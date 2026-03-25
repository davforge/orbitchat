const elements = {
  provider: document.getElementById("provider"),
  apiKey: document.getElementById("apiKey"),
  apiKeyLabel: document.getElementById("apiKeyLabel"),
  toggleKey: document.getElementById("toggleKey"),
  saveKey: document.getElementById("saveKey"),
  modelSelect: document.getElementById("modelSelect"),
  customModel: document.getElementById("customModel"),
  systemPrompt: document.getElementById("systemPrompt"),
  messages: document.getElementById("messages"),
  userInput: document.getElementById("userInput"),
  imageUpload: document.getElementById("imageUpload"),
  imageQueue: document.getElementById("imageQueue"),
  imageWarning: document.getElementById("imageWarning"),
  send: document.getElementById("send"),
  clearChat: document.getElementById("clearChat"),
  status: document.getElementById("status"),
  keyStatus: document.getElementById("keyStatus"),
};

const state = {
  chat: [],
  images: [],
  awaiting: false,
};

const STORAGE_KEYS = {
  openrouterKey: "orbit_openrouter_key",
  openaiKey: "orbit_openai_key",
  provider: "orbit_provider",
  model: "orbit_model",
  customModel: "orbit_custom_model",
  systemPrompt: "orbit_system_prompt",
};

function setStatus(text) {
  elements.status.textContent = text;
}

function loadSettings() {
  const storedProvider = localStorage.getItem(STORAGE_KEYS.provider);
  if (storedProvider) elements.provider.value = storedProvider;

  const storedModel = localStorage.getItem(STORAGE_KEYS.model);
  populateModelOptions(elements.provider.value, storedModel);

  const storedCustomModel = localStorage.getItem(STORAGE_KEYS.customModel);
  if (storedCustomModel) elements.customModel.value = storedCustomModel;

  const storedSystem = localStorage.getItem(STORAGE_KEYS.systemPrompt);
  if (storedSystem) elements.systemPrompt.value = storedSystem;

  loadApiKeyForProvider();
  updateCustomModelVisibility();
  updateImageSupport();
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.provider, elements.provider.value);
  localStorage.setItem(STORAGE_KEYS.model, getSelectedModel());
  localStorage.setItem(STORAGE_KEYS.customModel, elements.customModel.value.trim());
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPrompt.value);
}

function getSelectedModel() {
  const selected = elements.modelSelect.value;
  if (selected === "custom") {
    return elements.customModel.value.trim();
  }
  return selected;
}

function populateModelOptions(provider, preferredModel) {
  const openRouterModels = [
    "openrouter/free",
    "google/gemma-3-4b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "stepfun/step-3.5-flash:free",
  ];

  const openAiModels = ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"];

  const list = provider === "openai" ? openAiModels : openRouterModels;
  elements.modelSelect.innerHTML = "";

  list.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    elements.modelSelect.appendChild(option);
  });

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom";
  elements.modelSelect.appendChild(customOption);

  if (preferredModel && list.includes(preferredModel)) {
    elements.modelSelect.value = preferredModel;
  } else if (preferredModel) {
    elements.modelSelect.value = "custom";
    elements.customModel.value = preferredModel;
  } else {
    elements.modelSelect.value = list[0];
  }
}

function updateCustomModelVisibility() {
  const isCustom = elements.modelSelect.value === "custom";
  elements.customModel.style.display = isCustom ? "block" : "none";
}

function updateImageSupport() {
  const model = elements.modelSelect.value;
  const supportsImages = isImageSupported(model);

  elements.imageUpload.disabled = !supportsImages;
  elements.imageUpload.setAttribute("aria-disabled", String(!supportsImages));
  const uploadButton = document.querySelector(".upload-button");
  if (uploadButton) {
    uploadButton.classList.toggle("disabled", !supportsImages);
  }

  if (!supportsImages) {
    elements.imageWarning.textContent = "This model does not accept images.";
  } else if (elements.provider.value === "openai") {
    elements.imageWarning.textContent = "OpenAI: ensure the selected model supports images.";
  } else if (model === "custom") {
    elements.imageWarning.textContent = "Custom model: ensure it supports images.";
  } else {
    elements.imageWarning.textContent = "Pick an image compatible model for uploads.";
  }
}

function isImageSupported(model) {
  if (elements.provider.value !== "openrouter") return true;
  const nonVisionModels = ["openrouter/free", "stepfun/step-3.5-flash:free"];
  return !nonVisionModels.includes(model);
}

function loadApiKeyForProvider() {
  const provider = elements.provider.value;
  if (provider === "openai") {
    const storedKey = localStorage.getItem(STORAGE_KEYS.openaiKey);
    elements.apiKey.value = storedKey || "";
    elements.apiKey.placeholder = "sk-...";
    elements.apiKeyLabel.textContent = "OpenAI API Key";
  } else {
    const storedKey = localStorage.getItem(STORAGE_KEYS.openrouterKey);
    elements.apiKey.value = storedKey || "";
    elements.apiKey.placeholder = "sk-or-...";
    elements.apiKeyLabel.textContent = "OpenRouter API Key";
  }
}

function getApiKeyForProvider() {
  return elements.apiKey.value.trim();
}

