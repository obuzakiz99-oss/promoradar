"""PromoRadar relay — server copy of bots/fp/prrelay.py (24.11, owner: move the laptop parts to a free server).
Runs on Linux (free VPS in Europe) or Windows. Every 30 min fetches the official public endpoints that refuse GitHub's
US servers, force-pushes relay.json (+ rules.json from scripts/tg-enrich.mjs) to the `relay` branch and asks GitHub
for a site rebuild. Needs: python3, git, node, gh (logged in), chromium. State/log: $RELAY_DIR (default ./prrelay)."""
import json, os, shutil, subprocess, sys, time, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
WIN = os.name == 'nt'
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.environ.get('RELAY_DIR') or os.path.join(HERE, 'prrelay'); REPO = os.path.join(D, 'repo')
os.makedirs(D, exist_ok=True)
def tool(env, win_path, name):
    return os.environ.get(env) or (win_path if WIN else shutil.which(name) or name)
GIT = tool('GIT', r'C:\Program Files\Git\cmd\git.exe', 'git')
NODE = tool('NODE', r'C:\Program Files\nodejs\node.exe', 'node')
GH = tool('GH', r'C:\Program Files\GitHub CLI\gh.exe', 'gh')
ENRICH = os.path.join(os.path.dirname(HERE), 'scripts', 'tg-enrich.mjs')
NOWIN = 0x08000000 if WIN else 0
REMOTE = 'https://github.com/obuzakiz99-oss/promoradar.git'
EVERY = 30 * 60
UA = {'User-Agent': 'Mozilla/5.0 (compatible; PromoRadar/1.0; +https://promoradar.example)',
      'Accept': 'application/json, text/html;q=0.9, application/xml;q=0.8, */*;q=0.5', 'Accept-Language': 'en-US,en;q=0.9'}
URLS = [   # must match the URLs in src/lib exactly
    'https://api.bybit.com/v5/announcements/index?locale=en-US&type=latest_activities&limit=40',
    'https://api.bybit.com/v5/earn/product?category=FlexibleSaving',
    'https://api.bybit.com/v5/earn/product?category=OnChain',
    'https://www.okx.com/api/v5/support/announcements?annType=latest-events',
    'https://www.okx.com/api/v5/support/announcements?annType=announcements-jumpstart',
    'https://www.okx.com/api/v5/support/announcements?annType=announcements-earn-and-loan',
    'https://www.okx.com/api/v5/finance/savings/lending-rate-summary',
    # 06.11 Funding Radar: Binance futures and Bybit refuse US servers
    'https://fapi.binance.com/fapi/v1/premiumIndex',
    'https://fapi.binance.com/fapi/v1/fundingInfo',
    'https://fapi.binance.com/fapi/v1/ticker/24hr',
    'https://api.bybit.com/v5/market/tickers?category=linear',
    # 08.11 hedge venues next to APR: OKX swaps funding (OKX doesn't answer US servers)
    'https://www.okx.com/api/v5/public/funding-rate?instId=ANY',
    # 08.11 token unlock calendar: DropsTab's public /vesting page (HTML, allowed by its robots.txt) refuses US runners
    'https://dropstab.com/vesting',
]
HTML_OK = ('https://dropstab.com/',)
# 12.11 POST endpoints (relayed as "POST <url> <body>"): Bitget PoolX answers GitHub's runners with 429
BG = 'https://www.bitget.com/v1/finance/poolx/product/'
BG_H = {'content-type': 'application/json;charset=UTF-8', 'language': 'en_US', 'locale': 'en_US'}
POSTS = [(BG + 'page/list/new', json.dumps({'pageNo': 1, 'pageSize': n, 'pre': False, 'status': st}, separators=(',', ':')), BG_H)
         for st, n in ((2, 20), (1, 20), (3, 50))] + [(BG + 'count', '{}', BG_H)]

def fetch_post(url, body, headers):
    req = urllib.request.Request(url, data=body.encode('utf-8'), headers={**UA, **headers}, method='POST')
    with urllib.request.urlopen(req, timeout=20) as r:
        out = r.read().decode('utf-8')
    json.loads(out)
    return out
os.makedirs(REPO, exist_ok=True)

