#!/usr/bin/env bash
set -euo pipefail

# RPM_INSTALL_PREFIX обычно пустой при обычной установке, поэтому держим дефолт.
INSTALL_PREFIX="${RPM_INSTALL_PREFIX:-}"
APP_ROOT="$INSTALL_PREFIX/opt/iteaapp"
RESOURCE_ROOT="$APP_ROOT/resources/opt/iteaapp"

# 1️⃣ Nautilus extension
mkdir -p /usr/share/nautilus-python/extensions
mkdir -p /usr/share/nautilus/python-extensions
cp "$RESOURCE_ROOT/nautilus/itea-nautilus.py" /usr/share/nautilus-python/extensions/
cp "$RESOURCE_ROOT/nautilus/itea-nautilus.py" /usr/share/nautilus/python-extensions/
chmod 644 /usr/share/nautilus-python/extensions/itea-nautilus.py
chmod 644 /usr/share/nautilus/python-extensions/itea-nautilus.py

# 2️⃣ Systemd service (user mode)
mkdir -p /usr/lib/systemd/user/default.target.wants
ln -sf "$RESOURCE_ROOT/systemd/iteaapp-backend.service" /usr/lib/systemd/user/default.target.wants/iteaapp-backend.service
systemctl --user daemon-reload || true

# 3️⃣ Chrome sandbox permissions (if present)
if [ -f "$APP_ROOT/chrome-sandbox" ]; then
  chmod 4755 "$APP_ROOT/chrome-sandbox"
fi
