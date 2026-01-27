from flask import Blueprint, render_template, jsonify, send_file
import io
import time
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
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


@reports_bp.route('/api/reports/projects/download')
@login_required
def download_projects_report():
    """Download endpoint for projects report in Excel format"""
    if current_user.role != 'admin':
        return jsonify({'error': 'У вас нет прав доступа к этой странице'}), 403
    
    projects = load_data(app_config.PROJECTS_DB)
    users = load_data(app_config.USERS_DB)
    directions = load_data(app_config.DIRECTIONS_DB)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Отчет по проектам"
    
    # Define headers
    headers = ["Дата начала", "Дата окончания", "Название проекта", "Статус", "Куратор проекта", "Руководитель проекта"]
    
    # Add headers to worksheet
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Add data rows
    for row_num, project in enumerate(projects, 2):
        # Найти куратора направления
        supervisor = next((u for u in users if u.get('id') == project.get('supervisor_id')), None)
        supervisor_name = supervisor.get('name', '') if supervisor else ''
        
        # Найти руководителя
        manager = next((u for u in users if u.get('id') == project.get('manager_id')), None)
        manager_name = manager.get('name', '') if manager else ''
        
        # Найти название направления
        direction_name = project.get('direction', '')
        
        ws.cell(row=row_num, column=1, value=project.get('start_date', ''))
        ws.cell(row=row_num, column=2, value=project.get('end_date', ''))
        ws.cell(row=row_num, column=3, value=project.get('name', ''))
        ws.cell(row=row_num, column=4, value=project.get('status', ''))
        ws.cell(row=row_num, column=5, value=manager_name)
        ws.cell(row=row_num, column=6, value=supervisor_name)
    
    # Adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO object
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    timestamp = int(time.time())
    filename = f'report_projects_{current_user.id}_{timestamp}.xlsx'
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


@reports_bp.route('/api/reports/tasks/download')
@login_required
def download_tasks_report():
    """Download endpoint for tasks report in Excel format"""
    if current_user.role != 'admin':
        return jsonify({'error': 'У вас нет прав доступа к этой странице'}), 403
    
    tasks = load_data(app_config.TASKS_DB)
    users = load_data(app_config.USERS_DB)
    projects = load_data(app_config.PROJECTS_DB)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Отчет по задачам"
    
    # Define headers
    headers = ["Исполнитель", "Проект", "Задача", "Дата начала задачи", "Дата окончания задачи", "Статус задачи"]
    
    # Add headers to worksheet
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Add data rows
    for row_num, task in enumerate(tasks, 2):
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
        
        ws.cell(row=row_num, column=1, value=executor_name)
        ws.cell(row=row_num, column=2, value=project_name)
        ws.cell(row=row_num, column=3, value=task.get('title', ''))
        ws.cell(row=row_num, column=4, value=task.get('start_date', ''))
        ws.cell(row=row_num, column=5, value=end_date)
        ws.cell(row=row_num, column=6, value=task.get('status', ''))
    
    # Adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO object
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    timestamp = int(time.time())
    filename = f'report_tasks_{current_user.id}_{timestamp}.xlsx'
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )