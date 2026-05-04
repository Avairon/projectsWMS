from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user
from app.utils import load_data, save_data, can_access_project, get_available_roles
from config import Config
import uuid
from datetime import datetime

app_config = Config()
dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/')
@login_required
def index():
    return redirect(url_for('dashboard.dashboard'))


@dashboard_bp.route('/dashboard')
@login_required
def dashboard():
    projects = load_data(app_config.PROJECTS_DB)
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)
    
    # Получаем параметры фильтрации из запроса
    search_query = request.args.get('search', '').strip().lower()
    supervisor_filter = request.args.get('supervisor', '')
    manager_filter = request.args.get('manager', '')
    show_completed = request.args.get('show_completed', 'false') == 'true'
    
    # Преобразуем роли для совместимости
    role = current_user.role
    if role == 'supervisor':
        role = 'curator'
    elif role == 'worker':
        role = 'executor'

    # Фильтрация проектов по видимости (роли)
    if role == 'admin':
        visible_projects = projects
    elif role == 'curator':
        visible_projects = [p for p in projects if p.get('supervisor_id', '') == current_user.id or p.get('manager_id', '') == current_user.id]
    elif role == 'manager':
        visible_projects = [p for p in projects if p.get('manager_id', '') == current_user.id or p.get('supervisor_id', '') == current_user.id]
    else:  # executor
        visible_projects = [p for p in projects if current_user.id in p.get('team', [])]

    # Применяем фильтры поиска
    filtered_projects = visible_projects
    
    # Фильтр по поиску
    if search_query:
        filtered_projects = [p for p in filtered_projects if search_query in p.get('name', '').lower()]
    
    # Фильтр по руководителю (supervisor)
    if supervisor_filter:
        filtered_projects = [p for p in filtered_projects if p.get('supervisor_id') == supervisor_filter]
    
    # Фильтр по куратору (manager)
    if manager_filter:
        filtered_projects = [p for p in filtered_projects if p.get('manager_id') == manager_filter]
    
    # Фильтр по статусу (скрыть завершенные)
    if not show_completed:
        filtered_projects = [p for p in filtered_projects if p.get('status') != 'завершен']

    # таски
    user_tasks = []
    if role == 'admin':
        user_tasks = tasks
    elif role in ['curator', 'manager']:
        project_ids = [p['id'] for p in visible_projects]
        user_tasks = [t for t in tasks if t['project_id'] in project_ids]
    else:  # executor
        user_tasks = [t for t in tasks if t['assignee_id'] == current_user.id]
    
    # Подготовка статистики в зависимости от роли
    stats = {}
    
    if role == 'admin':
        # Статистика для администратора
        stats = {
            'total_active_projects': len([p for p in projects if p['status'] == 'в работе']),
            'total_paused_projects': len([p for p in projects if p['status'] in ['приостановлен', 'отложен']]),
            'overdue_projects_count': len(get_overdue_projects(projects)),
            'curators_count': len(set([p['supervisor_id'] for p in projects if p.get('supervisor_id')])),
            'managers_count': len(set([p['manager_id'] for p in projects if p.get('manager_id')])),
            'executors_count': len(set([uid for p in projects for uid in p.get('team', [])]))
        }
    elif role == 'curator':
        # Статистика для куратора
        my_projects = visible_projects
        my_project_tasks = [t for t in tasks if t['project_id'] in [p['id'] for p in my_projects]]
        
        stats = {
            'my_active_projects': len([p for p in my_projects if p['status'] == 'в работе']),
            'my_paused_projects': len([p for p in my_projects if p['status'] in ['приостановлен', 'отложен']]),
            'my_overdue_projects_count': len(get_overdue_projects(my_projects)),
            'my_managers_count': len(set([p['manager_id'] for p in my_projects if p.get('manager_id')])),
            'my_executors_count': len(set([uid for p in my_projects for uid in p.get('team', [])]))
        }
    elif role == 'manager':
        # Статистика для менеджера
        my_projects = visible_projects
        my_project_tasks = [t for t in tasks if t['project_id'] in [p['id'] for p in my_projects]]
        
        stats = {
            'my_manager_active_projects': len([p for p in my_projects if p['status'] == 'в работе']),
            'my_manager_paused_projects': len([p for p in my_projects if p['status'] in ['приостановлен', 'отложен']]),
            'projects_with_overdue_tasks_count': len(get_projects_with_overdue_tasks(my_projects, tasks)),
            'my_manager_executors_count': len(set([uid for p in my_projects for uid in p.get('team', [])]))
        }
    else:  # executor
        # Статистика для исполнителя
        my_tasks = user_tasks
        
        stats = {
            'executor_total_tasks': len(my_tasks),
            'executor_active_tasks': len([t for t in my_tasks if t['status'] == 'активна']),
            'executor_completed_tasks': len([t for t in my_tasks if t['status'] == 'завершена']),
            'executor_paused_tasks': len([t for t in my_tasks if t['status'] == 'отложена']),
            'executor_overdue_tasks': len(get_overdue_tasks_for_executor(current_user.id, my_tasks))
        }
    
    # Добавляем информацию о пользователях к каждому проекту
    enhanced_projects = []
    for project in visible_projects:
        # Получаем информацию о кураторе (руководителе направления)
        manager_info = None
        if project.get('manager_id'):
            manager = next((u for u in users if u.get('id') == project['manager_id']), None)
            if manager:
                manager_info = {'id': manager['id'], 'name': manager.get('name', manager.get('full_name', 'Не указано'))}
        
        # Получаем информацию о руководителе проекта
        supervisor_info = None
        if project.get('supervisor_id'):
            supervisor = next((u for u in users if u.get('id') == project['supervisor_id']), None)
            if supervisor:
                supervisor_info = {'id': supervisor['id'], 'name': supervisor.get('name', supervisor.get('full_name', 'Не указано'))}
        
        # Создаем копию проекта с дополнительной информацией
        enhanced_project = project.copy()
        enhanced_project['manager_info'] = manager_info
        enhanced_project['supervisor_info'] = supervisor_info
        enhanced_projects.append(enhanced_project)

    user_token = current_user.token

    return render_template('dashboard.html', 
                         projects=enhanced_projects, 
                         tasks=user_tasks, 
                         users=users, 
                         stats=stats,
                         user_token=user_token,
                         search_query=search_query,
                         supervisor_filter=supervisor_filter,
                         manager_filter=manager_filter,
                         show_completed=show_completed)


