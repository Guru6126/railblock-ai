// API client for RailBlock AI FastAPI backend

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export function getBackendUrl() {
  return localStorage.getItem("railblock_backend_url") || DEFAULT_BACKEND_URL;
}

export function setBackendUrl(url) {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  localStorage.setItem("railblock_backend_url", cleanUrl);
  return cleanUrl;
}

export function getSectionName() {
  return localStorage.getItem("railblock_section") || "SEC-14";
}

export function setSectionName(section) {
  const clean = section.trim();
  localStorage.setItem("railblock_section", clean);
  return clean;
}

// NOTE: API key is now stored server-side via POST /api/settings/groq-key
// This getter is kept only to detect if an old key was cached locally during migration.
export function getApiKey() {
  const key = localStorage.getItem("railblock_groq_api_key") || "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export function setApiKey(key) {
  const cleanKey = (key || "").trim().replace(/^["']|["']$/g, "");
  localStorage.setItem("railblock_groq_api_key", cleanKey);
  return cleanKey;
}

export function getGroqModel() {
  return localStorage.getItem("railblock_groq_model") || "llama-3.3-70b-versatile";
}

export function setGroqModel(model) {
  localStorage.setItem("railblock_groq_model", model.trim());
}

async function request(endpoint, options = {}) {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // use fallback
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(`Cannot connect to backend at ${baseUrl}. Ensure backend server is running.`);
    }
    throw err;
  }
}

export const api = {
  checkHealth: () => request("/"),
  getTasks: () => request("/api/tasks"),
  addTask: (taskData) =>
    request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    }),
  getTrains: () => request("/api/trains"),
  getBlocks: () => request("/api/blocks"),
  getAlerts: () => request("/api/alerts"),
  resetScenario: () => request("/api/reset", { method: "POST" }),
  optimize: (section = getSectionName()) =>
    request(`/api/optimize?section=${encodeURIComponent(section)}`, { method: "POST" }),
  checkConflicts: (section = getSectionName()) =>
    request(`/api/check-conflicts?section=${encodeURIComponent(section)}`, { method: "POST" }),

  // ── Groq key management (server-side) ─────────────────────────────────────
  setGroqKey: (apiKey) =>
    request("/api/settings/groq-key", {
      method: "POST",
      body: JSON.stringify({ api_key: apiKey }),
    }),
  getGroqKeyStatus: () => request("/api/settings/groq-key/status"),

  // ── Hybrid AI-Deterministic pipeline endpoints ─────────────────────────────
  /** Groq risk scoring → merged with deterministic scores */
  aiPrioritize: (section = getSectionName()) =>
    request(`/api/ai/prioritize?section=${encodeURIComponent(section)}`, { method: "POST" }),

  /** Groq block recommendation → constraint validation → approved or fallback */
  aiRecommendBlock: (section = getSectionName()) =>
    request(`/api/ai/recommend-block?section=${encodeURIComponent(section)}`, { method: "POST" }),

  /** Groq schedule risk analysis */
  aiRisk: (section = getSectionName()) =>
    request(`/api/ai/risk?section=${encodeURIComponent(section)}`, { method: "POST" }),

  /** Groq structured conflict explanation — proxied through backend */
  aiExplainConflict: ({ alertId, trainId, alertMessage, alertAction }) =>
    request("/api/ai/explain-conflict", {
      method: "POST",
      body: JSON.stringify({
        alert_id: alertId || null,
        train_id: trainId || null,
        alert_message: alertMessage || null,
        alert_action: alertAction || null,
      }),
    }),

  /** What-if disruption simulation */
  simulate: ({ disruption_type, section, train_id, delay_minutes, fault_location, emergency_duration_min }) =>
    request("/api/simulate", {
      method: "POST",
      body: JSON.stringify({
        disruption_type,
        section: section || getSectionName(),
        train_id: train_id || null,
        delay_minutes: delay_minutes || null,
        fault_location: fault_location || null,
        emergency_duration_min: emergency_duration_min || null,
      }),
    }),
};
