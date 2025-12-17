package com.splitzy.splitzy.config;

import com.splitzy.splitzy.model.User;
import com.splitzy.splitzy.service.CustomUserDetailsService;
import com.splitzy.splitzy.service.dao.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Seeds demo/preview accounts and comprehensive sample data on application startup.
 * These accounts allow visitors to explore the app without registration.
 * 
 * Demo accounts are created ONCE and persist in the database.
 * Runs in all profiles including production.
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DemoDataSeeder.class);

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private UserDao userDao;

    @Autowired
    private ExpenseDao expenseDao;

    @Autowired
    private GroupDao groupDao;

    @Value("${demo.data.enabled:true}")
    private boolean demoDataEnabled;

    // Demo account credentials (public - for preview purposes)
    private static final List<DemoUser> DEMO_USERS = List.of(
        new DemoUser("Alice Demo", "alice@demo.splitzy.com", "Demo@1234"),
        new DemoUser("Bob Demo", "bob@demo.splitzy.com", "Demo@1234"),
        new DemoUser("Carol Demo", "carol@demo.splitzy.com", "Demo@1234"),
        new DemoUser("David Demo", "david@demo.splitzy.com", "Demo@1234"),
        new DemoUser("Emma Demo", "emma@demo.splitzy.com", "Demo@1234"),
        new DemoUser("Frank Demo", "frank@demo.splitzy.com", "Demo@1234")
    );

    // Comprehensive expense templates by category with realistic patterns
    private static final Map<String, List<ExpenseTemplate>> EXPENSE_TEMPLATES = Map.ofEntries(
        // FOOD & DINING
        Map.entry("food", List.of(
            new ExpenseTemplate("Dinner at Italian restaurant", 45, 120, 0.8),
            new ExpenseTemplate("Lunch at Thai place", 25, 55, 0.7),
            new ExpenseTemplate("Brunch at cafe", 30, 70, 0.6),
            new ExpenseTemplate("Pizza night", 28, 50, 0.9),
            new ExpenseTemplate("Sushi dinner", 55, 140, 0.5),
            new ExpenseTemplate("BBQ restaurant", 45, 95, 0.6),
            new ExpenseTemplate("Mexican food", 32, 65, 0.8),
            new ExpenseTemplate("Indian takeout", 38, 72, 0.7),
            new ExpenseTemplate("Coffee and pastries", 18, 35, 1.5),
            new ExpenseTemplate("Burgers and fries", 22, 48, 0.8),
            new ExpenseTemplate("Chinese takeout", 28, 58, 0.7),
            new ExpenseTemplate("Korean BBQ", 65, 120, 0.4),
            new ExpenseTemplate("Steakhouse dinner", 85, 180, 0.3),
            new ExpenseTemplate("Food truck lunch", 15, 28, 1.0),
            new ExpenseTemplate("Ramen shop", 22, 38, 0.6),
            new ExpenseTemplate("Seafood restaurant", 55, 130, 0.4),
            new ExpenseTemplate("Fast food run", 12, 28, 1.2),
            new ExpenseTemplate("Late night snacks", 18, 35, 0.5),
            new ExpenseTemplate("Weekend breakfast", 25, 48, 0.8),
            new ExpenseTemplate("Work lunch", 15, 32, 1.5)
        )),
        // GROCERIES
        Map.entry("groceries", List.of(
            new ExpenseTemplate("Weekly groceries", 85, 180, 1.0),
            new ExpenseTemplate("Costco run", 160, 380, 0.3),
            new ExpenseTemplate("Trader Joes shopping", 65, 115, 0.8),
            new ExpenseTemplate("Whole Foods trip", 95, 220, 0.5),
            new ExpenseTemplate("Party supplies", 55, 140, 0.2),
            new ExpenseTemplate("Fresh produce", 28, 55, 0.9),
            new ExpenseTemplate("Meat and poultry", 45, 95, 0.6),
            new ExpenseTemplate("Bakery items", 18, 38, 0.7),
            new ExpenseTemplate("Specialty ingredients", 25, 65, 0.4),
            new ExpenseTemplate("Quick grocery stop", 22, 48, 1.2),
            new ExpenseTemplate("Organic groceries", 75, 150, 0.4),
            new ExpenseTemplate("Asian grocery store", 35, 75, 0.5),
            new ExpenseTemplate("Farmers market", 42, 85, 0.6)
        )),
        // ENTERTAINMENT
        Map.entry("entertainment", List.of(
            new ExpenseTemplate("Movie tickets", 32, 58, 0.8),
            new ExpenseTemplate("Concert tickets", 85, 220, 0.2),
            new ExpenseTemplate("Escape room", 85, 150, 0.15),
            new ExpenseTemplate("Bowling night", 42, 75, 0.5),
            new ExpenseTemplate("Mini golf", 32, 55, 0.4),
            new ExpenseTemplate("Arcade games", 28, 48, 0.6),
            new ExpenseTemplate("Netflix subscription", 15, 20, 0.1),
            new ExpenseTemplate("Spotify family plan", 16, 18, 0.1),
            new ExpenseTemplate("Comedy show tickets", 55, 95, 0.25),
            new ExpenseTemplate("Theme park visit", 120, 280, 0.1),
            new ExpenseTemplate("Laser tag", 38, 65, 0.3),
            new ExpenseTemplate("Karaoke night", 45, 85, 0.35),
            new ExpenseTemplate("Museum entry", 25, 45, 0.4),
            new ExpenseTemplate("Sporting event tickets", 65, 180, 0.2),
            new ExpenseTemplate("Pool hall", 25, 55, 0.4),
            new ExpenseTemplate("Board game cafe", 22, 45, 0.35),
            new ExpenseTemplate("Zoo tickets", 35, 65, 0.25),
            new ExpenseTemplate("Aquarium visit", 42, 75, 0.2),
            new ExpenseTemplate("Trivia night", 28, 55, 0.4),
            new ExpenseTemplate("Paint and sip class", 45, 75, 0.2)
        )),
        // TRANSPORTATION
        Map.entry("transportation", List.of(
            new ExpenseTemplate("Uber to airport", 38, 75, 0.3),
            new ExpenseTemplate("Lyft ride share", 18, 38, 0.8),
            new ExpenseTemplate("Gas for road trip", 45, 95, 0.5),
            new ExpenseTemplate("Parking fees", 12, 28, 0.9),
            new ExpenseTemplate("Train tickets", 28, 55, 0.6),
            new ExpenseTemplate("Toll fees", 8, 22, 0.7),
            new ExpenseTemplate("Uber to downtown", 15, 32, 0.9),
            new ExpenseTemplate("Airport shuttle", 25, 45, 0.3),
            new ExpenseTemplate("Car wash", 18, 38, 0.4),
            new ExpenseTemplate("Bus tickets", 12, 25, 0.5),
            new ExpenseTemplate("Subway passes", 18, 35, 0.6),
            new ExpenseTemplate("Bike rental", 15, 35, 0.4),
            new ExpenseTemplate("Scooter rental", 12, 28, 0.5)
        )),
        // TRAVEL
        Map.entry("travel", List.of(
            new ExpenseTemplate("Airbnb for weekend", 220, 480, 0.15),
            new ExpenseTemplate("Hotel booking", 160, 380, 0.2),
            new ExpenseTemplate("Flight tickets", 220, 550, 0.1),
            new ExpenseTemplate("Rental car", 85, 180, 0.2),
            new ExpenseTemplate("Beach house rental", 350, 650, 0.08),
            new ExpenseTemplate("Ski lodge stay", 280, 520, 0.06),
            new ExpenseTemplate("City hotel", 140, 280, 0.15),
            new ExpenseTemplate("Hostel booking", 55, 95, 0.1),
            new ExpenseTemplate("Cabin rental", 180, 350, 0.1),
            new ExpenseTemplate("Resort stay", 320, 580, 0.05),
            new ExpenseTemplate("Travel insurance", 45, 95, 0.1),
            new ExpenseTemplate("Airport lounge", 35, 65, 0.15),
            new ExpenseTemplate("Vacation activities", 65, 150, 0.2)
        )),
        // UTILITIES
        Map.entry("utilities", List.of(
            new ExpenseTemplate("Electricity bill", 85, 165, 0.25),
            new ExpenseTemplate("Internet bill", 55, 78, 0.25),
            new ExpenseTemplate("Water bill", 32, 58, 0.25),
            new ExpenseTemplate("Gas bill", 42, 95, 0.25),
            new ExpenseTemplate("Phone bill", 65, 120, 0.25),
            new ExpenseTemplate("Streaming services", 35, 65, 0.2),
            new ExpenseTemplate("Cloud storage", 12, 25, 0.1),
            new ExpenseTemplate("Cable TV", 75, 140, 0.15)
        )),
        // RENT & HOUSING
        Map.entry("rent", List.of(
            new ExpenseTemplate("Monthly rent share", 850, 1400, 0.25),
            new ExpenseTemplate("Security deposit share", 850, 1400, 0.02),
            new ExpenseTemplate("Move-in costs", 250, 450, 0.02),
            new ExpenseTemplate("Furniture share", 120, 280, 0.05)
        )),
        // SHOPPING
        Map.entry("shopping", List.of(
            new ExpenseTemplate("Amazon order", 32, 140, 0.7),
            new ExpenseTemplate("Target run", 42, 115, 0.6),
            new ExpenseTemplate("Household items", 28, 75, 0.8),
            new ExpenseTemplate("Birthday gift", 32, 95, 0.3),
            new ExpenseTemplate("Holiday gifts", 55, 180, 0.15),
            new ExpenseTemplate("Office supplies", 22, 55, 0.5),
            new ExpenseTemplate("Kitchen gadgets", 35, 95, 0.3),
            new ExpenseTemplate("Bathroom supplies", 25, 55, 0.6),
            new ExpenseTemplate("Decor items", 28, 85, 0.35),
            new ExpenseTemplate("Tech accessories", 22, 65, 0.4),
            new ExpenseTemplate("Cleaning supplies", 18, 42, 0.7),
            new ExpenseTemplate("Home improvement", 45, 120, 0.25),
            new ExpenseTemplate("Pet supplies", 28, 75, 0.4),
            new ExpenseTemplate("Book purchase", 15, 35, 0.5),
            new ExpenseTemplate("Electronics", 85, 280, 0.15),
            new ExpenseTemplate("Clothing share", 45, 120, 0.2)
        )),
        // HEALTHCARE & FITNESS
        Map.entry("healthcare", List.of(
            new ExpenseTemplate("Pharmacy run", 18, 55, 0.5),
            new ExpenseTemplate("Gym membership", 32, 75, 0.25),
            new ExpenseTemplate("Doctor copay", 25, 55, 0.2),
            new ExpenseTemplate("Vitamins and supplements", 28, 65, 0.35),
            new ExpenseTemplate("First aid supplies", 18, 42, 0.3),
            new ExpenseTemplate("Fitness class", 22, 45, 0.4),
            new ExpenseTemplate("Sports equipment", 35, 95, 0.2),
            new ExpenseTemplate("Yoga class pack", 85, 150, 0.1),
            new ExpenseTemplate("Personal trainer session", 55, 95, 0.15),
            new ExpenseTemplate("Eye exam", 45, 95, 0.1),
            new ExpenseTemplate("Dental cleaning", 75, 150, 0.1)
        )),
        // SUBSCRIPTIONS & SERVICES
        Map.entry("subscriptions", List.of(
            new ExpenseTemplate("Gym membership split", 25, 55, 0.25),
            new ExpenseTemplate("Meal kit subscription", 65, 120, 0.2),
            new ExpenseTemplate("Magazine subscription", 12, 28, 0.1),
            new ExpenseTemplate("Software license", 15, 45, 0.15),
            new ExpenseTemplate("App subscription", 8, 18, 0.2),
            new ExpenseTemplate("Wine club", 55, 95, 0.1),
            new ExpenseTemplate("Cleaning service", 85, 150, 0.15)
        )),
        // EVENTS & CELEBRATIONS
        Map.entry("events", List.of(
            new ExpenseTemplate("Birthday party expenses", 120, 280, 0.1),
            new ExpenseTemplate("Housewarming party", 85, 180, 0.05),
            new ExpenseTemplate("Game day food", 55, 120, 0.15),
            new ExpenseTemplate("Holiday party", 95, 220, 0.08),
            new ExpenseTemplate("Graduation celebration", 75, 160, 0.05),
            new ExpenseTemplate("Baby shower gifts", 55, 120, 0.08),
            new ExpenseTemplate("Wedding gift", 85, 180, 0.06),
            new ExpenseTemplate("Anniversary dinner", 95, 180, 0.1),
            new ExpenseTemplate("New Year's Eve party", 120, 280, 0.03),
            new ExpenseTemplate("Super Bowl party", 75, 150, 0.05),
            new ExpenseTemplate("BBQ cookout", 65, 140, 0.15)
        )),
        // EDUCATION & LEARNING
        Map.entry("education", List.of(
            new ExpenseTemplate("Online course", 85, 180, 0.1),
            new ExpenseTemplate("Textbook share", 45, 95, 0.15),
            new ExpenseTemplate("Workshop fee", 55, 120, 0.1),
            new ExpenseTemplate("Tutoring session", 45, 85, 0.15),
            new ExpenseTemplate("Study materials", 25, 55, 0.2),
            new ExpenseTemplate("Language course", 65, 120, 0.1),
            new ExpenseTemplate("Certification exam", 95, 220, 0.05)
        )),
        // PETS
        Map.entry("pets", List.of(
            new ExpenseTemplate("Pet food", 35, 75, 0.5),
            new ExpenseTemplate("Vet visit", 75, 180, 0.15),
            new ExpenseTemplate("Pet toys", 18, 45, 0.3),
            new ExpenseTemplate("Pet grooming", 45, 95, 0.2),
            new ExpenseTemplate("Pet sitting", 35, 75, 0.15),
            new ExpenseTemplate("Pet medication", 28, 65, 0.15)
        ))
    );

    // More diverse groups
    private static final List<GroupTemplate> GROUP_TEMPLATES = List.of(
        new GroupTemplate("Roommates", "home", List.of(0, 1, 4)),
        new GroupTemplate("Weekend Crew", "trip", List.of(0, 1, 2, 3)),
        new GroupTemplate("Work Lunch Gang", "other", List.of(1, 2, 3, 5)),
        new GroupTemplate("Movie Buddies", "other", List.of(0, 2, 5)),
        new GroupTemplate("Gym Partners", "other", List.of(0, 3, 4)),
        new GroupTemplate("Road Trip Squad", "trip", List.of(0, 1, 2, 4, 5)),
        new GroupTemplate("Book Club", "other", List.of(2, 3, 4, 5)),
        new GroupTemplate("Pet Parents", "other", List.of(0, 4, 5)),
        new GroupTemplate("Game Night Crew", "other", List.of(0, 1, 2, 3, 4, 5)),
        new GroupTemplate("Vacation House", "trip", List.of(0, 2, 3, 5))
    );

    @Override
    public void run(String... args) {
        if (!demoDataEnabled) {
            logger.info("Demo data seeding is disabled");
            return;
        }

        logger.info("🌱 Starting comprehensive demo data seeder...");

        try {
            // Step 1: Create demo users if they don't exist
            List<UserDto> demoUserDtos = createDemoUsers();
            
            if (demoUserDtos.size() < 2) {
                logger.warn("Not enough demo users created, skipping data seeding");
                return;
            }

            // Step 2: Create friend connections
            createFriendConnections(demoUserDtos);

            // Step 3: Create groups
            List<GroupDto> groups = createGroups(demoUserDtos);

            // Step 4: Create comprehensive sample expenses
            createSampleExpenses(demoUserDtos, groups);

            logger.info("✅ Demo data seeding completed successfully!");
            logger.info("📋 Demo accounts available:");
            for (DemoUser user : DEMO_USERS) {
                logger.info("   Email: {} | Password: {}", user.email, user.password);
            }

        } catch (Exception e) {
            logger.error("❌ Demo data seeding failed", e);
        }
    }

    private List<UserDto> createDemoUsers() {
        List<UserDto> createdUsers = new ArrayList<>();

        for (DemoUser demoUser : DEMO_USERS) {
            try {
                Optional<UserDto> existing = userDao.findByEmail(demoUser.email);
                
                if (existing.isPresent()) {
                    logger.debug("Demo user already exists: {}", demoUser.email);
                    createdUsers.add(existing.get());
                } else {
                    User user = new User();
                    user.setName(demoUser.name);
                    user.setEmail(demoUser.email);
                    user.setPassword(demoUser.password);
                    user.setVerified(true);
                    user.setFriendIds(new HashSet<>());
                    
                    userDetailsService.save(user);
                    
                    Optional<UserDto> saved = userDao.findByEmail(demoUser.email);
                    if (saved.isPresent()) {
                        createdUsers.add(saved.get());
                        logger.info("✅ Created demo user: {}", demoUser.email);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to create demo user: {}", demoUser.email, e);
            }
        }

        return createdUsers;
    }

    private void createFriendConnections(List<UserDto> users) {
        logger.info("👥 Setting up friend connections...");

        for (int i = 0; i < users.size(); i++) {
            UserDto user1 = users.get(i);
            Set<String> friendIds = user1.getFriendIds() != null ? new HashSet<>(user1.getFriendIds()) : new HashSet<>();
            boolean updated = false;

            for (int j = i + 1; j < users.size(); j++) {
                UserDto user2 = users.get(j);

                if (!friendIds.contains(user2.getId())) {
                    friendIds.add(user2.getId());
                    updated = true;

                    Set<String> user2FriendIds = user2.getFriendIds() != null ? new HashSet<>(user2.getFriendIds()) : new HashSet<>();
                    if (!user2FriendIds.contains(user1.getId())) {
                        user2FriendIds.add(user1.getId());
                        userDao.updateFriendIds(user2.getId(), user2FriendIds);
                    }

                    logger.debug("Connected friends: {} ↔ {}", user1.getName(), user2.getName());
                }
            }

            if (updated) {
                userDao.updateFriendIds(user1.getId(), friendIds);
            }
        }

        logger.info("✅ Friend connections established");
    }

    private List<GroupDto> createGroups(List<UserDto> users) {
        logger.info("🏠 Creating demo groups...");
        List<GroupDto> createdGroups = new ArrayList<>();

        for (GroupTemplate template : GROUP_TEMPLATES) {
            if (!template.memberIndices.stream().allMatch(idx -> idx < users.size())) {
                continue;
            }

            UserDto creator = users.get(template.memberIndices.get(0));
            
            List<GroupDto> existingGroups = groupDao.findByCreatorIdOrMemberId(creator.getId());
            boolean groupExists = existingGroups.stream()
                .anyMatch(g -> template.name.equals(g.getGroupName()));

            if (groupExists) {
                logger.debug("Group already exists: {}", template.name);
                existingGroups.stream()
                    .filter(g -> template.name.equals(g.getGroupName()))
                    .findFirst()
                    .ifPresent(createdGroups::add);
                continue;
            }

            GroupDto groupDto = new GroupDto();
            groupDto.setGroupName(template.name);
            groupDto.setGroupType(template.type);
            groupDto.setCreatorId(creator.getId());
            groupDto.setCreatorName(creator.getName());
            groupDto.setCreatedAt(LocalDateTime.now());

            List<GroupDto.GroupMemberDto> members = new ArrayList<>();
            for (int i = 1; i < template.memberIndices.size(); i++) {
                UserDto member = users.get(template.memberIndices.get(i));
                GroupDto.GroupMemberDto memberDto = new GroupDto.GroupMemberDto();
                memberDto.setId(member.getId());
                memberDto.setUsername(member.getName());
                memberDto.setEmail(member.getEmail());
                members.add(memberDto);
            }
            groupDto.setFriends(members);

            try {
                GroupDto saved = groupDao.save(groupDto);
                createdGroups.add(saved);
                logger.info("✅ Created group: {}", template.name);
            } catch (Exception e) {
                logger.error("Failed to create group: {}", template.name, e);
            }
        }

        return createdGroups;
    }

    private void createSampleExpenses(List<UserDto> users, List<GroupDto> groups) {
        logger.info("💰 Creating comprehensive sample expenses...");

        UserDto primaryUser = users.get(0);
        List<ExpenseDto> existingExpenses = expenseDao.findAllByUserInvolvement(
            primaryUser.getId(), Sort.by(Sort.Direction.DESC, "createdAt")
        );

        if (existingExpenses.size() >= 100) {
            logger.info("Demo user already has {} expenses, skipping expense generation", existingExpenses.size());
            return;
        }

        // Generate expenses for 6 months with realistic patterns
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(6);
        
        List<String> categories = new ArrayList<>(EXPENSE_TEMPLATES.keySet());
        Random random = new Random(42);
        
        int targetExpenses = 400; // More expenses for richer data
        int created = 0;

        // Track spending patterns for realism
        Map<DayOfWeek, Double> weekdayMultipliers = Map.of(
            DayOfWeek.MONDAY, 0.8,
            DayOfWeek.TUESDAY, 0.7,
            DayOfWeek.WEDNESDAY, 0.8,
            DayOfWeek.THURSDAY, 0.9,
            DayOfWeek.FRIDAY, 1.4,
            DayOfWeek.SATURDAY, 1.5,
            DayOfWeek.SUNDAY, 1.2
        );

        for (int i = 0; i < targetExpenses; i++) {
            try {
                // Pick random category with weight
                String category = selectWeightedCategory(categories, random);
                List<ExpenseTemplate> templates = EXPENSE_TEMPLATES.get(category);
                ExpenseTemplate template = selectWeightedTemplate(templates, random);

                // Generate date with weekday pattern consideration
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
                LocalDate expenseDate = startDate.plusDays(random.nextInt((int) daysBetween + 1));
                
                // Skip some weekdays to make weekends more active
                double dayMultiplier = weekdayMultipliers.get(expenseDate.getDayOfWeek());
                if (random.nextDouble() > dayMultiplier && random.nextDouble() > 0.3) {
                    continue; // Skip this iteration to create fewer weekday expenses
                }

                // Generate amount with some variance
                double baseAmount = template.minAmount + random.nextDouble() * (template.maxAmount - template.minAmount);
                // Add occasional larger expenses
                if (random.nextDouble() < 0.05) {
                    baseAmount *= (1.5 + random.nextDouble());
                }
                double amount = Math.round(baseAmount * 100.0) / 100.0;

                // Higher group expense probability for certain categories
                boolean isGroupExpense = random.nextDouble() < getGroupProbability(category) && !groups.isEmpty();
                
                List<UserDto> participants;
                GroupDto group = null;

                if (isGroupExpense) {
                    group = groups.get(random.nextInt(groups.size()));
                    participants = getGroupMembers(group, users);
                } else {
                    // Variable participant count based on category
                    int maxParticipants = getMaxParticipants(category, users.size());
                    int numParticipants = 2 + random.nextInt(maxParticipants - 1);
                    List<UserDto> shuffled = new ArrayList<>(users);
                    Collections.shuffle(shuffled, random);
                    participants = shuffled.subList(0, Math.min(numParticipants, shuffled.size()));
                }

                if (participants.size() < 2) continue;

                // Pick payer - slightly favor the primary user
                UserDto payer;
                if (random.nextDouble() < 0.35) {
                    payer = primaryUser;
                    if (!participants.contains(payer)) {
                        participants.set(0, payer);
                    }
                } else {
                    payer = participants.get(random.nextInt(participants.size()));
                }

                // Create expense DTO
                ExpenseDto expenseDto = new ExpenseDto();
                expenseDto.setDescription(template.description);
                expenseDto.setCategory(category);
                expenseDto.setTotalAmount(amount);
                expenseDto.setDate(expenseDate);
                
                // Add varied notes
                expenseDto.setNotes(generateNote(category, random));
                
                expenseDto.setSplitMethod(selectSplitMethod(random));
                expenseDto.setCreatorId(payer.getId());
                expenseDto.setCreatorName(payer.getName());
                
                // Realistic time of day based on category
                int hour = getRealisticHour(category, random);
                expenseDto.setCreatedAt(expenseDate.atStartOfDay().plusHours(hour).plusMinutes(random.nextInt(60)));
                expenseDto.setUpdatedAt(expenseDto.getCreatedAt());

                if (group != null) {
                    expenseDto.setGroupId(group.getId());
                    expenseDto.setGroupName(group.getGroupName());
                }

                // Set payers
                ExpenseDto.PayerDto payerDto = new ExpenseDto.PayerDto();
                payerDto.setUserId(payer.getId());
                payerDto.setPayerName(payer.getName());
                payerDto.setPaidAmount(amount);
                expenseDto.setPayers(List.of(payerDto));

                // Determine if this expense is settled (30% chance)
                boolean isSettled = random.nextDouble() < 0.3;
                expenseDto.setPersonal(false);
                expenseDto.setSettled(isSettled);
                
                // Set participants with chosen split method - pass isSettled flag
                List<ExpenseDto.ParticipantDto> participantDtos = 
                    createParticipants(participants, payer, amount, expenseDto.getSplitMethod(), random, isSettled);
                expenseDto.setParticipants(participantDtos);

                // Save expense
                expenseDao.save(expenseDto);
                created++;

                if (created % 100 == 0) {
                    logger.info("Created {} expenses...", created);
                }

            } catch (Exception e) {
                logger.debug("Failed to create expense: {}", e.getMessage());
            }
        }

        logger.info("✅ Created {} comprehensive sample expenses", created);
        
        // Create personal expenses for each user
        createPersonalExpenses(users, random);
    }
    
    private void createPersonalExpenses(List<UserDto> users, Random random) {
        logger.info("💼 Creating personal expenses for demo users...");
        
        // Personal expense templates
        List<ExpenseTemplate> personalTemplates = List.of(
            new ExpenseTemplate("Coffee run", 5, 12, 1.5),
            new ExpenseTemplate("Snack purchase", 4, 15, 1.2),
            new ExpenseTemplate("Personal subscription", 8, 25, 0.8),
            new ExpenseTemplate("Solo lunch", 12, 28, 1.3),
            new ExpenseTemplate("Dry cleaning", 15, 35, 0.6),
            new ExpenseTemplate("Haircut", 25, 55, 0.4),
            new ExpenseTemplate("Personal care items", 10, 35, 0.9),
            new ExpenseTemplate("Book purchase", 12, 30, 0.5),
            new ExpenseTemplate("App purchase", 2, 15, 0.7),
            new ExpenseTemplate("Personal workout class", 15, 35, 0.5),
            new ExpenseTemplate("Personal medical copay", 20, 50, 0.3),
            new ExpenseTemplate("Personal gift", 20, 60, 0.4),
            new ExpenseTemplate("Solo movie", 12, 22, 0.6),
            new ExpenseTemplate("Personal transport", 5, 25, 1.0),
            new ExpenseTemplate("Personal meal delivery", 15, 40, 0.8)
        );
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(4);
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        
        int totalPersonalExpenses = 0;
        
        for (UserDto user : users) {
            // Create 15-25 personal expenses per user
            int numPersonalExpenses = 15 + random.nextInt(11);
            
            for (int i = 0; i < numPersonalExpenses; i++) {
                try {
                    ExpenseTemplate template = personalTemplates.get(random.nextInt(personalTemplates.size()));
                    LocalDate expenseDate = startDate.plusDays(random.nextInt((int) daysBetween + 1));
                    double amount = template.minAmount + random.nextDouble() * (template.maxAmount - template.minAmount);
                    amount = Math.round(amount * 100.0) / 100.0;
                    
                    ExpenseDto expenseDto = new ExpenseDto();
                    expenseDto.setDescription(template.description);
                    expenseDto.setCategory(getPersonalCategory(template.description));
                    expenseDto.setTotalAmount(amount);
                    expenseDto.setDate(expenseDate);
                    expenseDto.setSplitMethod(com.splitzy.splitzy.model.SplitMethod.EQUALLY);
                    expenseDto.setCreatorId(user.getId());
                    expenseDto.setCreatorName(user.getName());
                    
                    int hour = 8 + random.nextInt(14);
                    expenseDto.setCreatedAt(expenseDate.atStartOfDay().plusHours(hour).plusMinutes(random.nextInt(60)));
                    expenseDto.setUpdatedAt(expenseDto.getCreatedAt());
                    
                    // Mark as personal expense
                    expenseDto.setPersonal(true);
                    expenseDto.setSettled(random.nextDouble() < 0.6); // 60% of personal expenses are marked as paid
                    
                    // Payer is only the user
                    ExpenseDto.PayerDto payerDto = new ExpenseDto.PayerDto();
                    payerDto.setUserId(user.getId());
                    payerDto.setPayerName(user.getName());
                    payerDto.setPaidAmount(amount);
                    expenseDto.setPayers(List.of(payerDto));
                    
                    // Only one participant (the user)
                    ExpenseDto.ParticipantDto participantDto = new ExpenseDto.ParticipantDto();
                    participantDto.setUserId(user.getId());
                    participantDto.setPartName(user.getName());
                    participantDto.setShare(amount);
                    participantDto.setPaid(amount);
                    participantDto.setNet(0);
                    participantDto.setFullySettled(expenseDto.isSettled());
                    participantDto.setSettledAmount(expenseDto.isSettled() ? amount : 0);
                    expenseDto.setParticipants(List.of(participantDto));
                    
                    expenseDao.save(expenseDto);
                    totalPersonalExpenses++;
                    
                } catch (Exception e) {
                    logger.debug("Failed to create personal expense: {}", e.getMessage());
                }
            }
        }
        
        logger.info("✅ Created {} personal expenses across all demo users", totalPersonalExpenses);
    }
    
    private String getPersonalCategory(String description) {
        if (description.contains("Coffee") || description.contains("lunch") || description.contains("Snack") || description.contains("meal")) {
            return "food";
        } else if (description.contains("subscription") || description.contains("App")) {
            return "subscriptions";
        } else if (description.contains("care") || description.contains("Haircut") || description.contains("medical") || description.contains("Dry cleaning")) {
            return "healthcare";
        } else if (description.contains("Book") || description.contains("workout") || description.contains("class")) {
            return "education";
        } else if (description.contains("movie") || description.contains("gift")) {
            return "entertainment";
        } else if (description.contains("transport")) {
            return "transportation";
        }
        return "shopping";
    }

    private String selectWeightedCategory(List<String> categories, Random random) {
        // Weight categories by frequency
        Map<String, Double> weights = Map.ofEntries(
            Map.entry("food", 2.5),
            Map.entry("groceries", 1.5),
            Map.entry("entertainment", 1.5),
            Map.entry("transportation", 1.2),
            Map.entry("travel", 0.4),
            Map.entry("utilities", 0.4),
            Map.entry("rent", 0.2),
            Map.entry("shopping", 1.3),
            Map.entry("healthcare", 0.6),
            Map.entry("subscriptions", 0.3),
            Map.entry("events", 0.4),
            Map.entry("education", 0.3),
            Map.entry("pets", 0.4)
        );
        
        double totalWeight = weights.values().stream().mapToDouble(d -> d).sum();
        double roll = random.nextDouble() * totalWeight;
        double cumulative = 0;
        
        for (String cat : categories) {
            cumulative += weights.getOrDefault(cat, 1.0);
            if (roll <= cumulative) {
                return cat;
            }
        }
        return categories.get(random.nextInt(categories.size()));
    }

    private ExpenseTemplate selectWeightedTemplate(List<ExpenseTemplate> templates, Random random) {
        double totalWeight = templates.stream().mapToDouble(t -> t.weight).sum();
        double roll = random.nextDouble() * totalWeight;
        double cumulative = 0;
        
        for (ExpenseTemplate t : templates) {
            cumulative += t.weight;
            if (roll <= cumulative) {
                return t;
            }
        }
        return templates.get(random.nextInt(templates.size()));
    }

    private double getGroupProbability(String category) {
        return switch (category) {
            case "rent", "utilities" -> 0.8;
            case "travel", "events" -> 0.7;
            case "entertainment", "food" -> 0.5;
            case "groceries" -> 0.4;
            default -> 0.3;
        };
    }

    private int getMaxParticipants(String category, int maxUsers) {
        return switch (category) {
            case "events", "travel" -> Math.min(6, maxUsers);
            case "rent", "utilities" -> Math.min(4, maxUsers);
            case "entertainment", "food" -> Math.min(5, maxUsers);
            default -> Math.min(3, maxUsers);
        };
    }

    private int getRealisticHour(String category, Random random) {
        return switch (category) {
            case "food" -> 11 + random.nextInt(11); // 11am - 10pm
            case "groceries" -> 10 + random.nextInt(10); // 10am - 8pm
            case "entertainment" -> 14 + random.nextInt(9); // 2pm - 11pm
            case "transportation" -> 7 + random.nextInt(14); // 7am - 9pm
            case "utilities", "rent", "subscriptions" -> 9 + random.nextInt(4); // 9am - 1pm
            case "healthcare" -> 8 + random.nextInt(8); // 8am - 4pm
            default -> 9 + random.nextInt(12); // 9am - 9pm
        };
    }

    private String generateNote(String category, Random random) {
        if (random.nextDouble() > 0.3) return null; // 70% no notes
        
        List<String> notes = switch (category) {
            case "food" -> List.of("Great food!", "Will go again", "Good service", "A bit pricey but worth it");
            case "groceries" -> List.of("Weekly essentials", "Stocking up", "On sale items");
            case "travel" -> List.of("Great trip!", "Perfect location", "Amazing views", "Memorable weekend");
            case "entertainment" -> List.of("Fun night!", "Highly recommend", "Great time with friends");
            case "utilities" -> List.of("Monthly bill", "Due by end of month");
            case "events" -> List.of("Great celebration!", "Amazing party", "Unforgettable night");
            default -> List.of("Shared expense", "Split equally");
        };
        return notes.get(random.nextInt(notes.size()));
    }

    private com.splitzy.splitzy.model.SplitMethod selectSplitMethod(Random random) {
        double roll = random.nextDouble();
        if (roll < 0.7) return com.splitzy.splitzy.model.SplitMethod.EQUALLY;
        if (roll < 0.9) return com.splitzy.splitzy.model.SplitMethod.PERCENTAGE;
        return com.splitzy.splitzy.model.SplitMethod.EXACT_AMOUNTS;
    }

    private List<ExpenseDto.ParticipantDto> createParticipants(
            List<UserDto> participants, UserDto payer, double amount, 
            com.splitzy.splitzy.model.SplitMethod splitMethod, Random random, boolean isExpenseSettled) {
        
        List<ExpenseDto.ParticipantDto> participantDtos = new ArrayList<>();
        double totalShares = 0;

        for (int j = 0; j < participants.size(); j++) {
            UserDto participant = participants.get(j);
            ExpenseDto.ParticipantDto pDto = new ExpenseDto.ParticipantDto();
            pDto.setUserId(participant.getId());
            pDto.setPartName(participant.getName());
            
            double share;
            if (j == participants.size() - 1) {
                // Last person gets remainder
                share = Math.round((amount - totalShares) * 100.0) / 100.0;
            } else if (splitMethod == com.splitzy.splitzy.model.SplitMethod.EQUALLY) {
                share = Math.round((amount / participants.size()) * 100.0) / 100.0;
            } else {
                // Variable shares for percentage/amount split
                double baseShare = amount / participants.size();
                double variance = baseShare * 0.3 * (random.nextDouble() - 0.5);
                share = Math.round((baseShare + variance) * 100.0) / 100.0;
            }
            
            pDto.setShare(Math.max(share, 0.01)); // Minimum 1 cent
            pDto.setPaid(participant.getId().equals(payer.getId()) ? amount : 0);
            pDto.setNet(pDto.getPaid() - pDto.getShare());
            
            // Set settlement status
            if (isExpenseSettled) {
                // If expense is settled, all participants are fully settled
                pDto.setFullySettled(true);
                pDto.setSettledAmount(pDto.getShare());
            } else {
                // Random partial settlements for unsettled expenses (20% chance)
                if (random.nextDouble() < 0.2 && pDto.getNet() < 0) {
                    // Partial payment - pay 30-80% of what they owe
                    double partialPercent = 0.3 + random.nextDouble() * 0.5;
                    double owedAmount = Math.abs(pDto.getNet());
                    pDto.setSettledAmount(Math.round(owedAmount * partialPercent * 100.0) / 100.0);
                    pDto.setFullySettled(false);
                } else {
                    pDto.setSettledAmount(0);
                    pDto.setFullySettled(false);
                }
            }
            
            participantDtos.add(pDto);
            totalShares += pDto.getShare();
        }
        
        return participantDtos;
    }

    private List<UserDto> getGroupMembers(GroupDto group, List<UserDto> allUsers) {
        List<UserDto> members = new ArrayList<>();
        
        allUsers.stream()
            .filter(u -> u.getId().equals(group.getCreatorId()))
            .findFirst()
            .ifPresent(members::add);

        if (group.getFriends() != null) {
            for (GroupDto.GroupMemberDto member : group.getFriends()) {
                allUsers.stream()
                    .filter(u -> u.getId().equals(member.getId()))
                    .findFirst()
                    .ifPresent(members::add);
            }
        }

        return members;
    }

    // Helper classes
    private static class DemoUser {
        final String name;
        final String email;
        final String password;

        DemoUser(String name, String email, String password) {
            this.name = name;
            this.email = email;
            this.password = password;
        }
    }

    private static class ExpenseTemplate {
        final String description;
        final double minAmount;
        final double maxAmount;
        final double weight; // Frequency weight

        ExpenseTemplate(String description, double minAmount, double maxAmount) {
            this(description, minAmount, maxAmount, 1.0);
        }

        ExpenseTemplate(String description, double minAmount, double maxAmount, double weight) {
            this.description = description;
            this.minAmount = minAmount;
            this.maxAmount = maxAmount;
            this.weight = weight;
        }
    }

    private static class GroupTemplate {
        final String name;
        final String type;
        final List<Integer> memberIndices;

        GroupTemplate(String name, String type, List<Integer> memberIndices) {
            this.name = name;
            this.type = type;
            this.memberIndices = memberIndices;
        }
    }
}
