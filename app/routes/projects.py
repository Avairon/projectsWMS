from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user
from app.utils import load_data, save_data, can_access_project, can_access_task, load_directions
from config import Config
import uuid
from datetime import datetime
from dateutil.parser import parse as parse_date

app_config = Config()
projects_bp = Blueprint('projects', __name__)


def calculate_project_statistics(project_id):
    """
    Вычисляет статистику по проекту:
    - % не выполненных задач
    - % выполненных задач в срок
    - количество сотрудников
    """
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)
    
    # Получаем задачи проекта
    project_tasks = [t for t in tasks if t.get('project_id') == project_id]
    
    total_tasks = len(project_tasks)
    completed_tasks = [t for t in project_tasks if t.get('status') == 'завершена']
    incomplete_tasks = [t for t in project_tasks if t.get('status') != 'завершена']
    
    # Вычисляем процент невыполненных задач
    percent_incomplete = 0
    if total_tasks > 0:
        percent_incomplete = (len(incomplete_tasks) / total_tasks) * 100
    
    # Вычисляем процент выполненных задач в срок
    completed_on_time = 0
    for task in completed_tasks:
        if 'completion_date' in task and task['completion_date']:
            try:
                deadline = parse_date(task['deadline'], dayfirst=True)
                completion_date = parse_date(task['completion_date'], dayfirst=True)
                if completion_date <= deadline:
                    completed_on_time += 1
            except:
                # Если не удается распарсить даты, считаем, что задача не выполнена в срок
                pass
    
    percent_completed_on_time = 0
    if len(completed_tasks) > 0:
        percent_completed_on_time = (completed_on_time / len(completed_tasks)) * 100
    
    # Получаем команду проекта
    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p.get('id') == project_id), None)
    team_members = project.get('team', []) if project else []
    employee_count = len(team_members)
    
    return {
        'percent_incomplete': round(percent_incomplete, 2),
        'percent_completed_on_time': round(percent_completed_on_time, 2),
        'employee_count': employee_count
    }


def calculate_employee_statistics(project_id):
    """
    Вычисляет статистику по сотрудникам проекта:
    - сколько всего задач выполнено
    - % выполненных задач в срок
    """
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)
    
    # Получаем задачи проекта
    project_tasks = [t for t in tasks if t.get('project_id') == project_id]
    
    # Получаем команду проекта
    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p.get('id') == project_id), None)
    team_member_ids = project.get('team', []) if project else []
    
    employee_stats = []
    
    for user_id in team_member_ids:
        user = next((u for u in users if u.get('id') == user_id), None)
        if user:
            # Все задачи пользователя в проекте
            user_tasks = [t for t in project_tasks if t.get('assignee_id') == user_id]
            
            # Выполненные задачи пользователя
            completed_tasks = [t for t in user_tasks if t.get('status') == 'завершена']
            
            # Выполненные в срок задачи
            completed_on_time = 0
            for task in completed_tasks:
                if 'completion_date' in task and task['completion_date']:
                    try:
                        deadline = parse_date(task['deadline'], dayfirst=True)
                        completion_date = parse_date(task['completion_date'], dayfirst=True)
                        if completion_date <= deadline:
                            completed_on_time += 1
                    except:
                        # Если не удается распарсить даты, считаем, что задача не выполнена в срок
                        pass
            
            # Процент выполненных задач в срок
            percent_completed_on_time = 0
            if len(completed_tasks) > 0:
                percent_completed_on_time = (completed_on_time / len(completed_tasks)) * 100
            
            employee_stats.append({
                'id': user_id,
                'name': user.get('name', ''),
                'total_completed_tasks': len(completed_tasks),
                'percent_completed_on_time': round(percent_completed_on_time, 2)
            })
    
    return employee_stats


@projects_bp.route('/project/<project_id>')
@login_required
def project_detail(project_id):
    if not can_access_project(project_id):
        flash('У вас нет доступа к этому проекту')
        return redirect(url_for('dashboard.dashboard'))

    projects = load_data(app_config.PROJECTS_DB)
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)

    project = next((p for p in projects if p.get('id') == project_id), None)
    if not project:
        flash('Проект не найден')
        return redirect(url_for('dashboard.dashboard'))

    project_tasks = [t for t in tasks if t.get('project_id') == project_id]

    supervisor = next((u for u in users if u.get('id') == project.get('supervisor_id', '')), None) if project.get('supervisor_id') else None
    manager = next((u for u in users if u.get('id') == project.get('manager_id', '')), None) if project.get('manager_id') else None
    team_members = []
    if project.get('team'):
        team_members = [next((u for u in users if u.get('id') == member_id), None) for member_id in project.get('team', [])]
        team_members = [m for m in team_members if m]

    # Получаем статистику проекта
    project_stats = calculate_project_statistics(project_id)
    employee_stats = calculate_employee_statistics(project_id)
    
    return render_template('project_detail.html', 
                         project=project, 
                         tasks=project_tasks, 
                         supervisor=supervisor, 
                         manager=manager, 
                         team_members=team_members,
                         users=users,
                         project_stats=project_stats,
                         employee_stats=employee_stats)


