#!/usr/bin/env bash
# PromoRadar server setup (24.11). For a free Ubuntu 22.04/24.04 VM (x86 or ARM) in Europe (e.g. Oracle Cloud Always Free,
# VM.Standard.E2.1.Micro, region Frankfurt/Amsterdam). Run as the normal user (not root):
#   curl -fsSL https://raw.githubusercontent.com/obuzakiz99-oss/promoradar/main/server/setup.sh | bash
# Then once: gh auth login   (GitHub.com → HTTPS → login with a web browser), and: bash ~/promoradar/server/setup.sh start
set -euo pipefail
REPO=~/promoradar

if [ "${1:-}" != "start" ]; then
  sudo apt-get update -q
  sudo apt-get install -yq git python3 curl ca-certificates gnupg
  # Node 22 (NodeSource), GitHub CLI and Google Chrome (headless, renders exchange campaign pages) — official repos
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -yq nodejs
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg status=none
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
  sudo apt-get update -q && sudo apt-get install -yq gh
  if [ "$(dpkg --print-architecture)" = "amd64" ]; then
    curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb
    sudo apt-get install -yq /tmp/chrome.deb && rm /tmp/chrome.deb
  else
    sudo snap install chromium   # ARM (Oracle A1): no Google Chrome build, Ubuntu ships Chromium as a snap
  fi
  # 1 GB RAM VMs: 2 GB swap so headless Chrome doesn't get killed
  if ! swapon --show | grep -q .; then sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null; fi
  [ -d "$REPO/.git" ] || git clone -q https://github.com/obuzakiz99-oss/promoradar.git "$REPO"
  echo; echo "Готово. Тепер: gh auth login   а потім: bash $REPO/server/setup.sh start"; exit 0
fi

gh auth status >/dev/null || { echo "Спочатку: gh auth login"; exit 1; }
gh auth setup-git
git -C "$REPO" pull -q
U=$(whoami)
# relay: always on, restarted if it dies; health: every hour
sudo tee /etc/systemd/system/promoradar-relay.service >/dev/null <<UNIT
[Unit]
Description=PromoRadar relay
After=network-online.target
[Service]
User=$U
WorkingDirectory=$REPO
Environment=CHROME=$(command -v google-chrome || echo /snap/bin/chromium) RELAY_DIR=/home/$U/prrelay
ExecStartPre=/usr/bin/git -C $REPO pull -q --ff-only
ExecStart=/usr/bin/python3 $REPO/server/relay.py
Restart=always
RestartSec=60
[Install]
WantedBy=multi-user.target
UNIT
sudo tee /etc/systemd/system/promoradar-health.service >/dev/null <<UNIT
[Unit]
Description=PromoRadar health check
[Service]
Type=oneshot
User=$U
WorkingDirectory=$REPO
ExecStart=/usr/bin/node $REPO/scripts/health.mjs /home/$U/promoradar-health
UNIT
sudo tee /etc/systemd/system/promoradar-health.timer >/dev/null <<UNIT
[Unit]
Description=PromoRadar health check every hour
[Timer]
OnBootSec=10min
OnUnitActiveSec=1h
Persistent=true
[Install]
WantedBy=timers.target
UNIT
# the relay pulls the repo each restart; restart it daily so script updates arrive
( crontab -l 2>/dev/null | grep -v promoradar-relay; echo "17 4 * * * sudo systemctl restart promoradar-relay" ) | crontab -
sudo systemctl daemon-reload
sudo systemctl enable --now promoradar-relay.service promoradar-health.timer
echo "Запущено. Перевірка: systemctl status promoradar-relay   журнал: tail ~/prrelay/relay.log"
