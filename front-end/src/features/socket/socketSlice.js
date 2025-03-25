// src/features/socket/socketSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connected: false,
  lastEvent: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setConnected(state, action) {
      state.connected = action.payload;
    },
    setLastEvent(state, action) {
      state.lastEvent = action.payload;
    },
  },
});

export const { setConnected, setLastEvent } = socketSlice.actions;
export default socketSlice.reducer;
