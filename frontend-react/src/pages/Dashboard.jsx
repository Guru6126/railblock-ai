import React, { useState } from "react";
import {
  ClipboardList,
  Layers,
  AlertTriangle,
  Radio,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useApp } from "../context/AppContext";
import { analyzeRiskAI } from "../services/claude";
import AIReportModal from "../components/AIReportModal";

export default function Dashboard() {
  const {
    tasks,
    blocks,
    alerts,
    activeSection,
    setActiveTab,
    resetDemo,
    apiKey,
  } = useApp();

  const [aiModal, setAiModal] = useState({
    isOpen: false,
    loading: false,
    content: null,
    error: null,
  });

  // Calculate stats
  const pendingTasksCount = tasks.length;
  const blocksTodayCount = blocks.length;
  const conflictsCount = alerts.length;
  const sectionsActiveCount = 1; // Prototype section

  // Severity breakdown
  const severityCounts = {
    critical: tasks.filter((t) => t.severity === "critical").length,
    high: tasks.filter((t) => t.severity === "high").length,
    medium: tasks.filter((t) => t.severity === "medium").length,
    low: tasks.filter((t) => t.severity === "low").length,
  };

  const severityData = [
    { name: "Critical", count: severityCounts.critical, color: "#DC2626" },
    { name: "High", count: severityCounts.high, color: "#D97706" },
    { name: "Medium", count: severityCounts.medium, color: "#EAB308" },
    { name: "Low", count: severityCounts.low, color: "#16A34A" },
  ];

  // Department breakdown
  const deptCounts = {
    Track: tasks.filter((t) => t.department === "track").length,
    Signal: tasks.filter((t) => t.department === "signal").length,
    OHE: tasks.filter((t) => t.department === "ohe").length,
  };

  const deptData = [
    { name: "Track (TMS)", count: deptCounts.Track, color: "#2563EB" },
    { name: "Signal (SMMS)", count: deptCounts.Signal, color: "#7C3AED" },
    { name: "OHE (TDMS)", count: deptCounts.OHE, color: "#0891B2" },
  ];

  const handleAnalyseRisk = async () => {
    setAiModal({
      isOpen: true,
      loading: true,
      content: null,
      error: null,
    });

    try {
      const activeBlock = blocks[0] || null;
      const res = await analyzeRiskAI(tasks, activeBlock);
      setAiModal({
        isOpen: true,
        loading: false,
        content: res,
        error: null,
      });
    } catch (err) {
      setAiModal({
        isOpen: true,
        loading: false,
        content: null,
        error: err.message || "Failed to generate risk analysis",
      });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Operations Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Section <span className="font-semibold text-[#1F3864]">{activeSection}</span> · Real-time Block & Disconnection Overview
          </p>
        </div>

      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Pending Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Pending Tasks
            </span>
            <div className="text-3xl font-extrabold text-[#1F3864]">{pendingTasksCount}</div>
            <p className="text-xs text-blue-600 font-medium">3 Departments active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Blocks Today */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Blocks Planned
            </span>
            <div className="text-3xl font-extrabold text-[#1F3864]">{blocksTodayCount}</div>
            <p className="text-xs text-emerald-600 font-medium">
              {blocksTodayCount > 0 ? "1 Merged Shadow Block" : "No active block"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16A34A]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Conflicts Detected */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Conflicts Detected
            </span>
            <div
              className={`text-3xl font-extrabold ${
                conflictsCount > 0 ? "text-[#DC2626]" : "text-[#1F3864]"
              }`}
            >
              {conflictsCount}
            </div>
            <p
              className={`text-xs font-medium ${
                conflictsCount > 0 ? "text-red-600 font-semibold" : "text-slate-500"
              }`}
            >
              {conflictsCount > 0 ? "Live RTIS Interventions" : "0 conflicts"}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
              conflictsCount > 0
                ? "bg-red-50 border-red-200 text-[#DC2626]"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Active Sections */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Sections Monitored
            </span>
            <div className="text-3xl font-extrabold text-[#1F3864]">1</div>
            <p className="text-xs text-slate-500 font-medium">SEC-14 Corridor</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#1F3864]">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1F3864]">
                Priority & Severity Breakdown
              </h2>
              <p className="text-xs text-[#64748B]">Task count distribution by urgency</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              {tasks.length} Total Requests
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1F3864]">
                Department Request Breakdown
              </h2>
              <p className="text-xs text-[#64748B]">Multi-department requests in SEC-14</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#2563EB] rounded-lg">
              3 Systems Integrated
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={deptData}
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#1E293B", fontWeight: 500 }} />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Alerts Preview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1F3864]">Recent Conflict Alerts</h2>
              <p className="text-xs text-[#64748B]">Live RTIS collision & hold telemetry</p>
            </div>
            <button
              onClick={() => setActiveTab("monitor")}
              className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>View All in Live Monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700">No active conflict alerts</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Run optimizer and check conflicts in the Live Monitor tab
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert, idx) => {
                const isPaused = alert.action_taken === "block_paused";
                return (
                  <div
                    key={alert.id || idx}
                    className={`p-4 rounded-xl border-l-4 border bg-white flex items-start justify-between gap-4 shadow-2xs ${
                      isPaused
                        ? "border-l-[#DC2626] border-[#E2E8F0] bg-red-50/20"
                        : "border-l-[#D97706] border-[#E2E8F0] bg-amber-50/20"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isPaused
                              ? "bg-red-100 text-[#DC2626]"
                              : "bg-amber-100 text-[#D97706]"
                          }`}
                        >
                          {alert.action_taken}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          {alert.created_at
                            ? new Date(alert.created_at).toLocaleTimeString()
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#1E293B]">{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1F3864]">Quick Operations</h2>
            <p className="text-xs text-[#64748B]">Direct shortcuts for block planning</p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveTab("optimizer")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100 hover:bg-blue-100/70 text-[#1F3864] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-xs font-semibold">Open Block Optimizer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
              </button>

              <button
                onClick={() => setActiveTab("monitor")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[#1E293B] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-[#64748B]" />
                  <span className="text-xs font-semibold">Live Monitor & Conflicts</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              <button
                onClick={() => setActiveTab("scenarios")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[#1E293B] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[#D97706]" />
                  <span className="text-xs font-semibold">Load Demo Scenarios</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Scenario Status: SEC-14 Ready</span>
            <button
              onClick={() => resetDemo("Scenario 1")}
              className="font-bold text-[#2563EB] hover:underline"
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* AI Risk Modal */}
      <AIReportModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal((prev) => ({ ...prev, isOpen: false }))}
        title="RailBlock AI Risk Assessment"
        subtitle={`Audit for Section ${activeSection} · Powered by Groq Cloud Llama-3.3`}
        content={aiModal.content}
        loading={aiModal.loading}
        error={aiModal.error}
      />
    </div>
  );
}
