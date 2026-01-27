/**
 * Analytics Dashboard Regression Tests
 *
 * These tests verify that analytics KPIs calculate correctly based on expense data.
 * Run with: npm test -- --testPathPattern=AnalyticsDashboard
 */

// Mock expense data for testing
const createMockExpense = (overrides = {}) => ({
  id: `exp-${Math.random().toString(36).substr(2, 9)}`,
  description: 'Test Expense',
  category: 'food',
  totalAmount: 100,
  date: new Date().toISOString(),
  isSettled: false,
  isPersonal: false,
  participants: [
    { userId: 'user-1', partName: 'Test User', paid: 100, share: 50, net: 50, settledAmount: 0, fullySettled: false },
    { userId: 'user-2', partName: 'Friend', paid: 0, share: 50, net: -50, settledAmount: 0, fullySettled: false }
  ],
  payers: [{ userId: 'user-1', payerName: 'Test User', paidAmount: 100 }],
  ...overrides
});

const MY_USER_ID = 'user-1';

// ========== HELPER FUNCTIONS (extracted from AnalyticsDashboard) ==========

/**
 * Calculate total spent by the user
 */
const calculateTotalSpent = (expenses, userId) => {
  return expenses.reduce((total, exp) => {
    const myPart = exp.participants?.find(p => p.userId === userId);
    return total + (myPart?.share || 0);
  }, 0);
};

/**
 * Calculate settlement score (percentage of settled expenses)
 */
const calculateSettlementScore = (expenses, userId) => {
  let settled = 0;
  let total = 0;

  expenses.forEach(exp => {
    const myPart = exp.participants?.find(p => p.userId === userId);
    if (myPart) {
      total++;
      if (exp.isSettled || myPart.fullySettled || Math.abs(myPart.net || 0) < 0.01) {
        settled++;
      }
    }
  });

  return {
    percentage: total > 0 ? (settled / total) * 100 : 100,
    settled,
    total
  };
};

/**
 * Calculate category breakdown
 */
const calculateCategoryBreakdown = (expenses, userId) => {
  const categories = {};

  expenses.forEach(exp => {
    const cat = exp.category || 'other';
    const myPart = exp.participants?.find(p => p.userId === userId);
    if (myPart) {
      if (!categories[cat]) {
        categories[cat] = { category: cat, amount: 0, count: 0 };
      }
      categories[cat].amount += myPart.share || 0;
      categories[cat].count++;
    }
  });

  return Object.values(categories).sort((a, b) => b.amount - a.amount);
};

/**
 * Calculate personal vs shared breakdown
 */
const calculateExpenseTypeBreakdown = (expenses, userId) => {
  let personal = { count: 0, amount: 0 };
  let shared = { count: 0, amount: 0 };

  expenses.forEach(exp => {
    const myPart = exp.participants?.find(p => p.userId === userId);
    const share = myPart?.share || 0;

    if (exp.isPersonal) {
      personal.count++;
      personal.amount += share;
    } else {
      shared.count++;
      shared.amount += share;
    }
  });

  const total = personal.amount + shared.amount;
  return {
    personal: { ...personal, percentage: total > 0 ? (personal.amount / total) * 100 : 0 },
    shared: { ...shared, percentage: total > 0 ? (shared.amount / total) * 100 : 0 },
    total
  };
};

/**
 * Calculate payment status
 */
const calculatePaymentStatus = (expenses, userId) => {
  let settled = { count: 0, amount: 0 };
  let unsettled = { count: 0, amount: 0 };
  let partial = { count: 0, amount: 0 };

  expenses.forEach(exp => {
    const myPart = exp.participants?.find(p => p.userId === userId);
    if (!myPart) return;

    const share = myPart.share || 0;

    if (exp.isSettled || myPart.fullySettled) {
      settled.count++;
      settled.amount += share;
    } else if (myPart.settledAmount > 0 && myPart.settledAmount < share) {
      partial.count++;
      partial.amount += share;
    } else {
      unsettled.count++;
      unsettled.amount += share;
    }
  });

  return { settled, unsettled, partial };
};

// ========== TESTS ==========

