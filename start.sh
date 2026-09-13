#!/usr/bin/env bash
set -e

SERVER_DIR="/opt/render/project/src/mc_server"
cd "$SERVER_DIR"

echo "eula=true" > eula.txt

RAM_VAL=${RAM_SIZE:-10G}
echo "[SYSTEM] 마인크래프트 서버를 시작합니다 (RAM ${RAM_VAL} 할당)..."

exec java -Xmx${RAM_VAL} -Xms2G -jar paper-26.2-123.jar nogui
