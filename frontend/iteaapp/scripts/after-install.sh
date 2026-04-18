#!/usr/bin/env bash
set -euo pipefail

INSTALL_PREFIX="${RPM_INSTALL_PREFIX:-}"
APP_ROOT="$INSTALL_PREFIX/opt/iteaapp"
RESOURCE_ROOT="$APP_ROOT/resources/opt/iteaapp"
USER_SYSTEMD_DIR="$INSTALL_PREFIX/usr/lib/systemd/user"
USER_WANTS_DIR="$USER_SYSTEMD_DIR/default.target.wants"
SERVICE_NAME="iteaapp-backend.service"
SERVICE_SOURCE="$RESOURCE_ROOT/systemd/$SERVICE_NAME"
SERVICE_TARGET="$USER_SYSTEMD_DIR/$SERVICE_NAME"

# 1. Nautilus extension
mkdir -p /usr/share/nautilus-python/extensions
mkdir -p /usr/share/nautilus/python-extensions
cp "$RESOURCE_ROOT/nautilus/itea-nautilus.py" /usr/share/nautilus-python/extensions/
cp "$RESOURCE_ROOT/nautilus/itea-nautilus.py" /usr/share/nautilus/python-extensions/
chmod 644 /usr/share/nautilus-python/extensions/itea-nautilus.py
chmod 644 /usr/share/nautilus/python-extensions/itea-nautilus.py

# 2. Install the user unit where systemd actually discovers it.
mkdir -p "$USER_SYSTEMD_DIR"
mkdir -p "$USER_WANTS_DIR"
cp "$SERVICE_SOURCE" "$SERVICE_TARGET"
chmod 644 "$SERVICE_TARGET"
ln -sf "../$SERVICE_NAME" "$USER_WANTS_DIR/$SERVICE_NAME"

# `systemctl --user` may be unavailable in a non-interactive install session.
systemctl --user daemon-reload >/dev/null 2>&1 || true
systemctl --user enable --now "$SERVICE_NAME" >/dev/null 2>&1 || true

# 3. Chrome sandbox permissions (if present)
if [ -f "$APP_ROOT/chrome-sandbox" ]; then
  chmod 4755 "$APP_ROOT/chrome-sandbox"
fi
