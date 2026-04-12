import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state } from "./state.js";

// ─── Module state ───────────────────────────────────────────────────────────
let currentConversationId = null;
let currentMessages = []; // {role, content} array for API
let isLoading = false;
let allConversations = []; // cached conversation list
let _bound = false; // prevent double-binding

// ─── Helpers ─────────────────────────────────────────────────────────────────
function el(id) {
  return document.getElementById(id);
}

function getAvatarInitial() {
  const user = state.currentUser;
  if (!user) return "U";
  const name = user.displayName || user.email || "U";
  return name.charAt(0).toUpperCase();
}

function isToday(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
}

function scrollToBottom() {
  const container = el("chatbot-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

// ─── Conversation list rendering ─────────────────────────────────────────────
function renderConversationList(conversations, filterText = "") {
  const container = el("chatbot-history");
  if (!container) return;

  const filtered = filterText
    ? conversations.filter((c) =>
        (c.title || "New chat").toLowerCase().includes(filterText.toLowerCase())
      )
    : conversations;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="chatbot-history-empty">${filterText ? "No results found." : "No chats yet."}</p>`;
    return;
  }

  const todayItems = filtered.filter((c) => isToday(c.updatedAt || c.createdAt));
  const olderItems = filtered.filter((c) => !isToday(c.updatedAt || c.createdAt));

  let html = "";

  if (todayItems.length > 0) {
    html += `<div class="chatbot-history-group"><p class="chatbot-history-label">Today</p>`;
    todayItems.forEach((c) => {
      const isActive = c.id === currentConversationId;
      html += `
        <button class="chatbot-history-item button-reset${isActive ? " active" : ""}" data-conv-id="${c.id}">
          <span class="chatbot-history-title">${escapeHtml(c.title || "New chat")}</span>
          <button class="chatbot-history-menu button-reset" data-menu-conv-id="${c.id}" title="Options" tabindex="-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </button>`;
    });
    html += `</div>`;
  }

  if (olderItems.length > 0) {
    html += `<div class="chatbot-history-group"><p class="chatbot-history-label">Older</p>`;
    olderItems.forEach((c) => {
      const isActive = c.id === currentConversationId;
      html += `
        <button class="chatbot-history-item button-reset${isActive ? " active" : ""}" data-conv-id="${c.id}">
          <span class="chatbot-history-title">${escapeHtml(c.title || "New chat")}</span>
          <button class="chatbot-history-menu button-reset" data-menu-conv-id="${c.id}" title="Options" tabindex="-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </button>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

// ─── Load conversations from Firestore ───────────────────────────────────────
async function loadConversations() {
  if (!state.currentUser || !state.firestore) return;
  try {
    const uid = state.currentUser.uid;
    const q = query(
      collection(state.firestore, "users", uid, "conversations"),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    allConversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderConversationList(allConversations);
  } catch {
    // Silently fail — user may not have any conversations yet
    renderConversationList([]);
  }
}

// ─── Select and load a conversation ──────────────────────────────────────────
async function selectConversation(id) {
  if (!state.currentUser || !state.firestore) return;
  currentConversationId = id;
  currentMessages = [];

  // Update active state in list
  renderConversationList(allConversations);

  // Hide welcome, show messages
  const welcome = el("chatbot-welcome");
  const messages = el("chatbot-messages");
  if (welcome) welcome.style.display = "none";
  if (messages) {
    messages.style.display = "flex";
    messages.innerHTML = `<div class="chatbot-thinking"><span></span><span></span><span></span></div>`;
  }

  try {
    const uid = state.currentUser.uid;
    const snap = await getDoc(doc(state.firestore, "users", uid, "conversations", id));
    if (!snap.exists()) return;
    const data = snap.data();
    const storedMessages = data.messages || [];

    if (messages) messages.innerHTML = "";
    storedMessages.forEach((m) => {
      currentMessages.push({ role: m.role, content: m.content });
      appendMessage(m.role, m.content);
    });
    scrollToBottom();
  } catch {
    if (messages) messages.innerHTML = `<p style="color:var(--gray-400);text-align:center;padding:24px">Could not load conversation.</p>`;
  }
}

// ─── Start a new chat ─────────────────────────────────────────────────────────
function startNewChat() {
  currentConversationId = null;
  currentMessages = [];

  const welcome = el("chatbot-welcome");
  const messages = el("chatbot-messages");
  if (welcome) welcome.style.display = "";
  if (messages) {
    messages.style.display = "none";
    messages.innerHTML = "";
  }

  const input = el("chatbot-input");
  if (input) {
    input.value = "";
    input.style.height = "auto";
  }

  renderConversationList(allConversations);
}

// ─── Escape HTML ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Render a message bubble ──────────────────────────────────────────────────
function appendMessage(role, content, isError = false) {
  const container = el("chatbot-messages");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = `chatbot-message chatbot-message--${role}`;

  if (role === "user") {
    const initial = getAvatarInitial();
    wrapper.innerHTML = `
      <div class="chatbot-avatar chatbot-avatar--user">${escapeHtml(initial)}</div>
      <div class="chatbot-message-content">${escapeHtml(content)}</div>`;
  } else {
    const contentHtml = isError
      ? `<div class="chatbot-error-badge">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           ${escapeHtml(content)}
         </div>`
      : `<div class="chatbot-message-content">${formatMessageContent(content)}</div>`;

    wrapper.innerHTML = `
      <div class="chatbot-avatar chatbot-avatar--ai">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white"/></svg>
      </div>
      <div class="chatbot-message-body">
        ${contentHtml}
        ${!isError ? `<div class="chatbot-message-actions">
          <button class="chatbot-action-btn button-reset" title="Copy" data-copy="${escapeHtml(content)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>` : ""}
      </div>`;
  }

  container.appendChild(wrapper);
  return wrapper;
}

// Format AI message content (newlines to <br>, basic markdown bold)
function formatMessageContent(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
function showThinking() {
  const container = el("chatbot-messages");
  if (!container) return null;
  const div = document.createElement("div");
  div.className = "chatbot-message chatbot-message--assistant";
  div.id = "chatbot-thinking-indicator";
  div.innerHTML = `
    <div class="chatbot-avatar chatbot-avatar--ai">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="white"/></svg>
    </div>
    <div class="chatbot-thinking"><span></span><span></span><span></span></div>`;
  container.appendChild(div);
  scrollToBottom();
  return div;
}

// ─── Send a message ───────────────────────────────────────────────────────────
async function sendMessage(text) {
  if (!text.trim() || isLoading || !state.currentUser) return;

  isLoading = true;
  const sendBtn = el("chatbot-send-btn");
  const input = el("chatbot-input");
  const welcome = el("chatbot-welcome");
  const messagesEl = el("chatbot-messages");

  if (sendBtn) sendBtn.disabled = true;
  if (input) {
    input.value = "";
    input.style.height = "auto";
    input.disabled = true;
  }

  // Show messages area, hide welcome
  if (welcome) welcome.style.display = "none";
  if (messagesEl) messagesEl.style.display = "flex";

  // Add user message to UI
  appendMessage("user", text);
  currentMessages.push({ role: "user", content: text });
  scrollToBottom();

  // Show thinking indicator
  const thinkingEl = showThinking();

  try {
    const uid = state.currentUser.uid;

    // Create conversation in Firestore if this is the first message
    if (!currentConversationId && state.firestore) {
      const title = text.length > 45 ? text.slice(0, 45) + "…" : text;
      try {
        const docRef = await addDoc(
          collection(state.firestore, "users", uid, "conversations"),
          {
            title,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            messages: [{ role: "user", content: text }],
          }
        );
        currentConversationId = docRef.id;
      } catch {
        // Non-fatal — continue without persistence
      }
    } else if (currentConversationId && state.firestore) {
      // Append user message to existing conversation
      try {
        await updateDoc(
          doc(state.firestore, "users", uid, "conversations", currentConversationId),
          {
            messages: arrayUnion({ role: "user", content: text }),
            updatedAt: serverTimestamp(),
          }
        );
      } catch {
        // Non-fatal
      }
    }

    // Call the API
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: currentMessages }),
    });

    const data = await res.json();

    // Remove thinking indicator
    if (thinkingEl) thinkingEl.remove();

    if (!res.ok) {
      appendMessage("assistant", data.message || "Something went wrong. Please try again.", true);
    } else {
      const reply = data.message;
      currentMessages.push({ role: "assistant", content: reply });
      appendMessage("assistant", reply);

      // Save AI response to Firestore
      if (currentConversationId && state.firestore) {
        try {
          await updateDoc(
            doc(state.firestore, "users", uid, "conversations", currentConversationId),
            {
              messages: arrayUnion({ role: "assistant", content: reply }),
              updatedAt: serverTimestamp(),
            }
          );
        } catch {
          // Non-fatal
        }
      }
    }
  } catch {
    if (thinkingEl) thinkingEl.remove();
    appendMessage("assistant", "Could not reach the AI service. Please check your connection and try again.", true);
  }

  scrollToBottom();
  isLoading = false;
  if (input) input.disabled = false;
  if (input && input.value.trim().length > 0 && sendBtn) sendBtn.disabled = false;
  if (input) input.focus();

  // Refresh conversation list
  await loadConversations();
}

// ─── Sidebar toggle ───────────────────────────────────────────────────────────
function toggleSidebar() {
  const shell = el("dash-view-ai");
  if (shell) shell.classList.toggle("sidebar-hidden");
}

// ─── Main init function ───────────────────────────────────────────────────────
export async function initChatbot() {
  if (_bound) {
    // Re-entering — just refresh the conversation list
    await loadConversations();
    return;
  }
  _bound = true;

  // Collapse sidebar by default on mobile
  if (window.innerWidth <= 640) {
    const shell = el("dash-view-ai");
    if (shell) shell.classList.add("sidebar-hidden");
  }

  // Bind new chat button
  el("chatbot-new-btn")?.addEventListener("click", () => {
    startNewChat();
  });

  // Bind sidebar toggle
  el("chatbot-toggle-btn")?.addEventListener("click", () => {
    toggleSidebar();
  });

  // Bind send button
  el("chatbot-send-btn")?.addEventListener("click", () => {
    const input = el("chatbot-input");
    sendMessage(input?.value || "");
  });

  // Bind textarea (Enter to send, Shift+Enter for newline, auto-resize)
  const textarea = el("chatbot-input");
  if (textarea) {
    textarea.addEventListener("input", () => {
      autoResize(textarea);
      const sendBtn = el("chatbot-send-btn");
      if (sendBtn) sendBtn.disabled = textarea.value.trim().length === 0;
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && textarea.value.trim().length > 0) {
          sendMessage(textarea.value);
        }
      }
    });
  }

  // Bind search
  el("chatbot-search")?.addEventListener("input", (e) => {
    renderConversationList(allConversations, e.target.value);
  });

  // Bind conversation list clicks (delegated)
  el("chatbot-history")?.addEventListener("click", (e) => {
    // Ignore the "..." menu button itself
    const menuBtn = e.target.closest(".chatbot-history-menu");
    if (menuBtn) {
      e.stopPropagation();
      return;
    }
    const item = e.target.closest(".chatbot-history-item");
    if (item) {
      const id = item.dataset.convId;
      if (id && id !== currentConversationId) {
        selectConversation(id);
      }
    }
  });

  // Bind suggestion chips
  el("chatbot-welcome")?.addEventListener("click", (e) => {
    const suggestion = e.target.closest(".chatbot-suggestion");
    if (suggestion) {
      const prompt = suggestion.dataset.prompt;
      if (prompt) sendMessage(prompt);
    }
  });

  // Bind copy buttons (delegated on messages container)
  el("chatbot-messages")?.addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const text = copyBtn.dataset.copy;
      navigator.clipboard?.writeText(text).catch(() => {});
      // Brief visual feedback
      const icon = copyBtn.querySelector("svg");
      if (icon) {
        copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 1500);
      }
    }
  });

  // Initial state: show welcome
  startNewChat();

  // Load conversation history
  await loadConversations();
}
