document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initGanttChart();
    initTooltips();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
            
            if (tabId === 'gantt') {
                setTimeout(() => renderGanttChart(), 100);
            }
        });
    });
}

let ganttScale = 40;
let ganttStartDate = null;
let ganttEndDate = null;

function initGanttChart() {
    if (typeof tasksData === 'undefined' || typeof projectStartDate === 'undefined') {
        return;
    }
    
    const startParts = projectStartDate.split('.');
    const endParts = projectEndDate.split('.');
    
    if (startParts.length === 3) {
        ganttStartDate = new Date(startParts[2], startParts[1] - 1, startParts[0]);
    } else {
        ganttStartDate = new Date();
    }
    
    if (endParts.length === 3) {
        ganttEndDate = new Date(endParts[2], endParts[1] - 1, endParts[0]);
    } else {
        ganttEndDate = new Date();
        ganttEndDate.setMonth(ganttEndDate.getMonth() + 3);
    }
    
    if (isNaN(ganttStartDate.getTime())) {
        ganttStartDate = new Date();
    }
    if (isNaN(ganttEndDate.getTime())) {
        ganttEndDate = new Date();
        ganttEndDate.setMonth(ganttEndDate.getMonth() + 3);
    }
}

function renderGanttChart() {
    const timeline = document.getElementById('gantt-timeline');
    const tasksContainer = document.getElementById('gantt-tasks');
    
    if (!timeline || !tasksContainer) return;
    
    timeline.innerHTML = '';
    tasksContainer.innerHTML = '';
    
    if (!ganttStartDate || !ganttEndDate) {
        initGanttChart();
    }
    
    const days = getDaysBetween(ganttStartDate, ganttEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const labelWidth = 200;
    timeline.innerHTML = `<div style="min-width: ${labelWidth}px; border-right: 2px solid var(--gray-300);"></div>`;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date(ganttStartDate);
        date.setDate(date.getDate() + i);
        
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = date.getTime() === today.getTime();
        
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        
        const timelineItem = document.createElement('div');
        timelineItem.className = 'gantt-timeline-item';
        if (isWeekend) timelineItem.classList.add('weekend');
        if (isToday) timelineItem.classList.add('today');
        timelineItem.style.minWidth = ganttScale + 'px';
        timelineItem.innerHTML = `
            <div>${date.getDate()}</div>
            <div style="font-size: 0.65rem; opacity: 0.7">${dayNames[dayOfWeek]}</div>
        `;
        timeline.appendChild(timelineItem);
    }
    
    if (typeof tasksData === 'undefined' || !tasksData.length) {
        tasksContainer.innerHTML = '<p class="no-data" style="padding: 20px;">Нет задач для отображения на графике</p>';
        return;
    }
    
    tasksData.forEach(task => {
        const row = document.createElement('div');
        row.className = 'gantt-row';
        row.dataset.taskId = task.id;
        
        const label = document.createElement('div');
        label.className = 'gantt-task-label';
        label.textContent = task.title;
        label.title = task.title;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'gantt-task-bar-container';
        
        let taskStart, taskEnd;
        
        if (task.start_date) {
            const startParts = task.start_date.split('.');
            if (startParts.length === 3) {
                taskStart = new Date(startParts[2], startParts[1] - 1, startParts[0]);
            }
        }
        
        if (task.deadline) {
            const endParts = task.deadline.split('.');
            if (endParts.length === 3) {
                taskEnd = new Date(endParts[2], endParts[1] - 1, endParts[0]);
            }
        }
        
        if (!taskStart || isNaN(taskStart.getTime())) {
            taskStart = new Date(ganttStartDate);
        }
        if (!taskEnd || isNaN(taskEnd.getTime())) {
            taskEnd = new Date(taskStart);
            taskEnd.setDate(taskEnd.getDate() + 7);
        }
        
        const startOffset = getDaysBetween(ganttStartDate, taskStart);
        const duration = getDaysBetween(taskStart, taskEnd) + 1;
        
        const bar = document.createElement('div');
        bar.className = 'gantt-task-bar';
        
        let statusClass = 'status-active';
        if (task.status === 'завершена') statusClass = 'status-completed';
        else if (task.status === 'отложена') statusClass = 'status-paused';
        bar.classList.add(statusClass);
        
        bar.style.left = (startOffset * ganttScale) + 'px';
        bar.style.width = (duration * ganttScale) + 'px';
        bar.dataset.taskId = task.id;
        bar.dataset.startDate = formatDate(taskStart);
        bar.dataset.endDate = formatDate(taskEnd);
        
        const leftHandle = document.createElement('div');
        leftHandle.className = 'resize-handle left';
        
        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        
        bar.appendChild(leftHandle);
        bar.appendChild(rightHandle);
        
        initDragAndDrop(bar, barContainer);
        initResize(bar, leftHandle, rightHandle, barContainer);
        
        bar.addEventListener('click', function(e) {
            if (!e.target.classList.contains('resize-handle')) {
                openTaskModal(task.id);
            }
        });
        
        const assignee = typeof usersData !== 'undefined' ? 
            usersData.find(u => u.id === task.assignee_id) : null;
        
        bar.addEventListener('mouseenter', function(e) {
            showTooltip(e, task, assignee);
        });
        
        bar.addEventListener('mousemove', function(e) {
            moveTooltip(e);
        });
        
        bar.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        barContainer.appendChild(bar);
        row.appendChild(label);
        row.appendChild(barContainer);
        tasksContainer.appendChild(row);
    });
}