def get_overdue_projects(projects):
    """Получить список просроченных проектов"""
    overdue_projects = []
    today = datetime.now().date()
    for project in projects:
        #DEBUG
        #print(project['end_date'] + " " + str(today))
        if 'end_date' in project and project['end_date']:
            try:
                # Формат даты в ваших данных: DD.MM.YYYY
                deadline_date = datetime.strptime(project['end_date'], '%d.%m.%Y').date()
                if deadline_date < today:
                    #print(project['name'] + " <- DEADLINE")
                    overdue_projects.append(project)
            except ValueError:
                # Некорректный формат даты — пропускаем
                continue
    return overdue_projects


def get_projects_with_overdue_tasks(projects, tasks):
    """Получить проекты с просроченными задачами"""
    project_ids_with_overdue_tasks = set()
    today = datetime.now().date()
    
    for task in tasks:
        if 'deadline' in task and task['deadline']:
            try:
                deadline_date = datetime.strptime(task['deadline'], '%Y-%m-%d').date()
                if deadline_date < today and task['project_id'] in [p['id'] for p in projects]:
                    project_ids_with_overdue_tasks.add(task['project_id'])
            except ValueError:
                # Если формат даты некорректный, пропускаем
                continue
    
    return [p for p in projects if p['id'] in project_ids_with_overdue_tasks]


def get_overdue_tasks_for_executor(executor_id, tasks):
    """Получить просроченные задачи для конкретного исполнителя"""
    overdue_tasks = []
    today = datetime.now().date()
    
    for task in tasks:
        if task.get('assignee_id') == executor_id and 'deadline' in task and task['deadline']:
            try:
                deadline_date = datetime.strptime(task['deadline'], '%Y-%m-%d').date()
                if deadline_date < today:
                    overdue_tasks.append(task)
            except ValueError:
                # Если формат даты некорректный, пропускаем
                continue
    return overdue_tasks


@dashboard_bp.route('/api/overdue_projects')
@login_required
def api_overdue_projects():
    """API для получения списка просроченных проектов"""
    projects = load_data(app_config.PROJECTS_DB)
    overdue_projects = get_overdue_projects(projects)
    
    # Подготовим данные для ответа
    result = []
    for project in overdue_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/curators_list')
