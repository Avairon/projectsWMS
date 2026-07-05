from flask import Blueprint, jsonify, request, send_file
from flask_login import login_required, current_user
from app.utils import load_data, save_data, can_access_project
from config import Config
import uuid
import os
from datetime import datetime
from werkzeug.utils import secure_filename

app_config = Config()
project_files_bp = Blueprint('project_files', __name__)

@project_files_bp.route('/project/<project_id>/files', methods=['GET'])
@login_required
def get_project_files(project_id):
    """Получить список файлов проекта"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    project_files = load_data(app_config.PROJECT_FILES_DB)
    
    # Фильтруем файлы по project_id
    files = [f for f in project_files if f.get('project_id') == project_id]
    
    # Сортируем по дате (новые сверху)
    files.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
    
    return jsonify(files)

@project_files_bp.route('/project/<project_id>/files/subtasks', methods=['GET'])
@login_required
def get_project_subtasks(project_id):
    """Получить список всех подзадач проекта для dropdown"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    tasks = load_data(app_config.TASKS_DB)
    project_tasks = [t for t in tasks if t.get('project_id') == project_id]
    
    subtasks_list = []
    for task in project_tasks:
        task_id = task.get('id')
        task_title = task.get('title')
        
        # Добавляем саму задачу как опцию
        subtasks_list.append({
            'id': f'task_{task_id}',
            'title': f'📋 {task_title}',
            'type': 'task',
            'task_id': task_id
        })
        
        # Добавляем подзадачи
        for subtask in task.get('subtasks', []):
            subtasks_list.append({
                'id': f'subtask_{task_id}_{subtask.get("id")}',
                'title': f'  ↳ {subtask.get("title")}',
                'type': 'subtask',
                'task_id': task_id,
                'subtask_id': subtask.get('id')
            })
    
    return jsonify(subtasks_list)

@project_files_bp.route('/project/<project_id>/files/task/<task_id>/subtask/<subtask_id>', methods=['GET'])
@login_required
def get_subtask_files(project_id, task_id, subtask_id):
    """Получить список файлов конкретной подзадачи"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    project_files = load_data(app_config.PROJECT_FILES_DB)
    
    # Фильтруем файлы по project_id, task_id и subtask_id
    files = [
        f for f in project_files 
        if f.get('project_id') == project_id 
        and f.get('task_id') == task_id 
        and f.get('subtask_id') == subtask_id
    ]
    
    # Сортируем по дате (новые сверху)
    files.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
    
    return jsonify(files)

@project_files_bp.route('/project/<project_id>/files/upload', methods=['POST'])
@login_required
def upload_project_file(project_id):
    """Загрузить файл в проект"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    # Проверяем, что пользователь является участником проекта
    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p.get('id') == project_id), None)
    
    if not project:
        return jsonify({'error': 'Проект не найден'}), 404
    
    # Проверка прав: все участники команды могут загружать файлы
    is_team_member = current_user.id in project.get('team', [])
    is_manager = project.get('manager_id') == current_user.id
    is_supervisor = project.get('supervisor_id') == current_user.id
    is_admin = current_user.role == 'admin'
    
    if not (is_team_member or is_manager or is_supervisor or is_admin):
        return jsonify({'error': 'У вас нет прав для загрузки файлов в этот проект'}), 403
    
    # Получаем данные из формы
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    task_id = request.form.get('task_id', '').strip()
    subtask_id = request.form.get('subtask_id', '').strip()
    
    if not title:
        return jsonify({'error': 'Название файла обязательно'}), 400
    
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не был загружен'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Файл не был выбран'}), 400
    
    # Создаем папку для файлов проекта, если её нет
    project_upload_dir = os.path.join(app_config.UPLOAD_FOLDER, f'project_{project_id}')
    os.makedirs(project_upload_dir, exist_ok=True)
    
    # Генерируем уникальное имя файла
    original_filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{original_filename}"
    filepath = os.path.join(project_upload_dir, unique_filename)
    
    # Сохраняем файл
    file.save(filepath)
    
    # Создаем запись о файле
    file_record = {
        'id': str(uuid.uuid4())[:8],
        'project_id': project_id,
        'task_id': task_id if task_id else None,
        'subtask_id': subtask_id if subtask_id else None,
        'title': title,
        'description': description,
        'original_filename': original_filename,
        'unique_filename': unique_filename,
        'file_size': os.path.getsize(filepath),
        'uploaded_by': current_user.id,
        'uploaded_by_name': current_user.name if hasattr(current_user, 'name') else current_user.username,
        'uploaded_at': datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    }
    
    # Сохраняем запись в базу
    project_files = load_data(app_config.PROJECT_FILES_DB)
    project_files.append(file_record)
    save_data(app_config.PROJECT_FILES_DB, project_files)
    
    return jsonify({
        'success': True,
        'message': 'Файл успешно загружен',
        'file': file_record
    })

@project_files_bp.route('/project/<project_id>/files/<file_id>/download', methods=['GET'])
@login_required
def download_project_file(project_id, file_id):
    """Скачать файл проекта"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    project_files = load_data(app_config.PROJECT_FILES_DB)
    file_record = next((f for f in project_files if f.get('id') == file_id and f.get('project_id') == project_id), None)
    
    if not file_record:
        return jsonify({'error': 'Файл не найден'}), 404
    
    filepath = os.path.join(app_config.UPLOAD_FOLDER, f'project_{project_id}', file_record['unique_filename'])
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Файл не найден на сервере'}), 404
    
    return send_file(filepath, as_attachment=True, download_name=file_record['original_filename'])

@project_files_bp.route('/project/<project_id>/files/<file_id>', methods=['DELETE'])
@login_required
def delete_project_file(project_id, file_id):
    """Удалить файл проекта"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403
    
    # Проверяем права на удаление: кураторы, руководители и админы
    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p.get('id') == project_id), None)
    
    if not project:
        return jsonify({'error': 'Проект не найден'}), 404
    
    is_manager = project.get('manager_id') == current_user.id
    is_supervisor = project.get('supervisor_id') == current_user.id
    is_admin = current_user.role == 'admin'
    
    if not (is_manager or is_supervisor or is_admin):
        return jsonify({'error': 'У вас нет прав для удаления файлов'}), 403
    
    project_files = load_data(app_config.PROJECT_FILES_DB)
    file_record = next((f for f in project_files if f.get('id') == file_id and f.get('project_id') == project_id), None)
    
    if not file_record:
        return jsonify({'error': 'Файл не найден'}), 404
    
    # Удаляем физический файл
    filepath = os.path.join(app_config.UPLOAD_FOLDER, f'project_{project_id}', file_record['unique_filename'])
    if os.path.exists(filepath):
        os.remove(filepath)
    
    # Удаляем запись из базы
    project_files = [f for f in project_files if f.get('id') != file_id]
    save_data(app_config.PROJECT_FILES_DB, project_files)
    
    return jsonify({
        'success': True,
        'message': 'Файл успешно удален'
    })