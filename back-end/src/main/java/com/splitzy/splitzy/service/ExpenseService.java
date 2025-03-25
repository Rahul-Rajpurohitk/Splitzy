package com.splitzy.splitzy.service;

import com.corundumstudio.socketio.SocketIOServer;
import com.splitzy.splitzy.dto.*;
import com.splitzy.splitzy.model.*;
import com.splitzy.splitzy.repository.ExpenseRepository;
import com.splitzy.splitzy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.splitzy.splitzy.model.SplitMethod.*;

@Service
public class ExpenseService {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseService.class);

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private NotificationService notificationService;  // <--- For sending notifications

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SocketIOServer socketIOServer;



    public List<Expense> getExpensesForUser(String userId) {
        // Example: find all expenses where user is a participant or a payer
        // This is just a placeholder; you'd write a custom query or filter logic
        logger.debug("Fetching expenses for userId={}", userId);
        return expenseRepository.findAll(); // or a real query
    }

    public Expense createExpense(CreateExpenseRequest request) {

        logger.info("createExpense() called with request: {}", request);
        // 1) Basic checks
        User creator = userRepository.findById(request.getCreatorId())
                .orElseThrow(() -> {
                    logger.error("Creator not found for id={}", request.getCreatorId());
                    return new RuntimeException("Creator not found: " + request.getCreatorId());
                });

        Expense expense = new Expense();
        expense.setDescription(request.getDescription());
        expense.setNotes(request.getNotes());
        expense.setDate(request.getDate());
        expense.setCreatorId(request.getCreatorId());
        expense.setCreatorName(creator.getName());
        expense.setCreatedAt(LocalDateTime.now());
        expense.setUpdatedAt(LocalDateTime.now());

        SplitMethod splitMethod = SplitMethod.valueOf(request.getSplitMethod().toUpperCase());
        expense.setSplitMethod(splitMethod);
        logger.debug("Split method set to: {}", splitMethod);


        // 2) If itemized
        double sum;
        if (splitMethod == SplitMethod.ITEMIZED && request.getItems() != null) {
            logger.info("Handling itemized logic for expense");
            double tmpSum = 0;
            List<ExpenseItem> itemList = new ArrayList<>();
            for (ExpenseItemDTO iDto : request.getItems()) {
                ExpenseItem item = new ExpenseItem();
                item.setName(iDto.getName());
                item.setAmount(iDto.getAmount());
                item.setUserShares(iDto.getUserShares());
                itemList.add(item);
                tmpSum += iDto.getAmount();
            }
            expense.setItems(itemList);
            sum = tmpSum;
            logger.debug("Itemized total sum: {}", sum);
        } else {
            sum = request.getTotalAmount();
            logger.debug("Non-itemized sum: {}", sum);
        }

        // 3) Convert payers
        List<Payer> payers = new ArrayList<>();
        double payersSum = 0;
        for (PayerDTO pDto : request.getPayers()) {
            Payer payer = new Payer();
            payer.setUserId(pDto.getUserId());
            // Always fetch name from DB:
            User user = userRepository.findById(pDto.getUserId())
                    .orElseThrow(() -> new RuntimeException("Payer user not found: " + pDto.getUserId()));
            payer.setPayerName(user.getName());
            payer.setPaidAmount(pDto.getPaidAmount());
            payers.add(payer);
            payersSum += pDto.getPaidAmount();
        }
        expense.setPayers(payers);
        logger.debug("Payers: {}, sum of payers' amounts: {}", payers, payersSum);
        // optional: check if payersSum == sum

        // 4) Build "frontEndParts" from request.getParticipants()
        List<Participant> frontEndParts = new ArrayList<>();
        if (request.getParticipants() != null) {
            for (ParticipantDTO pd : request.getParticipants()) {
                Participant part = new Participant();
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
        List<Participant> backendParts = new ArrayList<>();
        if (request.getParticipants() != null) {
            logger.info("Recomputing backendParts from participants for splitMethod={}", splitMethod);
            switch (splitMethod) {

                case EQUALLY:
                    handleEqualSplitFromParticipants(backendParts, request.getParticipants(), payers, sum);
                    break;
                case PERCENTAGE:
                    handlePercentageSplitFromParticipants(backendParts, request.getParticipants(), payers, sum);
                    break;
                case EXACT_AMOUNTS:
                    handleExactAmountsFromParticipants(backendParts, request.getParticipants(), payers, sum);
                    break;
                case SHARES:
                    handleSharesFromParticipants(backendParts, request.getParticipants(), payers, sum);
                    break;
                case ITEMIZED:
                    // itemized is often handled by "items," but if you want to re-check raw fields, do it here
                    // or skip if front-end's itemized logic is enough
                    logger.info("Skipping itemized re-check, trusting front-end item data");
                    break;
                default:
                    // EQUAL or fallback
                    logger.warn("Unknown splitMethod, defaulting to EQUAL split");
                    handleEqualSplitFromParticipants(backendParts, request.getParticipants(), payers, sum);
                    break;
            }
        }

        // 6) Compare frontEndParts vs. backendParts
        boolean mismatch = compareParticipants(frontEndParts, backendParts);
        if (mismatch) {
            // Option A: override
            logger.warn("Mismatch detected between front-end participants and back-end computed participants. Overriding with backendParts.");
            expense.setParticipants(backendParts);
        } else {
            // Option B: trust frontEndParts
            logger.info("No mismatch, trusting front-end participants data");
            expense.setParticipants(frontEndParts);
        }

        // 7) fill participant names from DB
        logger.debug("Filling participant names from DB...");
        for (Participant p : expense.getParticipants()) {
            if (p.getUserId() == null) {
                logger.warn("Participant userId is null, skipping name fetch");
                continue;
            }
            User user = userRepository.findById(p.getUserId())
                    .orElseThrow(() -> new RuntimeException("Participant not found with ID: " + p.getUserId()));
            p.setPartName(user.getName());
        }

        // 8) set total, save
        expense.setTotalAmount(sum);
        Expense saved = expenseRepository.save(expense);
        logger.info("Expense saved with id={}, totalAmount={}", saved.getId(), saved.getTotalAmount());

        // notifications, socket events
        sendExpenseNotification(saved, creator.getId(), creator.getName());
        sendExpenseSocketEvent(saved, creator.getId(), creator.getName());

        return saved;
    }

    // ---------- "FromParticipants" handle methods ----------

    private void handleEqualSplitFromParticipants(List<Participant> backendParts,
                                                  List<ParticipantDTO> frontEndParts,
                                                  List<Payer> payers,
                                                  double sum) {
        logger.debug("handleEqualSplitFromParticipants called, sum={}", sum);
        int count = frontEndParts.size();
        double each = (count > 0) ? sum / count : 0.0;

        // Build a map for easy lookup of who paid how much
        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        for (ParticipantDTO pd : frontEndParts) {
            Participant part = new Participant();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(each);
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            part.setPaid(paid);
            part.setNet(paid - each); // correctly computed net
            backendParts.add(part);
        }
        logger.debug("EqualSplit created {} backend participants", backendParts.size());
    }


    private void handlePercentageSplitFromParticipants(List<Participant> backendParts,
                                                       List<ParticipantDTO> frontEndParts,
                                                       List<Payer> payers,
                                                       double sum) {
        logger.debug("handlePercentageSplitFromParticipants called, sum={}", sum);

        // Calculate total percentage
        double totalPct = 0.0;
        for (ParticipantDTO pd : frontEndParts) {
            totalPct += (pd.getPercent() == null ? 0.0 : pd.getPercent());
        }
        logger.debug("Total percentage found: {}", totalPct);

        if (Math.abs(totalPct - 100.0) > 0.001) {
            throw new RuntimeException("Percent does not sum to 100");
        }

        // Build a map to easily retrieve paid amounts
        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        // Calculate share, paid, and net amounts
        for (ParticipantDTO pd : frontEndParts) {
            double pct = (pd.getPercent() == null) ? 0.0 : pd.getPercent();
            double share = (pct / 100.0) * sum;

            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - share;

            Participant part = new Participant();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(share);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("Percentage split created {} backend participants", backendParts.size());
    }


    private void handleExactAmountsFromParticipants(List<Participant> backendParts,
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

        // Create a paidMap for quick lookup
        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        // Set exact share, paid, and net amounts correctly
        for (ParticipantDTO pd : frontEndParts) {
            double exactShare = (pd.getExact() == null) ? 0.0 : pd.getExact();
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - exactShare;

            Participant part = new Participant();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(exactShare);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("ExactAmounts split created {} backend participants", backendParts.size());
    }


    private void handleSharesFromParticipants(List<Participant> backendParts,
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

        // Create paidMap for quick lookup
        Map<String, Double> paidMap = new HashMap<>();
        for (Payer payer : payers) {
            paidMap.put(payer.getUserId(), payer.getPaidAmount());
        }

        // Properly set shares, paid, and net fields
        for (ParticipantDTO pd : frontEndParts) {
            int shares = (pd.getShares() == null) ? 0 : pd.getShares();
            double userShare = ((double) shares / totalShares) * sum;
            double paid = paidMap.getOrDefault(pd.getUserId(), 0.0);
            double net = paid - userShare;

            Participant part = new Participant();
            part.setUserId(pd.getUserId());
            part.setPartName(pd.getName());
            part.setShare(userShare);
            part.setPaid(paid);
            part.setNet(net);

            backendParts.add(part);
        }

        logger.debug("Shares split created {} backend participants", backendParts.size());
    }


    // ---------- compare participants logic ----------
    private boolean compareParticipants(List<Participant> frontEnd, List<Participant> backend) {
        logger.debug("Comparing front-end participants with backend participants");
        // Return "true" if there's a mismatch
        if (frontEnd.size() != backend.size()) {
            logger.warn("Mismatch in size: frontEnd={}, backend={}", frontEnd.size(), backend.size());
            return true; // mismatch in size
        }
        // Sort them by userId if needed
        // or assume same order

        for (int i = 0; i < frontEnd.size(); i++) {
            Participant fe = frontEnd.get(i);
            Participant be = backend.get(i);
            // If userId is null, that's automatically a mismatch (or throw an error)
            if (fe.getUserId() == null || be.getUserId() == null) {
                logger.warn("Null userId found in frontEndParts or backendParts at index={}", i);
                return true;
            }

            // Now safe to call .equals
            if (!fe.getUserId().equals(be.getUserId())) {
                logger.warn("UserId mismatch at index={}, frontEnd={}, backend={}", i, fe.getUserId(), be.getUserId());
                return true;
            }

            // Compare "share" within tolerance
            double diff = Math.abs(fe.getShare() - be.getShare());
            if (diff > 0.01) {
                logger.warn("Share mismatch at index={}, frontEnd share={}, backend share={}", i, fe.getShare(), be.getShare());
                return true; // mismatch
            }
            // If you want to also compare net, paid, etc.:
            double netDiff = Math.abs(fe.getNet() - be.getNet());
            if (netDiff > 0.01) {
                logger.warn("Net mismatch at index={}, frontEnd net={}, backend net={}", i, fe.getNet(), be.getNet());
                return true;
            }
        }
        logger.debug("No mismatch found between front-end and backend participants");
        return false; // no mismatch
    }

    private void sendExpenseSocketEvent(Expense expense, String creatorId, String creatorName) {
        try {

            // Build a payload
            ExpenseEventData data = new ExpenseEventData();
            data.setType("EXPENSE_CREATED");
            data.setExpenseId(expense.getId());
            // If you store creatorId, you can set it. Or just pass the name
            data.setCreatorId(creatorId);
            data.setCreatorName(creatorName);

            // We want to notify all participants (or payers, or both).
            // For example, notify each participant by their email:
            for (Participant p : expense.getParticipants()) {
                // Load the user to get their email
                User user = userRepository.findById(p.getUserId())
                        .orElse(null);
                if (user != null) {
                    String email = user.getEmail();
                    // Emit to the "room" named by that email
                    socketIOServer.getRoomOperations(email)
                            .sendEvent("expenseEvent", data);
                    logger.info("[ExpenseService] Socket.IO event [EXPENSE_CREATED] sent to room: {}", email);
                }
            }
        } catch (Exception e) {
            logger.error("[ExpenseService] Error sending Socket.IO expense event: {}", e.getMessage(), e);
        }
    }

    public Expense getExpenseById(String id) {
        logger.debug("getExpenseById called with id={}", id);
        return expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
    }

    // rename to getExpensesForUser
    public List<Expense> getExpensesForUser(String userId, String filter) {
        logger.debug("getExpensesForUser called with userId={}, filter={}", userId, filter);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        return switch (filter.toUpperCase()) {
            case "CREATOR" -> expenseRepository.findAllByCreatorId(userId, sort);
            case "PAYER" -> expenseRepository.findAllByPayer(userId, sort);
            case "PARTICIPANT" -> expenseRepository.findAllByParticipant(userId, sort);
            default -> expenseRepository.findAllByUserInvolvement(userId, sort);
        };
    }


    private void sendExpenseNotification(Expense expense, String creatorName, String creatorId) {
        logger.debug("Sending expense notification for expenseId={}, creatorId={}", expense.getId(), creatorId);
        // Suppose you want to notify each participant
        for (Participant p : expense.getParticipants()) {
            notificationService.createNotification(
                    p.getUserId(),
                    "You have a new expense: " + expense.getDescription(),
                    expense.getId(),
                    creatorName,// referenceId
                    creatorId,                      // or whoever created the expense
                    "EXPENSE"                      // type
            );
        }
    }
}
