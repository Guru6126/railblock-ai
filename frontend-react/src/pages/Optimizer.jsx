import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cpu,
  Check,
  Calendar,
  ShieldCheck,
  TrendingDown,
  Layers3,
  BrainCircuit,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { summarizeScheduleAI } from "../services/claude";
import AIReportModal from "../components/AIReportModal";
import FormattedAiText from "../components/FormattedAiText";
import AIDecisionInspector from "../components/AIDecisionInspector";

export default function Optimizer() {
  const {
    tasks,
    blocks,
    optimizing,
    runOptimize,
    activeSection,
    apiKey,
  } = useApp();

  const [hasRun, setHasRun] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [aiBriefing, setAiBriefing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  // AI Decision Inspector state
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorError, setInspectorError] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiValidation, setAiValidation] = useState(null);
  const [aiRiskData, setAiRiskData] = useState(null);
  const [appliedWindow, setAppliedWindow] = useState(null);

  const activeBlock = blocks[0] || null;

  const handleRunOptimizer = async () => {
    try {
      const res = await runOptimize();
      setOptimizeResult(res);
      setHasRun(true);
      
      setAiLoading(true);
      setAiError(null);
      const targetBlock = res || activeBlock || {
        section: activeSection,
        start_time: "2026-09-06T10:00:00",
        end_time: "2026-09-06T11:55:00",
        reduction_pct: 67,
      };
      try {
        const summary = await summarizeScheduleAI(tasks, targetBlock);
        setAiBriefing(summary);
      } catch (err) {
        setAiError(err.message || "Failed to generate AI explanation");
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetAIRecommendation = async () => {
    setInspectorLoading(true);
    setInspectorError(null);
    try {
      const { api } = await import("../services/api");
      // Run both recommendation and risk in parallel
      const [recRes, riskRes] = await Promise.all([
        api.aiRecommendBlock(activeSection),
        api.aiRisk(activeSection),
      ]);
      setAiRecommendation(recRes.recommendation);
      setAiValidation(recRes.validation);
      setAiRiskData(riskRes);
    } catch (err) {
      setInspectorError(err.message || "AI pipeline failed. Check Groq key in Settings.");
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleApplyRecommendation = (window) => {
    setAppliedWindow(window);
    // Show a toast-style confirmation in the UI
  };

  // Department helper
  const getDeptColor = (dept) => {
    switch (dept?.toLowerCase()) {
      case "track":
        return {
          badge: "bg-blue-100 text-blue-800 border-blue-200",
          border: "border-blue-500",
          name: "Track (TMS)",
        };
      case "signal":
        return {
          badge: "bg-purple-100 text-purple-800 border-purple-200",
          border: "border-purple-500",
          name: "Signal (SMMS)",
        };
      case "ohe":
        return {
          badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
          border: "border-cyan-500",
          name: "OHE (TDMS)",
        };
      default:
        return {
          badge: "bg-slate-100 text-slate-800 border-slate-200",
          border: "border-slate-500",
          name: dept,
        };
    }
  };

  // Ordered tasks for the merged block
  const orderedTasks = (optimizeResult?.ordered_task_ids || activeBlock?.task_ids || [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean);

  const fallbackTasks = tasks.length > 0 ? tasks : [];
  const displayOrderedTasks = orderedTasks.length > 0 ? orderedTasks : fallbackTasks;

  const isOptimized = Boolean(activeBlock || optimizeResult);

  const displayBlock = activeBlock || {
    start_time: "2026-09-06T10:00:00",
    end_time: "2026-09-06T11:55:00"
  };

  const getDurationMins = (start, end) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.round((e - s) / 60000);
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const blockDuration = getDurationMins(displayBlock.start_time, displayBlock.end_time);
  const blockStartFormatted = formatTime(displayBlock.start_time);
  const blockEndFormatted = formatTime(displayBlock.end_time);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1F3864]">Block Optimizer</h1>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Shadow Blocking: Merging uncoordinated Track, Signal, and OHE closures into a single synchronized window.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            Status:
          </span>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              isOptimized
                ? "bg-emerald-50 text-[#16A34A] border-emerald-200"
                : "bg-amber-50 text-[#D97706] border-amber-200"
            }`}
          >
            {isOptimized ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Optimized (Shadow Block Active)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Requested (3 Separate Closures)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Headline Metrics (Shown prominently after optimize or if block exists) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Pre-Optimization Closures
          </span>
          <div className="text-3xl font-extrabold text-[#DC2626] mt-1">
            {tasks.length} <span className="text-sm font-semibold text-slate-500">separate blocks</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{tasks.length} department disruptions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Post-Optimization Blocks
          </span>
          <div className="text-3xl font-extrabold text-[#16A34A] mt-1">
            1 <span className="text-sm font-semibold text-emerald-700">Unified Block</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Zero redundant corridor halts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Disruption Reduction
          </span>
          <div className="text-3xl font-extrabold text-[#2563EB] mt-1">
            67% <span className="text-sm font-semibold text-blue-700">saved</span>
          </div>
          <p className="text-xs text-blue-600 font-medium mt-1">Track occupancy minimized</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Optimized Window
          </span>
          <div className="text-xl font-extrabold text-[#1F3864] mt-1.5 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <span>{blockStartFormatted} – {blockEndFormatted}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{blockDuration} minutes total duration</p>
        </div>
      </div>

      {/* Main Split Panels: BEFORE vs AFTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* LEFT PANEL: BEFORE */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                  A
                </span>
                <h2 className="text-base font-bold text-[#1F3864]">
                  Before Optimization (Legacy BDMS)
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-700 rounded-lg border border-red-200">
                3 Separate Track Closures
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-3">
              Without AI coordination, departments independently halt trains {tasks.length} times across the week:
            </p>

            {/* Unmerged Tasks */}
            <div className="space-y-3 mt-4">
              {tasks.map((task, idx) => {
                const deptStyle = getDeptColor(task.department);
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border-l-4 ${deptStyle.border} border bg-slate-50/70 space-y-2 hover:bg-slate-50 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border ${deptStyle.badge}`}
                      >
                        {deptStyle.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Closure #{idx + 1}: {task.est_duration_min} min
                      </span>
                    </div>

                    <div className="font-semibold text-sm text-[#1E293B]">
                      {task.defect_desc}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                      <span>Severity: <strong className="text-slate-800 uppercase">{task.severity}</strong></span>
                      <span>Overdue: <strong className="text-amber-700">{task.overdue_days}d</strong></span>
                      <span>Priority: <strong className="text-blue-700">{(task.priority_score || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 text-xs text-red-800">
            ⚠️ <strong>Impact:</strong> {tasks.length} separate block approvals required, {tasks.length} separate speed restrictions, cumulative train delay of ~{tasks.length * 60}+ minutes.
          </div>
        </div>

        {/* RIGHT PANEL: AFTER */}
        <div
          className={`bg-white rounded-2xl border ${
            isOptimized ? "border-blue-300 ring-2 ring-blue-100" : "border-[#E2E8F0]"
          } shadow-xs p-6 flex flex-col justify-between space-y-6 ${
            hasRun ? "animate-merge-reveal" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  B
                </span>
                <h2 className="text-base font-bold text-[#1F3864]">
                  After Optimization (RailBlock AI)
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1 Synchronized Shadow Block</span>
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-3">
              CP-SAT solver ordered and consolidated all {tasks.length} departmental tasks into a single non-overlapping sequence:
            </p>

            {/* Single Merged Container */}
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-[#1F3864] text-white">
                    BLOCK-SEC14-01
                  </span>
                  <span className="text-xs font-bold text-[#1F3864]">
                    Window: {blockStartFormatted} – {blockEndFormatted} ({blockDuration} min)
                  </span>
                </div>
              </div>

              {/* Execution Sequence inside unified block */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Synchronized Execution Order
                </div>
                {displayOrderedTasks.map((task, idx) => {
                  const deptStyle = getDeptColor(task.department);
                  return (
                    <div
                      key={task.id || idx}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 shadow-2xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#1F3864] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${deptStyle.badge}`}
                          >
                            {task.department}
                          </span>
                          <span className="text-xs font-semibold text-[#1E293B] truncate">
                            {task.defect_desc}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#1F3864] shrink-0">
                        {task.est_duration_min} min
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Benefit:</strong> Single block clearance issued by Traffic Controller. All {tasks.length} gangs work in coordinated parallel/sequential harmony.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