describe('Analytics KPI Calculations', () => {

  describe('Total Spent', () => {
    test('calculates total correctly for single expense', () => {
      const expenses = [createMockExpense()];
      const total = calculateTotalSpent(expenses, MY_USER_ID);
      expect(total).toBe(50); // User's share is 50
    });

    test('calculates total correctly for multiple expenses', () => {
      const expenses = [
        createMockExpense({ participants: [
          { userId: MY_USER_ID, share: 30 },
          { userId: 'user-2', share: 70 }
        ]}),
        createMockExpense({ participants: [
          { userId: MY_USER_ID, share: 20 },
          { userId: 'user-2', share: 80 }
        ]})
      ];
      const total = calculateTotalSpent(expenses, MY_USER_ID);
      expect(total).toBe(50); // 30 + 20
    });

    test('returns 0 for empty expenses', () => {
      const total = calculateTotalSpent([], MY_USER_ID);
      expect(total).toBe(0);
    });
  });

  describe('Settlement Score', () => {
    test('returns 100% when all expenses are settled', () => {
      const expenses = [
        createMockExpense({ isSettled: true }),
        createMockExpense({ participants: [
          { userId: MY_USER_ID, fullySettled: true, share: 50 }
        ]})
      ];
      const score = calculateSettlementScore(expenses, MY_USER_ID);
      expect(score.percentage).toBe(100);
    });

    test('returns 0% when no expenses are settled', () => {
      const expenses = [
        createMockExpense(),
        createMockExpense()
      ];
      const score = calculateSettlementScore(expenses, MY_USER_ID);
      expect(score.percentage).toBe(0);
    });

    test('returns 50% when half are settled', () => {
      const expenses = [
        createMockExpense({ isSettled: true }),
        createMockExpense({ isSettled: false })
      ];
      const score = calculateSettlementScore(expenses, MY_USER_ID);
      expect(score.percentage).toBe(50);
    });

    test('treats net=0 as settled', () => {
      const expenses = [
        createMockExpense({ participants: [
          { userId: MY_USER_ID, net: 0, share: 50 }
        ]})
      ];
      const score = calculateSettlementScore(expenses, MY_USER_ID);
      expect(score.percentage).toBe(100);
    });
  });

  describe('Category Breakdown', () => {
    test('groups expenses by category', () => {
      const expenses = [
        createMockExpense({ category: 'food', participants: [{ userId: MY_USER_ID, share: 30 }] }),
        createMockExpense({ category: 'food', participants: [{ userId: MY_USER_ID, share: 20 }] }),
        createMockExpense({ category: 'transport', participants: [{ userId: MY_USER_ID, share: 60 }] })
      ];
      const breakdown = calculateCategoryBreakdown(expenses, MY_USER_ID);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].category).toBe('transport'); // Highest amount first (60)
      expect(breakdown[0].amount).toBe(60);
      expect(breakdown[1].category).toBe('food');
      expect(breakdown[1].amount).toBe(50); // 30 + 20
      expect(breakdown[1].count).toBe(2);
    });

    test('uses "other" for missing category', () => {
      const expenses = [
        createMockExpense({ category: null, participants: [{ userId: MY_USER_ID, share: 25 }] })
      ];
      const breakdown = calculateCategoryBreakdown(expenses, MY_USER_ID);
      expect(breakdown[0].category).toBe('other');
    });
  });

  describe('Personal vs Shared Breakdown', () => {
    test('correctly separates personal and shared expenses', () => {
      const expenses = [
        createMockExpense({ isPersonal: true, participants: [{ userId: MY_USER_ID, share: 100 }] }),
        createMockExpense({ isPersonal: false, participants: [{ userId: MY_USER_ID, share: 50 }] }),
        createMockExpense({ isPersonal: false, participants: [{ userId: MY_USER_ID, share: 50 }] })
      ];
      const breakdown = calculateExpenseTypeBreakdown(expenses, MY_USER_ID);

      expect(breakdown.personal.count).toBe(1);
      expect(breakdown.personal.amount).toBe(100);
      expect(breakdown.personal.percentage).toBe(50); // 100 / 200

      expect(breakdown.shared.count).toBe(2);
      expect(breakdown.shared.amount).toBe(100); // 50 + 50
      expect(breakdown.shared.percentage).toBe(50);
    });
  });

  describe('Payment Status', () => {
    test('categorizes settled, partial, and unsettled correctly', () => {
      const expenses = [
        // Fully settled
        createMockExpense({ isSettled: true, participants: [
          { userId: MY_USER_ID, share: 100, settledAmount: 100, fullySettled: true }
        ]}),
        // Partial settlement
        createMockExpense({ isSettled: false, participants: [
          { userId: MY_USER_ID, share: 100, settledAmount: 50, fullySettled: false }
        ]}),
        // Unsettled
        createMockExpense({ isSettled: false, participants: [
          { userId: MY_USER_ID, share: 100, settledAmount: 0, fullySettled: false }
        ]})
      ];
      const status = calculatePaymentStatus(expenses, MY_USER_ID);

      expect(status.settled.count).toBe(1);
      expect(status.settled.amount).toBe(100);

      expect(status.partial.count).toBe(1);
      expect(status.partial.amount).toBe(100);

      expect(status.unsettled.count).toBe(1);
      expect(status.unsettled.amount).toBe(100);
    });
  });

  describe('Partial Settlement Display', () => {
    test('calculates remaining balance after partial settlement', () => {
      const expense = createMockExpense({
        participants: [
          { userId: MY_USER_ID, share: 100, paid: 0, net: -100, settledAmount: 40, fullySettled: false },
          { userId: 'user-2', share: 0, paid: 100, net: 100, settledAmount: 0, fullySettled: false }
        ]
      });

      const myPart = expense.participants.find(p => p.userId === MY_USER_ID);
      const remainingAmount = Math.abs((myPart.share || 0) - (myPart.settledAmount || 0));

      expect(remainingAmount).toBe(60); // 100 - 40 = 60 still owed
    });
  });
});

