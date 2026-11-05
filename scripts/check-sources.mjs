// Probe candidate promo sources: status + a sample. usage: node scripts/probe.mjs
const H = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "application/json, text/plain, text/html, application/xml;q=0.9, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
const C = [
  // ---- CEX
  ["gate api", "https://www.gate.com/apiw/v2/announcement/list?page=1&limit=10&type=activity&lang=en"],
  ["gate rss", "https://www.gate.com/rss/en/announcements"],
  ["gate page", "https://www.gate.com/announcements/activities"],
  ["mexc api", "https://www.mexc.com/help/announce/api/en-US/section/15425930840734/articles?page=1&perPage=10"],
  ["mexc api2", "https://www.mexc.com/api/operation/announce/list?pageNum=1&pageSize=10&lang=en-US"],
  ["mexc events", "https://www.mexc.com/api/operateactivity/activity/list/v2?pageNum=1&pageSize=10&locale=en-US"],
  ["htx api", "https://www.htx.com/-/x/support/public/getList/v2?language=en-us&page=1&limit=10&oneLevelId=360000032161"],
  ["bingx api", "https://bingx.com/api/customer/v1/announcement/listArticles?sectionId=11257060005007&page=1&pageSize=10"],
  ["bitmart api", "https://www.bitmart.com/api/support/en-US/articles?section=Activities&page=1"],
  ["lbank api", "https://www.lbank.com/api/notice/list?lang=en-US&type=2&page=1&size=10"],
  ["coinex api", "https://www.coinex.com/res/support/announcement?lang=en_US&page=1&limit=10&category=activities"],
  ["whitebit", "https://whitebit.com/api/v4/public/platform/status"],
  ["xt api", "https://www.xt.com/sapi/v4/announcement/list?lang=en&page=1&size=10"],
  ["phemex", "https://phemex.com/api/phemex-support/articles?lang=en&category=Promotions&page=1"],
  ["crypto.com", "https://crypto.com/exchange/api/announcements?category=promotions"],
  ["kraken blog rss", "https://blog.kraken.com/feed"],
  ["coinbase blog", "https://www.coinbase.com/blog/rss"],
  ["upbit notices", "https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=10&category=event"],
  ["bithumb", "https://feed.bithumb.com/notice?category=9"],
  ["bitget activity", "https://api.bitget.com/api/v2/public/annoucements?language=en_US&annType=latest_news&annSubType=activity"],
  ["binance alpha/wallet", "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageNo=1&pageSize=20&catalogId=157"],
  ["okx jumpstart", "https://www.okx.com/api/v5/support/announcements?annType=announcements-jumpstart"],
  // ---- DEX / DeFi / aggregators
  ["galxe graphql", "https://graphigo.prd.galaxy.eco/query"],
  ["cmc airdrops", "https://api.coinmarketcap.com/data-api/v3/airdrop/query?status=ONGOING&start=1&limit=10"],
  ["coingecko news", "https://api.coingecko.com/api/v3/news"],
  ["defillama raises", "https://api.llama.fi/raises"],
  ["pancakeswap blog", "https://blog.pancakeswap.finance/rss.xml"],
  ["pancake medium", "https://medium.com/feed/pancakeswap"],
  ["dydx blog", "https://www.dydx.xyz/blog/rss.xml"],
  ["jupiter", "https://station.jup.ag/rss.xml"],
  ["hyperliquid medium", "https://medium.com/feed/@hyperliquid"],
  ["aerodrome", "https://medium.com/feed/@aerodromefi"],
  ["raydium", "https://medium.com/feed/@raydium"],
  ["gmx", "https://medium.com/feed/@gmx.io"],
  ["uniswap blog", "https://blog.uniswap.org/rss.xml"],
  ["aster", "https://medium.com/feed/@asterdex"],
  ["layer3", "https://layer3.xyz/api/quests?limit=10"],
  ["zealy", "https://api-v1.zealy.io/communities?limit=10"],
  ["dappradar airdrops", "https://dappradar.com/api/airdrops?page=1"],
  ["airdrops.io rss", "https://airdrops.io/feed/"],
  ["cointelegraph rss", "https://cointelegraph.com/rss/tag/airdrop"],
];
const out = await Promise.all(C.map(async ([n, u]) => {
  try {
    const init = { headers: H, signal: AbortSignal.timeout(12000) };
    if (n === "galxe graphql") Object.assign(init, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ query: "{ campaigns(input:{first:3, forAdmin:false, listType:Trending}) { list { name space { name } } } }" }) });
    const r = await fetch(u, init);
    const t = await r.text();
    const titles = [...t.matchAll(/"(?:title|annTitle|name|headline)"\s*:\s*"([^"]{8,90})"/g)].slice(0, 2).map((m) => m[1]);
    const xml = [...t.matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]{8,90})/g)].slice(1, 3).map((m) => m[1]);
    return `${r.status} ${n.padEnd(20)} ${t.length.toString().padStart(7)}b  ${(titles.length ? titles : xml).join(" | ").slice(0, 150)}`;
  } catch (e) { return `ERR ${n.padEnd(20)} ${String(e.message || e).slice(0, 80)}`; }
}));
console.log(out.join("\n"));
