#!/bin/bash
set -e

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
set -e
# Перезагружаем демоны пользователя, чтобы подхватить новый сервис
su - \$SUDO_USER -c "systemctl --user daemon-reload"
su - \$SUDO_USER -c "systemctl --user enable --now iteaapp-backend.service"
# Перезапускаем Nautilus, чтобы подхватился python-скрипт
su - \$SUDO_USER -c "nautilus -q || true"
exit 0
EOF
chmod +x "$DEB_DIR/DEBIAN/postinst"

# Скрипт PRERM (перед удалением пакета)
cat <<EOF > "$DEB_DIR/DEBIAN/prerm"
#!/bin/bash
set -e
su - \$SUDO_USER -c "systemctl --user stop iteaapp-backend.service" || true
su - \$SUDO_USER -c "systemctl --user disable iteaapp-backend.service" || true
exit 0
EOF
chmod +x "$DEB_DIR/DEBIAN/prerm"

echo "=== 6. Упаковка в DEB ==="
cd "$WORK_DIR"
dpkg-deb --build iteaapp-deb
mv iteaapp-deb.deb

echo "Пакет сохранен "
