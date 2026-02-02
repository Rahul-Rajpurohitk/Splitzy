package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.splitzy.splitzy.dto.*;
import com.splitzy.splitzy.dto.SettleExpenseRequest;
import com.splitzy.splitzy.model.*;
import com.splitzy.splitzy.service.dao.ExpenseDao;
import com.splitzy.splitzy.service.dao.ExpenseDto;
import com.splitzy.splitzy.service.dao.UserDao;
import com.splitzy.splitzy.service.dao.UserDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.splitzy.splitzy.model.SplitMethod.*;

@Service
public class ExpenseService {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseService.class);

    @Autowired
    private ExpenseDao expenseDao;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserDao userDao;

    @Autowired
    private SocketIOServer socketIOServer;

    @Autowired
    private SqsEventPublisher sqsEventPublisher;

    public List<Expense> getExpensesForUser(String userId) {
        logger.debug("Fetching expenses for userId={}", userId);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return expenseDao.findAllByUserInvolvement(userId, sort).stream()
                .map(this::toExpense)
                .collect(Collectors.toList());
    }

    public Expense createExpense(CreateExpenseRequest request) {

        logger.info("createExpense() called with request: {}", request);
        // 1) Basic checks
        UserDto creator = userDao.findById(request.getCreatorId())
                .orElseThrow(() -> {
                    logger.error("Creator not found for id={}", request.getCreatorId());
                    return new RuntimeException("Creator not found: " + request.getCreatorId());
                });

        ExpenseDto expenseDto = new ExpenseDto();
        expenseDto.setDescription(request.getDescription());
        expenseDto.setCategory(request.getCategory());
        expenseDto.setNotes(request.getNotes());
        expenseDto.setGroupId(request.getGroupId());
        expenseDto.setGroupName(request.getGroupName());
        expenseDto.setDate(request.getDate());
        expenseDto.setCreatorId(request.getCreatorId());
        expenseDto.setCreatorName(creator.getName());
        expenseDto.setCreatedAt(LocalDateTime.now());
        expenseDto.setUpdatedAt(LocalDateTime.now());

        SplitMethod splitMethod = SplitMethod.valueOf(request.getSplitMethod().toUpperCase());
        expenseDto.setSplitMethod(splitMethod);
        expenseDto.setTaxRate(request.getTaxRate());
        expenseDto.setTipRate(request.getTipRate());
        expenseDto.setPersonal(request.isPersonal());
        expenseDto.setSettled(false);
        logger.debug("Split method set to: {}", splitMethod);

        // 2) Process items
        double sum;
        if (splitMethod == SplitMethod.ITEMIZED && request.getItems() != null) {
            logger.info("Handling itemized logic for expense");
            double tmpSum = 0;
            List<ExpenseDto.ExpenseItemDto> itemList = new ArrayList<>();
            for (ExpenseItemDTO iDto : request.getItems()) {
                ExpenseDto.ExpenseItemDto item = new ExpenseDto.ExpenseItemDto();
                item.setName(iDto.getName());
                item.setAmount(iDto.getAmount());
                item.setUserShares(iDto.getUserShares());
                itemList.add(item);
                tmpSum += iDto.getAmount();
            }
            expenseDto.setItems(itemList);
            sum = tmpSum;
            logger.debug("Itemized total sum: {}", sum);
        } else {
            sum = request.getTotalAmount();
            logger.debug("Non-itemized sum: {}", sum);
        }

        // 3) Convert payers
        List<ExpenseDto.PayerDto> payers = new ArrayList<>();
        double payersSum = 0;
        for (PayerDTO pDto : request.getPayers()) {
            ExpenseDto.PayerDto payer = new ExpenseDto.PayerDto();
            payer.setUserId(pDto.getUserId());
            // Always fetch name from DB:
            UserDto user = userDao.findById(pDto.getUserId())
                    .orElseThrow(() -> new RuntimeException("Payer user not found: " + pDto.getUserId()));
            payer.setPayerName(user.getName());
            payer.setPaidAmount(pDto.getPaidAmount());
            payers.add(payer);
            payersSum += pDto.getPaidAmount();
        }
        expenseDto.setPayers(payers);
        logger.debug("Payers: {}, sum of payers' amounts: {}", payers, payersSum);

        // 4) Build "frontEndParts" from request.getParticipants()
        List<ExpenseDto.ParticipantDto> frontEndParts = new ArrayList<>();
        if (request.getParticipants() != null) {
            for (ParticipantDTO pd : request.getParticipants()) {
                ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
                part.setUserId(pd.getUserId());
                part.setPartName(pd.getName());
                part.setPaid(pd.getPaid());
                part.setShare(pd.getOwes());  // front-end calls it "owes"
                part.setNet(pd.getNet());
                frontEndParts.add(part);
            }
        }
        logger.debug("Front-end participants count: {}", frontEndParts.size());

        // 5) Re-run the logic => "backendParts"
        List<ExpenseDto.ParticipantDto> backendParts = new ArrayList<>();
        if (request.getParticipants() != null) {
            logger.info("Recomputing backendParts from participants for splitMethod={}", splitMethod);
            // Convert payers to Payer model for processing
            List<Payer> payersModel = payers.stream().map(p -> {
                Payer pm = new Payer();
                pm.setUserId(p.getUserId());
                pm.setPayerName(p.getPayerName());
                pm.setPaidAmount(p.getPaidAmount());
                return pm;
            }).collect(Collectors.toList());

            switch (splitMethod) {
                case EQUALLY:
                    handleEqualSplitFromParticipants(backendParts, request.getParticipants(), payersModel, sum);
                    break;
                case PERCENTAGE:
                    handlePercentageSplitFromParticipants(backendParts, request.getParticipants(), payersModel, sum);
                    break;
                case EXACT_AMOUNTS:
                    handleExactAmountsFromParticipants(backendParts, request.getParticipants(), payersModel, sum);
                    break;
                case SHARES:
                    handleSharesFromParticipants(backendParts, request.getParticipants(), payersModel, sum);
                    break;
                case ITEMIZED:
                    Map<String, Double> owedMap = computeOwedItemizedTaxTip(
                            request.getParticipants(),
                            request.getItems(),
                            request.getTaxRate(),
                            request.getTipRate()
                    );
                    for (ParticipantDTO pd : request.getParticipants()) {
                        ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
                        part.setUserId(pd.getUserId());
                        part.setPartName(pd.getName());
                        double owed = owedMap.getOrDefault(pd.getUserId(), 0.0);
                        part.setShare(owed);
                        double paid = 0;
                        for (PayerDTO pDto : request.getPayers()) {
                            if (pDto.getUserId().equals(pd.getUserId())) {
                                paid = pDto.getPaidAmount();
                                break;
                            }
                        }
                        part.setPaid(paid);
                        part.setNet(paid - owed);
                        backendParts.add(part);
                    }
                    break;
                case TWO_PERSON:
                    handleTwoPersonSplitFromParticipants(backendParts, request.getParticipants(), payersModel, sum, request.getCreatorId(), request.getFullOwe());
                    break;
                default:
                    logger.warn("Unknown splitMethod, defaulting to EQUAL split");
                    handleEqualSplitFromParticipants(backendParts, request.getParticipants(), payersModel, sum);
                    break;
            }
        }

        // 6) Compare frontEndParts vs. backendParts
        boolean mismatch = compareParticipants(frontEndParts, backendParts);
        if (mismatch) {
            logger.warn("Mismatch detected between front-end participants and back-end computed participants. Overriding with backendParts.");
            expenseDto.setParticipants(backendParts);
        } else {
            logger.info("No mismatch, trusting front-end participants data");
            expenseDto.setParticipants(frontEndParts);
        }

        // 7) fill participant names from DB
        logger.debug("Filling participant names from DB...");
        for (ExpenseDto.ParticipantDto p : expenseDto.getParticipants()) {
            if (p.getUserId() == null) {
                logger.warn("Participant userId is null, skipping name fetch");
                continue;
            }
            UserDto user = userDao.findById(p.getUserId())
                    .orElseThrow(() -> new RuntimeException("Participant not found with ID: " + p.getUserId()));
            p.setPartName(user.getName());
        }

        // 8) set total, save
        expenseDto.setTotalAmount(sum);
        ExpenseDto savedDto = expenseDao.save(expenseDto);
        logger.info("Expense saved with id={}, totalAmount={}", savedDto.getId(), savedDto.getTotalAmount());

        Expense saved = toExpense(savedDto);

        // notifications, socket events
        sendExpenseNotification(saved, creator.getId(), creator.getName());
        sendExpenseSocketEvent(saved, creator.getId(), creator.getName());

        return saved;
    }

    // ---------- "FromParticipants" handle methods ----------

    private void handleEqualSplitFromParticipants(List<ExpenseDto.ParticipantDto> backendParts,
                                                  List<ParticipantDTO> frontEndParts,
                                                  List<Payer> payers,
                                                  double sum) {
        logger.debug("handleEqualSplitFromParticipants called, sum={}", sum);
        int count = frontEndParts.size();
        double each = (count > 0) ? sum / count : 0.0;

        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        for (ParticipantDTO pd : frontEndParts) {
            ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(each);
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            part.setPaid(paid);
            part.setNet(paid - each);
            backendParts.add(part);
        }
        logger.debug("EqualSplit created {} backend participants", backendParts.size());
    }

    private void handlePercentageSplitFromParticipants(List<ExpenseDto.ParticipantDto> backendParts,
                                                       List<ParticipantDTO> frontEndParts,
                                                       List<Payer> payers,
                                                       double sum) {
        logger.debug("handlePercentageSplitFromParticipants called, sum={}", sum);

        double totalPct = 0.0;
        for (ParticipantDTO pd : frontEndParts) {
            totalPct += (pd.getPercent() == null ? 0.0 : pd.getPercent());
        }
        logger.debug("Total percentage found: {}", totalPct);

        if (Math.abs(totalPct - 100.0) > 0.001) {
            throw new RuntimeException("Percent does not sum to 100");
        }

        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        for (ParticipantDTO pd : frontEndParts) {
            double pct = (pd.getPercent() == null) ? 0.0 : pd.getPercent();
            double share = (pct / 100.0) * sum;

            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - share;

            ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(share);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("Percentage split created {} backend participants", backendParts.size());
    }

    private void handleExactAmountsFromParticipants(List<ExpenseDto.ParticipantDto> backendParts,
                                                    List<ParticipantDTO> frontEndParts,
                                                    List<Payer> payers,
                                                    double sum) {
        logger.debug("handleExactAmountsFromParticipants called, sum={}", sum);

        double totalExact = 0.0;
        for (ParticipantDTO pd : frontEndParts) {
            totalExact += (pd.getExact() == null ? 0.0 : pd.getExact());
        }
        logger.debug("Exact amounts total: {}", totalExact);

        if (Math.abs(totalExact - sum) > 0.001) {
            throw new RuntimeException("Exact amounts do not sum to total expense");
        }

        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        for (ParticipantDTO pd : frontEndParts) {
            double exactShare = (pd.getExact() == null) ? 0.0 : pd.getExact();
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - exactShare;

            ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(exactShare);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("ExactAmounts split created {} backend participants", backendParts.size());
    }

    private Map<String, Double> computeOwedItemizedTaxTip(
            List<ParticipantDTO> participants,
            List<ExpenseItemDTO> items,
            double taxRate,
            double tipRate
    ) {
        double itemSubtotal = 0.0;
        Map<String, Double> userItemTotals = new HashMap<>();
        for (ParticipantDTO p : participants) {
            userItemTotals.put(p.getUserId(), 0.0);
        }
        for (ExpenseItemDTO item : items) {
            double amount = item.getAmount();
            itemSubtotal += amount;
            double fractionSum = 0.0;
            for (Double fraction : item.getUserShares().values()) {
                fractionSum += fraction;
            }
            if (fractionSum > 0) {
                for (Map.Entry<String, Double> entry : item.getUserShares().entrySet()) {
                    String uid = entry.getKey();
                    double fraction = entry.getValue();
                    double share = amount * (fraction / fractionSum);
                    userItemTotals.put(uid, userItemTotals.getOrDefault(uid, 0.0) + share);
                }
            }
        }

        double taxAmount = itemSubtotal * (taxRate / 100.0);
        double tipAmount = (itemSubtotal + taxAmount) * (tipRate / 100.0);

        Map<String, Double> finalTotals = new HashMap<>();
        for (ParticipantDTO p : participants) {
            String uid = p.getUserId();
            double userSubtotal = userItemTotals.getOrDefault(uid, 0.0);
            double fraction = (itemSubtotal > 0) ? userSubtotal / itemSubtotal : 0.0;
            double userTax = taxAmount * fraction;
            double userTip = tipAmount * fraction;
            double totalOwed = userSubtotal + userTax + userTip;
            finalTotals.put(uid, totalOwed);
        }

        return finalTotals;
    }

    private void handleSharesFromParticipants(List<ExpenseDto.ParticipantDto> backendParts,
                                              List<ParticipantDTO> frontEndParts,
                                              List<Payer> payers,
                                              double sum) {
        logger.debug("handleSharesFromParticipants called, sum={}", sum);

        int totalShares = 0;
        for (ParticipantDTO pd : frontEndParts) {
            totalShares += (pd.getShares() == null ? 0 : pd.getShares());
        }
        logger.debug("Total shares: {}", totalShares);

        if (totalShares == 0) {
            throw new RuntimeException("No shares specified");
        }

        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        for (ParticipantDTO pd : frontEndParts) {
            int shares = (pd.getShares() == null) ? 0 : pd.getShares();
            double userShare = ((double) shares / totalShares) * sum;
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - userShare;

            ExpenseDto.ParticipantDto part = new ExpenseDto.ParticipantDto();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(userShare);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("Shares split created {} backend participants", backendParts.size());
    }

    private void handleTwoPersonSplitFromParticipants(
            List<ExpenseDto.ParticipantDto> backendParts,
            List<ParticipantDTO> frontEndParts,
            List<Payer> payers,
            double sum,
            String creatorId,
            String fullOwe
    ) {
        if (frontEndParts.size() != 2) {
            throw new RuntimeException("Two person split requires exactly two participants");
        }

        ParticipantDTO creatorPart = frontEndParts.stream()
                .filter(p -> p.getUserId().equals(creatorId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Creator not found in participants"));
        ParticipantDTO otherPart = frontEndParts.stream()
                .filter(p -> !p.getUserId().equals(creatorId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Other participant not found"));

        double totalPaidByCreator = payers.stream()
                .filter(p -> p.getUserId().equals(creatorId))
                .mapToDouble(Payer::getPaidAmount)
                .sum();
        double totalPaidByOther = payers.stream()
                .filter(p -> !p.getUserId().equals(creatorId))
                .mapToDouble(Payer::getPaidAmount)
                .sum();

        logger.debug("Aggregated payments - Creator: {}, Other: {}", totalPaidByCreator, totalPaidByOther);

        if ("you".equalsIgnoreCase(fullOwe)) {
            ExpenseDto.ParticipantDto payerPart = new ExpenseDto.ParticipantDto();
            payerPart.setUserId(otherPart.getUserId());
            payerPart.setPartName(otherPart.getName());
            payerPart.setPaid(totalPaidByOther);
            payerPart.setShare(0);
            payerPart.setNet(totalPaidByOther);
            backendParts.add(payerPart);

            ExpenseDto.ParticipantDto borrowerPart = new ExpenseDto.ParticipantDto();
            borrowerPart.setUserId(creatorPart.getUserId());
            borrowerPart.setPartName(creatorPart.getName());
            borrowerPart.setPaid(totalPaidByCreator);
            borrowerPart.setShare(sum);
            borrowerPart.setNet(totalPaidByCreator - sum);
            backendParts.add(borrowerPart);
        } else if ("other".equalsIgnoreCase(fullOwe)) {
            ExpenseDto.ParticipantDto payerPart = new ExpenseDto.ParticipantDto();
            payerPart.setUserId(creatorPart.getUserId());
            payerPart.setPartName(creatorPart.getName());
            payerPart.setPaid(totalPaidByCreator);
            payerPart.setShare(0);
            payerPart.setNet(totalPaidByCreator);
            backendParts.add(payerPart);

            ExpenseDto.ParticipantDto borrowerPart = new ExpenseDto.ParticipantDto();
            borrowerPart.setUserId(otherPart.getUserId());
            borrowerPart.setPartName(otherPart.getName());
            borrowerPart.setPaid(totalPaidByOther);
            borrowerPart.setShare(sum);
            borrowerPart.setNet(totalPaidByOther - sum);
            backendParts.add(borrowerPart);
        } else {
            throw new RuntimeException("Invalid fullOwe value: " + fullOwe);
        }
    }

    private boolean compareParticipants(List<ExpenseDto.ParticipantDto> frontEnd, List<ExpenseDto.ParticipantDto> backend) {
        logger.debug("Comparing front-end participants with backend participants");
        if (frontEnd.size() != backend.size()) {
            logger.warn("Mismatch in size: frontEnd={}, backend={}", frontEnd.size(), backend.size());
            return true;
        }

        for (int i = 0; i < frontEnd.size(); i++) {
            ExpenseDto.ParticipantDto fe = frontEnd.get(i);
            ExpenseDto.ParticipantDto be = backend.get(i);
            if (fe.getUserId() == null || be.getUserId() == null) {
                logger.warn("Null userId found in frontEndParts or backendParts at index={}", i);
                return true;
            }

            if (!fe.getUserId().equals(be.getUserId())) {
                logger.warn("UserId mismatch at index={}, frontEnd={}, backend={}", i, fe.getUserId(), be.getUserId());
                return true;
            }

            double diff = Math.abs(fe.getShare() - be.getShare());
            if (diff > 0.01) {
                logger.warn("Share mismatch at index={}, frontEnd share={}, backend share={}", i, fe.getShare(), be.getShare());
                return true;
            }
            double netDiff = Math.abs(fe.getNet() - be.getNet());
            if (netDiff > 0.01) {
                logger.warn("Net mismatch at index={}, frontEnd net={}, backend net={}", i, fe.getNet(), be.getNet());
                return true;
            }
        }
        logger.debug("No mismatch found between front-end and backend participants");
        return false;
    }

    private void sendExpenseSocketEvent(Expense expense, String creatorId, String creatorName) {
        try {
            ExpenseEventData data = new ExpenseEventData();
            data.setType("EXPENSE_CREATED");
            data.setExpenseId(expense.getId());
            data.setCreatorId(creatorId);
            data.setCreatorName(creatorName);

            Set<String> targetEmails = new HashSet<>();

            // ALWAYS include the creator first - ensures creator gets notified on all their devices
            UserDto creator = userDao.findById(creatorId).orElse(null);
            if (creator != null) {
                String creatorEmail = creator.getEmail();
                targetEmails.add(creatorEmail);
                socketIOServer.getRoomOperations(creatorEmail)
                        .sendEvent("expenseEvent", data);
                logger.info("[ExpenseService] Socket.IO event [EXPENSE_CREATED] sent to creator room: {}", creatorEmail);
            }

            // Direct Socket.IO broadcast to all participants (instant, best-effort)
            for (Participant p : expense.getParticipants()) {
                UserDto user = userDao.findById(p.getUserId()).orElse(null);
                if (user != null) {
                    String email = user.getEmail();
                    // Avoid duplicate sends if participant is the creator
                    if (!targetEmails.contains(email)) {
                        targetEmails.add(email);
                        socketIOServer.getRoomOperations(email)
                                .sendEvent("expenseEvent", data);
                        logger.info("[ExpenseService] Socket.IO event [EXPENSE_CREATED] sent to room: {}", email);
                    }
                }
            }

            // Also publish to SQS for guaranteed delivery (includes creator + all participants)
            sqsEventPublisher.publishExpenseEvent(targetEmails, data);

        } catch (Exception e) {
            logger.error("[ExpenseService] Error sending expense event: {}", e.getMessage(), e);
        }
    }

    public Expense getExpenseById(String id) {
        logger.debug("getExpenseById called with id={}", id);
        return expenseDao.findById(id)
                .map(this::toExpense)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
    }

    public List<Expense> getExpensesForUser(String userId, String filter) {
        logger.debug("getExpensesForUser called with userId={}, filter={}", userId, filter);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        List<ExpenseDto> dtos = switch (filter.toUpperCase()) {
            case "CREATOR" -> expenseDao.findAllByCreatorId(userId, sort);
            case "PAYER" -> expenseDao.findAllByPayer(userId, sort);
            case "PARTICIPANT" -> expenseDao.findAllByParticipant(userId, sort);
            default -> expenseDao.findAllByUserInvolvement(userId, sort);
        };

        return dtos.stream().map(this::toExpense).collect(Collectors.toList());
    }

    /**
     * Get expenses for user with advanced filtering options.
     * @param userId The user ID
     * @param filter Basic filter (CREATOR, PAYER, PARTICIPANT, ALL)
     * @param owingFilter Filter by owing status: "youOwe", "othersOwe", or null/all
     * @param settledFilter Filter by settled status: "settled", "unsettled", or null/all
     * @param friendId Filter by friend involvement (optional)
     * @param groupId Filter by group (optional)
     */
    public List<Expense> getExpensesForUserFiltered(String userId, String filter,
            String owingFilter, String settledFilter, String friendId, String groupId,
            String typeFilter, String partialFilter, String categoryFilter, String dateRangeFilter) {
        logger.debug("getExpensesForUserFiltered called with userId={}, filter={}, owingFilter={}, settledFilter={}, friendId={}, groupId={}, typeFilter={}, partialFilter={}, categoryFilter={}, dateRangeFilter={}",
                userId, filter, owingFilter, settledFilter, friendId, groupId, typeFilter, partialFilter, categoryFilter, dateRangeFilter);

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<ExpenseDto> dtos;

        // Start with base query based on friendId or groupId if provided
        if (friendId != null && !friendId.trim().isEmpty()) {
            dtos = expenseDao.findAllByBothUserInvolvement(userId, friendId, sort);
        } else if (groupId != null && !groupId.trim().isEmpty()) {
            dtos = expenseDao.findAllByGroupId(groupId, sort);
        } else {
            // Apply basic filter
            dtos = switch (filter != null ? filter.toUpperCase() : "ALL") {
                case "CREATOR" -> expenseDao.findAllByCreatorId(userId, sort);
                case "PAYER" -> expenseDao.findAllByPayer(userId, sort);
                case "PARTICIPANT" -> expenseDao.findAllByParticipant(userId, sort);
                default -> expenseDao.findAllByUserInvolvement(userId, sort);
            };
        }

        // Convert to Expense objects
        List<Expense> expenses = dtos.stream().map(this::toExpense).collect(Collectors.toList());

        // Apply owingFilter
        if (owingFilter != null && !owingFilter.isEmpty() && !owingFilter.equalsIgnoreCase("all")) {
            expenses = expenses.stream().filter(expense -> {
                // Find user's participant record
                Participant myParticipant = expense.getParticipants().stream()
                        .filter(p -> userId.equals(p.getUserId()))
                        .findFirst()
                        .orElse(null);

                if (myParticipant == null) return true; // Include if user not found as participant

                double myNet = myParticipant.getNet();
                double myRemainingAmount = Math.abs(myParticipant.getShare() - myParticipant.getSettledAmount());
                boolean isMyPartSettled = myParticipant.isFullySettled() || myRemainingAmount < 0.01;

                if ("youOwe".equalsIgnoreCase(owingFilter)) {
                    // User owes money: net < 0 and not settled
                    return myNet < 0 && !isMyPartSettled;
                } else if ("othersOwe".equalsIgnoreCase(owingFilter)) {
                    // Others owe user: net > 0 and not settled
                    return myNet > 0 && !isMyPartSettled;
                }
                return true;
            }).collect(Collectors.toList());
        }

        // Apply settledFilter
        if (settledFilter != null && !settledFilter.isEmpty() && !settledFilter.equalsIgnoreCase("all")) {
            expenses = expenses.stream().filter(expense -> {
                // Find user's participant record
                Participant myParticipant = expense.getParticipants().stream()
                        .filter(p -> userId.equals(p.getUserId()))
                        .findFirst()
                        .orElse(null);

                if (myParticipant == null) return true; // Include if user not found as participant

                double myRemainingAmount = Math.abs(myParticipant.getShare() - myParticipant.getSettledAmount());
                boolean isMyPartSettled = myParticipant.isFullySettled() || myRemainingAmount < 0.01;

                if ("settled".equalsIgnoreCase(settledFilter)) {
                    return isMyPartSettled;
                } else if ("unsettled".equalsIgnoreCase(settledFilter)) {
                    return !isMyPartSettled;
                }
                return true;
            }).collect(Collectors.toList());
        }

        // Apply typeFilter (personal/shared)
        // Personal = only 1 participant (yourself), Shared = multiple participants
        if (typeFilter != null && !typeFilter.isEmpty() && !typeFilter.equalsIgnoreCase("all")) {
            expenses = expenses.stream().filter(expense -> {
                // Check if explicitly marked as personal OR has only 1 participant
                boolean isPersonalExpense = expense.isPersonal() ||
                    (expense.getParticipants() != null && expense.getParticipants().size() <= 1);
                if ("personal".equalsIgnoreCase(typeFilter)) {
                    return isPersonalExpense;
                } else if ("shared".equalsIgnoreCase(typeFilter)) {
                    return !isPersonalExpense;
                }
                return true;
            }).collect(Collectors.toList());
        }

        // Apply partialFilter - checks only the CURRENT USER's partial payment status
        // Not any participant - only shows expenses where YOU have a partial payment
        if (partialFilter != null && !partialFilter.isEmpty() && !partialFilter.equalsIgnoreCase("all")) {
            expenses = expenses.stream().filter(expense -> {
                // Find the current user's participant record
                Participant myParticipant = expense.getParticipants().stream()
                        .filter(p -> userId.equals(p.getUserId()))
                        .findFirst()
                        .orElse(null);

                if (myParticipant == null) return false; // Exclude if user not a participant

                // Check if current user has partial payment (some settled but not fully)
                double settledAmount = myParticipant.getSettledAmount();
                double share = myParticipant.getShare();
                boolean fullySettled = myParticipant.isFullySettled() || Math.abs(share - settledAmount) < 0.01;
                boolean hasPartialPayment = settledAmount > 0.01 && !fullySettled;

                if ("partial".equalsIgnoreCase(partialFilter)) {
                    return hasPartialPayment;
                } else if ("none".equalsIgnoreCase(partialFilter)) {
                    // No partial payments - either fully settled or no payments at all
                    return !hasPartialPayment;
                }
                return true;
            }).collect(Collectors.toList());
        }

        // Apply categoryFilter
        if (categoryFilter != null && !categoryFilter.isEmpty() && !categoryFilter.equalsIgnoreCase("all")) {
            expenses = expenses.stream().filter(expense -> {
                String expenseCategory = expense.getCategory();
                if (expenseCategory == null) return false;
                return expenseCategory.equalsIgnoreCase(categoryFilter);
            }).collect(Collectors.toList());
        }

        // Apply dateRangeFilter
        if (dateRangeFilter != null && !dateRangeFilter.isEmpty() && !dateRangeFilter.equalsIgnoreCase("all")) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startDate = null;
            LocalDateTime endDate = now;

            switch (dateRangeFilter.toLowerCase()) {
                case "today":
                    startDate = now.toLocalDate().atStartOfDay();
                    break;
                case "week":
                    startDate = now.minusWeeks(1).toLocalDate().atStartOfDay();
                    break;
                case "month":
                    startDate = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
                    break;
                case "lastmonth":
                    startDate = now.minusMonths(1).withDayOfMonth(1).toLocalDate().atStartOfDay();
                    endDate = now.withDayOfMonth(1).toLocalDate().atStartOfDay().minusSeconds(1);
                    break;
                case "3months":
                    startDate = now.minusMonths(3).toLocalDate().atStartOfDay();
                    break;
                case "6months":
                    startDate = now.minusMonths(6).toLocalDate().atStartOfDay();
                    break;
                case "year":
                    startDate = now.withDayOfYear(1).toLocalDate().atStartOfDay();
                    break;
            }

            if (startDate != null) {
                final LocalDateTime finalStartDate = startDate;
                final LocalDateTime finalEndDate = endDate;
                expenses = expenses.stream().filter(expense -> {
                    // Use the 'date' field first (what users see on expense cards)
                    // Fall back to 'createdAt' if date is null
                    LocalDateTime expenseDate = null;
                    java.time.LocalDate localDate = expense.getDate();
                    if (localDate != null) {
                        expenseDate = localDate.atStartOfDay();
                    } else if (expense.getCreatedAt() != null) {
                        expenseDate = expense.getCreatedAt();
                    } else {
                        return true; // Include if no date at all
                    }
                    return !expenseDate.isBefore(finalStartDate) && !expenseDate.isAfter(finalEndDate);
                }).collect(Collectors.toList());
            }
        }

        logger.debug("Filtered expenses count: {}", expenses.size());
        return expenses;
    }

    public List<Expense> getExpensesForFriend(String userId, String friendId) {
        logger.debug("Fetching expenses for userId={} and friendId={}", userId, friendId);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return expenseDao.findAllByBothUserInvolvement(userId, friendId, sort).stream()
                .map(this::toExpense)
                .collect(Collectors.toList());
    }

    public List<Expense> getExpensesForGroup(String groupId) {
        logger.debug("Fetching expenses for groupId={}", groupId);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return expenseDao.findAllByGroupId(groupId, sort).stream()
                .map(this::toExpense)
                .collect(Collectors.toList());
    }

    /**
     * Delete an expense by ID.
     */
    public void deleteExpense(String expenseId) {
        logger.info("deleteExpense called for expenseId={}", expenseId);
        ExpenseDto expense = expenseDao.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + expenseId));
        expenseDao.deleteById(expenseId);
        logger.info("Expense deleted: {}", expenseId);
    }

    /**
     * Settle an expense for a specific participant (full or partial).
     */
    public Expense settleExpense(String expenseId, SettleExpenseRequest request) {
        logger.info("settleExpense called for expenseId={}, participantUserId={}", expenseId, request.getParticipantUserId());
        
        ExpenseDto expense = expenseDao.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + expenseId));
        
        // Find the participant and update their settled amount
        for (ExpenseDto.ParticipantDto participant : expense.getParticipants()) {
            if (participant.getUserId().equals(request.getParticipantUserId())) {
                double amountOwed = Math.abs(participant.getNet());
                double currentSettled = participant.getSettledAmount();
                
                double settleAmount;
                if (request.isSettleFullAmount()) {
                    settleAmount = amountOwed - currentSettled;
                } else {
                    settleAmount = Math.min(request.getSettleAmount(), amountOwed - currentSettled);
                }
                
                participant.setSettledAmount(currentSettled + settleAmount);
                
                // Check if fully settled
                if (Math.abs(participant.getSettledAmount() - amountOwed) < 0.01) {
                    participant.setFullySettled(true);
                }
                
                logger.info("Participant {} settled ${} (total settled: ${})", 
                    request.getParticipantUserId(), settleAmount, participant.getSettledAmount());
                break;
            }
        }
        
        // Check if all participants are fully settled
        boolean allSettled = expense.getParticipants().stream()
                .allMatch(p -> p.isFullySettled() || Math.abs(p.getNet()) < 0.01);
        expense.setSettled(allSettled);
        
        expense.setUpdatedAt(LocalDateTime.now());
        ExpenseDto savedDto = expenseDao.save(expense);

        Expense saved = toExpense(savedDto);

        // Send socket event for expense settlement
        sendExpenseSettledEvent(saved, request.getParticipantUserId());

        return saved;
    }

    /**
     * Send socket event when expense is settled.
     */
    private void sendExpenseSettledEvent(Expense expense, String settledByUserId) {
        try {
            ExpenseEventData data = new ExpenseEventData();
            data.setType("EXPENSE_SETTLED");
            data.setExpenseId(expense.getId());
            data.setCreatorId(settledByUserId);

            UserDto settledByUser = userDao.findById(settledByUserId).orElse(null);
            if (settledByUser != null) {
                data.setCreatorName(settledByUser.getName());
            }

            Set<String> targetEmails = new HashSet<>();

            // Notify all participants
            for (Participant p : expense.getParticipants()) {
                UserDto user = userDao.findById(p.getUserId()).orElse(null);
                if (user != null) {
                    String email = user.getEmail();
                    if (!targetEmails.contains(email)) {
                        targetEmails.add(email);
                        socketIOServer.getRoomOperations(email)
                                .sendEvent("expenseEvent", data);
                        logger.info("[ExpenseService] Socket.IO event [EXPENSE_SETTLED] sent to room: {}", email);
                    }
                }
            }

            // Also publish to SQS for guaranteed delivery
            sqsEventPublisher.publishExpenseEvent(targetEmails, data);

        } catch (Exception e) {
            logger.error("[ExpenseService] Error sending expense settled event: {}", e.getMessage(), e);
        }
    }

    /**
     * Mark an entire expense as fully settled (all participants).
     */
    public Expense settleExpenseFull(String expenseId) {
        logger.info("settleExpenseFull called for expenseId={}", expenseId);
        
        ExpenseDto expense = expenseDao.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + expenseId));
        
        // Mark all participants as fully settled
        for (ExpenseDto.ParticipantDto participant : expense.getParticipants()) {
            double amountOwed = Math.abs(participant.getNet());
            participant.setSettledAmount(amountOwed);
            participant.setFullySettled(true);
        }
        
        expense.setSettled(true);
        expense.setUpdatedAt(LocalDateTime.now());
        ExpenseDto savedDto = expenseDao.save(expense);
        
        logger.info("Expense {} fully settled", expenseId);
        return toExpense(savedDto);
    }

    private void sendExpenseNotification(Expense expense, String creatorId, String creatorName) {
        logger.debug("Sending expense notification for expenseId={}, creatorId={}", expense.getId(), creatorId);
        for (Participant p : expense.getParticipants()) {
            notificationService.createNotification(
                    p.getUserId(),
                    "You have a new expense: " + expense.getDescription(),
                    expense.getId(),
                    creatorName,
                    creatorId,
                    "EXPENSE"
            );
        }
    }

    // --- Conversion helpers ---

    private Expense toExpense(ExpenseDto dto) {
        Expense expense = new Expense();
        expense.setId(dto.getId());
        expense.setDescription(dto.getDescription());
        expense.setCategory(dto.getCategory());
        expense.setTotalAmount(dto.getTotalAmount());
        expense.setDate(dto.getDate());
        expense.setNotes(dto.getNotes());
        expense.setGroupId(dto.getGroupId());
        expense.setGroupName(dto.getGroupName());
        expense.setSplitMethod(dto.getSplitMethod());
        expense.setCreatorId(dto.getCreatorId());
        expense.setCreatorName(dto.getCreatorName());
        expense.setCreatedAt(dto.getCreatedAt());
        expense.setUpdatedAt(dto.getUpdatedAt());
        expense.setTaxRate(dto.getTaxRate());
        expense.setTipRate(dto.getTipRate());
        expense.setPersonal(dto.isPersonal());
        expense.setSettled(dto.isSettled());

        if (dto.getPayers() != null) {
            expense.setPayers(dto.getPayers().stream().map(p -> {
                Payer payer = new Payer();
                payer.setUserId(p.getUserId());
                payer.setPayerName(p.getPayerName());
                payer.setPaidAmount(p.getPaidAmount());
                return payer;
            }).collect(Collectors.toList()));
        }

        if (dto.getParticipants() != null) {
            expense.setParticipants(dto.getParticipants().stream().map(p -> {
                Participant part = new Participant();
                part.setUserId(p.getUserId());
                part.setPartName(p.getPartName());
                part.setPercent(p.getPercent());
                part.setExact(p.getExact());
                part.setShares(p.getShares());
                part.setShare(p.getShare());
                part.setPaid(p.getPaid());
                part.setNet(p.getNet());
                part.setSettledAmount(p.getSettledAmount());
                part.setFullySettled(p.isFullySettled());
                return part;
            }).collect(Collectors.toList()));
        }

        if (dto.getItems() != null) {
            expense.setItems(dto.getItems().stream().map(i -> {
                ExpenseItem item = new ExpenseItem();
                item.setName(i.getName());
                item.setAmount(i.getAmount());
                item.setUserShares(i.getUserShares());
                return item;
            }).collect(Collectors.toList()));
        }

        return expense;
    }
}
