"use client";
import { useEffect, useState } from "react";

export function Share({ title, label, copyLabel, copiedLabel }: { title: string; label: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  const enc = encodeURIComponent;
  const btn = "flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3.5 text-sm font-bold text-ink-2 transition-colors hover:border-line-2 hover:text-ink";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-3">{label}</span>
      <button
        type="button"
        className={btn}
        onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}
      >
        {copied ? "✓ " + copiedLabel : copyLabel}
      </button>
      <a className={btn} target="_blank" rel="noopener" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`}>Telegram</a>
      <a className={btn} target="_blank" rel="noopener" href={`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`}>X</a>
    </div>
  );
}
