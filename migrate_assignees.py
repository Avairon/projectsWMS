#!/usr/bin/env python3
"""
Скрипт миграции для преобразования assignee_id в assignee_ids
Запуск: python migrate_assignees.py
"""
import json
import os
from datetime import datetime

def migrate_tasks():
    """Миграция задач: assignee_id -> assignee_ids"""
    tasks_file = 'database/tasks.json'
    
    if not os.path.exists(tasks_file):
        print(f"❌ Файл {tasks_file} не найден")
        return False
    
    # Загружаем задачи
    with open(tasks_file, 'r', encoding='utf-8') as f:
        tasks = json.load(f)
    
    migrated_count = 0
    
    for task in tasks:
        # Если уже есть assignee_ids, пропускаем
        if 'assignee_ids' in task:
            continue
        
        # Если есть assignee_id, преобразуем в массив
        if 'assignee_id' in task and task['assignee_id']:
            task['assignee_ids'] = [task['assignee_id']]
            # Удаляем старое поле
            del task['assignee_id']
            migrated_count += 1
        else:
            # Если нет assignee_id, создаём пустой массив
            task['assignee_ids'] = []
            if 'assignee_id' in task:
                del task['assignee_id']
            migrated_count += 1
        
        # Миграция подзадач
        if 'subtasks' in task:
            for subtask in task['subtasks']:
                if 'assignee_ids' in subtask:
                    continue
                
                if 'assignee_id' in subtask and subtask['assignee_id']:
                    subtask['assignee_ids'] = [subtask['assignee_id']]
                    del subtask['assignee_id']
                else:
                    subtask['assignee_ids'] = []
                    if 'assignee_id' in subtask:
                        del subtask['assignee_id']
    
    # Создаём резервную копию
    backup_file = f'database/tasks_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Резервная копия создана: {backup_file}")
    
    # Сохраняем изменения
    with open(tasks_file, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Миграция завершена. Обработано задач: {migrated_count}")
    return True

if __name__ == '__main__':
    print("🔄 Начинаю миграцию assignee_id -> assignee_ids...")
    if migrate_tasks():
        print("✅ Миграция успешно завершена!")
    else:
        print("❌ Ошибка при миграции")