@login_required
def api_curators_list():
    """API для получения списка кураторов"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Получаем ID кураторов из проектов
    curator_ids = set([p['supervisor_id'] for p in projects if p.get('supervisor_id')])
    
    # Находим информацию о кураторах
    curators = []
    for user in users:
        if user['id'] in curator_ids:
            curators.append({
                'id': user['id'],
                'name': user['full_name'],
                'email': user['email']
            })
    
    return jsonify(curators)


@dashboard_bp.route('/api/my_overdue_projects')
@login_required
def api_my_overdue_projects():
    """API для получения списка просроченных проектов для куратора"""
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему куратору
    my_projects = [p for p in projects if p.get('supervisor_id', '') == current_user.id]
    overdue_projects = get_overdue_projects(my_projects)
    
    # Подготовим данные для ответа
    result = []
    for project in overdue_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/projects_with_overdue_tasks')
@login_required
def api_projects_with_overdue_tasks():
    """API для получения списка проектов с просроченными задачами"""
    projects = load_data(app_config.PROJECTS_DB)
    tasks = load_data(app_config.TASKS_DB)
    
    # Фильтруем проекты, принадлежащие текущему менеджеру
    my_projects = [p for p in projects if p.get('manager_id', '') == current_user.id]
    projects_with_overdue_tasks = get_projects_with_overdue_tasks(my_projects, tasks)
    
    # Подготовим данные для ответа
    result = []
    for project in projects_with_overdue_tasks:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/overdue_executor_tasks')
@login_required
def api_overdue_executor_tasks():
    """API для получения списка просроченных задач для исполнителя"""
    tasks = load_data(app_config.TASKS_DB)
    
    # Фильтруем задачи, принадлежащие текущему исполнителю
    my_tasks = [t for t in tasks if t.get('assignee_id') == current_user.id]
    overdue_tasks = get_overdue_tasks_for_executor(current_user.id, my_tasks)
    
    # Подготовим данные для ответа
    result = []
    for task in overdue_tasks:
        result.append({
            'id': task['id'],
            'title': task['title']
        })
    
    return jsonify(result)


# API эндпоинты для отображения списков при клике на карточки статистики

@dashboard_bp.route('/api/active_projects')
@login_required
def api_active_projects():
    """API для получения списка проектов в работе"""
    projects = load_data(app_config.PROJECTS_DB)
    active_projects = [p for p in projects if p.get('status') == 'в работе']
    
    result = []
    for project in active_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/paused_projects')
@login_required
def api_paused_projects():
    """API для получения списка отложенных проектов"""
    projects = load_data(app_config.PROJECTS_DB)
    paused_projects = [p for p in projects if p.get('status') in ['приостановлен', 'отложен']]
    
    result = []
    for project in paused_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/managers_list')
@login_required
def api_managers_list():
    """API для получения списка руководителей"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Получаем ID руководителей из проектов
    manager_ids = set([p['supervisor_id'] for p in projects if p.get('supervisor_id')])
    
    # Находим информацию о руководителях
    managers = []
    for user in users:
        if user['id'] in manager_ids:
            managers.append({
                'id': user['id'],
                'name': user.get('name', user.get('full_name', 'Не указано')),
                'username': user.get('username', ''),
                'email': user.get('email', '')
            })
    
    return jsonify(managers)


@dashboard_bp.route('/api/executors_list')
@login_required
def api_executors_list():
    """API для получения списка исполнителей"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Получаем ID исполнителей из проектов
    executor_ids = set([uid for p in projects for uid in p.get('team', [])])
    
    # Находим информацию об исполнителях
    executors = []
    for user in users:
        if user['id'] in executor_ids:
            executors.append({
                'id': user['id'],
                'name': user.get('name', user.get('full_name', 'Не указано')),
                'username': user.get('username', ''),
                'email': user.get('email', '')
            })
    
    return jsonify(executors)


@dashboard_bp.route('/api/my_active_projects')
@login_required
def api_my_active_projects():
    """API для получения списка активных проектов куратора"""
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему куратору
    my_projects = [p for p in projects if p.get('supervisor_id', '') == current_user.id or p.get('manager_id', '') == current_user.id]
    active_projects = [p for p in my_projects if p.get('status') == 'в работе']
    
    result = []
    for project in active_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/my_paused_projects')
@login_required
def api_my_paused_projects():
    """API для получения списка отложенных проектов куратора"""
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему куратору
    my_projects = [p for p in projects if p.get('supervisor_id', '') == current_user.id or p.get('manager_id', '') == current_user.id]
    paused_projects = [p for p in my_projects if p.get('status') in ['приостановлен', 'отложен']]
    
    result = []
    for project in paused_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/my_managers_list')
@login_required
def api_my_managers_list():
    """API для получения списка руководителей в проектах куратора"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему куратору
    my_project_ids = [p['id'] for p in projects if p.get('supervisor_id', '') == current_user.id or p.get('manager_id', '') == current_user.id]
    
    # Получаем ID руководителей из этих проектов
    manager_ids = set([p['supervisor_id'] for p in projects if p.get('supervisor_id') and p['id'] in my_project_ids])
    
    # Находим информацию о руководителях
    managers = []
    for user in users:
        if user['id'] in manager_ids:
            managers.append({
                'id': user['id'],
                'name': user.get('name', user.get('full_name', 'Не указано')),
                'username': user.get('username', ''),
                'email': user.get('email', '')
            })
    
    return jsonify(managers)


