import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Optimizer from "./pages/Optimizer";
import LiveMonitor from "./pages/LiveMonitor";
import { AlertCircle, X } from "lucide-react";

function MainContent() {
  const { activeTab, error, setError, toast } = useApp();

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "tasks":
        return <Tasks />;
      case "optimizer":
        return <Optimizer />;
      case "monitor":
        return <LiveMonitor />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* Fixed Left Sidebar (240px) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopBar />

        {/* Global Inline Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-xs text-[#DC2626] font-semibold animate-slide-down">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-100 rounded-md text-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Page View */}
        <main className="flex-1 pb-16">{renderPage()}</main>

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-down">
            <div
              className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
                toast.type === "success"
                  ? "bg-emerald-900 text-emerald-100 border-emerald-700"
                  : toast.type === "danger"
                  ? "bg-red-900 text-red-100 border-red-700"
                  : toast.type === "warning"
                  ? "bg-amber-900 text-amber-100 border-amber-700"
                  : "bg-slate-900 text-slate-100 border-slate-700"
              }`}
            >
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
