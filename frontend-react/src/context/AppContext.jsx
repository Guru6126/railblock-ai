import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getSectionName, getBackendUrl, getApiKey } from "../services/api";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [trains, setTrains] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(getSectionName());
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Show a momentary toast
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Fetch all primary datasets
  const refreshAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [tasksRes, trainsRes, blocksRes, alertsRes] = await Promise.all([
        api.getTasks().catch((err) => {
          console.warn("Failed to load tasks", err);
          return [];
        }),
        api.getTrains().catch((err) => {
          console.warn("Failed to load trains", err);
          return [];
        }),
        api.getBlocks().catch((err) => {
          console.warn("Failed to load blocks", err);
          return [];
        }),
        api.getAlerts().catch((err) => {
          console.warn("Failed to load alerts", err);
          return [];
        }),
      ]);

      setTasks(tasksRes || []);
      setTrains(trainsRes || []);
      setBlocks(blocksRes || []);
      setAlerts(alertsRes || []);
    } catch (err) {
      setError(err.message || "Failed to sync with backend API");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Run CP-SAT Optimizer
  const runOptimize = useCallback(async () => {
    setOptimizing(true);
    setError(null);
    try {
      const res = await api.optimize(activeSection);
      await refreshAll(true);
      showToast(`Optimization complete! Merged ${res.task_count_before} tasks into 1 Shadow Block (${res.reduction_pct}% reduction).`, "success");
      return res;
    } catch (err) {
      setError(err.message || "Optimization failed");
      showToast(err.message || "Optimization failed", "danger");
      throw err;
    } finally {
      setOptimizing(false);
    }
  }, [activeSection, refreshAll, showToast]);

  // Run Conflict Monitor
  const runCheckConflicts = useCallback(async () => {
    setCheckingConflicts(true);
    setError(null);
    try {
      const res = await api.checkConflicts(activeSection);
      await refreshAll(true);
      if (res.length > 0) {
        showToast(`Conflict check finished: ${res.length} conflict alert(s) raised.`, "warning");
      } else {
        showToast("Conflict check finished: Section is clear. No conflicts detected.", "success");
      }
      return res;
    } catch (err) {
      setError(err.message || "Conflict monitor check failed");
      showToast(err.message || "Conflict monitor check failed", "danger");
      throw err;
    } finally {
      setCheckingConflicts(false);
    }
  }, [activeSection, refreshAll, showToast]);

  // Reset demo scenario
  const resetDemo = useCallback(async (scenarioName = "Demo Scenario") => {
    setLoading(true);
    setError(null);
    try {
      await api.resetScenario();
      await refreshAll(true);
      showToast(`Loaded ${scenarioName}: Reseeded 3 tasks & 4 simulated trains.`, "success");
    } catch (err) {
      setError(err.message || "Reset failed");
      showToast(err.message || "Reset failed", "danger");
    } finally {
      setLoading(false);
    }
  }, [refreshAll, showToast]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Derived state: Filter by activeSection
  const sectionTasks = tasks.filter((t) => t.section === activeSection);
  const sectionTrains = trains.filter((t) => t.section === activeSection);
  const sectionBlocks = blocks.filter((b) => b.section === activeSection);
  
  const sectionTrainIds = new Set(sectionTrains.map((t) => t.id));
  const sectionBlockIds = new Set(sectionBlocks.map((b) => b.id));
  const sectionAlerts = alerts.filter(
    (a) => sectionBlockIds.has(a.block_id)
  );

  // Derived live status
  const hasConflict = sectionAlerts.length > 0;
  const liveStatus = hasConflict ? "conflict" : "clear";

  const value = {
    tasks: sectionTasks,
    trains: sectionTrains,
    blocks: sectionBlocks,
    alerts: sectionAlerts,
    loading,
    optimizing,
    checkingConflicts,
    error,
    setError,
    activeSection,
    setActiveSection,
    backendUrl,
    setBackendUrlState,
    apiKey,
    setApiKeyState,
    toast,
    showToast,
    activeTab,
    setActiveTab,
    refreshAll,
    runOptimize,
    runCheckConflicts,
    resetDemo,
    liveStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
