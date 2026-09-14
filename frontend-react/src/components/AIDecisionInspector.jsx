import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
  ChevronDown,
  Activity,
} from "lucide-react";
import FormattedAiText from "./FormattedAiText";

/**
 * AIDecisionInspector — the core transparency panel for the hybrid pipeline.
 *
 * Displays:
 *   - Task risk score (0–100 gauge)
 *   - AI-recommended block window
 *   - Constraint validation status
 *   - Bullet-point contextual reasoning from Groq
 *   - "Apply Recommendation" button
 */
export default function AIDecisionInspector({
  recommendation,     // { recommended_start, recommended_end, confidence, justification, reasoning_bullets, alternative_windows }
  validation,         // { approved, violations, fallback_start, fallback_end, fallback_reason }
  riskData,           // { risk_score, risk_level, top_risk, reasoning, sequence_recommendation }
  prioritizedTasks,   // array with ai_risk_score, risk_level, reasoning_bullets per task
  loading,
  error,
  onApplyRecommendation, // (window: {start, end}) => void
}) {
  const [activeTab, setActiveTab] = useState("recommendation");
  const [expandedTask, setExpandedTask] = useState(null);

  const tabs = [
    { id: "recommendation", label: "Block Recommendation", icon: Clock },
    { id: "risk", label: "Risk Analysis", icon: TrendingUp },
    { id: "reasoning", label: "Task Prioritization", icon: Sparkles },
  ];

  const fmtTime = (iso) => {
    if (!iso) return "N/A";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return { bar: "from-red-500 to-red-700", text: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    if (score >= 60) return { bar: "from-amber-400 to-orange-500", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
    if (score >= 40) return { bar: "from-yellow-400 to-amber-400", text: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
    return { bar: "from-emerald-400 to-green-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  };

  const getRiskLevelBadge = (level) => {
    const map = {
      CRITICAL: "bg-red-100 text-red-700 border-red-200",
      HIGH: "bg-amber-100 text-amber-700 border-amber-200",
      MODERATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
      LOW: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return map[level?.toUpperCase()] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getConfidenceDot = (confidence) => {
    if (confidence === "HIGH") return "bg-emerald-500";
    if (confidence === "MEDIUM") return "bg-amber-500";
    return "bg-red-500";
  };

  // Pick the window to apply
  const applyWindow = recommendation
    ? { start: recommendation?.recommended_start, end: recommendation?.recommended_end }
    : null;

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3864] to-[#2563EB] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Decision Inspector</h3>
            <p className="text-[11px] text-blue-200">
              Powered by Groq AI
            </p>
          </div>
        </div>
        {/* Pipeline status pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[#E2E8F0] bg-slate-50/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? "border-[#2563EB] text-[#2563EB] bg-white"
                  : "border-transparent text-[#64748B] hover:text-[#1F3864] hover:bg-white/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center gap-3 text-[#64748B]">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold">Running AI analysis pipeline...</p>
            <p className="text-xs text-slate-400">Groq → Constraint Validation → Result</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4" /> AI Pipeline Error
            </div>
            {error}
          </div>
        )}

        {/* ── TAB: Block Recommendation ────────────────────────────────── */}
        {!loading && !error && activeTab === "recommendation" && (
          <div className="space-y-4">
            {!recommendation ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Clock className="w-7 h-7 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-600">No recommendation yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Get AI Block Recommendation" above</p>
              </div>
            ) : (
              <>
                {/* Recommended Window Card */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/40 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      AI-Recommended Window
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceDot(recommendation.confidence)}`} />
                      <span className="text-[11px] font-bold text-slate-600">
                        {recommendation.confidence} Confidence
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#2563EB] shrink-0" />
                    <span className="text-xl font-extrabold text-[#1F3864]">
                      {fmtTime(recommendation.recommended_start)} – {fmtTime(recommendation.recommended_end)}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">{recommendation.justification}</p>
                </div>



                {/* AI Reasoning Bullets */}
                {recommendation.reasoning_bullets?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Reasoning
                    </p>
                    {recommendation.reasoning_bullets.map((bullet, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#1E293B]">
                        <ChevronRight className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alternative Windows */}
                {recommendation.alternative_windows?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Alternative Windows
                    </p>
                    {recommendation.alternative_windows.map((alt, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-semibold text-[#1F3864]">
                          {fmtTime(alt.start)} – {fmtTime(alt.end)}
                        </span>
                        <span className="text-[#64748B]">{alt.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apply Recommendation Button */}
                {onApplyRecommendation && applyWindow && (
                  <button
                    onClick={() => onApplyRecommendation(applyWindow)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-sm font-bold shadow-md shadow-emerald-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Apply AI Recommendation
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: Risk Analysis ────────────────────────────────────────── */}
        {!loading && !error && activeTab === "risk" && (
          <div className="space-y-4">
            {!riskData ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Activity className="w-7 h-7 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-600">No risk analysis yet</p>
                <p className="text-xs text-slate-400 mt-1">Trigger from the Optimizer or Tasks page</p>
              </div>
            ) : (
              <>
                {/* Risk Score Gauge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Overall Risk Score
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRiskLevelBadge(riskData.risk_level)}`}>
                      {riskData.risk_level}
                    </span>
                  </div>
                  <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getRiskColor(riskData.risk_score || 0).bar} transition-all duration-700`}
                      style={{ width: `${Math.min(100, riskData.risk_score || 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0</span>
                    <span className={`font-bold text-sm ${getRiskColor(riskData.risk_score || 0).text}`}>
                      {riskData.risk_score}/100
                    </span>
                    <span>100</span>
                  </div>
                </div>

                {/* Top Risk */}
                <div className="p-3.5 bg-red-50/60 border border-red-100 rounded-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 mb-1">
                    Top Risk
                  </p>
                  <p className="text-xs font-semibold text-[#1E293B]">{riskData.top_risk}</p>
                </div>

                {/* Reasoning */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                    Risk Reasoning
                  </p>
                  <p className="text-xs text-[#1E293B] leading-relaxed">{riskData.reasoning}</p>
                </div>

                {/* Sequence Recommendation */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                    Sequence Recommendation
                  </p>
                  <p className="text-xs text-[#1E293B]">{riskData.sequence_recommendation}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Task Prioritization ─────────────────────────────────── */}
        {!loading && !error && activeTab === "reasoning" && (
          <div className="space-y-3">
            {!prioritizedTasks?.length ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Zap className="w-7 h-7 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold text-slate-600">No AI prioritization yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "AI Prioritize All Tasks" in the Tasks page</p>
              </div>
            ) : (
              prioritizedTasks.map((task, idx) => {
                const colors = getRiskColor(task.ai_risk_score || 0);
                const isOpen = expandedTask === (task.id || idx);
                return (
                  <div key={task.id || idx} className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <button
                      onClick={() => setExpandedTask(isOpen ? null : (task.id || idx))}
                      className="w-full p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Rank badge */}
                        <div className="w-7 h-7 rounded-full bg-[#1F3864] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                          {task.priority_rank || idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1E293B] truncate">
                            {task.defect_desc}
                          </p>
                          <p className="text-[10px] text-[#64748B] uppercase">
                            {task.department} · {task.section}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {task.ai_risk_score}/100
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRiskLevelBadge(task.risk_level)}`}>
                          {task.risk_level}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>
                    {isOpen && task.reasoning_bullets?.length > 0 && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#E2E8F0] bg-slate-50/60 space-y-1.5">
                        {task.reasoning_bullets.map((bullet, bi) => (
                          <div key={bi} className="flex items-start gap-1.5 text-[11px] text-[#1E293B]">
                            <ChevronRight className="w-3 h-3 text-[#2563EB] shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