function getDaysBetween(start, end) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((end - start) / oneDay);
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function initDragAndDrop(bar, container) {
    let isDragging = false;
    let startX = 0;
    let originalLeft = 0;
    
    bar.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('resize-handle')) return;
        
        isDragging = true;
        startX = e.clientX;
        originalLeft = parseInt(bar.style.left) || 0;
        bar.classList.add('dragging');
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const newLeft = originalLeft + deltaX;
        
        const snappedLeft = Math.round(newLeft / ganttScale) * ganttScale;
        bar.style.left = Math.max(0, snappedLeft) + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        
        isDragging = false;
        bar.classList.remove('dragging');
        
        const newStartOffset = parseInt(bar.style.left) / ganttScale;
        const duration = parseInt(bar.style.width) / ganttScale;
        
        const newStartDate = new Date(ganttStartDate);
        newStartDate.setDate(newStartDate.getDate() + newStartOffset);
        
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + duration - 1);
        
        bar.dataset.startDate = formatDate(newStartDate);
        bar.dataset.endDate = formatDate(newEndDate);
        
        updateTaskDates(bar.dataset.taskId, formatDate(newStartDate), formatDate(newEndDate));
    });
}

function initResize(bar, leftHandle, rightHandle, container) {
    let isResizing = false;
    let resizeDirection = null;
    let startX = 0;
    let originalLeft = 0;
    let originalWidth = 0;
    
    function startResize(e, direction) {
        isResizing = true;
        resizeDirection = direction;
        startX = e.clientX;
        originalLeft = parseInt(bar.style.left) || 0;
        originalWidth = parseInt(bar.style.width) || ganttScale;
        bar.classList.add('dragging');
        
        e.preventDefault();
        e.stopPropagation();
    }
    
    leftHandle.addEventListener('mousedown', (e) => startResize(e, 'left'));
    rightHandle.addEventListener('mousedown', (e) => startResize(e, 'right'));
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        
        if (resizeDirection === 'left') {
            const newLeft = Math.round((originalLeft + deltaX) / ganttScale) * ganttScale;
            const newWidth = originalWidth - (newLeft - originalLeft);
            
            if (newWidth >= ganttScale && newLeft >= 0) {
                bar.style.left = newLeft + 'px';
                bar.style.width = newWidth + 'px';
            }
        } else if (resizeDirection === 'right') {
            const newWidth = Math.round((originalWidth + deltaX) / ganttScale) * ganttScale;
            
            if (newWidth >= ganttScale) {
                bar.style.width = newWidth + 'px';
            }
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (!isResizing) return;
        
        isResizing = false;
        resizeDirection = null;
        bar.classList.remove('dragging');
        
        const newStartOffset = parseInt(bar.style.left) / ganttScale;
        const duration = parseInt(bar.style.width) / ganttScale;
        
        const newStartDate = new Date(ganttStartDate);
        newStartDate.setDate(newStartDate.getDate() + newStartOffset);
        
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + duration - 1);
        
        bar.dataset.startDate = formatDate(newStartDate);
        bar.dataset.endDate = formatDate(newEndDate);
        
        updateTaskDates(bar.dataset.taskId, formatDate(newStartDate), formatDate(newEndDate));
    });
}

