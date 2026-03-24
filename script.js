const elements = {
  apiKey: document.getElementById("apiKey"),
  toggleKey: document.getElementById("toggleKey"),
  saveKey: document.getElementById("saveKey"),
  model: document.getElementById("model"),
  temperature: document.getElementById("temperature"),
  tempValue: document.getElementById("tempValue"),
  maxTokens: document.getElementById("maxTokens"),
  systemPrompt: document.getElementById("systemPrompt"),
  messages: document.getElementById("messages"),
  userInput: document.getElementById("userInput"),
  send: document.getElementById("send"),
  clearChat: document.getElementById("clearChat"),
  status: document.getElementById("status"),
  keyStatus: document.getElementById("keyStatus"),
};

const state = {
  chat: [],
  awaiting: false,
};

const STORAGE_KEYS = {
  apiKey: "orbit_api_key",
  model: "orbit_model",
  temperature: "orbit_temperature",
  maxTokens: "orbit_max_tokens",
  systemPrompt: "orbit_system_prompt",
};

function setStatus(text) {
  elements.status.textContent = text;
}

function loadSettings() {
  const storedKey = localStorage.getItem(STORAGE_KEYS.apiKey);
  if (storedKey) elements.apiKey.value = storedKey;

  const storedModel = localStorage.getItem(STORAGE_KEYS.model);
  if (storedModel) elements.model.value = storedModel;

  const storedTemp = localStorage.getItem(STORAGE_KEYS.temperature);
  if (storedTemp) {
    elements.temperature.value = storedTemp;
    elements.tempValue.textContent = storedTemp;
  }

  const storedMaxTokens = localStorage.getItem(STORAGE_KEYS.maxTokens);
  if (storedMaxTokens) elements.maxTokens.value = storedMaxTokens;

  const storedSystem = localStorage.getItem(STORAGE_KEYS.systemPrompt);
  if (storedSystem) elements.systemPrompt.value = storedSystem;
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.model, elements.model.value.trim());
  localStorage.setItem(STORAGE_KEYS.temperature, elements.temperature.value);
  localStorage.setItem(STORAGE_KEYS.maxTokens, elements.maxTokens.value);
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPrompt.value);
}

function createMessage(role, content, className = role) {
  const el = document.createElement("div");
  el.className = `message ${className}`;
  el.textContent = content;
  return el;
}

function appendMessage(role, content, className = role) {
  const message = createMessage(role, content, className);
  elements.messages.appendChild(message);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return message;
}

function resetChat() {
  state.chat = [];
  elements.messages.innerHTML = "";
}

async function sendMessage() {
  if (state.awaiting) return;

  const apiKey = elements.apiKey.value.trim();
  const content = elements.userInput.value.trim();

  if (!apiKey) {
    appendMessage("assistant", "Add your OpenRouter API key first.", "error");
    return;
  }

  if (!content) return;

  appendMessage("user", content);
  state.chat.push({ role: "user", content });
  elements.userInput.value = "";

  persistSettings();

  const thinking = appendMessage("assistant", "Thinking…", "assistant");
  state.awaiting = true;
  elements.send.disabled = true;
  setStatus("Contacting OpenRouter...");

  try {
    const systemPrompt = elements.systemPrompt.value.trim();
    const messages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...state.chat]
      : [...state.chat];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Orbit Chat",
      },
      body: JSON.stringify({
        model: elements.model.value.trim(),
        messages,
        temperature: Number(elements.temperature.value),
        max_tokens: Number(elements.maxTokens.value),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenRouter request failed.");
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    thinking.textContent = reply || "No response received.";
    state.chat.push({ role: "assistant", content: thinking.textContent });
    setStatus("Ready");
  } catch (error) {
    thinking.remove();
    appendMessage("assistant", error.message || "Something went wrong.", "error");
    setStatus("Error");
  } finally {
    state.awaiting = false;
    elements.send.disabled = false;
  }
}

function handleKeyPress(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function toggleKeyVisibility() {
  const isPassword = elements.apiKey.type === "password";
  elements.apiKey.type = isPassword ? "text" : "password";
  elements.toggleKey.textContent = isPassword ? "Hide" : "Show";
}

function saveApiKey() {
  const key = elements.apiKey.value.trim();
  if (!key) {
    appendMessage("assistant", "Nothing to save yet.", "error");
    return;
  }
  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  setStatus("Key saved locally");
  setKeyStatus("Key: Testing...", "pending");
  testApiKey(key);
}

function clearChat() {
  resetChat();
  setStatus("Chat cleared");
}

async function testApiKey(apiKey) {
  if (state.awaiting) return;

  const testPrompt = "API KEY TEST RESPOND WITH WORKING if working";
  appendMessage("user", testPrompt);
  const thinking = appendMessage("assistant", "Testing key…");
  state.awaiting = true;
  elements.send.disabled = true;
  setStatus("Testing API key...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Orbit Chat",
      },
      body: JSON.stringify({
        model: elements.model.value.trim(),
        messages: [{ role: "user", content: testPrompt }],
        temperature: 0,
        max_tokens: 32,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "API key test failed.");
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    thinking.textContent = reply || "No response received.";
    setStatus("Key test complete");
    setKeyStatus("Key: Working", "good");
  } catch (error) {
    thinking.remove();
    appendMessage("assistant", error.message || "API key test failed.", "error");
    setStatus("Key test failed");
    setKeyStatus("Key: Failed", "bad");
  } finally {
    state.awaiting = false;
    elements.send.disabled = false;
  }
}

function setKeyStatus(text, tone) {
  elements.keyStatus.textContent = text;
  elements.keyStatus.classList.remove("good", "bad");
  if (tone === "good") elements.keyStatus.classList.add("good");
  if (tone === "bad") elements.keyStatus.classList.add("bad");
}

elements.send.addEventListener("click", sendMessage);
elements.userInput.addEventListener("keydown", handleKeyPress);
elements.toggleKey.addEventListener("click", toggleKeyVisibility);
elements.saveKey.addEventListener("click", saveApiKey);
elements.clearChat.addEventListener("click", clearChat);
elements.temperature.addEventListener("input", () => {
  elements.tempValue.textContent = elements.temperature.value;
});

[elements.model, elements.maxTokens, elements.systemPrompt].forEach((input) => {
  input.addEventListener("change", persistSettings);
});

loadSettings();
resetChat();
