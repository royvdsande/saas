import { state } from "./state.js";
import { els } from "./elements.js";
import { setStatus, setLoadingState } from "./utils.js";

// Conversation history (role/content pairs)
const messages = [];

export function renderChatMessage(role, content) {
  if (!els.aiChatMessages) return;
  const div = document.createElement("div");
  div.className = `ai-message ai-message--${role}`;
  const inner = document.createElement("div");
  inner.className = "ai-message-content";
  inner.textContent = content;
  div.appendChild(inner);
  els.aiChatMessages.appendChild(div);
  els.aiChatMessages.scrollTop = els.aiChatMessages.scrollHeight;
}

export async function sendChatMessage(text, statusEl) {
  if (!text.trim()) return;
  if (!state.currentUser) {
    setStatus(statusEl, "Sign in to use the AI assistant.", "error");
    return;
  }

  // Clear input
  if (els.aiChatInput) els.aiChatInput.value = "";

  // Add user message to UI and history
  renderChatMessage("user", text);
  messages.push({ role: "user", content: text });

  setLoadingState(els.aiChatSend, true);
  setStatus(statusEl, "", "info");

  try {
    const token = await state.currentUser.getIdToken();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Could not reach the AI service. Please try again.");
    }
    if (!res.ok) throw new Error(data.message || "Request failed.");

    const reply = data.message;
    messages.push({ role: "assistant", content: reply });
    renderChatMessage("assistant", reply);
  } catch (error) {
    setStatus(statusEl, error.message, "error");
    // Remove the user message from history if request failed
    messages.pop();
  } finally {
    setLoadingState(els.aiChatSend, false);
    els.aiChatInput?.focus();
  }
}
