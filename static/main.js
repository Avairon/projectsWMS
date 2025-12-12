document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initTabs();
    initGanttChart();
});

function initMobileMenu() {
    const header = document.querySelector('header .container');
    const nav = document.querySelector('nav');
    
    if (!header || !nav) return;
    
    let toggle = document.querySelector('.mobile-menu-toggle');
    if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'mobile-menu-toggle';
        toggle.innerHTML = '&#9776;';
        toggle.setAttribute('aria-label', 'Toggle menu');
        toggle.setAttribute('aria-expanded', 'false');
        
        const h1 = header.querySelector('h1');
        if (h1) {
            h1.after(toggle);
        }
    }
    
    toggle.addEventListener('click', function() {
        nav.classList.toggle('active');
        const isActive = nav.classList.contains('active');
        toggle.setAttribute('aria-expanded', isActive.toString());
        toggle.innerHTML = isActive ? '&#10005;' : '&#9776;';
    });
    
    document.addEventListener('click', function(e) {
        if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('active')) {
            nav.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '&#9776;';
        }
    });
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
                
                if (tabId === 'gantt') {
                    setTimeout(renderGanttChart, 100);
                }
            }
        });
    });
}

let ganttScale = 1;

function initGanttChart() {
    if (typeof tasks === 'undefined' || !document.getElementById('gantt-chart')) {
        return;
    }
    renderGanttChart();
}

function zoomGantt(direction) {
    if (direction === 'in' && ganttScale < 2) {
        ganttScale += 0.2;
    } else if (direction === 'out' && ganttScale > 0.5) {
        ganttScale -= 0.2;
    }
    renderGanttChart();
}

function renderGanttChart() {
    const timelineEl = document.getElementById('gantt-timeline');
    const tasksEl = document.getElementById('gantt-tasks');
    
    if (!timelineEl || !tasksEl || typeof tasks === 'undefined') return;
    
    timelineEl.innerHTML = '';
    tasksEl.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        tasksEl.innerHTML = '<p class="no-data">Нет задач для отображения</p>';
        return;
    }
    
    const dayWidth = 35 * ganttScale;
    
    let startDate, endDate;
    
    if (typeof projectStartDate !== 'undefined' && projectStartDate) {
        startDate = parseDate(projectStartDate);
    } else {
        startDate = new Date();
        tasks.forEach(task => {
            if (task.start_date) {
                const taskStart = parseDate(task.start_date);
                if (taskStart < startDate) startDate = taskStart;
            }
        });
    }
    
    if (typeof projectEndDate !== 'undefined' && projectEndDate) {
        endDate = parseDate(projectEndDate);
    } else {
        endDate = new Date();
        tasks.forEach(task => {
            if (task.deadline) {
                const taskEnd = parseDate(task.deadline);
                if (taskEnd > endDate) endDate = taskEnd;
            }
        });
    }
    
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 14);
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'gantt-timeline-item';
        dayEl.style.width = dayWidth + 'px';
        
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayEl.classList.add('weekend');
        }
        
        if (date.getTime() === today.getTime()) {
            dayEl.classList.add('today');
        }
        
        dayEl.textContent = date.getDate() + '.' + (date.getMonth() + 1);
        timelineEl.appendChild(dayEl);
    }
    
    tasks.forEach(task => {
        const rowEl = document.createElement('div');
        rowEl.className = 'gantt-row';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'gantt-task-label';
        labelEl.textContent = task.title;
        labelEl.title = task.title;
        rowEl.appendChild(labelEl);
        
        const barContainer = document.createElement('div');
        barContainer.className = 'gantt-task-bar-container';
        barContainer.style.width = (totalDays * dayWidth) + 'px';
        
        const taskStartDate = task.start_date ? parseDate(task.start_date) : parseDate(task.created_at);
        const taskEndDate = task.deadline ? parseDate(task.deadline) : taskStartDate;
        
        const startOffset = Math.floor((taskStartDate - startDate) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((taskEndDate - taskStartDate) / (1000 * 60 * 60 * 24)) + 1);
        
        const barEl = document.createElement('div');
        barEl.className = 'gantt-task-bar';
        
        if (task.status === 'активна') {
            barEl.classList.add('status-active');
        } else if (task.status === 'завершена') {
            barEl.classList.add('status-completed');
        } else {
            barEl.classList.add('status-paused');
        }
        
        barEl.style.left = (startOffset * dayWidth) + 'px';
        barEl.style.width = (duration * dayWidth) + 'px';
        
        barEl.setAttribute('data-task-id', task.id);
        barEl.setAttribute('draggable', 'true');
        
        barEl.addEventListener('mouseenter', function(e) {
            showTooltip(e, task);
        });
        barEl.addEventListener('mouseleave', hideTooltip);
        barEl.addEventListener('click', function() {
            if (typeof showTaskModal === 'function') {
                showTaskModal(task.id);
            }
        });
        
        initDragDrop(barEl, task, dayWidth, startDate);
        
        barContainer.appendChild(barEl);
        rowEl.appendChild(barContainer);
        tasksEl.appendChild(rowEl);
    });
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length >= 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
}

