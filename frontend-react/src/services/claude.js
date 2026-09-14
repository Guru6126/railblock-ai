/**
 * AI service facade — proxies all Groq calls through the backend.
 *
 * Previously this module called api.groq.com directly from the browser.
 * Now all AI calls route through FastAPI endpoints which enforce:
 *   Groq AI → Python Constraint Validation → Approved or Fallback
 *
 * The old exports (callGroq, callClaude, callGrok, explainConflictAI,
 * summarizeScheduleAI, analyzeRiskAI) are preserved as aliases for
 * backward compatibility with any page that still imports them.
 */
import { api } from "./api";

// ── Core backend-proxied AI functions ─────────────────────────────────────────

/**
 * Explain a conflict using Groq (via backend).
 * Returns structured { root_cause, operational_impact, recommended_action, severity_assessment }
 */
export async function explainConflictAI(alert, train, _block) {
  const result = await api.aiExplainConflict({
    alertId: alert?.id || null,
    trainId: train?.id || train?.number || alert?.train_id || null,
    alertMessage: alert?.message || null,
    alertAction: alert?.action_taken || alert?.action || null,
  });

  // Return as formatted text for backward-compat with FormattedAiText component
  if (result.root_cause) {
    return (
      `**Root Cause Analysis**\n${result.root_cause}\n\n` +
      `**Operational Impact**\n${result.operational_impact}\n\n` +
      `**Recommended Action**\n${result.recommended_action}`
    );
  }
  // Fallback: if backend returned raw text
  return JSON.stringify(result, null, 2);
}

/**
 * Structured version — returns the raw JSON object from backend.
 * Used by the new AIDecisionInspector component.
 */
export async function explainConflictStructured(alert, train) {
  return api.aiExplainConflict({
    alertId: alert?.id || null,
    trainId: train?.id || train?.number || alert?.train_id || null,
    alertMessage: alert?.message || null,
    alertAction: alert?.action_taken || alert?.action || null,
  });
}

/**
 * Summarize the optimized schedule (via backend Groq analysis).
 * Returns formatted text for the AI briefing card in Optimizer.jsx.
 */
export async function summarizeScheduleAI(tasks, block) {
  const result = await api.aiRisk();
  // Format as a briefing from the risk analysis
  if (result.reasoning) {
    return (
      `**Maintenance Schedule Briefing — Section ${block?.section || "SEC-14"}**\n\n` +
      `${result.reasoning}\n\n` +
      `**Sequence Recommendation:** ${result.sequence_recommendation}`
    );
  }
  return "AI briefing unavailable. Please ensure the Groq API key is configured.";
}

/**
 * Analyse overall maintenance risk (via backend Groq AI).
 * Returns formatted text for AIReportModal.
 */
export async function analyzeRiskAI(tasks, block) {
  const result = await api.aiRisk();
  if (result.risk_level) {
    return (
      `**Risk Level:** ${result.risk_level} (Score: ${result.risk_score}/100)\n\n` +
      `**Top Risk Identification**\n${result.top_risk}\n\n` +
      `**Reasoning**\n${result.reasoning}\n\n` +
      `**Sequence & Execution Recommendation**\n${result.sequence_recommendation}`
    );
  }
  return "Risk analysis unavailable. Please ensure the Groq API key is configured.";
}

// ── Backward-compat aliases ───────────────────────────────────────────────────
export const callGroq = async () => {
  throw new Error("Direct Groq calls have been moved to the backend. Use the api.* methods instead.");
};
export const callGrok = callGroq;
export const callClaude = callGroq;

// ── Model listing (now via backend key status) ────────────────────────────────
export async function fetchGroqModels() {
  const status = await api.getGroqKeyStatus();
  if (!status.configured) {
    throw new Error("Groq API key not configured. Set it in Settings.");
  }
  // Return the known active models — no direct browser→Groq call needed
  return [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
  ];
}
