"use client";
import { useEffect, useState } from "react";

export function Share({ title, label, copyLabel, copiedLabel }: { title: string; label: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState<boolean | "fail">(false);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  const enc = (s: string) => encodeURIComponent(s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ""));
  const btn = "flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3.5 text-sm font-bold text-ink-2 transition-colors hover:border-line-2 hover:text-ink";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-3">{label}</span>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          // in-app browsers (Telegram, Instagram) and iframes often block the clipboard API: fall back to a hidden
          // textarea, and when even that fails show the link so it can be copied by hand (audit 12.11)
          const href = window.location.href;
          let ok = false;
          try { await navigator.clipboard.writeText(href); ok = true; } catch {
            try { const ta = document.createElement("textarea"); ta.value = href; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch { ok = false; }
          }
          setCopied(ok ? true : "fail"); setTimeout(() => setCopied(false), ok ? 1800 : 6000);
        }}
      >
        {copied === true ? "✓ " + copiedLabel : copyLabel}
      </button>
      <a className={btn} target="_blank" rel="noopener" href={`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`}>Telegram</a>
      {copied === "fail" && <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={copyLabel} className="h-10 w-full min-w-0 rounded-xl border border-amber/50 bg-surface px-3 font-mono text-xs text-ink sm:w-72" />}
      <a className={btn} target="_blank" rel="noopener" href={`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`}>X</a>
    </div>
  );
}
