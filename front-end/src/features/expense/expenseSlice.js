// src/features/expense/expenseSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// 1) Async Thunk to fetch all expenses for the user with optional filters
export const fetchExpensesThunk = createAsyncThunk(
  "expense/fetchAll",
  async ({ userId, token, filters = {} }, thunkAPI) => {
    try {
      if (!userId) throw new Error("No userId provided");

      // Build params with optional filters
      const params = { userId, filter: "ALL" };

      // Add optional filters if provided
      if (filters.owingFilter && filters.owingFilter !== 'all') {
        params.owingFilter = filters.owingFilter;
      }
      if (filters.settledFilter && filters.settledFilter !== 'all') {
        params.settledFilter = filters.settledFilter;
      }
      if (filters.friendFilter?.id) {
        params.friendId = filters.friendFilter.id;
      }
      if (filters.groupFilter?.id) {
        params.groupId = filters.groupFilter.id;
      }
      // New filters: typeFilter (personal/shared) and partialFilter
      if (filters.typeFilter && filters.typeFilter !== 'all') {
        params.typeFilter = filters.typeFilter;
      }
      if (filters.partialFilter && filters.partialFilter !== 'all') {
        params.partialFilter = filters.partialFilter;
      }
      // Category and date range filters
      if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        params.categoryFilter = filters.categoryFilter;
      }
      if (filters.dateRangeFilter && filters.dateRangeFilter !== 'all') {
        params.dateRangeFilter = filters.dateRangeFilter;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/user-expenses`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data; // on success, this becomes the action.payload
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 2) Async Thunk to fetch a single expense
export const fetchSingleExpenseThunk = createAsyncThunk(
  "expense/fetchSingle",
  async ({ expenseId, userId, token }, thunkAPI) => {
    try {
      if (!userId || !expenseId) throw new Error("Missing userId or expenseId");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/${expenseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // We'll return just one expense; you might store it separately or in the same list
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 3) Async Thunk to create a new expense
export const createExpenseThunk = createAsyncThunk(
  "expense/create",
  async ({ payload, token }, thunkAPI) => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/home/expenses`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 4) New Async Thunk: Fetch expenses filtered by friend
export const fetchExpensesForFriendThunk = createAsyncThunk(
  "expense/fetchForFriend",
  async ({ userId, friendId, token }, thunkAPI) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/friend`,
        {
          params: { userId, friendId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 5) New Async Thunk: Fetch expenses filtered by group
export const fetchExpensesForGroupThunk = createAsyncThunk(
  "expense/fetchForGroup",
  async ({ groupId, token }, thunkAPI) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/group`,
        {
          params: { groupId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 6) Background sync thunk - silently updates without triggering loading state
// Only updates Redux state if data actually changed (compares by JSON stringification)
// Supports filters to maintain current filtered view
export const backgroundSyncExpensesThunk = createAsyncThunk(
  "expense/backgroundSync",
  async ({ userId, token, filters = {} }, thunkAPI) => {
    try {
      if (!userId) throw new Error("No userId provided");

      // Build params with filters (same as fetchExpensesThunk)
      const params = { userId, filter: "ALL" };
      if (filters.owingFilter && filters.owingFilter !== 'all') {
        params.owingFilter = filters.owingFilter;
      }
      if (filters.settledFilter && filters.settledFilter !== 'all') {
        params.settledFilter = filters.settledFilter;
      }
      if (filters.friendFilter?.id) {
        params.friendId = filters.friendFilter.id;
      }
      if (filters.groupFilter?.id) {
        params.groupId = filters.groupFilter.id;
      }
      if (filters.typeFilter && filters.typeFilter !== 'all') {
        params.typeFilter = filters.typeFilter;
      }
      if (filters.partialFilter && filters.partialFilter !== 'all') {
        params.partialFilter = filters.partialFilter;
      }
      if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        params.categoryFilter = filters.categoryFilter;
      }
      if (filters.dateRangeFilter && filters.dateRangeFilter !== 'all') {
        params.dateRangeFilter = filters.dateRangeFilter;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/user-expenses`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Get current state to compare
      const currentList = thunkAPI.getState().expense.list;
      const newData = res.data;

      // Quick comparison - check if any expense was added, removed, or updated
      const currentIds = new Set(currentList.map(e => e.id));
      const newIds = new Set(newData.map(e => e.id));

      // Check for added or removed expenses
      const hasAddedOrRemoved = currentList.length !== newData.length ||
        [...currentIds].some(id => !newIds.has(id)) ||
        [...newIds].some(id => !currentIds.has(id));

      // Check for updated expenses by comparing updatedAt timestamps
      const hasUpdated = !hasAddedOrRemoved && newData.some(newExp => {
        const currentExp = currentList.find(e => e.id === newExp.id);
        return currentExp && currentExp.updatedAt !== newExp.updatedAt;
      });

      const hasChanges = hasAddedOrRemoved || hasUpdated;

      // Return data with flag indicating if update is needed
      return { data: newData, hasChanges };
    } catch (err) {
      // Silently fail for background sync - don't disrupt user
      console.warn('[BackgroundSync] Failed:', err.message);
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);


// 4) Initial state
const initialState = {
  list: [],             // all fetched expenses
  selectedExpenseId: null,
  status: "idle",       // "idle" | "loading" | "succeeded" | "failed"
  error: null,
  activeFilter: null,  // null or { filterType: "friend" or "group", filterEntity: { ... } }
};

// 5) Create the slice
const expenseSlice = createSlice({
  name: "expense",
  initialState,
  reducers: {
    setSelectedExpenseId(state, action) {
      state.selectedExpenseId = action.payload;
    },
    clearSelectedExpenseId(state) {
      state.selectedExpenseId = null;
    },
    // New reducers for expense filtering
    setExpenseFilter(state, action) {
      // action.payload: { filterType, filterEntity }
      state.activeFilter = action.payload;
    },
    clearExpenseFilter(state) {
      state.activeFilter = null;
    },
  },
  extraReducers: (builder) => {
    // fetchExpensesThunk
    builder
      .addCase(fetchExpensesThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchExpensesThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload; // the array of expenses
      })
      .addCase(fetchExpensesThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch expenses";
      });

    // fetchSingleExpenseThunk
    builder
      .addCase(fetchSingleExpenseThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSingleExpenseThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Option A: replace the entire list with [one expense]
        state.list = [action.payload];
      })
      .addCase(fetchSingleExpenseThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch single expense";
      });

    // createExpenseThunk
    builder
      .addCase(createExpenseThunk.pending, (state) => {
        // optional
      })
      .addCase(createExpenseThunk.fulfilled, (state, action) => {
        // we can optionally push the new expense into state.list
        // or refetch in the component
        state.list.push(action.payload);
      })
      .addCase(createExpenseThunk.rejected, (state, action) => {
        state.error = action.payload || "Failed to create expense";
      });

      // Handle new friend filtering thunk
    builder
      .addCase(fetchExpensesForFriendThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchExpensesForFriendThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchExpensesForFriendThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch friend expenses";
      });
    // Handle new group filtering thunk
    builder
      .addCase(fetchExpensesForGroupThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchExpensesForGroupThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchExpensesForGroupThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch group expenses";
      });

    // Background sync - only updates if data changed, no loading state
    builder
      .addCase(backgroundSyncExpensesThunk.pending, (state) => {
        // Do NOT set loading state - this is a silent background sync
      })
      .addCase(backgroundSyncExpensesThunk.fulfilled, (state, action) => {
        // Only update list if data actually changed
        if (action.payload?.hasChanges) {
          console.log('[BackgroundSync] Data changed, updating state silently');
          state.list = action.payload.data;
          // Keep status as-is (don't change to "succeeded" to avoid re-renders)
        }
      })
      .addCase(backgroundSyncExpensesThunk.rejected, (state, action) => {
        // Silently ignore errors for background sync
        console.warn('[BackgroundSync] Silently ignoring error:', action.payload);
      });

  },
});

export const {
  setSelectedExpenseId,
  clearSelectedExpenseId,
  setExpenseFilter,
  clearExpenseFilter,
} = expenseSlice.actions;


export default expenseSlice.reducer;
