from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user
from app.utils import load_data, save_data, can_access_project, get_available_roles, load_directions
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
    
    if current_user.role == 'admin':
        visible_projects = projects
    elif current_user.role == 'manager':
        visible_projects = [p for p in projects if p.get('manager_id', '') == current_user.id or p.get('supervisor_id', '') == current_user.id]
    elif current_user.role == 'supervisor':
        visible_projects = [p for p in projects if p.get('supervisor_id', '') == current_user.id]
    else:
        visible_projects = [p for p in projects if current_user.id in p.get('team', [])]
    
    user_tasks = []
    if current_user.role == 'admin':
        user_tasks = tasks
    elif current_user.role in ['manager', 'supervisor']:
        project_ids = [p['id'] for p in visible_projects]
        user_tasks = [t for t in tasks if t['project_id'] in project_ids]
    else:
        user_tasks = [t for t in tasks if t['assignee_id'] == current_user.id]
    
    # Calculate task status distribution
    not_started_tasks = len([t for t in user_tasks if t['status'] == 'не начата'])
    in_progress_tasks = len([t for t in user_tasks if t['status'] == 'активна'])
    completed_tasks_count = len([t for t in user_tasks if t['status'] == 'завершена'])
    
    # Calculate completed tasks on time
    completed_on_time = 0
    for task in user_tasks:
        if task['status'] == 'завершена':
            try:
                deadline = datetime.strptime(task['deadline'], '%d.%m.%Y')
                # Check if completion_date exists and is not empty
                completion_date_str = task.get('completion_date', '')
                if completion_date_str and completion_date_str.strip():
                    completion_date = datetime.strptime(completion_date_str, '%d.%m.%Y')
                else:
                    # If completion date is not set, use current date as fallback
                    completion_date = datetime.now()
                    
                if completion_date <= deadline:
                    completed_on_time += 1
            except ValueError:
                # Handle case where date format is invalid
                continue
    
    # Calculate task percentages
    total_tasks_count = len(user_tasks)
    completed_percentage = round((completed_tasks_count / total_tasks_count * 100), 2) if total_tasks_count > 0 else 0
    on_time_percentage = round((completed_on_time / completed_tasks_count * 100), 2) if completed_tasks_count > 0 else 0
    
    stats = {
        'total_projects': len(visible_projects),
        'active_projects': len([p for p in visible_projects if p['status'] == 'в работе']),
        'total_tasks': total_tasks_count,
        'active_tasks': in_progress_tasks,
        'completed_tasks': completed_tasks_count,
        'not_started_tasks': not_started_tasks,
        'completed_on_time': completed_on_time,
        'completed_percentage': completed_percentage,
        'on_time_percentage': on_time_percentage,
        'unique_assignees': len(set([t['assignee_id'] for t in user_tasks]))
    }
    
    user_token = current_user.token
    directions = [d['name'] for d in load_directions()]

    return render_template('dashboard.html', 
                         projects=visible_projects, 
                         tasks=user_tasks, 
                         users=users, 
                         stats=stats,
                         user_token=user_token,
                         directions=directions)
