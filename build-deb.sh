#!/bin/bash
# set -e

echo "=== 1. Подготовка окружения ==="
WORK_DIR=$(pwd)
DEB_DIR="$WORK_DIR/iteaapp-deb"
VERSION="1.0.0"

# Очищаем старую сборку
rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/opt/iteaapp/backend"
mkdir -p "$DEB_DIR/opt/iteaapp/frontend"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/512x512/apps"
mkdir -p "$DEB_DIR/usr/share/nautilus-python/extensions"
mkdir -p "$DEB_DIR/usr/lib/systemd/user"
mkdir -p "$DEB_DIR/usr/bin"

echo "=== 2. Сборка Бэкенда (Java) ==="
cd "$WORK_DIR/backend"
./mvnw clean package -DskipTests
cp target/backend-*.jar "$DEB_DIR/opt/iteaapp/backend/backend.jar"

echo "=== 3. Сборка Фронтенда (Electron) ==="
cd "$WORK_DIR/frontend/iteaapp"
npm run build
npm run build:linux
# Копируем распакованный electron-результат
cp -r dist/linux-unpacked/* "$DEB_DIR/opt/iteaapp/frontend/"
if [ -f "$DEB_DIR/opt/iteaapp/frontend/chrome-sandbox" ]; then
    echo " → fixing chrome‑sandbox permissions"
    chmod 4755 "$DEB_DIR/opt/iteaapp/frontend/chrome-sandbox"
    # ownership will be set to root by dpkg during installation, no need for chown here
fi

# Установка иконки в системную тему
cp "$WORK_DIR/frontend/iteaapp/public/images/logo.png" "$DEB_DIR/usr/share/icons/hicolor/512x512/apps/iteaapp.png"


echo "=== 4. Копирование интеграции Nautilus ==="
# Предполагаем, что файл у тебя сейчас лежит в ~/.local/share/nautilus-python/extensions/itea-nautilus.py
# Замени путь, если он лежит в исходниках проекта
cp ~/.local/share/nautilus-python/extensions/itea-nautilus.py "$DEB_DIR/usr/share/nautilus-python/extensions/"

echo "=== 5. Создание служебных файлов ==="

# Симлинк для удобного запуска (опционально)
ln -s /opt/iteaapp/frontend/iteaapp "$DEB_DIR/usr/bin/iteaapp"

# Ярлык приложения (.desktop)
cat <<EOF > "$DEB_DIR/usr/share/applications/iteaapp.desktop"
[Desktop Entry]
Name=iTea App
Exec=/opt/iteaapp/frontend/iteaapp --no-sandbox
Icon=iteaapp
Type=Application
Categories=Utility;Network;
EOF

# Сервис systemd для бэкенда (запускается от юзера)
cat <<EOF > "$DEB_DIR/usr/lib/systemd/user/iteaapp-backend.service"
[Unit]
Description=iTea App Backend Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/java -jar /opt/iteaapp/backend/backend.jar
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Файл зависимостей deb-пакета
cat <<EOF > "$DEB_DIR/DEBIAN/control"
Package: iteaapp
Version: $VERSION
Architecture: amd64
Maintainer: iTea Team
Description: iTea Cloud Drive Client
Depends: default-jre, python3-nautilus, fuse
EOF

# Скрипт POST-INSTALL (после установки пакета)
cat <<EOF > "$DEB_DIR/DEBIAN/postinst"
#!/bin/bash
# Не останавливаемся при ошибках в этом скрипте, чтобы не блокировать установку пакета

SANDBOX="/opt/iteaapp/frontend/chrome-sandbox"

# Регистрируем SUID через dpkg-statoverride (как это делает Google Chrome)
# dpkg сбрасывает SUID при распаковке — statoverride восстанавливает его
if [ -f "\$SANDBOX" ]; then
    # Убираем старую запись если есть (при переустановке)
    dpkg-statoverride --remove "\$SANDBOX" 2>/dev/null || true
    # Добавляем новую запись: root root 4755
    dpkg-statoverride --update --add root root 4755 "\$SANDBOX"
fi

if [ -n "\$SUDO_USER" ]; then
    USER_ID=\$(id -u "\$SUDO_USER")
    echo "Настройка сервисов для пользователя \$SUDO_USER..."
    su - \$SUDO_USER -c "export XDG_RUNTIME_DIR=/run/user/\$USER_ID; systemctl --user daemon-reload" || true
    su - \$SUDO_USER -c "export XDG_RUNTIME_DIR=/run/user/\$USER_ID; systemctl --user enable --now iteaapp-backend.service" || true
    su - \$SUDO_USER -c "nautilus -q" || true
fi

exit 0
EOF
chmod +x "$DEB_DIR/DEBIAN/postinst"


cat <<EOF > "$DEB_DIR/DEBIAN/prerm"
#!/bin/bash
if [ -n "\$SUDO_USER" ]; then
    su - \$SUDO_USER -c "export XDG_RUNTIME_DIR=/run/user/\$(id -u \$SUDO_USER); systemctl --user stop iteaapp-backend.service" || true
    su - \$SUDO_USER -c "export XDG_RUNTIME_DIR=/run/user/\$(id -u \$SUDO_USER); systemctl --user disable iteaapp-backend.service" || true
fi
exit 0
EOF
chmod +x "$DEB_DIR/DEBIAN/prerm"

echo "=== 6. Упаковка в DEB ==="
cd "$WORK_DIR"
dpkg-deb --build iteaapp-deb

echo "Пакет собран: iteaapp-deb.deb"