function getAutoParameters(promptText) {
  const promptChars = promptText.length;
  const estimatedTokens = Math.ceil(promptChars / 4);
  const maxTokens = Math.min(1200, Math.max(256, 400 + estimatedTokens));
  return { temperature: 0.7, maxTokens };
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

function appendUserMessageWithImages(text, images) {
  const wrapper = document.createElement("div");
  wrapper.className = "message user";

  if (text) {
    const textNode = document.createElement("div");
    textNode.textContent = text;
    wrapper.appendChild(textNode);
  }

  if (images.length) {
    const grid = document.createElement("div");
    grid.className = "image-queue";
    images.forEach((image) => {
      const card = document.createElement("div");
      card.className = "image-card";
      const img = document.createElement("img");
      img.src = image.dataUrl;
      img.alt = image.name;
      card.appendChild(img);
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);
  }

  elements.messages.appendChild(wrapper);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function resetChat() {
  state.chat = [];
  elements.messages.innerHTML = "";
}

async function sendMessage() {
  if (state.awaiting) return;

  const apiKey = getApiKeyForProvider();
  const content = elements.userInput.value.trim();
  const queuedImages = [...state.images];
  const selectedModel = getSelectedModel();

  if (!apiKey) {
    appendMessage("assistant", "Add your API key first.", "error");
    return;
  }

  if (!selectedModel) {
    appendMessage("assistant", "Enter a model name first.", "error");
    return;
  }

  if (!content && queuedImages.length === 0) return;

  if (queuedImages.length > 0 && !isImageSupported(elements.modelSelect.value)) {
    appendMessage("assistant", "Selected model does not accept images.", "error");
    return;
  }

  if (queuedImages.length) {
    appendUserMessageWithImages(content, queuedImages);
  } else {
    appendMessage("user", content);
  }

  const contentParts = [];
  if (content) contentParts.push({ type: "text", text: content });
  queuedImages.forEach((image) =>
    contentParts.push({ type: "image_url", image_url: { url: image.dataUrl } })
  );

  const userMessage =
    queuedImages.length > 0 ? { role: "user", content: contentParts } : { role: "user", content };

  state.chat.push(userMessage);
  elements.userInput.value = "";
  state.images = [];
  renderImageQueue();

  persistSettings();

  const thinking = appendMessage("assistant", "Thinking…", "assistant");
  state.awaiting = true;
  elements.send.disabled = true;
  setStatus("Contacting provider...");

  try {
    const systemPrompt = elements.systemPrompt.value.trim();
    const messages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...state.chat]
      : [...state.chat];

    const autoParams = getAutoParameters(content);
    const isOpenAI = elements.provider.value === "openai";
    const url = isOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (!isOpenAI) {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "Orbit Chat";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: autoParams.temperature,
        max_tokens: autoParams.maxTokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Request failed.");
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
  if (elements.provider.value === "openai") {
    localStorage.setItem(STORAGE_KEYS.openaiKey, key);
  } else {
    localStorage.setItem(STORAGE_KEYS.openrouterKey, key);
  }
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

  const selectedModel = getSelectedModel();
  if (!selectedModel) {
    thinking.remove();
    appendMessage("assistant", "Enter a model name first.", "error");
    setStatus("Key test failed");
    setKeyStatus("Key: Failed", "bad");
    state.awaiting = false;
    elements.send.disabled = false;
    return;
  }

  try {
    const isOpenAI = elements.provider.value === "openai";
    const url = isOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (!isOpenAI) {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "Orbit Chat";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: selectedModel,
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


function renderImageQueue() {
  elements.imageQueue.innerHTML = "";
  state.images.forEach((image) => {
    const card = document.createElement("div");
    card.className = "image-card";
    const img = document.createElement("img");
    img.src = image.dataUrl;
    img.alt = image.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      state.images = state.images.filter((item) => item.id !== image.id);
      renderImageQueue();
    });
    card.appendChild(img);
    card.appendChild(remove);
    elements.imageQueue.appendChild(card);
  });
}

function handleImageUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  files.forEach((file) => {
    const reader = new FileReader();
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    reader.onload = () => {
      state.images.push({ id, name: file.name, dataUrl: reader.result });
      renderImageQueue();
    };
    reader.readAsDataURL(file);
  });

  event.target.value = "";
}

elements.send.addEventListener("click", sendMessage);
elements.userInput.addEventListener("keydown", handleKeyPress);
elements.imageUpload.addEventListener("change", handleImageUpload);
elements.provider.addEventListener("change", () => {
  loadApiKeyForProvider();
  populateModelOptions(elements.provider.value, getSelectedModel());
  updateImageSupport();
  persistSettings();
});
elements.toggleKey.addEventListener("click", toggleKeyVisibility);
elements.saveKey.addEventListener("click", saveApiKey);
elements.clearChat.addEventListener("click", clearChat);

elements.modelSelect.addEventListener("change", () => {
  updateCustomModelVisibility();
  updateImageSupport();
  persistSettings();
});

elements.customModel.addEventListener("input", () => {
  updateImageSupport();
  persistSettings();
});

[elements.systemPrompt].forEach((input) => {
  input.addEventListener("change", persistSettings);
});

loadSettings();
resetChat();
