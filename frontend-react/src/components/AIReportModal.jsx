import React from "react";
import { Sparkles, X, Copy, Check, AlertCircle, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import FormattedAiText from "./FormattedAiText";

export default function AIReportModal({
  isOpen,
  onClose,
  title,
  subtitle,
  content,
  loading,
  error,
}) {
  const [copied, setCopied] = React.useState(false);
  const { setActiveTab } = useApp();

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-slide-down">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1F3864] to-[#2563EB] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-blue-100/80">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-sm text-[#1F3864]">
                  RailBlock AI is generating insights...
                </p>
                <p className="text-xs text-[#64748B]">
                  Processing live section telemetry & maintenance constraints
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626] space-y-2">
              <div className="flex items-start gap-2 font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>AI Service Notice</span>
              </div>
              <p className="text-xs text-red-700 pl-7">{error}</p>
              {error.toLowerCase().includes("api key") && (
                <div className="pl-7 pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      setActiveTab("settings");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Configure AI API Key</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !error && content && (
            <div className="bg-slate-50/70 border border-[#E2E8F0] rounded-xl p-5 text-sm text-[#1E293B]">
              <FormattedAiText text={content} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!loading && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[11px] text-[#64748B]">
              Powered by RailBlock Smart Operations Engine
            </span>
            <div className="flex items-center gap-2">
              {content && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[#1F3864] hover:bg-[#182c4f] text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