function showTooltip(e, task) {
    const tooltip = document.getElementById('gantt-tooltip');
    if (!tooltip) return;
    
    tooltip.innerHTML = `
        <div class="tooltip-title">${task.title}</div>
        <div class="tooltip-info">
            Статус: ${task.status}<br>
            Начало: ${task.start_date || task.created_at}<br>
            Дедлайн: ${task.deadline || 'Не указан'}
        </div>
    `;
    
    tooltip.style.left = (e.pageX + 10) + 'px';
    tooltip.style.top = (e.pageY + 10) + 'px';
    tooltip.classList.add('visible');
}

function hideTooltip() {
    const tooltip = document.getElementById('gantt-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

function initDragDrop(barEl, task, dayWidth, chartStartDate) {
    let isDragging = false;
    let startX = 0;
    let originalLeft = 0;
    
    barEl.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('resize-handle')) return;
        
        isDragging = true;
        startX = e.clientX;
        originalLeft = parseInt(barEl.style.left) || 0;
        barEl.classList.add('dragging');
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const newLeft = Math.max(0, originalLeft + deltaX);
        barEl.style.left = newLeft + 'px';
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        
        isDragging = false;
        barEl.classList.remove('dragging');
        
        const newLeft = parseInt(barEl.style.left) || 0;
        const dayOffset = Math.round(newLeft / dayWidth);
        
        const newStartDate = new Date(chartStartDate);
        newStartDate.setDate(chartStartDate.getDate() + dayOffset);
        
        const duration = Math.round(parseInt(barEl.style.width) / dayWidth);
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + duration - 1);
        
        const formattedStartDate = formatDate(newStartDate);
        const formattedEndDate = formatDate(newEndDate);
        
        updateTaskDates(task.id, formattedStartDate, formattedEndDate);
    });
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function updateTaskDates(taskId, startDate, deadline) {
    const formData = new FormData();
    formData.append('start_date', startDate);
    formData.append('deadline', deadline);
    
    fetch(`/task/${taskId}/update`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Failed to update task:', data.error);
            renderGanttChart();
        }
    })
    .catch(error => {
        console.error('Error updating task:', error);
        renderGanttChart();
    });
}

function showTaskModal(taskId) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    
    fetch(`/api/task/${taskId}`)
        .then(response => response.json())
        .then(task => {
            const titleEl = document.getElementById('modal-task-title');
            const bodyEl = document.getElementById('modal-task-body');
            
            if (titleEl) titleEl.textContent = task.title;
            
            if (bodyEl) {
                bodyEl.innerHTML = `
                    <div class="task-detail-grid">
                        <div class="task-detail-item">
                            <strong>Статус</strong>
                            <p><span class="status-badge ${getStatusClass(task.status)}">${task.status}</span></p>
                        </div>
                        <div class="task-detail-item">
                            <strong>Исполнитель</strong>
                            <p>${task.assignee_name || 'Не назначен'}</p>
                        </div>
                        <div class="task-detail-item">
                            <strong>Дата начала</strong>
                            <p>${task.start_date || 'Не указана'}</p>
                        </div>
                        <div class="task-detail-item">
                            <strong>Дедлайн</strong>
                            <p>${task.deadline || 'Не указан'}</p>
                        </div>
                    </div>
                    <div class="task-detail-item" style="margin-bottom: 1rem;">
                        <strong>Описание</strong>
                        <p>${task.description || 'Нет описания'}</p>
                    </div>
                    ${task.files && task.files.length > 0 ? `
                        <div class="task-files-section">
                            <h4>Прикрепленные файлы</h4>
                            <div class="files-list">
                                ${task.files.map(file => `
                                    <div class="file-item">
                                        <span>${file.filename}</span>
                                        <small>${file.uploaded_at}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                `;
            }
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Error loading task:', error);
        });
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'активна': return 'status-active';
        case 'завершена': return 'status-completed';
        case 'отложена': return 'status-paused';
        default: return '';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
});
