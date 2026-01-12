#!/usr/bin/env python3
"""
Скрипт для конвертации формата дат в JSON-файлах базы данных
из YYYY-MM-DD в DD.MM.YYYY
"""

import json
import os
from datetime import datetime

def convert_date_format(date_str):
    """Конвертирует дату из формата YYYY-MM-DD в DD.MM.YYYY"""
    if not date_str or not isinstance(date_str, str):
        return date_str
    
    # Проверяем, является ли строка датой в формате YYYY-MM-DD
    if '-' in date_str and len(date_str) == 10:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%d.%m.%Y')
        except ValueError:
            # Если не получилось распознать формат, возвращаем как есть
            return date_str
    elif '/' in date_str and len(date_str) <= 10:
        # Если формат DD/MM/YYYY, конвертируем в DD.MM.YYYY
        try:
            date_obj = datetime.strptime(date_str, '%d/%m/%Y')
            return date_obj.strftime('%d.%m.%Y')
        except ValueError:
            return date_str
    else:
        # Проверяем формат DD.MM.YYYY, чтобы не конвертировать дважды
        try:
            date_obj = datetime.strptime(date_str, '%d.%m.%Y')
            return date_str  # Уже в нужном формате
        except ValueError:
            # Если это не дата в нужном формате, возвращаем как есть
            return date_str

def process_projects_db(file_path):
    """Обрабатывает файл базы данных проектов"""
    if not os.path.exists(file_path):
        print(f"Файл {file_path} не найден")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated = False
    for project in data:
        if 'start_date' in project and project['start_date']:
            old_date = project['start_date']
            project['start_date'] = convert_date_format(old_date)
            if old_date != project['start_date']:
                print(f"Преобразована дата начала проекта {project['id']}: {old_date} -> {project['start_date']}")
                updated = True
        
        if 'end_date' in project and project['end_date']:
            old_date = project['end_date']
            project['end_date'] = convert_date_format(old_date)
            if old_date != project['end_date']:
                print(f"Преобразована дата окончания проекта {project['id']}: {old_date} -> {project['end_date']}")
                updated = True
    
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Файл {file_path} обновлен")
    else:
        print(f"Файл {file_path} не требует изменений")

def process_tasks_db(file_path):
    """Обрабатывает файл базы данных задач"""
    if not os.path.exists(file_path):
        print(f"Файл {file_path} не найден")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated = False
    for task in data:
        if 'start_date' in task and task['start_date']:
            old_date = task['start_date']
            task['start_date'] = convert_date_format(old_date)
            if old_date != task['start_date']:
                print(f"Преобразована дата начала задачи {task['id']}: {old_date} -> {task['start_date']}")
                updated = True
        
        if 'deadline' in task and task['deadline']:
            old_date = task['deadline']
            task['deadline'] = convert_date_format(old_date)
            if old_date != task['deadline']:
                print(f"Преобразована дата дедлайна задачи {task['id']}: {old_date} -> {task['deadline']}")
                updated = True
                
        if 'created_at' in task and task['created_at']:
            old_date = task['created_at']
            task['created_at'] = convert_date_format(old_date)
            if old_date != task['created_at']:
                print(f"Преобразована дата создания задачи {task['id']}: {old_date} -> {task['created_at']}")
                updated = True
                
        if 'completion_date' in task and task['completion_date'] and task['completion_date'] != "":
            old_date = task['completion_date']
            task['completion_date'] = convert_date_format(old_date)
            if old_date != task['completion_date']:
                print(f"Преобразована дата завершения задачи {task['id']}: {old_date} -> {task['completion_date']}")
                updated = True
    
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Файл {file_path} обновлен")
    else:
        print(f"Файл {file_path} не требует изменений")

def main():
    print("Конвертация формата дат в базе данных...")
    
    projects_db = '/workspace/database/projects.json'
    tasks_db = '/workspace/database/tasks.json'
    
    print("Обработка проектов...")
    process_projects_db(projects_db)
    
    print("Обработка задач...")
    process_tasks_db(tasks_db)
    
    print("Конвертация завершена!")

if __name__ == "__main__":
    main()