@dashboard_bp.route('/api/my_executors_list')
@login_required
def api_my_executors_list():
    """API для получения списка исполнителей в проектах куратора"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему куратору
    my_project_ids = [p['id'] for p in projects if p.get('supervisor_id', '') == current_user.id or p.get('manager_id', '') == current_user.id]
    
    # Получаем ID исполнителей из этих проектов
    executor_ids = set([uid for p in projects if p['id'] in my_project_ids for uid in p.get('team', [])])
    
    # Находим информацию об исполнителях
    executors = []
    for user in users:
        if user['id'] in executor_ids:
            executors.append({
                'id': user['id'],
                'name': user.get('name', user.get('full_name', 'Не указано')),
                'username': user.get('username', ''),
                'email': user.get('email', '')
            })
    
    return jsonify(executors)


@dashboard_bp.route('/api/manager_active_projects')
@login_required
def api_manager_active_projects():
    """API для получения списка активных проектов менеджера"""
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему менеджеру
    my_projects = [p for p in projects if p.get('manager_id', '') == current_user.id or p.get('supervisor_id', '') == current_user.id]
    active_projects = [p for p in my_projects if p.get('status') == 'в работе']
    
    result = []
    for project in active_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/manager_paused_projects')
@login_required
def api_manager_paused_projects():
    """API для получения списка отложенных проектов менеджера"""
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему менеджеру
    my_projects = [p for p in projects if p.get('manager_id', '') == current_user.id or p.get('supervisor_id', '') == current_user.id]
    paused_projects = [p for p in my_projects if p.get('status') in ['приостановлен', 'отложен']]
    
    result = []
    for project in paused_projects:
        result.append({
            'id': project['id'],
            'name': project['name']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/manager_executors_list')
@login_required
def api_manager_executors_list():
    """API для получения списка исполнителей в проектах менеджера"""
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Фильтруем проекты, принадлежащие текущему менеджеру
    my_project_ids = [p['id'] for p in projects if p.get('manager_id', '') == current_user.id or p.get('supervisor_id', '') == current_user.id]
    
    # Получаем ID исполнителей из этих проектов
    executor_ids = set([uid for p in projects if p['id'] in my_project_ids for uid in p.get('team', [])])
    
    # Находим информацию об исполнителях
    executors = []
    for user in users:
        if user['id'] in executor_ids:
            executors.append({
                'id': user['id'],
                'name': user.get('name', user.get('full_name', 'Не указано')),
                'username': user.get('username', ''),
                'email': user.get('email', '')
            })
    
    return jsonify(executors)


@dashboard_bp.route('/api/executor_total_tasks')
@login_required
def api_executor_total_tasks():
    """API для получения всех задач исполнителя"""
    tasks = load_data(app_config.TASKS_DB)
    my_tasks = [t for t in tasks if t.get('assignee_id') == current_user.id]
    
    result = []
    for task in my_tasks:
        result.append({
            'id': task['id'],
            'title': task['title']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/executor_active_tasks')
@login_required
def api_executor_active_tasks():
    """API для получения активных задач исполнителя"""
    tasks = load_data(app_config.TASKS_DB)
    my_tasks = [t for t in tasks if t.get('assignee_id') == current_user.id and t.get('status') == 'активна']
    
    result = []
    for task in my_tasks:
        result.append({
            'id': task['id'],
            'title': task['title']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/executor_completed_tasks')
@login_required
def api_executor_completed_tasks():
    """API для получения завершенных задач исполнителя"""
    tasks = load_data(app_config.TASKS_DB)
    my_tasks = [t for t in tasks if t.get('assignee_id') == current_user.id and t.get('status') == 'завершена']
    
    result = []
    for task in my_tasks:
        result.append({
            'id': task['id'],
            'title': task['title']
        })
    
    return jsonify(result)


@dashboard_bp.route('/api/executor_paused_tasks')
@login_required
def api_executor_paused_tasks():
    """API для получения отложенных задач исполнителя"""
    tasks = load_data(app_config.TASKS_DB)
    my_tasks = [t for t in tasks if t.get('assignee_id') == current_user.id and t.get('status') == 'отложена']
    
    result = []
    for task in my_tasks:
        result.append({
            'id': task['id'],
            'title': task['title']
        })
    
    return jsonify(result)
