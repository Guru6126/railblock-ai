import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Activity,
  TrainFront,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Sidebar() {
  const { activeTab, setActiveTab, alerts, tasks } = useApp();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "tasks",
      label: "Maintenance Tasks",
      icon: ClipboardList,
      badge: tasks.length ? tasks.length : null,
    },
    { id: "optimizer", label: "Block Optimizer", icon: Layers },
    {
      id: "monitor",
      label: "Live Monitor",
      icon: Activity,
      alertBadge: alerts.length > 0,
    },
  ];

  return (
    <aside className="w-[240px] min-w-[240px] bg-white border-r border-[#E2E8F0] flex flex-col justify-between h-screen sticky top-0 shadow-xs z-30 select-none">
      {/* Top Branding */}
      <div>
        <div className="p-5 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F3864] flex items-center justify-center text-white shadow-md shadow-blue-900/20">
            <TrainFront className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#1F3864] text-lg tracking-tight">RailBlock</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-[#2563EB]">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium leading-none mt-0.5">
              Smart Shadow Blocking
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-50/80 text-[#1F3864] font-semibold border-l-4 border-[#1F3864] shadow-xs"
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-slate-50 border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#2563EB]" : "text-[#64748B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {item.badge}
                  </span>
                )}

                {item.alertBadge && (
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#E2E8F0] bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              Ministry of Railways
            </span>
            <span className="text-xs font-semibold text-[#1F3864]">SIH 2026 · PS-26027</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#16A34A] pulse-glow" title="System Online" />
        </div>
      </div>
    </aside>
  );
}
