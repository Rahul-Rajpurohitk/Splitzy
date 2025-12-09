import { configureStore } from '@reduxjs/toolkit';
import socketReducer from './features/socket/socketSlice';
import expenseReducer from './features/expense/expenseSlice';

export const store = configureStore({
  reducer: {
    socket: socketReducer, // Add other slices here if needed
    expense: expenseReducer, // <-- add our expense slice
  },
});