@projects_bp.route('/api/project/<project_id>/statistics')
@login_required
def project_statistics_api(project_id):
    """API endpoint для получения статистики проекта"""
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403

    project_stats = calculate_project_statistics(project_id)
    employee_stats = calculate_employee_statistics(project_id)
    
    return jsonify({
        'project_stats': project_stats,
        'employee_stats': employee_stats
    })


@projects_bp.route('/create_project', methods=['GET', 'POST'])
@login_required
def create_project():
    if current_user.role not in ['admin', 'manager']:
        flash('У вас нет прав на создание проектов')
        return redirect(url_for('dashboard.dashboard'))

    users = load_data(app_config.USERS_DB)
    managers = [u for u in users if u['role'] in ['admin', 'manager']]
    curators = [u for u in users if u['role'] in ['admin', 'supervisor', 'manager']]
    directions = load_directions()

    if request.method == 'POST':
        project_id = str(uuid.uuid4())[:8]
        
        start_date = request.form['start_date']
        end_date = request.form.get('end_date', '')
        
        # Проверяем формат даты и при необходимости конвертируем
        if start_date:
            try:
                start_dt = parse_date(start_date, dayfirst=True)
                start_date = start_dt.strftime("%d.%m.%Y")
            except:
                flash('Некорректный формат даты начала')
                return render_template('create_project.html', users=users, managers=managers, curators=curators, directions=directions)
        
        if end_date:
            try:
                end_dt = parse_date(end_date, dayfirst=True)
                end_date = end_dt.strftime("%d.%m.%Y")
            except:
                flash('Некорректный формат даты окончания')
                return render_template('create_project.html', users=users, managers=managers, curators=curators, directions=directions)

        # Получаем данные об инициаторе
        initiator_type = request.form.get('initiator_type', '').strip()
        initiator_name = request.form.get('initiator_name', '').strip()
        
        # Валидация инициатора
        if not initiator_type:
            flash('Пожалуйста, выберите тип инициатора проекта')
            return render_template('create_project.html', users=users, managers=managers, curators=curators, directions=directions)
        
        # Для некоторых типов инициаторов требуется ФИО
        if initiator_type in ['deputy_director', 'department_head', 'teacher'] and not initiator_name:
            flash('Для выбранного типа инициатора необходимо указать ФИО')
            return render_template('create_project.html', users=users, managers=managers, curators=curators, directions=directions)


        team_members = request.form.get('team_members', '')
        team = team_members.split(',') if team_members else []

        new_project = {
            "id": project_id,
            "name": request.form['name'].strip(),
            "description": request.form['description'].strip(),
            "direction": request.form['direction'].strip(),
            "expected_result": request.form['expected_result'].strip(),
            "start_date": start_date,
            "end_date": end_date,
            "last_activity": datetime.now().strftime("%d.%m.%Y"),
            "status": request.form.get('status', 'в работе'),
            "supervisor_id": request.form['supervisor_id'],
            "manager_id": request.form['manager_id'],
            "team": team,
            "initiator_type": initiator_type,
            "initiator_name": initiator_name if initiator_name else None
        }

        projects = load_data(app_config.PROJECTS_DB)
        projects.append(new_project)
        save_data(app_config.PROJECTS_DB, projects)

        flash('Проект успешно создан')
        return redirect(url_for('projects.project_detail', project_id=project_id))

    return render_template('create_project.html', users=users, managers=managers, curators=curators, directions=directions)


