/**
 * Coin logo by ticker, from public exchange icon CDNs (audit 12.11). Measured on the token index: Gate's CDN has
 * 56 of 62 tickers, OKX's adds one more; the old bin.bnbstatic.com/static/assets/logos path no longer serves files.
 * The first URL is the main logo, the rest are tried in order if it fails; the monogram shows if none loads.
 */
export function coinLogos(sym: string): [string, ...string[]] {
  const s = sym.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [`https://icon.gateimg.com/images/coin_icon/64/${s}.png`, `https://static.okx.com/cdn/oksupport/asset/currency/icon/${s}.png`];
}

/** Monogram that fits a round badge: up to 3 narrow letters, 2 when the ticker is wide (M, W, O…). */
export function coinMonogram(sym: string): string {
  const s = sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /[MWOQDGHNU]/.test(s.slice(0, 3)) ? s.slice(0, 2) : s.slice(0, 3);
}
