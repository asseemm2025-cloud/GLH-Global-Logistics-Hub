#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install Docker Desktop/Engine and start it."; exit 1; }
echo "Starting GLH web app + PostgreSQL..."
docker compose up --build -d
printf "Waiting for GLH readiness"
i=0
while [ "$i" -lt 60 ]; do
  if curl -fsS http://127.0.0.1:4000/api/ready >/tmp/glh-ready.json 2>/dev/null; then
    echo "\nGLH is ready: http://localhost:4000"
    cat /tmp/glh-ready.json; echo
    echo "On this computer use localhost. For a phone on the same Wi-Fi, use this computer's LAN IP, e.g. http://192.168.x.x:4000 (allow port 4000 in firewall)."
    exit 0
  fi
  printf "."
  sleep 2
  i=$((i+1))
done
echo "\nGLH did not become ready. Check logs with: docker compose logs --tail=100 app db"
exit 1