def say(*a):
    with open(os.path.join(D, 'relay.log'), 'a', encoding='utf-8') as f: f.write(time.strftime('%Y-%m-%d %H:%M:%S ') + ' '.join(map(str, a)) + '\n')

def beat(**kw):
    with open(os.path.join(D, 'state.json'), 'w', encoding='utf-8') as f: json.dump({'at': time.time(), **kw}, f)

def git(*args):
    r = subprocess.run([GIT, *args], cwd=REPO, capture_output=True, text=True, timeout=120, creationflags=NOWIN)
    if r.returncode: raise RuntimeError(f'git {args[0]}: {(r.stderr or r.stdout).strip()[:200]}')
    return r.stdout

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        body = r.read().decode('utf-8')
    if not url.startswith(HTML_OK): json.loads(body)   # API answers must be valid JSON; listed pages are HTML
    return body


def enrich():
    # 12.11 (user: Telegram promos must be completed with the exchange page): render the linked campaign pages in
    # headless Chrome and keep them in repo/rules.json, which goes to the relay branch with relay.json
    try:
        r = subprocess.run([NODE, ENRICH, REPO, '12'], capture_output=True, text=True, encoding='utf-8', timeout=25 * 60, creationflags=NOWIN)
        tail = (r.stdout or r.stderr or '').strip().splitlines()
        return 'enrich: ' + (tail[-1] if tail else f'exit {r.returncode}')[:200]
    except Exception as e:
        return 'enrich error: ' + str(e)[:200]

def run_once():
    items, bad = {}, []
    for u in URLS:
        try: items[u] = {'at': int(time.time() * 1000), 'body': fetch(u)}
        except Exception as e: bad.append(f'{u.split("?")[0][-40:]}: {str(e)[:80]}')
        time.sleep(1)
    for u, b, h in POSTS:
        try: items[f'POST {u} {b}'] = {'at': int(time.time() * 1000), 'body': fetch_post(u, b, h)}
        except Exception as e: bad.append(f'POST {u[-30:]}: {str(e)[:80]}')
        time.sleep(1.5)
    if not items: say('nothing fetched', bad); return 0, bad
    if os.path.isdir(os.path.join(REPO, '.git')): say(enrich())
    if not os.path.isdir(os.path.join(REPO, '.git')):
        git('init', '-q', '-b', 'relay'); git('remote', 'add', 'origin', REMOTE)
        git('config', 'user.name', 'obuzakiz99-oss'); git('config', 'user.email', '320042687+obuzakiz99-oss@users.noreply.github.com')
    with open(os.path.join(REPO, 'relay.json'), 'w', encoding='utf-8') as f:
        json.dump({'updatedAt': int(time.time() * 1000), 'items': items}, f, ensure_ascii=False)
    git('add', '-A')
    has_head = subprocess.run([GIT, 'rev-parse', '--verify', 'HEAD'], cwd=REPO, capture_output=True, creationflags=NOWIN).returncode == 0
    git('commit', '-q', '-m', 'relay: ' + time.strftime('%Y-%m-%dT%H:%M:%S'), *(['--amend'] if has_head else []))   # one commit, no history growth
    git('push', '-q', '-f', 'origin', 'HEAD:relay')
    return len(items), bad


def rebuild():
    # 12.11: GitHub runs the */30 cron only every 4-8 hours, so the laptop asks for a site rebuild after each relay push
    r = subprocess.run([GH, 'workflow', 'run', 'pages.yml', '-R', 'obuzakiz99-oss/promoradar', '--ref', 'main'],
                       capture_output=True, text=True, timeout=60, creationflags=NOWIN)
    return 'rebuild ok' if r.returncode == 0 else 'rebuild fail: ' + (r.stderr or r.stdout).strip()[:150]

say('relay started')
last = 0.0
while True:
    # wall-clock schedule: after the laptop wakes from sleep/standby the overdue run happens within a minute
    if time.time() - last >= EVERY:
        last = time.time()
        try:
            n, bad = run_once()
            say(f'pushed {n}/{len(URLS) + len(POSTS)}', *(['fail:'] + bad if bad else []))
            if n: say(rebuild())
            beat(ok=n, fail=len(bad))
        except Exception as e:
            say('error', str(e)[:300]); beat(error=str(e)[:200])
    time.sleep(60); beat()
