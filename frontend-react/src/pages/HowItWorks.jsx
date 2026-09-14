import React from "react";
import { 
  BookOpen, 
  Cpu, 
  BrainCircuit, 
  Activity,
  ArrowRight,
  Database,
  Network,
  ShieldCheck,
  Sparkles
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
            <BookOpen className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1F3864] tracking-tight">System Architecture & AI Documentation</h1>
            <p className="text-sm text-[#64748B] mt-1 font-medium">
              Under the hood: How RailBlock AI transforms railway scheduling
            </p>
          </div>
        </div>
      </div>

      {/* Flowchart Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-[#1F3864]">Application Data Flow</h2>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm overflow-x-auto">
          <div className="min-w-[800px] flex items-center justify-between gap-4">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-3 w-40 text-center relative group">
              <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center shadow-inner group-hover:border-blue-400 transition-colors">
                <Database className="w-7 h-7 text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3864]">Data Ingestion</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">TMS, SMMS, TDMS backlogs & live RTIS telemetry</p>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-3 w-40 text-center relative group">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-inner group-hover:border-blue-500 transition-colors">
                <Cpu className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3864]">Heuristic Scoring</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Multi-variate formula scoring tasks by severity & delay</p>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-3 w-40 text-center relative group">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-inner group-hover:border-emerald-500 transition-colors relative">
                <BrainCircuit className="w-7 h-7 text-emerald-600" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3864]">CP-SAT Optimizer</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Google OR-Tools packs tasks in parallel</p>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-3 w-40 text-center relative group">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center shadow-inner group-hover:border-indigo-500 transition-colors">
                <ShieldCheck className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3864]">COA Approval</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Managerial sign-off on the consolidated block</p>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />

            {/* Step 5 */}
            <div className="flex flex-col items-center gap-3 w-40 text-center relative group">
              <div className="w-16 h-16 rounded-full bg-violet-50 border-2 border-violet-200 flex items-center justify-center shadow-inner group-hover:border-violet-500 transition-colors relative">
                <Activity className="w-7 h-7 text-violet-600" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3864]">Live Monitor & AI</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">LLM resolves train conflicts vs active blocks</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ML Algorithms & Formulas */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-[#1F3864]">Algorithms & Optimization</h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
            
            {/* Heuristic Formula */}
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#1F3864] uppercase tracking-wider mb-3">1. Heuristic Priority Scoring</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Before optimization, tasks are ranked using a multi-variate weighted formula. This ensures that only the most critical or overdue tasks are passed to the solver.
              </p>
              
              <div className="bg-slate-900 rounded-xl p-5 font-mono text-xs shadow-inner overflow-x-auto text-slate-300">
                <div className="mb-2 text-emerald-400"># Priority Score Calculation</div>
                <div>Score = (W₁ × Severity) + (W₂ × OverdueDays)</div>
                <div className="mt-3 text-slate-500">
                  Where:<br/>
                  W₁ = 0.7 (Severity Weight)<br/>
                  W₂ = 0.3 (Overdue Weight)
                </div>
              </div>
            </div>

            {/* CP-SAT Model */}
            <div className="p-6">
              <h3 className="text-sm font-bold text-[#1F3864] uppercase tracking-wider mb-3">2. Constraint Programming (CP-SAT)</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                We use Google OR-Tools CP-SAT solver to parallelize maintenance tasks. Unlike traditional methods which stack tasks sequentially, the AI calculates a schedule where different departments work simultaneously in the same block.
              </p>
              
              <div className="bg-slate-900 rounded-xl p-5 font-mono text-xs shadow-inner overflow-x-auto text-slate-300">
                <div className="mb-2 text-blue-400"># Objective Function</div>
                <div className="mb-4">Minimize(Makespan)</div>
                
                <div className="mb-2 text-blue-400"># Departmental Constraints</div>
                <div>For each department <span className="text-amber-400">D</span> in (Track, Signal, OHE):</div>
                <div className="ml-4">AddNoOverlap(Tasks in <span className="text-amber-400">D</span>)</div>
                <div className="mt-3 text-slate-500">
                  // Result: Tasks within the SAME department cannot overlap.<br/>
                  // Tasks in DIFFERENT departments CAN overlap (Parallel Execution).
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* The Role of Groq AI */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-violet-600" />
            <h2 className="text-xl font-bold text-[#1F3864]">The Role of Large Language Models (LLMs)</h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F3864]">Groq Cloud Integration</h3>
                <p className="text-xs text-slate-500">Powered by Meta Llama-3.3-70B-Versatile</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              While the CP-SAT algorithm handles the hard mathematics of scheduling, the application uses an LLM to interpret edge cases, perform risk analysis, and generate human-readable operational briefings for controllers.
            </p>

            <div className="space-y-4 flex-1">
              {/* Feature 1 */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-100 bg-violet-50/50">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F3864] uppercase mb-1">Live Conflict Resolution</h4>
                  <p className="text-xs text-slate-600">
                    When a train runs late and breaches an active block window, the LLM analyzes the RTIS telemetry (slack minutes, priority level, location) to determine the root cause of the conflict and outputs a structured recommendation (e.g., Hold Train vs Pause Block).
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-100 bg-violet-50/50">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F3864] uppercase mb-1">COA Handover Briefings</h4>
                  <p className="text-xs text-slate-600">
                    Instead of forcing the Section Controller to read raw JSON metrics, the LLM synthesizes the schedule data into a plain-english handover briefing, explaining exactly <em>why</em> the block was scheduled the way it was.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