function updateTaskDates(taskId, startDate, endDate) {
    console.log('Updating task dates:', taskId, startDate, endDate);
    
    // TODO: Backend - Реализовать API endpoint для обновления дат задачи
    // PUT /api/tasks/<task_id>/dates
    // Body: { start_date: string, deadline: string }
    // Ожидаемый ответ: { success: boolean, task: Task }
    
    /*
    fetch(`/api/tasks/${taskId}/dates`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_date: startDate,
            deadline: endDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Даты задачи обновлены', 'success');
        } else {
            showNotification('Ошибка обновления дат', 'error');
            renderGanttChart();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка соединения', 'error');
        renderGanttChart();
    });
    */
    
    showNotification('Даты задачи обновлены (требуется backend)', 'success');
}

function ganttZoom(direction) {
    if (direction === 'in') {
        ganttScale = Math.min(80, ganttScale + 10);
    } else {
        ganttScale = Math.max(20, ganttScale - 10);
    }
    renderGanttChart();
}

function ganttToday() {
    const chart = document.getElementById('gantt-chart');
    if (!chart) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysFromStart = getDaysBetween(ganttStartDate, today);
    const scrollPosition = (daysFromStart * ganttScale) - (chart.clientWidth / 2) + 200;
    
    chart.scrollLeft = Math.max(0, scrollPosition);
}

function initTooltips() {
}

function showTooltip(e, task, assignee) {
    const tooltip = document.getElementById('gantt-tooltip');
    if (!tooltip) return;
    
    const assigneeName = assignee ? assignee.name : 'Не назначен';
    
    tooltip.innerHTML = `
        <div class="tooltip-title">${task.title}</div>
        <div class="tooltip-info">
            <div>Исполнитель: ${assigneeName}</div>
            <div>Статус: ${task.status}</div>
            <div>Дедлайн: ${task.deadline || 'Не указан'}</div>
        </div>
    `;
    
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
    tooltip.classList.add('visible');
}

