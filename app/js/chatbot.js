import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state } from "./state.js";

// ─── Module-level state ───────────────────────────────────────────────────────
let _currentConvId = null;   // Firestore doc ID of active conversation
let _messages = [];          // { role: 'user'|'assistant', content: string }[]
let _isLoading = false;      // prevents double-send during API call
let _eventsBound = false;    // bind events only once per page session
let _allConversations = [];  // sidebar cache: { id, title, updatedAt, createdAt }
let _searchQuery = "";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function _getInitial() {
  const name = state.currentUser?.displayName || state.currentUser?.email || "?";
  return name[0].toUpperCase();
}

function _scrollToBottom() {
  const m = el("chat-messages");
  if (m) m.scrollTop = m.scrollHeight;
}

function _showWelcome(show) {
  const w = el("chat-welcome");
  if (!w) return;
  w.style.display = show ? "" : "none";
}

function _updateSendButton() {
  const btn = el("chat-send-btn");
  const ta = el("chat-textarea");
  if (btn) btn.disabled = _isLoading || !ta?.value.trim();
}

// ─── Plan context ─────────────────────────────────────────────────────────────
function _getPlanContext() {
  const userDoc = state.dashboardContext?.userDoc;
  if (!userDoc?.plan) return null;
  const plan = userDoc.plan;
  const profile = userDoc.planProfile || {};
  return {
    summary: plan.summary || null,
    dailyCalories: plan.dailyCalories || null,
    dailyMacros: plan.dailyMacros || null,
    workoutSplit: profile.workoutSplit || null,
    workoutFrequency: profile.workoutFrequency || null,
    workoutDuration: profile.workoutDuration || null,
    dietaryPreference: profile.dietaryPreference || null,
  };
}

// ─── Render: conversation list ────────────────────────────────────────────────
function _renderConversationList() {
  const listEl = el("chat-history");
  if (!listEl) return;

  const q = _searchQuery.toLowerCase();
  const filtered = q
    ? _allConversations.filter((c) => c.title?.toLowerCase().includes(q))
    : _allConversations;

  if (!filtered.length) {
    listEl.innerHTML = `<p style="font-size:13px;color:var(--gray-400);padding:12px 10px">No conversations yet.</p>`;
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const today = [];
  const older = [];
  filtered.forEach((c) => {
    const ts = c.updatedAt?.toDate ? c.updatedAt.toDate() : new Date((c.updatedAt?.seconds ?? 0) * 1000);
    if (ts >= todayStart) today.push(c);
    else older.push(c);
  });

  let html = "";
  if (today.length) {
    html += `<div class="chat-history-group"><p class="chat-history-label">Today</p>`;
    html += today.map(_convItemHTML).join("");
    html += `</div>`;
  }
  if (older.length) {
    html += `<div class="chat-history-group"><p class="chat-history-label">Older</p>`;
    html += older.map(_convItemHTML).join("");
    html += `</div>`;
  }

  listEl.innerHTML = html;
}

function _convItemHTML(conv) {
  const active = conv.id === _currentConvId ? " active" : "";
  return `<button class="chat-conv-item${active}" data-conv-id="${conv.id}"><span class="chat-conv-title">${_escapeHtml(conv.title || "Untitled chat")}</span></button>`;
}

// ─── Render: messages ─────────────────────────────────────────────────────────
function _appendMessageBubble(role, content) {
  const msgEl = el("chat-messages");
  if (!msgEl) return;

  const isUser = role === "user";
  const isError = role === "error";
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg--${isUser ? "user" : isError ? "error" : "ai"}`;

  if (isUser) {
    div.innerHTML = `
      <div class="chat-msg-avatar">${_escapeHtml(_getInitial())}</div>
      <div class="chat-msg-bubble">${_escapeHtml(content)}</div>`;
  } else {
    div.innerHTML = `
      <div class="chat-msg-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="chat-msg-bubble">${_escapeHtml(content)}</div>`;
  }

  msgEl.appendChild(div);
  _scrollToBottom();
}

function _renderAllMessages() {
  const msgEl = el("chat-messages");
  if (!msgEl) return;
  // Clear existing messages but preserve the welcome element
  const welcome = el("chat-welcome");
  msgEl.innerHTML = "";
  if (welcome) msgEl.appendChild(welcome);

  if (_messages.length === 0) {
    _showWelcome(true);
    return;
  }
  _showWelcome(false);
  _messages.forEach((m) => _appendMessageBubble(m.role === "user" ? "user" : "ai", m.content));
  _scrollToBottom();
}

