import os
import urllib.request
import urllib.parse
from gi import require_version
import gi

require_version('Gtk', '4.0')

import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from gi.repository import Nautilus

from gi.repository import GObject

class IteaShareExtension(GObject.GObject, Nautilus.MenuProvider):
    def __init__(self):
        super().__init__()

    def menu_activate_cb(self, menu, files):
        if not files:
            return
        
        # Получаем полный путь к выбранному файлу
        file_path = files[0].get_location().get_path()
        if not file_path:
            return
            
        # Общаемся с системным бэкендом (вашим Electron-приложением или бэком на Spring)
        # Например, отправляем HTTP запрос на скрытый локальный порт
        try:
            # Замените порт и путь на те, которые будет слушать ваш Electron/Backend
            url = "http://127.0.0.1:5174/api/share-from-nautilus"
            data = urllib.parse.urlencode({'file_path': file_path}).encode('utf-8')
            req = urllib.request.Request(url, data=data)
            urllib.request.urlopen(req, timeout=2)
        except Exception as e:
            print("Ошибка при передаче команды в iTea App:", e)

    def is_app_running(self):
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.05)
            try:
                # Проверяем порт, на котором слушает приложение (например, 5174 как в activate)
                s.connect(('127.0.0.1', 8080)) # Заменить на нужный порт бэкенда или Electron
                return True
            except Exception:
                return False

    def get_file_items(self, files):
        if len(files) != 1:
            return []

        # Получаем абсолютный путь к файлу
        file_path = files[0].get_location().get_path()
        if not file_path:
            return []

        # Базовая директория
        cloud_dir = os.path.expanduser("~/CloudMount")

        # Запрещаем делиться самой корневой папкой CloudMount
        if file_path.rstrip('/') == cloud_dir.rstrip('/'):
            return []

        # Показывать кнопку ТОЛЬКО если файл лежит внутри папки ~/CloudMount
        if not file_path.startswith(cloud_dir):
            return []

        # Быстрая проверка, запущен ли бэкенд/приложение
        if not self.is_app_running():
            return []
        item = Nautilus.MenuItem(
            name="IteaApp::ShareLink",
            label="Получить ссылку (iTea Облако)",
            tip="Скопировать публичную ссылку на этот файл",
            icon="emblem-shared"
        )
        
        item.connect("activate", self.menu_activate_cb, files)
        return [item]
