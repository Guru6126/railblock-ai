import React, { useState } from "react";
import { CheckSquare, XCircle, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

export default function CoaApproval() {
  const { blocks, tasks, activeSection, showToast, refreshAll } = useApp();

  const handleApprove = async (blockId) => {
    try {
      await api.approveBlock(blockId);
      showToast("Block request formally approved by COA", "success");
      refreshAll(); // Fetch the updated block status
    } catch (err) {
      showToast("Failed to approve block: " + err.message, "danger");
    }
  };

  const handleReject = () => {
    showToast("Block request returned for revision", "warning");
  };

  // Only show blocks for the current section
  const sectionBlocks = blocks.filter((b) => b.section === activeSection);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">COA Block Approval</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Chief Operations Manager Authorization Dashboard
          </p>
        </div>
      </div>

      {sectionBlocks.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-lg font-semibold text-slate-600">No pending block requests</p>
          <p className="text-sm text-slate-500 mt-1">
            All maintenance requests for section {activeSection} have been processed.
          </p>
        </div>
      ) : (
        sectionBlocks.map((block) => {
          const isApproved = block.status === "active" || block.status === "completed";
          const blockTasks = tasks.filter((t) => t.block_id === block.id);
          
          const start = new Date(block.start_time);
          const end = new Date(block.end_time);
          const duration = Math.round((end - start) / 60000);

          return (
            <div key={block.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className={`p-5 border-b flex justify-between items-center ${isApproved ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h2 className="text-lg font-bold text-[#1F3864]">
                    Block Request: {block.id}
                  </h2>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">
                    Section {block.section} · Consolidated AI Proposal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isApproved ? "Approved by COA" : "Pending Approval"}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Time Window</p>
                    <p className="text-lg font-bold text-[#1F3864]">
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Duration</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <p className="text-lg font-bold text-[#1F3864]">{duration} minutes</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Impacted Tasks</p>
                    <p className="text-lg font-bold text-[#1F3864]">{blockTasks.length} Consolidated</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#1F3864] mb-3">Tasks Included in this Block</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-2">Dept</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">Severity</th>
                          <th className="px-4 py-2">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {blockTasks.map((t) => (
                          <tr key={t.id}>
                            <td className="px-4 py-3 font-semibold text-slate-700 uppercase">{t.department}</td>
                            <td className="px-4 py-3 text-slate-600">{t.defect_desc}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.severity === 'critical' || t.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {t.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{t.est_duration_min} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {!isApproved && (
                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Request Revision
                  </button>
                  <button
                    onClick={() => handleApprove(block.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md transition-colors"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Approve Block
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
