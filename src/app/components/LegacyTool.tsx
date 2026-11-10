"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, Sparkles } from "lucide-react";

const QueryGPT = dynamic(() => import("./QueryGPT"), {
  ssr: false,
  loading: () => <p className="legacy-description">Loading the original text tool…</p>,
});

export default function LegacyTool() {
  const [open, setOpen] = useState(false);
  return (
    <details className="legacy-tool" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><span><Sparkles size={16} /> Original LingOSwap text style tool</span><span className="legacy-summary-note">Gen Z · Millennial · Boomer <ArrowDown size={13} /></span></summary>
      {open && <><p className="legacy-description">The original Cohere-powered slang rewriter remains available as a separate text tool.</p><QueryGPT placeholder="Write a phrase to remix across generations…" /></>}
    </details>
  );
}
