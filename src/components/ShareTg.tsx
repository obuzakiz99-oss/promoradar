"use client";

/** Share one link: the phone's own share sheet when there is one, otherwise Telegram. */
export function ShareTg({ url, text, label }: { url: string; text: string; label: string }) {
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ""))}`;
  return (
    <a
      href={tg}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        if (typeof navigator !== "undefined" && navigator.share) {
          e.preventDefault();
          navigator.share({ title: text, text, url }).catch(() => { /* cancelled */ });
        }
      }}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white/[0.02] px-3 text-xs font-bold text-ink-2 hover:border-line-2 hover:text-ink"
    >
      ↗ {label}
    </a>
  );
}