function moveTooltip(e) {
    const tooltip = document.getElementById('gantt-tooltip');
    if (!tooltip) return;
    
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('gantt-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

let currentTaskId = null;

function openTaskModal(taskId) {
    currentTaskId = taskId;
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;
    
    const assignee = typeof usersData !== 'undefined' ? 
        usersData.find(u => u.id === task.assignee_id) : null;
    
    document.getElementById('modal-task-title').textContent = task.title;
    document.getElementById('modal-task-description').textContent = task.description || 'Описание отсутствует';
    
    const statusEl = document.getElementById('modal-task-status');
    statusEl.textContent = task.status;
    statusEl.className = 'status-badge';
    if (task.status === 'активна') statusEl.classList.add('status-active');
    else if (task.status === 'завершена') statusEl.classList.add('status-completed');
    else statusEl.classList.add('status-paused');
    
    document.getElementById('modal-task-assignee').textContent = assignee ? assignee.name : 'Не назначен';
    document.getElementById('modal-task-start').textContent = task.start_date || 'Не указана';
    document.getElementById('modal-task-deadline').textContent = task.deadline || 'Не указан';
    
    loadTaskFiles(taskId);
    
    const fileUploadSection = document.getElementById('file-upload-section');
    if (fileUploadSection) {
        if (task.status !== 'завершена') {
            fileUploadSection.style.display = 'flex';
        } else {
            fileUploadSection.style.display = 'none';
        }
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentTaskId = null;
}

function loadTaskFiles(taskId) {
    const filesContainer = document.getElementById('modal-task-files');
    if (!filesContainer) return;
    
    // TODO: Backend - Реализовать API endpoint для получения файлов задачи
    // GET /api/tasks/<task_id>/files
    // Ожидаемый ответ: { files: [{ id: string, name: string, url: string, uploaded_at: string }] }
    
    /*
    fetch(`/api/tasks/${taskId}/files`)
        .then(response => response.json())
        .then(data => {
            if (data.files && data.files.length > 0) {
                filesContainer.innerHTML = data.files.map(file => `
                    <div class="file-item">
                        <a href="${file.url}" target="_blank">${file.name}</a>
                        <span>${file.uploaded_at}</span>
                    </div>
                `).join('');
            } else {
                filesContainer.innerHTML = '<p class="no-data">Файлы не прикреплены</p>';
            }
        })
        .catch(error => {
            console.error('Error loading files:', error);
            filesContainer.innerHTML = '<p class="no-data">Ошибка загрузки файлов</p>';
        });
    */
    
    filesContainer.innerHTML = '<p class="no-data">Файлы не прикреплены (требуется backend)</p>';
}

function uploadTaskFile() {
    const fileInput = document.getElementById('task-file-input');
    if (!fileInput || !fileInput.files.length || !currentTaskId) return;
    
    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('files', fileInput.files[i]);
    }
    
    console.log('Uploading files for task:', currentTaskId);
    
    // TODO: Backend - Реализовать API endpoint для загрузки файлов к задаче
    // POST /api/tasks/<task_id>/files
    // Body: FormData с файлами
    // Ожидаемый ответ: { success: boolean, files: [{ id, name, url }] }
    // Условие: задача не должна быть в статусе "завершена"
    
    /*
    fetch(`/api/tasks/${currentTaskId}/files`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Файлы загружены', 'success');
            loadTaskFiles(currentTaskId);
            fileInput.value = '';
        } else {
            showNotification('Ошибка загрузки файлов', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка соединения', 'error');
    });
    */
    
    showNotification('Загрузка файлов (требуется backend)', 'success');
    fileInput.value = '';
}

function openChangeAssigneeModal() {
    const modal = document.getElementById('change-assignee-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeChangeAssigneeModal() {
    const modal = document.getElementById('change-assignee-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function changeAssignee() {
    const select = document.getElementById('new-assignee');
    if (!select || !currentTaskId) return;
    
    const newAssigneeId = select.value;
    
    console.log('Changing assignee for task:', currentTaskId, 'to:', newAssigneeId);
    
    // TODO: Backend - Реализовать API endpoint для изменения ответственного
    // PUT /api/tasks/<task_id>/assignee
    // Body: { assignee_id: string }
    // Ожидаемый ответ: { success: boolean, task: Task }
    
    /*
    fetch(`/api/tasks/${currentTaskId}/assignee`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            assignee_id: newAssigneeId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Ответственный изменен', 'success');
            closeChangeAssigneeModal();
            location.reload();
        } else {
            showNotification('Ошибка изменения ответственного', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка соединения', 'error');
    });
    */
    
    showNotification('Ответственный изменен (требуется backend)', 'success');
    closeChangeAssigneeModal();
}

function openAddMemberModal() {
    const modal = document.getElementById('add-member-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeAddMemberModal() {
    const modal = document.getElementById('add-member-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    const tokenInput = document.getElementById('member-token');
    if (tokenInput) {
        tokenInput.value = '';
    }
}

function addMemberByToken() {
    const tokenInput = document.getElementById('member-token');
    if (!tokenInput) return;
    
    const token = tokenInput.value.trim();
    if (!token) {
        showNotification('Введите токен участника', 'error');
        return;
    }
    
    console.log('Adding member by token:', token, 'to project:', projectId);
    
    // TODO: Backend - Реализовать API endpoint для добавления участника в команду
    // POST /api/projects/<project_id>/team
    // Body: { token: string } или { user_id: string }
    // Ожидаемый ответ: { success: boolean, member: { id, name, token, role } }
    // Права доступа: куратор или руководитель проекта
    
    /*
    fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token: token
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Участник добавлен в команду', 'success');
            closeAddMemberModal();
            location.reload();
        } else {
            showNotification(data.message || 'Ошибка добавления участника', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка соединения', 'error');
    });
    */
    
    showNotification('Участник добавлен (требуется backend)', 'success');
    closeAddMemberModal();
}

function removeMember(memberId) {
    if (!confirm('Вы уверены, что хотите удалить этого участника из команды?')) {
        return;
    }
    
    console.log('Removing member:', memberId, 'from project:', projectId);
    
    // TODO: Backend - Реализовать API endpoint для удаления участника из команды
    // DELETE /api/projects/<project_id>/team/<user_id>
    // Ожидаемый ответ: { success: boolean }
    // Права доступа: куратор или руководитель проекта
    
    /*
    fetch(`/api/projects/${projectId}/team/${memberId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Участник удален из команды', 'success');
            location.reload();
        } else {
            showNotification('Ошибка удаления участника', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка соединения', 'error');
    });
    */
    
    showNotification('Участник удален (требуется backend)', 'success');
}

function showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification flash ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 3000;
        min-width: 250px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeAddMemberModal();
        closeChangeAssigneeModal();
    }
});
