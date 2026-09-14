import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  TrainFront,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import FormattedAiText from "../components/FormattedAiText";

export default function LiveMonitor() {
  const {
    trains,
    blocks,
    alerts,
    checkingConflicts,
    runCheckConflicts,
    activeSection,
    apiKey,
  } = useApp();

  // Collapsible AI explanations keyed by alert id / index
  const [explanations, setExplanations] = useState({});
  const [loadingAiMap, setLoadingAiMap] = useState({});
  const [openAccordion, setOpenAccordion] = useState({});

  const activeBlock = blocks[0] || {
    start_time: "2026-09-06T10:00:00",
    end_time: "2026-09-06T11:55:00",
  };

  const handleExplainConflict = async (alert, idx) => {
    const key = alert.id || idx;
    if (openAccordion[key] && explanations[key]) {
      setOpenAccordion((prev) => ({ ...prev, [key]: false }));
      return;
    }

    setOpenAccordion((prev) => ({ ...prev, [key]: true }));
    if (explanations[key]) return;

    setLoadingAiMap((prev) => ({ ...prev, [key]: true }));

    try {
      const train = trains.find((t) => t.id === alert.train_id || t.number === alert.train_id);
      // Use backend-proxied structured explanation
      const result = await api.aiExplainConflict({
        alertId: alert.id || null,
        trainId: train?.id || train?.number || alert.train_id || null,
        alertMessage: alert.message || null,
        alertAction: alert.action_taken || null,
      });
      setExplanations((prev) => ({ ...prev, [key]: { structured: result, error: null } }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [key]: { structured: null, error: err.message || "Failed to generate AI explanation" },
      }));
    } finally {
      setLoadingAiMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const blockStartObj = new Date(activeBlock.start_time);
  const blockEndObj = new Date(activeBlock.end_time);
  const blockStartMin = blockStartObj.getHours() * 60 + blockStartObj.getMinutes();
  const blockEndMin = blockEndObj.getHours() * 60 + blockEndObj.getMinutes();
  
  const timelineStartMin = blockStartMin - 30;
  const timelineEndMin = blockEndMin + 30;

  // Convert time to percentage position along timeline
  const getTimelinePercent = (isoStr) => {
    if (!isoStr) return 50;
    try {
      const date = new Date(isoStr);
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const pct = ((totalMinutes - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100;
      return Math.max(3, Math.min(97, pct));
    } catch {
      return 50;
    }
  };

  const formatMinToTime = (totalMin) => {
    const h = Math.floor(totalMin / 60) % 24;
    const m = Math.floor(totalMin % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Filter trains to those passing within the timeline window
  const relevantTrains = trains.filter(t => {
    if (!t.actual_pass_time) return false;
    const date = new Date(t.actual_pass_time);
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    return totalMinutes >= timelineStartMin && totalMinutes <= timelineEndMin;
  });

  const blockStartPct = getTimelinePercent(activeBlock.start_time);
  const blockEndPct = getTimelinePercent(activeBlock.end_time);
  const blockWidthPct = Math.max(5, blockEndPct - blockStartPct);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1F3864]">Live Track & RTIS Conflict Monitor</h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Section <span className="font-semibold text-[#1F3864]">{activeSection}</span> · Real-time train telemetry vs active maintenance block window
          </p>
        </div>

        {/* Check Conflicts Action */}
        <button
          onClick={() => runCheckConflicts()}
          disabled={checkingConflicts}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${checkingConflicts ? "animate-spin" : ""}`} />
          <span>{checkingConflicts ? "Scanning RTIS Feed..." : "Check Conflicts"}</span>
        </button>
      </div>

      {/* Track & Timeline Visualizer */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrainFront className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#1F3864]">
              Corridor Timeline & Live Train Positions
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
              <span className="text-[#64748B]">Active Maintenance Block</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[#64748B]">High Priority / Late Train</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-600" />
              <span className="text-[#64748B]">Regular Train</span>
            </div>
          </div>
        </div>

        {/* The Track Visualizer */}
        <div className="py-6 px-2">
          {/* Time scale headers */}
          <div className="flex justify-between text-[11px] font-mono text-[#64748B] mb-2 px-1">
            {[0, 0.166, 0.333, 0.5, 0.666, 0.833, 1].map((pct, i) => (
              <span key={i}>{formatMinToTime(timelineStartMin + (timelineEndMin - timelineStartMin) * pct)}</span>
            ))}
          </div>

          {/* Railway Tracks background */}
          <div className="relative h-24 bg-slate-900 rounded-2xl p-3 flex flex-col justify-center overflow-hidden shadow-inner">
            {/* Sleeper lines background */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,#fff_0,#fff_2px,transparent_0,transparent_16px)] pointer-events-none" />

            {/* Rails */}
            <div className="w-full h-0.5 bg-slate-400/80 mb-4" />
            <div className="w-full h-0.5 bg-slate-400/80" />

            {/* Active Block Window Overlay */}
            <div
              className="absolute top-2 bottom-2 bg-blue-500/30 border-2 border-blue-400 rounded-xl backdrop-blur-xs flex items-center justify-center transition-all duration-300 z-10"
              style={{
                left: `${blockStartPct}%`,
                width: `${blockWidthPct}%`,
              }}
            >
              <span className="text-[10px] font-mono font-bold text-blue-200 uppercase tracking-widest bg-[#1F3864]/90 px-2 py-0.5 rounded shadow-sm border border-blue-400/40">
                ACTIVE BLOCK ({formatMinToTime(blockStartMin)} - {formatMinToTime(blockEndMin)})
              </span>
            </div>

            {/* Train Markers */}
            {relevantTrains.map((train, idx) => {
              const actualPct = getTimelinePercent(train.actual_pass_time);
              const isHigh = train.priority === "high";
              const isLate = train.is_late;
              const isConflict =
                actualPct >= blockStartPct - 1 && actualPct <= blockEndPct + 1;

              return (
                <div
                  key={train.id || idx}
                  className="absolute z-20 -translate-x-1/2 group cursor-pointer"
                  style={{ left: `${actualPct}%`, top: "18%" }}
                >
                  {/* Train Dot / Icon */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform group-hover:scale-125 border-2 ${
                      isHigh || isLate
                        ? "bg-[#DC2626] border-white shadow-red-500/50"
                        : "bg-slate-700 border-slate-300"
                    } ${isConflict ? "animate-bounce" : ""}`}
                  >
                    <TrainFront className="w-4 h-4" />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                      <div>Train #{train.number}</div>
                      <div className="text-[10px] text-slate-300">
                        {isHigh ? "HIGH PRIORITY" : "LOW PRIORITY"} ·{" "}
                        {isLate ? "LATE" : "ON TIME"} (Slack: {train.slack_minutes}m)
                      </div>
                      <div className="text-[10px] text-blue-300 font-mono">
                        Pass: {new Date(train.actual_pass_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Train Schedule & Telemetry Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1F3864]">Simulated Live Train Positions (RTIS)</h2>
            <p className="text-xs text-[#64748B]">Approaching trains scheduled through section {activeSection}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-[#1F3864]">
            {relevantTrains.length} Trains in Corridor
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Train Number</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4">Scheduled Pass Time</th>
                <th className="py-3 px-4">Live Pass Time (RTIS)</th>
                <th className="py-3 px-4">Slack Buffer</th>
                <th className="py-3 px-4">Running Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {relevantTrains.map((train) => {
                const isHigh = train.priority === "high";
                const isLate = train.is_late;
                const scheduledTime = train.scheduled_pass_time
                  ? new Date(train.scheduled_pass_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A";
                const actualTime = train.actual_pass_time
                  ? new Date(train.actual_pass_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A";

                return (
                  <tr key={train.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1F3864] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <TrainFront className="w-4 h-4 text-slate-500" />
                        <span>{train.number}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          isHigh
                            ? "bg-red-50 text-[#DC2626] border-red-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {train.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-[#64748B]">
                      {scheduledTime}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs font-semibold text-[#1E293B]">
                      {actualTime}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold text-[#1E293B]">
                      {train.slack_minutes} min
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                          isLate
                            ? "bg-red-100 text-[#DC2626]"
                            : "bg-emerald-100 text-[#16A34A]"
                        }`}
                      >
                        {isLate ? "Late Running" : "On Time"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict Alerts Feed */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
            <div>
              <h2 className="text-base font-bold text-[#1F3864]">
                Active Conflict Interventions & Decisions
              </h2>
              <p className="text-xs text-[#64748B]">
                Decisions computed by priority & slack rules (High Priority, Late, Slack Hold)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-red-100 text-[#DC2626] rounded-lg">
            {alerts.length} Active Alerts
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">No conflicts currently raised</p>
            <p className="text-xs text-slate-500 mt-1">
              Click the "Check Conflicts" button above to evaluate live train positions against the active block.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, idx) => {
              const key = alert.id || idx;
              const isPaused = alert.action_taken === "block_paused";
              const isOpen = openAccordion[key];
              const aiData = explanations[key];
              const isLoadingAi = loadingAiMap[key];

              return (
                <div
                  key={key}
                  className={`rounded-xl border border-l-4 transition-all ${
                    isPaused
                      ? "border-l-[#DC2626] border-[#E2E8F0] bg-white shadow-xs"
                      : "border-l-[#D97706] border-[#E2E8F0] bg-white shadow-xs"
                  }`}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            isPaused
                              ? "bg-red-100 text-[#DC2626]"
                              : "bg-amber-100 text-[#D97706]"
                          }`}
                        >
                          {alert.action_taken}
                        </span>
                        <span className="text-xs text-[#64748B] flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {alert.created_at
                            ? new Date(alert.created_at).toLocaleTimeString()
                            : "Live"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#1E293B]">
                        {alert.message}
                      </p>
                    </div>

                    {/* AI Explain Button */}
                    <button
                      onClick={() => handleExplainConflict(alert, idx)}
                      disabled={isLoadingAi}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold shadow-2xs transition-colors"
                      title={apiKey ? "Explain with RailBlock AI" : "Add AI API Key in Settings"}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isLoadingAi ? "animate-spin" : ""}`} />
                      <span>{isOpen ? "Hide Explanation" : "Explain this conflict"}</span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Collapsible AI Explanation Drawer */}
                  {isOpen && (
                    <div className="p-4 border-t border-[#E2E8F0] bg-slate-50/70 rounded-b-xl space-y-3 animate-slide-down">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1F3864]">
                        <Sparkles className="w-4 h-4 text-[#2563EB]" />
                        <span>RailBlock AI Conflict Analysis & Guidance:</span>
                      </div>

                      {isLoadingAi && (
                        <div className="py-4 flex items-center gap-2 text-xs text-[#64748B]">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Generating operational root cause analysis...</span>
                        </div>
                      )}

                      {aiData?.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-[#DC2626]">
                          {aiData.error}
                        </div>
                      )}

                      {aiData?.structured && (
                        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs text-[#1E293B] space-y-3">
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">Root Cause</p>
                            <p>{aiData.structured.root_cause}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Operational Impact</p>
                            <p>{aiData.structured.operational_impact}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">Recommended Action</p>
                            <p>{aiData.structured.recommended_action}</p>
                          </div>
                          {aiData.structured.severity_assessment && (
                            <div className="pt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                aiData.structured.severity_assessment === "CRITICAL" ? "bg-red-100 text-red-700 border-red-200" :
                                aiData.structured.severity_assessment === "HIGH" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                "bg-blue-100 text-blue-700 border-blue-200"
                              }`}>
                                Severity: {aiData.structured.severity_assessment}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fallback: plain-text content from old format */}
                      {aiData?.content && !aiData?.structured && (
                        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs text-[#1E293B]">
                          <FormattedAiText text={aiData.content} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
