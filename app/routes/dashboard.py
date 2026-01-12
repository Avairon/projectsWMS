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
    
    stats = {
        'total_projects': len(visible_projects),
        'active_projects': len([p for p in visible_projects if p['status'] == 'в работе']),
        'total_tasks': len(user_tasks),
        'active_tasks': len([t for t in user_tasks if t['status'] == 'активна']),
        'completed_tasks': len([t for t in user_tasks if t['status'] == 'завершена'])
    }
    
    user_token = current_user.token

    return render_template('dashboard.html', 
                         projects=visible_projects, 
                         tasks=user_tasks, 
                         users=users, 
                         stats=stats,
                         user_token=user_token)
