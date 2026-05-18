from flask_login import UserMixin
import json
import os
import fcntl
from config import Config

app_config = Config()

def load_data(file_path):
    """Загрузка данных из JSON с обработкой ошибок и блокировками"""
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Используем разделяемую блокировку для чтения
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            try:
                content = f.read()
                if not content.strip():
                    return []
                return json.loads(content)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except json.JSONDecodeError as e:
        print(f"JSON decode error in {file_path}: {e}")
        # Создаем резервную копию поврежденного файла
        from datetime import datetime
        backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        try:
            os.rename(file_path, backup_path)
            print(f"Corrupted file backed up to: {backup_path}")
        except Exception as rename_err:
            print(f"Failed to create backup: {rename_err}")
        return []
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []

def save_data(file_path, data):
    """Сохранение данных в JSON с атомарной записью и блокировками"""
    import tempfile
    directory = os.path.dirname(file_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    
    # Создаем временный файл в той же директории для атомарной замены
    fd, temp_path = tempfile.mkstemp(dir=directory, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            # Получаем эксклюзивную блокировку
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        
        # Атомарная замена
        os.replace(temp_path, file_path)
        return True
    except Exception as e:
        print(f"Error saving {file_path}: {e}")
        # Удаляем временный файл если он остался
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except:
            pass
        raise

class User(UserMixin):
    def __init__(self, id, username, name, role, token=None):
        self.id = id
        self.username = username
        self.name = name
        self.role = role
        self.token = token
        
    def get_projects(self):
        users = load_data(app_config.USERS_DB)
        user = next((u for u in users if u['id'] == self.id), None)
        if user and 'projects' in user:
            return user['projects']
        return []

def load_user(user_id):
    users = load_data(app_config.USERS_DB)
    user = next((u for u in users if u['id'] == user_id), None)
    if user:
        return User(user['id'], user['username'], user['name'], user['role'], user.get('token'))
    return None