describe('Analytics KPI Impact Tests', () => {

  describe('When creating a new expense', () => {
    test('total spent should increase', () => {
      const before = [createMockExpense({ participants: [{ userId: MY_USER_ID, share: 50 }] })];
      const after = [
        ...before,
        createMockExpense({ participants: [{ userId: MY_USER_ID, share: 30 }] })
      ];

      const totalBefore = calculateTotalSpent(before, MY_USER_ID);
      const totalAfter = calculateTotalSpent(after, MY_USER_ID);

      expect(totalAfter).toBe(totalBefore + 30);
    });

    test('category breakdown should update', () => {
      const before = [createMockExpense({ category: 'food', participants: [{ userId: MY_USER_ID, share: 50 }] })];
      const after = [
        ...before,
        createMockExpense({ category: 'transport', participants: [{ userId: MY_USER_ID, share: 100 }] })
      ];

      const breakdownBefore = calculateCategoryBreakdown(before, MY_USER_ID);
      const breakdownAfter = calculateCategoryBreakdown(after, MY_USER_ID);

      expect(breakdownBefore).toHaveLength(1);
      expect(breakdownAfter).toHaveLength(2);
    });

    test('personal expense should update personal count', () => {
      const before = [createMockExpense({ isPersonal: false })];
      const after = [
        ...before,
        createMockExpense({ isPersonal: true, participants: [{ userId: MY_USER_ID, share: 50 }] })
      ];

      const typeBefore = calculateExpenseTypeBreakdown(before, MY_USER_ID);
      const typeAfter = calculateExpenseTypeBreakdown(after, MY_USER_ID);

      expect(typeAfter.personal.count).toBe(typeBefore.personal.count + 1);
    });
  });

  describe('When settling an expense', () => {
    test('settlement score should increase', () => {
      const before = [
        createMockExpense({ isSettled: false }),
        createMockExpense({ isSettled: false })
      ];

      const after = [
        createMockExpense({ isSettled: true }), // First expense now settled
        createMockExpense({ isSettled: false })
      ];

      const scoreBefore = calculateSettlementScore(before, MY_USER_ID);
      const scoreAfter = calculateSettlementScore(after, MY_USER_ID);

      expect(scoreAfter.percentage).toBeGreaterThan(scoreBefore.percentage);
    });

    test('payment status settled count should increase', () => {
      const before = [createMockExpense({ isSettled: false })];
      const after = [createMockExpense({ isSettled: true })];

      const statusBefore = calculatePaymentStatus(before, MY_USER_ID);
      const statusAfter = calculatePaymentStatus(after, MY_USER_ID);

      expect(statusBefore.settled.count).toBe(0);
      expect(statusAfter.settled.count).toBe(1);
    });
  });

  describe('When making a partial payment', () => {
    test('should move from unsettled to partial', () => {
      const before = [createMockExpense({
        isSettled: false,
        participants: [{ userId: MY_USER_ID, share: 100, settledAmount: 0, fullySettled: false }]
      })];

      const after = [createMockExpense({
        isSettled: false,
        participants: [{ userId: MY_USER_ID, share: 100, settledAmount: 50, fullySettled: false }]
      })];

      const statusBefore = calculatePaymentStatus(before, MY_USER_ID);
      const statusAfter = calculatePaymentStatus(after, MY_USER_ID);

      expect(statusBefore.unsettled.count).toBe(1);
      expect(statusBefore.partial.count).toBe(0);

      expect(statusAfter.unsettled.count).toBe(0);
      expect(statusAfter.partial.count).toBe(1);
    });
  });

  describe('When deleting an expense', () => {
    test('total spent should decrease', () => {
      const before = [
        createMockExpense({ id: 'exp-1', participants: [{ userId: MY_USER_ID, share: 50 }] }),
        createMockExpense({ id: 'exp-2', participants: [{ userId: MY_USER_ID, share: 30 }] })
      ];

      const after = before.filter(exp => exp.id !== 'exp-2'); // Delete second expense

      const totalBefore = calculateTotalSpent(before, MY_USER_ID);
      const totalAfter = calculateTotalSpent(after, MY_USER_ID);

      expect(totalAfter).toBe(totalBefore - 30);
    });

    test('category breakdown should update when category becomes empty', () => {
      const before = [
        createMockExpense({ id: 'exp-1', category: 'food', participants: [{ userId: MY_USER_ID, share: 50 }] }),
        createMockExpense({ id: 'exp-2', category: 'transport', participants: [{ userId: MY_USER_ID, share: 30 }] })
      ];

      const after = before.filter(exp => exp.id !== 'exp-2'); // Delete transport expense

      const breakdownAfter = calculateCategoryBreakdown(after, MY_USER_ID);

      expect(breakdownAfter).toHaveLength(1);
      expect(breakdownAfter[0].category).toBe('food');
    });
  });
});
