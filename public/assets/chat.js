import { api, escapeHtml, getClientId, renderMarkdown } from "./common.js";

const clientId = getClientId();
const $ = (id) => document.getElementById(id);
const inner = $("messages-inner");
let conversationId = null;
let busy = false;

function welcome() {
  inner.innerHTML = `<div class="welcome"><div class="big">🤖</div><h2>How can I help?</h2>
    <p>Ask anything — your conversations are saved in the sidebar.</p>
    <div class="suggestions">
      <button>Explain quantum computing simply</button><button>Write a haiku about the night</button>
      <button>Give me 5 tips to write clearer emails</button><button>What is the AI effect?</button>
    </div></div>`;
  inner.querySelectorAll(".suggestions button").forEach((b) => (b.onclick = () => send(b.textContent)));
}

function addMessage(role, content) {
  inner.querySelector(".welcome")?.remove();
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  const body = role === "user" ? escapeHtml(content) : renderMarkdown(content);
  el.innerHTML = `<div class="avatar">${role === "user" ? "🧑" : "🤖"}</div>
    <div><div class="who">${role === "user" ? "You" : "DarkGPT"}</div><div class="content md">${body}</div></div>`;
  inner.appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
  return el;
}

async function loadHistory() {
  const list = $("history");
  try {
    const { conversations } = await api(`/api/conversations?clientId=${clientId}`);
    list.innerHTML = conversations.length ? "" : '<li class="empty">No saved chats yet</li>';
    for (const c of conversations) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.textContent = c.title;
      b.className = c.id === conversationId ? "active" : "";
      b.onclick = () => openConversation(c.id, c.title);
      li.appendChild(b);
      list.appendChild(li);
    }
  } catch (e) {
    list.innerHTML = `<li class="empty">${escapeHtml(e.message)}</li>`;
  }
}

async function openConversation(id, title) {
  conversationId = id;
  $("chat-title").textContent = title;
  $("sidebar").classList.remove("open");
  inner.innerHTML = "";
  const { messages } = await api(`/api/conversations/${id}?clientId=${clientId}`);
  messages.forEach((m) => addMessage(m.role, m.content));
  loadHistory();
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  $("send").disabled = true;
  $("input").value = "";
  addMessage("user", text);
  const pending = addMessage("assistant", "");
  pending.querySelector(".content").innerHTML = '<span class="skeleton" style="display:block;width:60%;height:14px"></span>';
  try {
    const res = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ clientId, conversationId, model: $("model").value, message: text }),
    });
    const isNew = !conversationId;
    conversationId = res.conversationId;
    pending.querySelector(".content").innerHTML = renderMarkdown(res.reply);
    if (isNew) $("chat-title").textContent = text.split(/\s+/).slice(0, 6).join(" ");
    loadHistory();
  } catch (e) {
    pending.querySelector(".content").innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`;
  } finally {
    busy = false;
    $("send").disabled = false;
  }
}

$("composer").onsubmit = (e) => { e.preventDefault(); send($("input").value); };
$("input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send($("input").value); }
};
$("input").oninput = (e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; };
$("new-chat").onclick = () => { conversationId = null; $("chat-title").textContent = "New chat"; welcome(); loadHistory(); };
$("toggle-sidebar").onclick = () => $("sidebar").classList.toggle("open");
$("clear-history").onclick = async () => {
  if (!confirm("Delete all saved chats?")) return;
  await api(`/api/conversations?clientId=${clientId}`, { method: "DELETE" });
  conversationId = null; welcome(); loadHistory();
};

api("/api/models").then(({ models, default: def }) => {
  $("model").innerHTML = models.map((m) => `<option value="${m.id}"${m.id === def ? " selected" : ""}>${m.label}</option>`).join("");
});
welcome();
loadHistory();