@projects_bp.route('/project/<project_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_project(project_id):
    if not can_access_project(project_id):
        flash('У вас нет доступа к этому проекту')
        return redirect(url_for('dashboard.dashboard'))

    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p['id'] == project_id), None)

    if not project:
        flash('Проект не найден')
        return redirect(url_for('dashboard.dashboard'))

    if current_user.role not in ['admin'] and current_user.id != project['manager_id']:
        flash('У вас нет прав на редактирование этого проекта')
        return redirect(url_for('projects.project_detail', project_id=project_id))

    users = load_data(app_config.USERS_DB)
    managers = [u for u in users if u['role'] in ['admin', 'manager']]
    directions = load_directions()

    if request.method == 'POST':
        project['name'] = request.form['name'].strip()
        project['description'] = request.form['description'].strip()
        project['direction'] = request.form['direction'].strip()
        project['expected_result'] = request.form['expected_result'].strip()
        
        # Обновляем данные об инициаторе
        initiator_type = request.form.get('initiator_type', '').strip()
        initiator_name = request.form.get('initiator_name', '').strip()
        
        if not initiator_type:
            flash('Пожалуйста, выберите тип инициатора проекта')
            return render_template('edit_project.html', project=project, users=users, managers=managers, directions=directions)
        
        if initiator_type in ['deputy_director', 'department_head', 'teacher'] and not initiator_name:
            flash('Для выбранного типа инициатора необходимо указать ФИО')
            return render_template('edit_project.html', project=project, users=users, managers=managers, directions=directions)
        
        project['initiator_type'] = initiator_type
        project['initiator_name'] = initiator_name if initiator_name else None

        end_date = request.form.get('end_date', None)
        if end_date:
            try:
                end_dt = parse_date(end_date)
                end_date = end_dt.strftime("%d.%m.%Y")
                project['end_date'] = end_date
            except:
                flash('Некорректный формат даты окончания')
                return render_template('edit_project.html', project=project, users=users, managers=managers, directions=directions)
        else:
            project['end_date'] = end_date
        
        team_members = request.form.get('team_members', '')
        project['team'] = team_members.split(',') if team_members else []
        
        project['status'] = request.form.get('status', 'в работе')
        project['supervisor_id'] = request.form.get('supervisor_id', None)
        project['manager_id'] = request.form.get('manager_id', None)
        project['last_activity'] = datetime.now().strftime("%d.%m.%Y")

        for i, p in enumerate(projects):
            if p['id'] == project_id:
                projects[i] = project
                break

        save_data(app_config.PROJECTS_DB, projects)
        flash('Проект успешно обновлен')
        return redirect(url_for('projects.project_detail', project_id=project_id))

    return render_template('edit_project.html', project=project, users=users, managers=managers, directions=directions)


@projects_bp.route('/api/project/<project_id>/team', methods=['GET'])
@login_required
def api_get_project_team(project_id):
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403

    projects = load_data(app_config.PROJECTS_DB)
    users = load_data(app_config.USERS_DB)

    project = next((p for p in projects if p['id'] == project_id), None)
    if not project:
        return jsonify({'error': 'Проект не найден'}), 404

    team_member_ids = project.get('team', [])
    team_members = []

    for user_id in team_member_ids:
        user = next((u for u in users if u['id'] == user_id), None)
        if user:
            from app.utils import get_user_token
            token = get_user_token(user_id, project_id)
            team_member = {
                'id': user['id'],
                'token': token,
                'role': user.get('role', ''),
                'name': user.get('name', '')
            }
            team_members.append(team_member)

    return jsonify(team_members)


@projects_bp.route('/project/<project_id>/add_member', methods=['POST'])
@login_required
def add_project_member(project_id):
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403

    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p['id'] == project_id), None)
    if not project:
        return jsonify({'error': 'Проект не найден'}), 404

    if current_user.role not in ['admin', 'manager', 'supervisor']:
        return jsonify({'error': 'У вас нет прав для добавления участников в проект'}), 403

    if current_user.role == 'supervisor' and project.get('supervisor_id') != current_user.id:
        return jsonify({'error': 'Вы не являетесь куратором этого проекта'}), 403

    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({'error': 'Не указан ID пользователя'}), 400

    users = load_data(app_config.USERS_DB)
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    team = project.get('team', [])
    if user_id not in team:
        team.append(user_id)
        project['team'] = team

        for i, p in enumerate(projects):
            if p['id'] == project_id:
                projects[i] = project
                break
        save_data(app_config.PROJECTS_DB, projects)

        return jsonify({'success': True, 'message': 'Участник успешно добавлен в проект'})
    else:
        return jsonify({'error': 'Пользователь уже является участником проекта'}), 400


@projects_bp.route('/project/<project_id>/remove_member/<user_id>', methods=['POST'])
@login_required
def remove_project_member(project_id, user_id):
    if not can_access_project(project_id):
        return jsonify({'error': 'У вас нет доступа к этому проекту'}), 403

    projects = load_data(app_config.PROJECTS_DB)
    project = next((p for p in projects if p['id'] == project_id), None)
    if not project:
        return jsonify({'error': 'Проект не найден'}), 404

    if current_user.role not in ['admin', 'manager', 'supervisor']:
        return jsonify({'error': 'У вас нет прав для удаления участников из проекта'}), 403

    if current_user.role == 'supervisor' and project.get('supervisor_id') != current_user.id:
        return jsonify({'error': 'Вы не являетесь куратором этого проекта'}), 403

    users = load_data(app_config.USERS_DB)
    user = next((u for u in users if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    team = project.get('team', [])
    if user_id in team:
        team.remove(user_id)
        project['team'] = team

        for i, p in enumerate(projects):
            if p['id'] == project_id:
                projects[i] = project
                break
        save_data(app_config.PROJECTS_DB, projects)

        return jsonify({'success': True, 'message': 'Участник успешно удален из проекта'})
    else:
        return jsonify({'error': 'Пользователь не является участником проекта'}), 400
