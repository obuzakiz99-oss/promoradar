// After `next build`: replace Next's bare "404: This page could not be found" with our own page.
// - old addresses of removed sections jump to their replacement (e.g. /uk/funding/ → /uk/unlocks/);
// - removed promo / launchpool pages jump to the list they belonged to;
// - anything else: a short message in the visitor's language with links home.
import fs from "node:fs";

const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>PromoRadar</title>
<style>
  :root{color-scheme:dark}
  html,body{margin:0;min-height:100%;background:#06080b;color:#a6b0bd;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
  main{max-width:34rem;margin:0 auto;padding:18vh 16px 40px;text-align:center}
  b{display:block;font-size:1.6rem;color:#eef2f6;margin-bottom:.5rem}
  a{display:inline-block;margin:.4rem .3rem;padding:.7rem 1.1rem;border-radius:12px;border:1px solid #232a33;color:#eef2f6;text-decoration:none;font-weight:700}
  a.p{background:#c8ff3d;border-color:#c8ff3d;color:#0b0f05}
</style>
<script>
(function () {
  var base = "/promoradar";
  var path = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : location.pathname;
  var m = path.match(/^\\/(uk|en|ru)(\\/.*)?$/);
  var saved = null; try { saved = localStorage.getItem("pr:lang"); } catch (e) {}
  var lang = m ? m[1] : (saved || "uk");
  var rest = m && m[2] ? m[2] : "/";
  // renamed / removed sections → their replacement
  var MOVED = { "/funding": "/unlocks/" };
  var key = rest.replace(/\\/+$/, "");
  var to = MOVED[key];
  if (!to && /^\\/p\\//.test(rest)) to = "/";              // a promo that has ended → the promo list
  if (!to && /^\\/lp\\//.test(rest)) to = "/launchpools/";  // an old launchpool → all launchpools
  if (!to && /^\\/t\\//.test(rest)) to = "/t/";              // a token page that is gone → token search
  if (to) { location.replace(base + "/" + lang + to); return; }
  window.__lang = lang;
})();
</script>
</head>
<body>
<main id="m">
  <b>Сторінку не знайдено</b>
  <p>Можливо, акція вже завершилась або сторінку перенесли.</p>
  <a class="p" href="/promoradar/uk/">На головну</a><a href="/promoradar/uk/launchpools/">Launchpool</a><a href="/promoradar/uk/drops/">Аірдропи</a>
</main>
<script>
(function () {
  var l = window.__lang || "uk";
  var T = {
    uk: ["Сторінку не знайдено", "Можливо, акція вже завершилась або сторінку перенесли.", "На головну", "Launchpool", "Аірдропи"],
    en: ["Page not found", "The promo may have ended or the page has moved.", "Home", "Launchpool", "Airdrops"],
    ru: ["Страница не найдена", "Возможно, акция уже завершилась или страницу перенесли.", "На главную", "Launchpool", "Аирдропы"]
  }[l] || null;
  if (!T) return;
  document.documentElement.lang = l;
  var m = document.getElementById("m");
  m.querySelector("b").textContent = T[0];
  m.querySelector("p").textContent = T[1];
  var a = m.querySelectorAll("a"), href = ["/", "/launchpools/", "/drops/"];
  for (var i = 0; i < a.length; i++) { a[i].textContent = T[2 + i]; a[i].href = "/promoradar/" + l + href[i]; }
})();
</script>
</body>
</html>
`;
fs.writeFileSync("out/404.html", html);
console.log("404.html written");
