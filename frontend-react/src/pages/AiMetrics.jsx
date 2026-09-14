import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Clock, CalendarDays, Server, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";

export default function AiMetrics() {
  const { blocks, tasks, activeSection } = useApp();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const data = await api.getKpis();
        setKpis(data);
      } catch (err) {
        console.error("Failed to fetch KPIs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
  }, [blocks]); // re-fetch when blocks update

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Server className="w-8 h-8 animate-pulse text-blue-500" />
          <p className="font-semibold text-sm">Calculating Performance Metrics...</p>
        </div>
      </div>
    );
  }

  // Real availability calculation:
  // Traditional sequential duration:
  const traditionalDurationMins = tasks.reduce((sum, task) => sum + task.est_duration_min, 0);
  
  // AI block duration:
  const aiDurationMins = blocks.reduce((sum, block) => {
    const start = new Date(block.start_time);
    const end = new Date(block.end_time);
    return sum + Math.round((end - start) / 60000);
  }, 0);

  const traditionalBlocks = tasks.length; // Worst case: 1 block per task
  const aiBlocks = blocks.length;
  const blocksSaved = Math.max(0, traditionalBlocks - aiBlocks);
  
  const availabilityGain = Math.max(0, traditionalDurationMins - aiDurationMins);
  
  let utilizationGain = 0;
  if (aiDurationMins > 0) {
    utilizationGain = Math.round(((traditionalDurationMins - aiDurationMins) / aiDurationMins) * 100);
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">AI Performance Metrics</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Comparative analysis of RailBlock AI vs Traditional Scheduling for Section {activeSection}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Blocks Saved</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#1F3864]">{blocksSaved}</span>
              <span className="text-sm font-semibold text-emerald-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Fewer Disruptions
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">By combining tasks in parallel across departments.</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Network Availability</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#1F3864]">+{Math.round(availabilityGain / 60)}h</span>
              <span className="text-sm font-semibold text-blue-600">
                Gained
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">Additional train running hours unlocked.</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Asset Utilization</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#1F3864]">+{utilizationGain}%</span>
              <span className="text-sm font-semibold text-violet-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Increase
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">More dense packing of maintenance work per hour.</p>
          </div>
        </div>
      </div>

      {/* Side by side comparison chart */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#1F3864] mb-6">Schedule Efficiency: Traditional vs AI</h3>
        
        <div className="space-y-8">
          {/* Traditional Bar */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-slate-600">Traditional Sequential Scheduling</span>
              <span className="text-slate-600">{traditionalBlocks} Blocks Required</span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden flex">
              {Array.from({ length: traditionalBlocks }).map((_, i) => (
                <div key={i} className="flex-1 border-r border-white bg-slate-400" title={`Block ${i+1}`} />
              ))}
            </div>
          </div>

          {/* AI Bar */}
          <div>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-[#2563EB] flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> RailBlock AI Optimization</span>
              <span className="text-[#2563EB]">{aiBlocks} Blocks Required</span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out flex items-center text-[10px] font-bold text-white px-2"
                style={{ width: `${(aiBlocks / traditionalBlocks) * 100}%` }}
              >
                {aiBlocks > 0 ? "Consolidated AI Block" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Calculation Explanation */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-sm text-slate-600 shadow-inner">
        <h4 className="font-bold text-[#1F3864] mb-3">How these KPIs are calculated</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-2">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-700">Blocks Saved: </span>
              <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1 border border-slate-300">
                {traditionalBlocks} (Total Tasks) - {aiBlocks} (Optimized Blocks) = {blocksSaved} Blocks Saved
              </span>
              <p className="text-xs mt-1">Traditionally, departments request separate, sequential blocks. The CP-SAT algorithm consolidates parallel-compatible tasks into a single block window, saving the difference.</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-700">Network Availability Gained: </span>
              <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1 border border-slate-300">
                {traditionalDurationMins}m (Traditional Duration) - {aiDurationMins}m (AI Block Duration) = {availabilityGain} minutes ({Math.round(availabilityGain/60)} hours)
              </span>
              <p className="text-xs mt-1">Traditionally, total disruption equals the sum of every task's duration. Through parallel execution, the total disruption is only the length of the optimized block window. The difference is time handed back to freight and passenger train operations.</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-700">Asset Utilization: </span>
              <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1 border border-slate-300">
                (({traditionalDurationMins}m - {aiDurationMins}m) ÷ {aiDurationMins}m) × 100 = +{utilizationGain}%
              </span>
              <p className="text-xs mt-1">A metric reflecting the density of tasks packed into a single hour of maintenance. By allowing Track, Signal, and OHE teams to work simultaneously, the utilization of the blocked track section increases dramatically.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
