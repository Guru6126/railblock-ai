import React from "react";

/**
 * Renders raw AI output text into clean, formatted HTML elements
 * removing raw markdown characters (*, **, `, #, -) and rendering normal text.
 */
export default function FormattedAiText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  const processInline = (str) => {
    // Split inline markdown tokens: **bold**, *italic*, `code`
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-[#1F3864]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="italic text-slate-800 bg-slate-100 px-1 py-0.5 rounded">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="font-mono text-[11px] bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const flushList = (keyPrefix) => {
    if (currentList.length === 0) return;
    elements.push(
      <ul key={`ul-${keyPrefix}`} className="space-y-2 my-2 pl-1">
        {currentList.map((item, itemIdx) => (
          <li key={itemIdx} className="flex items-start gap-2 text-xs text-[#1E293B] leading-relaxed">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
            <span className="flex-1">{processInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Match bullets (- item, * item, 1. item)
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/) || trimmed.match(/^\d+\.\s+(.*)/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }

    flushList(idx);

    if (trimmed.startsWith("###")) {
      elements.push(
        <h4 key={idx} className="font-bold text-xs uppercase tracking-wider text-[#1F3864] mt-3 mb-1.5">
          {processInline(trimmed.replace(/^###\s*/, ""))}
        </h4>
      );
    } else if (trimmed.startsWith("##")) {
      elements.push(
        <h3 key={idx} className="font-bold text-sm text-[#1F3864] mt-4 mb-2">
          {processInline(trimmed.replace(/^##\s*/, ""))}
        </h3>
      );
    } else if (trimmed.startsWith("#")) {
      elements.push(
        <h2 key={idx} className="font-bold text-base text-[#1F3864] mt-4 mb-2">
          {processInline(trimmed.replace(/^#\s*/, ""))}
        </h2>
      );
    } else {
      elements.push(
        <p key={idx} className="text-xs text-[#1E293B] leading-relaxed mb-2">
          {processInline(trimmed)}
        </p>
      );
    }
  });

  flushList("final");

  return <div className="space-y-1 font-sans select-text">{elements}</div>;
}
