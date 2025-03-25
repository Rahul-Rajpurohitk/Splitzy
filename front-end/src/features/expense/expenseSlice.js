// src/features/expense/expenseSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// 1) Async Thunk to fetch all expenses for the user
export const fetchExpensesThunk = createAsyncThunk(
  "expense/fetchAll",
  async ({ userId, token }, thunkAPI) => {
    try {
      if (!userId) throw new Error("No userId provided");
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/home/expenses/user-expenses`,
        {
          params: { userId, filter: "ALL" },
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

// 4) Initial state
const initialState = {
  list: [],             // all fetched expenses
  selectedExpenseId: null,
  status: "idle",       // "idle" | "loading" | "succeeded" | "failed"
  error: null,
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
  },
});

export const {
  setSelectedExpenseId,
  clearSelectedExpenseId,
} = expenseSlice.actions;


export default expenseSlice.reducer;
