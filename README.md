# ITeaCloud

Здравствуйте, уважаемые жюри.

Мы команда ITea. Представляем вам проект ITeaCloud: клиент для работы с облачными файлами с Electron-фронтендом и Java-бэкендом.

## Как быстро собрать и установить

Сначала установите JDK 21.

Для сборки также понадобятся:

- Node.js и npm
- Для RPM-сборки: `rpm` и `rpmbuild`

## DEB

Сборка:

```bash
./build-deb.sh
```

Установка пакета:

```bash
sudo dpkg -i iteaapp-deb.deb
```

Если Debian/Ubuntu сообщит о нехватке зависимостей:

```bash
sudo apt-get install -f
```

Удаление:

```bash
sudo dpkg -P iteaapp
```

## RPM

Сборка:

```bash
./build-rpm.sh
```

Установка пакета:

```bash
sudo rpm -i iteaapp-1.0.0.rpm
```

Удаление:

```bash
sudo rpm -e iteaapp
```

## Ручная установка на ALT Linux

Если пакетная установка не сработала, приложение можно развернуть вручную.

1. Установить зависимости:

```bash
apt-get install java-21-openjdk libXScrnSaver libnotify nss xdg-utils gtk+3 at-spi2-core
```

2. Собрать проект:

```bash
./build-rpm.sh
```

3. Подготовить директории:

```bash
mkdir -p /opt/iteaapp
mkdir -p /opt/iteaapp/resources/opt/iteaapp/backend
mkdir -p /opt/iteaapp/resources/opt/iteaapp/systemd
mkdir -p /opt/iteaapp/resources/opt/iteaapp/nautilus
```

4. Скопировать фронтенд:

```bash
cp -r frontend/iteaapp/dist/linux-unpacked/* /opt/iteaapp/
```

5. Скопировать backend jar:

```bash
cp backend/target/backend-*.jar /opt/iteaapp/resources/opt/iteaapp/backend/backend.jar
```

6. Скопировать service и Nautilus-расширение:

```bash
cp extraResources/systemd/iteaapp-backend.service /opt/iteaapp/resources/opt/iteaapp/systemd/
cp nautilus/itea-nautilus.py /opt/iteaapp/resources/opt/iteaapp/nautilus/
```

7. Запустить backend вручную:

```bash
java -jar /opt/iteaapp/resources/opt/iteaapp/backend/backend.jar
```

8. В отдельном терминале запустить приложение:

```bash
/opt/iteaapp/iteaapp --no-sandbox
```
