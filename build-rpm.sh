#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/frontend/iteaapp"
BACKEND_DIR="$PROJECT_ROOT/backend"
EXTRA_RESOURCES_DIR="$PROJECT_ROOT/extraResources"
VERSION="1.0.0"
STAGING_DIR="$PROJECT_ROOT/build-rpm"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Не найдена команда: $1" >&2
    exit 1
  fi
}

prepare_extra_resources() {
  echo "=== 3. Подготовка extraResources ==="

  mkdir -p "$EXTRA_RESOURCES_DIR/nautilus"
  mkdir -p "$EXTRA_RESOURCES_DIR/systemd"

  cp "$PROJECT_ROOT/nautilus/itea-nautilus.py" \
    "$EXTRA_RESOURCES_DIR/nautilus/itea-nautilus.py"

  cat > "$EXTRA_RESOURCES_DIR/systemd/iteaapp-backend.service" <<'EOF'
[Unit]
Description=iTea App Backend Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/java -jar /opt/iteaapp/resources/opt/iteaapp/backend/backend.jar
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF
}

echo "=== 1. Подготовка окружения ==="
require_cmd npm
require_cmd java
require_cmd rpmbuild

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

echo "=== 2. Сборка бэкенда (Java) ==="
cd "$BACKEND_DIR"
./mvnw -DskipTests clean package
cp target/backend-*.jar "$EXTRA_RESOURCES_DIR/backend.jar"

prepare_extra_resources

echo "=== 4. Сборка фронтенда (Electron) ==="
cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "node_modules не найдены, ставлю зависимости через npm install"
  npm install
fi

npm run build
node scripts/build-linux-rpm.js

RPM_FILE="$(find "$FRONTEND_DIR/dist" -maxdepth 1 -name "*.rpm" | head -n 1)"
if [[ -z "$RPM_FILE" ]]; then
  echo "[ERROR] RPM-пакет не найден в $FRONTEND_DIR/dist" >&2
  exit 1
fi

OUTPUT_RPM="$PROJECT_ROOT/iteaapp-${VERSION}.rpm"
cp "$RPM_FILE" "$OUTPUT_RPM"

echo "RPM-пакет собран: $OUTPUT_RPM"
cat <<EOF
Для установки запустите:
  sudo rpm -i $(basename "$OUTPUT_RPM")
EOF
