# Здравстуйте, уважаемые жюри.
## Мы команда ITea. Представляем вам наш проект IteaCloud:

# Как быстро забилдить и собрать :)

## Установите JDK, далее установите пакет

## RPM:
### ./build-rpm.sh
### rpm -i "название".rpm 

## Ручная установка на ALT Linux

### 1. Поставить зависимости
### apt-get install java-21-openjdk libXScrnSaver libnotify nss xdg-utils gtk+3 at-spi2-core

### 2. Собрать проект
### ./build-rpm.sh

### 3. Создать папку приложения
### mkdir -p /opt/iteaapp

### 4. Скопировать фронтенд
### cp -r frontend/iteaapp/dist/linux-unpacked/* /opt/iteaapp/

### 5. Скопировать backend jar
### mkdir -p /opt/iteaapp/resources/opt/iteaapp/backend
### cp backend/target/backend-*.jar /opt/iteaapp/resources/opt/iteaapp/backend/backend.jar

### 6. Скопировать service и nautilus-расширение
### mkdir -p /opt/iteaapp/resources/opt/iteaapp/systemd
### mkdir -p /opt/iteaapp/resources/opt/iteaapp/nautilus
### cp extraResources/systemd/iteaapp-backend.service /opt/iteaapp/resources/opt/iteaapp/systemd/
### cp nautilus/itea-nautilus.py /opt/iteaapp/resources/opt/iteaapp/nautilus/

### 7. Запустить backend вручную
### java -jar /opt/iteaapp/resources/opt/iteaapp/backend/backend.jar

### 8. В отдельном терминале запустить приложение
### /opt/iteaapp/iteaapp --no-sandbox


## Удаление данной программы :(
## sudo dpkg -e iteaapp 