function _appendTypingIndicator() {
  const id = "chat-typing-" + Date.now();
  const msgEl = el("chat-messages");
  if (!msgEl) return id;
  const div = document.createElement("div");
  div.id = id;
  div.className = "chat-msg chat-msg--ai";
  div.innerHTML = `
    <div class="chat-msg-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div class="chat-msg-bubble">
      <div class="chat-typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgEl.appendChild(div);
  _scrollToBottom();
  return id;
}

function _removeTypingIndicator(id) {
  el(id)?.remove();
}

// ─── Firestore operations ─────────────────────────────────────────────────────
async function _loadConversations() {
  if (!state.currentUser || !state.firestore) return;
  try {
    const ref = collection(state.firestore, "users", state.currentUser.uid, "conversations");
    const snap = await getDocs(query(ref, orderBy("updatedAt", "desc")));
    _allConversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _renderConversationList();
  } catch {
    // Non-fatal: sidebar stays empty
  }
}

async function _loadConversation(convId) {
  if (!state.currentUser || !state.firestore) return;
  try {
    const ref = doc(state.firestore, "users", state.currentUser.uid, "conversations", convId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    _currentConvId = convId;
    _messages = snap.data().messages || [];
    _renderAllMessages();
    _renderConversationList();
  } catch {
    // Silently ignore load errors
  }
}

async function _createConversation(firstMessage) {
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
  const ref = await addDoc(
    collection(state.firestore, "users", state.currentUser.uid, "conversations"),
    {
      title,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  // Add to local cache immediately (with approximate timestamp for grouping)
  _allConversations.unshift({ id: ref.id, title, updatedAt: { seconds: Date.now() / 1000 }, createdAt: { seconds: Date.now() / 1000 } });
  _renderConversationList();
  return ref.id;
}

async function _persistMessages() {
  if (!_currentConvId || !state.currentUser || !state.firestore) return;
  const ref = doc(state.firestore, "users", state.currentUser.uid, "conversations", _currentConvId);
  await updateDoc(ref, {
    messages: _messages.map((m) => ({ role: m.role, content: m.content })),
    updatedAt: serverTimestamp(),
  });
  // Update local cache
  const cached = _allConversations.find((c) => c.id === _currentConvId);
  if (cached) cached.updatedAt = { seconds: Date.now() / 1000 };
}

// ─── Send message ─────────────────────────────────────────────────────────────
async function _sendMessage(text) {
  if (_isLoading || !text.trim()) return;
  _isLoading = true;
  _updateSendButton();

  const userText = text.trim();
  _messages.push({ role: "user", content: userText });
  _appendMessageBubble("user", userText);
  _showWelcome(false);

  const typingId = _appendTypingIndicator();

  try {
    // Create conversation doc on first message
    if (!_currentConvId) {
      _currentConvId = await _createConversation(userText);
    }

    const token = await state.currentUser.getIdToken();
    const planContext = _getPlanContext();

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: _messages.slice(-20),
        planContext,
      }),
    });

    _removeTypingIndicator(typingId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data.message || "Could not reach the AI service.";
      const isCredits = /credit|quota|billing/i.test(errMsg);
      _appendMessageBubble("error", isCredits ? "Not enough credits" : errMsg);
      _messages.pop(); // remove optimistic user message from memory on failure
    } else {
      const data = await res.json();
      const reply = data.message || "Sorry, I could not generate a response.";
      _messages.push({ role: "assistant", content: reply });
      _appendMessageBubble("ai", reply);
      await _persistMessages();
      // Refresh sidebar to show updated timestamp order
      await _loadConversations();
    }
  } catch {
    _removeTypingIndicator(typingId);
    _appendMessageBubble("error", "Something went wrong. Please try again.");
    _messages.pop();
  } finally {
    _isLoading = false;
    _updateSendButton();
    _scrollToBottom();
  }
}

// ─── New conversation ─────────────────────────────────────────────────────────
function _startNewConversation() {
  _currentConvId = null;
  _messages = [];
  const msgEl = el("chat-messages");
  if (msgEl) {
    const welcome = el("chat-welcome");
    msgEl.innerHTML = "";
    if (welcome) msgEl.appendChild(welcome);
  }
  _showWelcome(true);
  _renderConversationList();
  const ta = el("chat-textarea");
  if (ta) { ta.value = ""; ta.style.height = ""; }
  _updateSendButton();
}

// ─── Event bindings ───────────────────────────────────────────────────────────
function _bindEvents() {
  if (_eventsBound) return;
  _eventsBound = true;

  // New chat
  el("chat-new-btn")?.addEventListener("click", _startNewConversation);

  // Toggle left sidebar panel
  el("chat-toggle-sidebar")?.addEventListener("click", () => {
    el("chat-sidebar")?.classList.toggle("collapsed");
  });

  // Send button
  el("chat-send-btn")?.addEventListener("click", () => {
    const ta = el("chat-textarea");
    if (!ta?.value.trim()) return;
    const val = ta.value;
    ta.value = "";
    ta.style.height = "";
    _updateSendButton();
    _sendMessage(val);
  });

  // Textarea: Enter to send, Shift+Enter for newline, auto-resize
  el("chat-textarea")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const ta = e.target;
      if (ta.value.trim() && !_isLoading) {
        const val = ta.value;
        ta.value = "";
        ta.style.height = "";
        _updateSendButton();
        _sendMessage(val);
      }
    }
  });

  el("chat-textarea")?.addEventListener("input", (e) => {
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    _updateSendButton();
  });

  // Suggestion chips (delegated)
  el("chat-suggestions")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chat-suggestion-chip");
    if (!chip) return;
    const text = chip.dataset.suggestion;
    if (text) _sendMessage(text);
  });

  // Conversation list (delegated)
  el("chat-history")?.addEventListener("click", (e) => {
    const item = e.target.closest(".chat-conv-item");
    if (!item) return;
    const convId = item.dataset.convId;
    if (convId && convId !== _currentConvId) _loadConversation(convId);
  });

  // Search
  el("chat-search-input")?.addEventListener("input", (e) => {
    _searchQuery = e.target.value;
    _renderConversationList();
  });
}

// ─── Public entry point ───────────────────────────────────────────────────────
export function initChatView() {
  _bindEvents();
  _loadConversations();
  // If no active conversation, show welcome screen
  if (!_currentConvId) {
    _showWelcome(true);
  } else {
    // Re-render the active conversation (user navigated away and back)
    _renderAllMessages();
  }
  _updateSendButton();
}
