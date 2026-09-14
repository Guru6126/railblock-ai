import React, { useState, useMemo } from "react";
import {
  ClipboardList,
  Sparkles,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Calendar,
  Layers,
  Plus,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import AIReportModal from "../components/AIReportModal";

export default function Tasks() {
  const { tasks, blocks, activeSection, apiKey, refreshAll, showToast } = useApp();

  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortField, setSortField] = useState("priority_score");
  const [sortDirection, setSortDirection] = useState("desc");

  const [aiModal, setAiModal] = useState({
    isOpen: false,
    loading: false,
    content: null,
    error: null,
  });

  // AI Prioritization state
  const [aiPriorityMap, setAiPriorityMap] = useState({});
  const [aiPrioritizing, setAiPrioritizing] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    section: activeSection,
    department: "track",
    severity: "medium",
    defect_desc: "",
    est_duration_min: 60,
    overdue_days: 0,
  });

  const handleAddTask = async () => {
    try {
      if (!newTask.defect_desc.trim()) {
        showToast("Description is required", "danger");
        return;
      }
      await api.addTask(newTask);
      showToast("Task added successfully", "success");
      setShowAddModal(false);
      setNewTask({ ...newTask, defect_desc: "" });
      refreshAll();
    } catch (err) {
      showToast("Failed to add task: " + err.message, "danger");
    }
  };

  // Department Badges
  const getDeptBadge = (dept) => {
    switch (dept?.toLowerCase()) {
      case "track":
        return {
          label: "Track (TMS)",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "signal":
        return {
          label: "Signal (SMMS)",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "ohe":
        return {
          label: "OHE (TDMS)",
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
        };
      default:
        return {
          label: dept || "Unknown",
          bg: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  // Severity Badges
  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-50 text-[#DC2626] border-red-200";
      case "high":
        return "bg-amber-50 text-[#D97706] border-amber-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-emerald-50 text-[#16A34A] border-emerald-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  // Filter and Sort
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (departmentFilter !== "all" && task.department !== departmentFilter) {
          return false;
        }
        if (severityFilter !== "all" && task.severity !== severityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === null || valA === undefined) valA = 0;
        if (valB === null || valB === undefined) valB = 0;

        if (typeof valA === "string") {
          return sortDirection === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortDirection === "asc" ? valA - valB : valB - valA;
      });
  }, [tasks, departmentFilter, severityFilter, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };



  const handleAiPrioritize = async () => {
    setAiPrioritizing(true);
    try {
      const results = await api.aiPrioritize();
      const map = {};
      results.forEach((r) => {
        map[r.id] = { ai_risk_score: r.ai_risk_score, risk_level: r.risk_level };
      });
      setAiPriorityMap(map);
    } catch (err) {
      console.error("AI prioritize failed:", err);
    } finally {
      setAiPrioritizing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Maintenance Block Requests</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Aggregated defect notices from Track (TMS), Signal (SMMS), and OHE (TDMS) in Section{" "}
            <span className="font-semibold text-[#1F3864]">{activeSection}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
          <button
            onClick={handleAiPrioritize}
            disabled={aiPrioritizing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-sm font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${aiPrioritizing ? 'animate-spin' : ''}`} />
            <span>{aiPrioritizing ? 'Prioritizing...' : 'AI Prioritize All Tasks'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span>Filters:</span>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 text-[#1E293B] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="track">Track (TMS)</option>
            <option value="signal">Signal (SMMS)</option>
            <option value="ohe">OHE (TDMS)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 text-[#1E293B] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(departmentFilter !== "all" || severityFilter !== "all") && (
            <button
              onClick={() => {
                setDepartmentFilter("all");
                setSeverityFilter("all");
              }}
              className="text-xs text-[#2563EB] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-[#64748B] font-medium">
          Showing <span className="font-bold text-[#1F3864]">{filteredTasks.length}</span> of{" "}
          {tasks.length} requests
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B] select-none">
              <tr>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Defect Description</th>
                <th
                  onClick={() => toggleSort("severity")}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1F3864]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Severity</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Section</th>
                <th
                  onClick={() => toggleSort("overdue_days")}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1F3864]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Overdue</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("est_duration_min")}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1F3864]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Duration</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("priority_score")}
                  className="py-3.5 px-4 cursor-pointer hover:text-[#1F3864]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority Score</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#2563EB]" />
                  </div>
                </th>
              <th className="py-3.5 px-4">Block Status</th>
                <th className="py-3.5 px-4">AI Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    No maintenance tasks match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const deptBadge = getDeptBadge(task.department);
                  const severityClass = getSeverityBadge(task.severity);
                  const score = task.priority_score || 0;
                  const scorePercent = Math.round(score * 100);

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Department */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${deptBadge.bg}`}
                        >
                          {deptBadge.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4 font-semibold text-[#1E293B]">
                        <div>{task.defect_desc}</div>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          ID: {task.id}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${severityClass}`}
                        >
                          {task.severity}
                        </span>
                      </td>

                      {/* Section */}
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-[#1E293B]">
                        {task.section}
                      </td>

                      {/* Overdue */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold">
                        <span
                          className={
                            task.overdue_days > 7
                              ? "text-[#DC2626]"
                              : task.overdue_days > 0
                              ? "text-[#D97706]"
                              : "text-slate-600"
                          }
                        >
                          {task.overdue_days} days
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#1E293B]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{task.est_duration_min} min</span>
                        </div>
                      </td>

                      {/* Priority Score Progress Bar */}
                      <td className="py-4 px-4 whitespace-nowrap min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-[#1F3864]">
                            <span>{score.toFixed(2)}</span>
                            <span className="text-[10px] text-[#64748B]">
                              {scorePercent}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 0.6
                                  ? "bg-gradient-to-r from-amber-500 to-red-500"
                                  : score >= 0.4
                                  ? "bg-gradient-to-r from-blue-500 to-amber-500"
                                  : "bg-gradient-to-r from-emerald-500 to-blue-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, scorePercent))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Block Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {task.block_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Optimized</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-[#64748B]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>

                      {/* AI Risk Score */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {aiPriorityMap[task.id] ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                              aiPriorityMap[task.id].ai_risk_score >= 80 ? 'bg-red-100 text-red-700 border-red-200' :
                              aiPriorityMap[task.id].ai_risk_score >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              aiPriorityMap[task.id].ai_risk_score >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>
                              {aiPriorityMap[task.id].ai_risk_score}/100
                            </span>
                            <span className="text-[10px] text-[#64748B]">{aiPriorityMap[task.id].risk_level}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-down">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-[#1F3864]">Add Maintenance Task</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Section</label>
                <select value={newTask.section} onChange={e => setNewTask({...newTask, section: e.target.value})} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="SEC-14">SEC-14</option>
                  <option value="SEC-15">SEC-15</option>
                  <option value="SEC-16">SEC-16</option>
                  <option value="SEC-17">SEC-17</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Department</label>
                <select value={newTask.department} onChange={e => setNewTask({...newTask, department: e.target.value})} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="track">Track (TMS)</option>
                  <option value="signal">Signal (SMMS)</option>
                  <option value="ohe">OHE (TDMS)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Severity</label>
                <select value={newTask.severity} onChange={e => setNewTask({...newTask, severity: e.target.value})} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Defect Description</label>
                <input type="text" value={newTask.defect_desc} onChange={e => setNewTask({...newTask, defect_desc: e.target.value})} placeholder="e.g. Broken rail joint" className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Duration (min)</label>
                  <input type="number" min="5" value={newTask.est_duration_min} onChange={e => setNewTask({...newTask, est_duration_min: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Overdue Days</label>
                  <input type="number" min="0" value={newTask.overdue_days} onChange={e => setNewTask({...newTask, overdue_days: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#1E293B] focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#1E293B] hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleAddTask} className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 shadow-md shadow-blue-900/20 rounded-xl transition-colors">Add Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
