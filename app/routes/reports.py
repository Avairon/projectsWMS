from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from app.utils import load_data
from config import Config

app_config = Config()
reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/reports')
@login_required
def reports():
    """Страница отчетов для администраторов"""
    if current_user.role != 'admin':
        from flask import abort, flash, redirect, url_for
        flash('У вас нет прав доступа к этой странице')
        return redirect(url_for('dashboard.dashboard'))
    
    return render_template('reports.html')


@reports_bp.route('/api/reports/projects')
@login_required
def get_projects_report():
    """API endpoint для получения данных отчета по проектам"""
    if current_user.role != 'admin':
        return jsonify({'error': 'У вас нет прав доступа к этой странице'}), 403
    
    projects = load_data(app_config.PROJECTS_DB)
    users = load_data(app_config.USERS_DB)
    directions = load_data(app_config.DIRECTIONS_DB)
    
    report_data = []
    
    for project in projects:
        # Найти куратора направления
        supervisor = next((u for u in users if u.get('id') == project.get('supervisor_id')), None)
        supervisor_name = supervisor.get('name', '') if supervisor else ''
        
        # Найти руководителя
        manager = next((u for u in users if u.get('id') == project.get('manager_id')), None)
        manager_name = manager.get('name', '') if manager else ''
        
        # Найти название направления
        direction_name = project.get('direction', '')
        
        report_data.append({
            'project_name': project.get('name', ''),
            'curator_name': manager_name,
            'direction': direction_name,
            'manager_name': supervisor_name,
            'status': project.get('status', ''),
            'start_date': project.get('start_date', ''),
            'end_date': project.get('end_date', '')
        })
    
    return jsonify(report_data)


@reports_bp.route('/api/reports/tasks')
@login_required
def get_tasks_report():
    """API endpoint для получения данных отчета по задачам проектов"""
    if current_user.role != 'admin':
        return jsonify({'error': 'У вас нет прав доступа к этой странице'}), 403
    
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    report_data = []
    
    for task in tasks:
        # Найти исполнителя задачи
        assignee = next((u for u in users if u.get('id') == task.get('assignee_id')), None)
        executor_name = assignee.get('name', '') if assignee else ''
        
        # Найти проект задачи
        project = next((p for p in projects if p.get('id') == task.get('project_id')), None)
        project_name = project.get('name', '') if project else ''
        
        # Определяем дату окончания (дедлайн или дата завершения)
        end_date = task.get('deadline', '')
        if task.get('status') == 'завершена' and task.get('completion_date'):
            end_date = task.get('completion_date')
        
        report_data.append({
            'executor': executor_name,
            'project': project_name,
            'task': task.get('title', ''),
            'start_date': task.get('start_date', ''),
            'end_date': end_date,
            'status': task.get('status', '')
        })
    
    return jsonify(report_data)