import os
import json
import urllib.request
import urllib.parse
import socket
from gi import require_version
import gi

require_version('Gtk', '4.0')

import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from gi.repository import Nautilus

from gi.repository import GObject, GLib

BACKEND_URL = "http://127.0.0.1:8080"
CLOUD_DIR = os.path.expanduser("~/CloudMount")


def _is_backend_running():
    """Быстрая проверка доступности бэкенда через TCP."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.1)
        try:
            s.connect(('127.0.0.1', 8080))
            return True
        except Exception:
            return False


def _get_cloud_relative_path(file_path):
    """Получить относительный путь файла внутри ~/CloudMount."""
    if not file_path.startswith(CLOUD_DIR):
        return None
    rel = file_path[len(CLOUD_DIR):]
    if not rel.startswith('/'):
        rel = '/' + rel
    return rel


def _api_get(endpoint):
    """GET-запрос к бэкенду. Возвращает dict или None."""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        req = urllib.request.Request(url)
        req.add_header('Accept', 'application/json')
        with urllib.request.urlopen(req, timeout=2) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[ITea Nautilus] GET {endpoint} ошибка: {e}")
        return None


def _api_post(endpoint, data=None):
    """POST-запрос к бэкенду. Возвращает dict или None."""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        body = json.dumps(data).encode('utf-8') if data else b''
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Accept', 'application/json')
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[ITea Nautilus] POST {endpoint} ошибка: {e}")
        return None


def _get_first_account_id():
    """Получить ID первого подключённого аккаунта."""
    accounts = _api_get("/api/accounts")
    if accounts and len(accounts) > 0:
        return str(accounts[0].get('id', ''))
    return None


def _copy_to_clipboard(text):
    """Скопировать текст в буфер обмена через xclip/xsel/wl-copy."""
    for cmd in ['wl-copy', 'xclip -selection clipboard', 'xsel --clipboard --input']:
        try:
            import subprocess
            proc = subprocess.Popen(cmd.split(), stdin=subprocess.PIPE)
            proc.communicate(text.encode('utf-8'))
            if proc.returncode == 0:
                return True
        except Exception:
            continue
    return False


def _show_notification(title, body, icon="dialog-information"):
    """Показать системное уведомление через notify-send."""
    try:
        import subprocess
        subprocess.Popen([
            'notify-send',
            '--app-name=ITeaCloud',
            '--icon=' + icon,
            title,
            body
        ])
    except Exception:
        pass


class IteaCloudExtension(GObject.GObject, Nautilus.MenuProvider):
    """
    Расширение Nautilus для ITeaCloud.
    
    Пункты контекстного меню для файлов внутри ~/CloudMount:
    - Получить ссылку (share)
    - Скачать сейчас (принудительная синхронизация)
    - Открыть в ITeaCloud
    """

    def __init__(self):
        super().__init__()

    def get_file_items(self, files):
        if not files:
            return []

        # Получаем абсолютный путь к файлу
        file_path = files[0].get_location().get_path()
        if not file_path:
            return []

        # Запрещаем операции с корневой папкой CloudMount
        if file_path.rstrip('/') == CLOUD_DIR.rstrip('/'):
            return []

        # Показывать пункты ТОЛЬКО для файлов внутри ~/CloudMount
        if not file_path.startswith(CLOUD_DIR):
            return []

        # Быстрая проверка — работает ли бэкенд
        if not _is_backend_running():
            return []

        items = []
        is_dir = os.path.isdir(file_path)

        # ── 1. Получить ссылку ──
        share_item = Nautilus.MenuItem(
            name="IteaCloud::ShareLink",
            label="Получить ссылку (ITea)",
            tip="Создать публичную ссылку и скопировать в буфер обмена",
            icon="emblem-shared"
        )
        share_item.connect("activate", self._on_share, files)
        items.append(share_item)

        # ── 2. Скачать сейчас (принудительная синхронизация) ──
        if not is_dir:
            sync_item = Nautilus.MenuItem(
                name="IteaCloud::SyncNow",
                label="Скачать сейчас (ITea)",
                tip="Немедленно синхронизировать этот файл с облаком",
                icon="emblem-synchronizing"
            )
            sync_item.connect("activate", self._on_sync_now, files)
            items.append(sync_item)

        # ── 3. Открыть в ITeaCloud ──
        open_item = Nautilus.MenuItem(
            name="IteaCloud::OpenInApp",
            label="Открыть в ITeaCloud",
            tip="Открыть приложение ITeaCloud с этим файлом",
            icon="folder-cloud"
        )
        open_item.connect("activate", self._on_open_in_app, files)
        items.append(open_item)

        return items

    def _on_share(self, menu, files):
        """Создать публичную ссылку на файл."""
        if not files:
            return

        file_path = files[0].get_location().get_path()
        rel_path = _get_cloud_relative_path(file_path)
        if not rel_path:
            return

        account_id = _get_first_account_id()
        if not account_id:
            _show_notification(
                "ITeaCloud",
                "Нет подключённых аккаунтов",
                "dialog-error"
            )
            return

        encoded_path = urllib.parse.quote(rel_path, safe='/')
        result = _api_post(f"/api/share/{account_id}?path={encoded_path}")

        if result and 'url' in result:
            url = result['url']
            if _copy_to_clipboard(url):
                _show_notification(
                    "Ссылка скопирована",
                    f"{os.path.basename(file_path)}\n{url}",
                    "emblem-shared"
                )
            else:
                _show_notification(
                    "Ссылка создана",
                    url,
                    "emblem-shared"
                )
        elif result and 'error' in result:
            _show_notification(
                "Ошибка",
                result['error'],
                "dialog-error"
            )
        else:
            _show_notification(
                "Ошибка",
                "Не удалось создать ссылку",
                "dialog-error"
            )

    def _on_sync_now(self, menu, files):
        """Принудительная синхронизация файла — устанавливает политику ALWAYS."""
        if not files:
            return

        file_path = files[0].get_location().get_path()
        rel_path = _get_cloud_relative_path(file_path)
        if not rel_path:
            return

        account_id = _get_first_account_id()
        if not account_id:
            _show_notification(
                "ITeaCloud",
                "Нет подключённых аккаунтов",
                "dialog-error"
            )
            return

        result = _api_post("/api/rules", {
            "accountId": account_id,
            "pathPattern": rel_path,
            "policy": "ALWAYS",
            "priority": 10,
            "cronExpression": None
        })

        if result:
            _show_notification(
                "Синхронизация запущена",
                os.path.basename(file_path),
                "emblem-synchronizing"
            )
        else:
            _show_notification(
                "Ошибка",
                "Не удалось запустить синхронизацию",
                "dialog-error"
            )

    def _on_open_in_app(self, menu, files):
        """Открыть ITeaCloud приложение."""
        try:
            import subprocess
            subprocess.Popen([
                '/opt/iteaapp/iteaapp',
                '--no-sandbox'
            ])
        except Exception as e:
            _show_notification(
                "Ошибка",
                f"Не удалось запустить ITeaCloud: {e}",
                "dialog-error"
            )


class IteaInfoProvider(GObject.GObject, Nautilus.InfoProvider):
    """
    Поставщик информации — добавляет эмблемы синхронизации
    к файлам в ~/CloudMount.
    
    Эмблемы:
    - emblem-default (✓) — файл синхронизирован (есть правило ALWAYS)
    - emblem-synchronizing (↻) — файл в процессе синхронизации
    - emblem-important (!) — файл не синхронизирован (MANUAL)
    """

    def __init__(self):
        super().__init__()
        self._rules_cache = {}
        self._cache_time = 0

    def _refresh_rules_cache(self):
        """Обновить кэш правил синхронизации (не чаще раза в 5 секунд)."""
        import time
        now = time.time()
        if now - self._cache_time < 5:
            return

        self._cache_time = now
        account_id = _get_first_account_id()
        if not account_id:
            self._rules_cache = {}
            return

        rules = _api_get(f"/api/rules?accountId={account_id}")
        if rules:
            self._rules_cache = {
                r.get('pathPattern', ''): r.get('policy', 'MANUAL')
                for r in rules
            }
        else:
            self._rules_cache = {}

    def update_file_info(self, file):
        file_path = file.get_location().get_path()
        if not file_path:
            return

        if not file_path.startswith(CLOUD_DIR):
            return

        if file_path.rstrip('/') == CLOUD_DIR.rstrip('/'):
            return

        if not _is_backend_running():
            return

        rel_path = _get_cloud_relative_path(file_path)
        if not rel_path:
            return

        self._refresh_rules_cache()

        policy = self._rules_cache.get(rel_path, 'MANUAL')

        if policy == 'ALWAYS':
            file.add_emblem('default')  # ✓ зелёная галочка
        elif policy == 'SCHEDULED':
            file.add_emblem('synchronizing')  # ↻
        # MANUAL — без эмблемы (неявно значит «не синхронизирован»)
