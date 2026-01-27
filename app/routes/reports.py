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
            'curator_name': supervisor_name,
            'direction': direction_name,
            'manager_name': manager_name,
            'status': project.get('status', ''),
            'start_date': project.get('start_date', ''),
            'end_date': project.get('end_date', '')
        })
    
    return jsonify(report_data)