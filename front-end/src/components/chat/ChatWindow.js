import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiX, FiSend, FiMessageCircle, FiMinus, FiDollarSign, FiUsers, FiCornerUpLeft } from "react-icons/fi";
import socket from "../../socket";

// Category icons for expense display
const CATEGORY_ICONS = {
  general: "💰", food: "🍽️", groceries: "🛒", transport: "🚗",
  entertainment: "🎬", shopping: "🛍️", travel: "✈️", utilities: "💡",
  rent: "🏠", healthcare: "🏥", education: "📚", subscriptions: "📱",
  gifts: "🎁", sports: "⚽", pets: "🐾", coffee: "☕", games: "🎮", 
  music: "🎵", other: "📝"
};

function ChatWindow({ thread, minimized, rightPosition = 20, onClose, onMinimize, onExpand }) {
  const token = localStorage.getItem("splitzyToken");
  const myUserId = localStorage.getItem("myUserId");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, senderName, content, isExpense }
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Format time nicely - handle UTC from backend
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    let date;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z')) {
      date = new Date(dateStr + 'Z');
    } else {
      date = new Date(dateStr);
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24 && date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + 
           " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    if (!thread) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/chat/messages/${thread.id}?page=0&size=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Reverse to show oldest at top, newest at bottom (chat order)
        setMessages(res.data.reverse());
        // Mark as read
        axios.post(
          `${process.env.REACT_APP_API_URL}/chat/read/${thread.id}`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      } catch (e) {
        console.error("Failed to load messages", e);
      } finally {
        setLoading(false);
        // Scroll to bottom after messages render
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 100);
      }
    };
    fetchMessages();
  }, [thread, token]);

  // Socket live updates
  useEffect(() => {
    if (!thread) return;
    const roomId = thread.id;
    socket.emit("joinThread", roomId);

    const handleNewMessage = (msg) => {
      if (msg.threadId === roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    socket.on("chat:new_message", handleNewMessage);

    return () => {
      socket.emit("leaveThread", roomId);
      socket.off("chat:new_message", handleNewMessage);
    };
  }, [thread]);
  
  // RELIABILITY: Periodic sync every 10 seconds to catch missed socket events
  useEffect(() => {
    if (!thread || minimized) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/chat/messages/${thread.id}?page=0&size=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newMessages = res.data.reverse();
        setMessages((prev) => {
          // Only update if there are new messages
          if (newMessages.length !== prev.length) {
            console.log('[ChatWindow] Periodic sync found new messages');
            return newMessages;
          }
          return prev;
        });
      } catch (e) {
        console.error('[ChatWindow] Periodic sync failed', e);
      }
    }, 10000); // 10 seconds for chat
    
    return () => clearInterval(syncInterval);
  }, [thread, token, minimized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      // Use setTimeout to ensure DOM has rendered
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (!minimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [minimized]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const messageContent = input.trim();
    const replyToId = replyTo?.id || null;
    setInput("");
    setReplyTo(null);
    setSending(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/messages/${thread.id}`,
        { content: messageContent, replyToId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      console.error("Failed to send", e);
      setInput(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (msg) => {
    const isExpense = msg.messageType === "EXPENSE_SHARE";
    setReplyTo({
      id: msg.id,
      senderName: msg.senderId === myUserId ? "yourself" : msg.senderName,
      content: isExpense ? "💰 Shared an expense" : (msg.content?.substring(0, 80) + (msg.content?.length > 80 ? "..." : "")),
      isExpense
    });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const title = thread?.displayName || (thread?.type === "GROUP" ? "Group" : "Chat");
  const initial = title ? title[0].toUpperCase() : "C";
  const isGroup = thread?.type === "GROUP";

  // Minimized pill at bottom
  if (minimized) {
    return (
      <div 
        className="chat-pill" 
        style={{ right: `${rightPosition}px` }}
        onClick={onExpand}
      >
        <div className="avatar-xs">{initial}</div>
        <span className="chat-pill-title">{title}</span>
        <button 
          className="chat-pill-close" 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close"
        >
          <FiX size={12} />
        </button>
      </div>
    );
  }

  // Full chat window
  return (
    <div className="chat-window" style={{ right: `${rightPosition}px` }}>
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="avatar-sm">{initial}</div>
          <div className="chat-header-text">
            <h4>{title}</h4>
            <span className="chat-status">{isGroup ? "Group chat" : "Direct message"}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={onMinimize} title="Minimize">
            <FiMinus size={16} />
          </button>
          <button className="icon-btn close" onClick={onClose} title="Close">
            <FiX size={16} />
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={listRef}>
        {loading && (
          <div className="chat-empty">
            <div className="chat-empty-icon loading">●●●</div>
            <p>Loading messages...</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon"><FiMessageCircle size={32} /></div>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        )}
        {!loading &&
          messages.map((m) => {
            const isMe = m.senderId === myUserId;
            const isExpenseShare = m.messageType === "EXPENSE_SHARE";
            const hasReply = m.replyToId && m.replyToContent;
            
            // Parse expense snapshot if it's an expense share
            let expenseData = null;
            if (isExpenseShare && m.expenseSnapshot) {
              try {
                expenseData = JSON.parse(m.expenseSnapshot);
              } catch (e) {
                console.error("Failed to parse expense snapshot", e);
              }
            }

            return (
              <div key={m.id} className={`chat-bubble ${isMe ? "me" : ""} ${isExpenseShare ? "expense-share" : ""}`}>
                <div className="chat-meta">
                  <span className="chat-sender">{isMe ? "You" : (m.senderName || "User")}</span>
                  <span className="chat-time">{formatTime(m.createdAt)}</span>
                  <button 
                    className="chat-reply-btn" 
                    onClick={() => handleReply(m)}
                    title="Reply"
                  >
                    <FiCornerUpLeft size={12} />
                  </button>
                </div>

                {/* Show replied-to message preview */}
                {hasReply && (
                  <div className="chat-reply-preview">
                    <span className="reply-to-name">{m.replyToSenderName}</span>
                    <span className="reply-to-content">{m.replyToContent}</span>
                  </div>
                )}
                
                {isExpenseShare && expenseData ? (
                  <div className="chat-expense-card">
                    <div className="chat-expense-header">
                      <span className="chat-expense-icon">
                        {CATEGORY_ICONS[expenseData.category] || "💰"}
                      </span>
                      <div className="chat-expense-title">
                        <h5>{expenseData.description}</h5>
                        <span className="chat-expense-amount">
                          ${expenseData.totalAmount?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="chat-expense-details">
                      <div className="chat-expense-detail">
                        <FiDollarSign size={12} />
                        <span>{expenseData.splitMethod?.replace("_", " ") || "Split"}</span>
                      </div>
                      <div className="chat-expense-detail">
                        <FiUsers size={12} />
                        <span>{expenseData.participants?.length || 0} people</span>
                      </div>
                    </div>
                    {m.content && m.content !== "Shared an expense" && (
                      <div className="chat-expense-message">{m.content}</div>
                    )}
                  </div>
                ) : (
                  <div className="chat-text">{m.content}</div>
                )}
              </div>
            );
          })}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="chat-reply-bar">
          <div className="reply-bar-content">
            <FiCornerUpLeft size={14} />
            <span className="reply-bar-label">Replying to {replyTo.senderName}</span>
            <span className="reply-bar-text">{replyTo.content}</span>
          </div>
          <button className="reply-bar-close" onClick={cancelReply}>
            <FiX size={14} />
          </button>
        </div>
      )}

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="input modern"
          placeholder={replyTo ? "Type your reply..." : "Type a message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) sendMessage();
            if (e.key === "Escape" && replyTo) cancelReply();
          }}
        />
        <button 
          className="chip primary" 
          onClick={sendMessage} 
          disabled={sending || !input.trim()}
          title="Send message"
        >
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
