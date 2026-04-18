#!/usr/bin/env bash
set -euo pipefail

INSTALL_PREFIX="${RPM_INSTALL_PREFIX:-}"
USER_SYSTEMD_DIR="$INSTALL_PREFIX/usr/lib/systemd/user"
USER_WANTS_DIR="$USER_SYSTEMD_DIR/default.target.wants"
SERVICE_NAME="iteaapp-backend.service"

rm -f "$USER_WANTS_DIR/$SERVICE_NAME"
rm -f "$USER_SYSTEMD_DIR/$SERVICE_NAME"

systemctl --user daemon-reload >/dev/null 2>&1 || true
