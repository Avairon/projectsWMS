"""
tables.py - Модуль для отображения и фильтрации таблиц
Создан для системы отчетов НХТК Реестр проектов
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import re


class DataTable:
    """Класс для создания и фильтрации таблиц с данными"""
    
    def __init__(self, data: List[Dict[str, Any]], fields: List[Dict[str, Any]]):
        """
        Инициализация таблицы
        
        Args:
            data: Список словарей с данными
            fields: Список полей таблицы в формате:
                [
                    {'name': 'field_key', 'label': 'Название поля', 'type': 'text|date'}
                ]
        """
        self.original_data = data
        self.filtered_data = data.copy()
        self.fields = fields
        self.filters = {}
        self.search_query = ""
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Парсит дату из формата DD.MM.YYYY"""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str.strip(), '%d.%m.%Y')
        except (ValueError, AttributeError):
            return None
    
    def _date_to_str(self, date_obj: datetime) -> str:
        """Преобразует datetime в строку формата DD.MM.YYYY"""
        return date_obj.strftime('%d.%m.%Y')
    
    def search(self, query: str) -> 'DataTable':
        """
        Поиск по текстовым полям
        
        Args:
            query: Строка для поиска (регистронезависимая)
        """
        if not query:
            self.filtered_data = self.original_data.copy()
            self.search_query = ""
            return self
        
        query_lower = query.lower()
        result = []
        
        for item in self.original_data:
            match = False
            for field in self.fields:
                if field.get('type') == 'text':
                    value = str(item.get(field['name'], '')).lower()
                    if query_lower in value:
                        match = True
                        break
            
            if match:
                result.append(item)
        
        self.filtered_data = result
        self.search_query = query
        return self
    
    def filter_by_date(self, field_name: str, date_value: str) -> 'DataTable':
        """
        Фильтр по конкретной дате
        
        Args:
            field_name: Имя поля с датой
            date_value: Дата в формате DD.MM.YYYY
        """
        target_date = self._parse_date(date_value)
        
        if not target_date:
            # Если дата некорректная, сбрасываем фильтр для этого поля
            self.filters.pop(field_name, None)
            return self
        
        result = []
        for item in self.filtered_data:
            item_date = self._parse_date(item.get(field_name, ''))
            if item_date and item_date.date() == target_date.date():
                result.append(item)
        
        self.filters[field_name] = {'type': 'exact', 'value': date_value}
        self.filtered_data = result
        return self
    
    def filter_by_date_range(self, field_name: str, start_date: str, end_date: str) -> 'DataTable':
        """
        Фильтр по диапазону дат
        
        Args:
            field_name: Имя поля с датой
            start_date: Начальная дата в формате DD.MM.YYYY
            end_date: Конечная дата в формате DD.MM.YYYY
        """
        start = self._parse_date(start_date)
        end = self._parse_date(end_date)
        
        if not start or not end:
            # Если даты некорректные, сбрасываем фильтр для этого поля
            self.filters.pop(field_name, None)
            return self
        
        # Убедимся, что start <= end
        if start > end:
            start, end = end, start
        
        result = []
        for item in self.filtered_data:
            item_date = self._parse_date(item.get(field_name, ''))
            if item_date and start.date() <= item_date.date() <= end.date():
                result.append(item)
        
        self.filters[field_name] = {'type': 'range', 'start': start_date, 'end': end_date}
        self.filtered_data = result
        return self
    
    def clear_filters(self) -> 'DataTable':
        """Очистить все фильтры и поиск"""
        self.filtered_data = self.original_data.copy()
        self.filters = {}
        self.search_query = ""
        return self
    
    def get_filtered_data(self) -> List[Dict[str, Any]]:
        """Получить отфильтрованные данные"""
        return self.filtered_data
    
    def get_total_count(self) -> int:
        """Получить общее количество записей"""
        return len(self.original_data)
    
    def get_filtered_count(self) -> int:
        """Получить количество отфильтрованных записей"""
        return len(self.filtered_data)
    
    def to_html_table(self, add_numbering: bool = True) -> str:
        """
        Преобразовать данные в HTML таблицу
        
        Args:
            add_numbering: Добавить колонку с нумерацией строк
            
        Returns:
            HTML строка с таблицей
        """
        if not self.filtered_data:
            return '<p>Нет данных для отображения</p>'
        
        html = ['<table class="data-table">']
        
        # Заголовки таблицы
        html.append('<thead><tr>')
        if add_numbering:
            html.append('<th class="number-col">#</th>')
        for field in self.fields:
            html.append(f'<th>{field["label"]}</th>')
        html.append('</tr></thead>')
        
        # Данные таблицы
        html.append('<tbody>')
        for idx, item in enumerate(self.filtered_data, 1):
            html.append('<tr>')
            if add_numbering:
                html.append(f'<td class="number-col">{idx}</td>')
            for field in self.fields:
                value = item.get(field['name'], '')
                html.append(f'<td>{value}</td>')
            html.append('</tr>')
        html.append('</tbody>')
        
        html.append('</table>')
        
        return '\n'.join(html)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Преобразовать таблицу в словарь для JSON ответа
        
        Returns:
            Словарь с данными, метаданными и фильтрами
        """
        result = []
        for idx, item in enumerate(self.filtered_data, 1):
            row = {'row_number': idx}
            for field in self.fields:
                row[field['name']] = item.get(field['name'], '')
            result.append(row)
        
        return {
            'data': result,
            'fields': self.fields,
            'total_count': self.get_total_count(),
            'filtered_count': self.get_filtered_count(),
            'filters': self.filters,
            'search_query': self.search_query
        }


def create_projects_table(projects: List[Dict[str, Any]], 
                          users: List[Dict[str, Any]]) -> DataTable:
    """
    Создает таблицу проектов с обогащенными данными
    
    Args:
        projects: Список проектов
        users: Список пользователей для получения имен кураторов и руководителей
        
    Returns:
        DataTable с проектами
    """
    # Подготовка данных
    table_data = []
    
    for project in projects:
        # Найти куратора
        supervisor = next((u for u in users if u.get('id') == project.get('supervisor_id')), None)
        supervisor_name = supervisor.get('name', '') if supervisor else ''
        
        # Найти руководителя
        manager = next((u for u in users if u.get('id') == project.get('manager_id')), None)
        manager_name = manager.get('name', '') if manager else ''
        
        table_data.append({
            'start_date': project.get('start_date', ''),
            'end_date': project.get('end_date', ''),
            'project_name': project.get('name', ''),
            'status': project.get('status', ''),
            'curator_name': manager_name,
            'manager_name': supervisor_name
        })
    
    # Определение полей таблицы
    fields = [
        {'name': 'start_date', 'label': 'Дата начала', 'type': 'date'},
        {'name': 'end_date', 'label': 'Дата окончания', 'type': 'date'},
        {'name': 'project_name', 'label': 'Название проекта', 'type': 'text'},
        {'name': 'status', 'label': 'Статус', 'type': 'text'},
        {'name': 'curator_name', 'label': 'Куратор проекта', 'type': 'text'},
        {'name': 'manager_name', 'label': 'Руководитель проекта', 'type': 'text'}
    ]
    
    return DataTable(table_data, fields)


def create_tasks_table(tasks: List[Dict[str, Any]], 
                       users: List[Dict[str, Any]],
                       projects: List[Dict[str, Any]]) -> DataTable:
    """
    Создает таблицу задач с обогащенными данными
    
    Args:
        tasks: Список задач
        users: Список пользователей
        projects: Список проектов
        
    Returns:
        DataTable с задачами
    """
    # Подготовка данных
    table_data = []
    
    for task in tasks:
        # Найти исполнителя
        assignee = next((u for u in users if u.get('id') == task.get('assignee_id')), None)
        executor_name = assignee.get('name', '') if assignee else ''
        
        # Найти проект
        project = next((p for p in projects if p.get('id') == task.get('project_id')), None)
        project_name = project.get('name', '') if project else ''
        
        # Определяем дату окончания
        end_date = task.get('deadline', '')
        if task.get('status') == 'завершена' and task.get('completion_date'):
            end_date = task.get('completion_date')
        
        table_data.append({
            'executor': executor_name,
            'project': project_name,
            'task': task.get('title', ''),
            'start_date': task.get('start_date', ''),
            'end_date': end_date,
            'status': task.get('status', '')
        })
    
    # Определение полей таблицы
    fields = [
        {'name': 'executor', 'label': 'Исполнитель', 'type': 'text'},
        {'name': 'project', 'label': 'Проект', 'type': 'text'},
        {'name': 'task', 'label': 'Задача', 'type': 'text'},
        {'name': 'start_date', 'label': 'Дата начала задачи', 'type': 'date'},
        {'name': 'end_date', 'label': 'Дата окончания задачи', 'type': 'date'},
        {'name': 'status', 'label': 'Статус задачи', 'type': 'text'}
    ]
    
    return DataTable(table_data, fields)


# Экспортируемые функции
__all__ = [
    'DataTable',
    'create_projects_table',
    'create_tasks_table'
]