import React from "react";
import {
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Key,
  MapPin,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { setSectionName } from "../services/api";

export default function TopBar() {
  const {
    activeSection,
    liveStatus,
    alerts,
    loading,
    refreshAll,
    apiKey,
    setActiveTab,
    setActiveSection,
    resetDemo,
  } = useApp();

  return (
    <header className="h-20 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Section and Live Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-[#E2E8F0]">
          <MapPin className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            Section:
          </span>
          <select
            value={activeSection}
            onChange={(e) => {
              const newSec = e.target.value;
              setSectionName(newSec);
              setActiveSection(newSec);
              setTimeout(() => refreshAll(), 0);
            }}
            className="text-sm font-bold text-[#1F3864] bg-transparent border-none outline-none cursor-pointer"
          >
            <option value="SEC-14">SEC-14</option>
            <option value="SEC-15">SEC-15</option>
            <option value="SEC-16">SEC-16</option>
            <option value="SEC-17">SEC-17</option>
          </select>
        </div>

        {/* Live Status Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all ${
            liveStatus === "conflict"
              ? "bg-red-50 border-red-200 text-[#DC2626]"
              : "bg-emerald-50 border-emerald-200 text-[#16A34A]"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                liveStatus === "conflict" ? "bg-red-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                liveStatus === "conflict" ? "bg-[#DC2626]" : "bg-[#16A34A]"
              }`}
            />
          </span>
          <span>
            {liveStatus === "conflict"
              ? `Conflict Detected (${alerts.length})`
              : "Live Track Clear"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
      </div>
    </header>
  );
}
