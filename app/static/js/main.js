// Функция для парсинга даты из формата DD.MM.YYYY
function parseDateDDMMYYYY(dateStr) {
    if (!dateStr) return null;

    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            // parts[0] = день, parts[1] = месяц, parts[2] = год
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }

    // Если не DD.MM.YYYY, пробуем стандартный формат
    return new Date(dateStr);
}

document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initTabs();
    initProjectFilters();
    initTaskFilters();
    initGanttChart();
    initTaskModal();
    initDatePickers();
});

function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function () {
            nav.classList.toggle('active');
            const expanded = nav.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', expanded);
        });
    }
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'gantt-tab') {
                const ganttChart = document.getElementById('gantt-chart');
                if (ganttChart && ganttChart.dataset.projectId) {
                    loadGanttData(ganttChart.dataset.projectId);
                }
            }
        });
    });
}

function initProjectFilters() {
    const showCompletedCheckbox = document.getElementById('show-completed-projects');
    const projectsList = document.getElementById('projects-list');

    if (showCompletedCheckbox && projectsList) {
        showCompletedCheckbox.addEventListener('change', function () {
            const showCompleted = this.checked;
            const projectCards = projectsList.querySelectorAll('.project-card');

            projectCards.forEach(card => {
                const status = card.dataset.status;
                if (status === 'завершен') {
                    card.style.display = showCompleted ? '' : 'none';
                }
            });
        });

        showCompletedCheckbox.dispatchEvent(new Event('change'));
    }
}

function initTaskFilters() {
    const projectFilter = document.getElementById('task-project-filter');
    const statusFilter = document.getElementById('task-status-filter');
    const tasksList = document.getElementById('tasks-list');

    if (tasksList) {
        function filterTasks() {
            const projectId = projectFilter ? projectFilter.value : '';
            const status = statusFilter ? statusFilter.value : '';
            const taskCards = tasksList.querySelectorAll('.task-card');

            taskCards.forEach(card => {
                const cardProjectId = card.dataset.projectId;
                const cardStatus = card.dataset.status;

                let showByProject = !projectId || cardProjectId === projectId;
                let showByStatus = !status || cardStatus === status;

                card.style.display = (showByProject && showByStatus) ? '' : 'none';
            });
        }

        if (projectFilter) {
            projectFilter.addEventListener('change', filterTasks);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', filterTasks);
        }
    }
}

let currentZoom = 'week';
let ganttTasks = [];

function initGanttChart() {
    const ganttContainer = document.getElementById('gantt-chart');
    const zoomButtons = document.querySelectorAll('.gantt-zoom-btn');

    if (!ganttContainer) return;

    zoomButtons.forEach(button => {
        button.addEventListener('click', function () {
            zoomButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentZoom = this.dataset.zoom;

            if (ganttContainer.dataset.projectId) {
                renderGantt();
            }
        });
    });
}

function loadGanttData(projectId) {
    fetch(`/api/project/${projectId}/tasks`)
        .then(response => response.json())
        .then(tasks => {
            ganttTasks = tasks;
            renderGantt();
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
        });
}

function parseDate(dateStr) {
    if (!dateStr) return null;

    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }

    if (dateStr.includes('-')) {
        return new Date(dateStr);
    }

    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }

    return new Date(dateStr);
}

function formatDateDDMMYYYY(date) {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function renderGantt() {
    const ganttChart = document.getElementById('gantt-chart');
    if (!ganttChart || ganttTasks.length === 0) {
        ganttChart.innerHTML = '<p class="no-data">Нет задач для отображения</p>';
        return;
    }

    let minDate = null;
    let maxDate = null;

    ganttTasks.forEach(task => {
        const startDate = parseDate(task.start_date) || parseDate(task.created_at);
        const endDate = parseDate(task.deadline);

        if (startDate && (!minDate || startDate < minDate)) {
            minDate = new Date(startDate);
        }
        if (endDate && (!maxDate || endDate > maxDate)) {
            maxDate = new Date(endDate);
        }
    });

    if (!minDate || !maxDate) {
        ganttChart.innerHTML = '<p class="no-data">Недостаточно данных для диаграммы</p>';
        return;
    }

    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    let cellWidth, dateFormat;
    switch (currentZoom) {
        case 'day':
            cellWidth = 40;
            dateFormat = 'day';
            break;
        case 'week':
            cellWidth = 35;
            dateFormat = 'day';
            break;
        case 'month':
            cellWidth = 20;
            dateFormat = 'day';
            break;
        case 'year':
            cellWidth = 60;
            dateFormat = 'month';
            break;
        default:
            cellWidth = 35;
            dateFormat = 'day';
    }

    let timelineItems = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (currentZoom === 'year') {
        const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

        let currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
            const isCurrentMonth = currentMonth.getMonth() === today.getMonth() &&
                currentMonth.getFullYear() === today.getFullYear();
            timelineItems.push({
                date: new Date(currentMonth),
                label: currentMonth.toLocaleDateString('ru-RU', { month: 'short' }),
                isToday: isCurrentMonth,
                isWeekend: false
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    } else {
        let currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = currentDate.getTime() === today.getTime();

            timelineItems.push({
                date: new Date(currentDate),
                label: currentDate.getDate(),
                isToday: isToday,
                isWeekend: isWeekend
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    let html = '<div class="gantt-timeline">';
    html += `<div class="gantt-task-label" style="min-width: 160px; border-right: 2px solid var(--gray-300);">Задача</div>`;

    timelineItems.forEach(item => {
        let classes = 'gantt-timeline-item';
        if (item.isToday) classes += ' today';
        if (item.isWeekend) classes += ' weekend';
        html += `<div class="${classes}" style="min-width: ${cellWidth}px;">${item.label}</div>`;
    });
    html += '</div>';

    html += '<div class="gantt-tasks">';

    ganttTasks.forEach(task => {
        const startDate = parseDate(task.start_date) || parseDate(task.created_at);
        const endDate = parseDate(task.deadline);

        if (!startDate || !endDate) return;

        let statusClass = 'status-active';
        if (task.status === 'завершена') statusClass = 'status-completed';
        else if (task.status === 'отложена') statusClass = 'status-paused';

        let startOffset, barWidth;

        if (currentZoom === 'year') {
            const startMonthDiff = (startDate.getFullYear() - minDate.getFullYear()) * 12 +
                (startDate.getMonth() - minDate.getMonth());
            const endMonthDiff = (endDate.getFullYear() - minDate.getFullYear()) * 12 +
                (endDate.getMonth() - minDate.getMonth());
            startOffset = startMonthDiff * cellWidth;
            barWidth = Math.max((endMonthDiff - startMonthDiff + 1) * cellWidth, cellWidth);
        } else {
            const startDaysDiff = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
            const endDaysDiff = Math.floor((endDate - minDate) / (1000 * 60 * 60 * 24));
            startOffset = startDaysDiff * cellWidth;
            barWidth = Math.max((endDaysDiff - startDaysDiff + 1) * cellWidth, cellWidth);
        }

        const assigneeName = task.assignee_name || 'Не назначен';

        html += `
            <div class="gantt-row">
                <div class="gantt-task-label" title="${task.title}">${task.title}</div>
                <div class="gantt-task-bar-container">
                    <div class="gantt-task-bar ${statusClass}" 
                         style="left: ${startOffset}px; width: ${barWidth}px;"
                         data-task-id="${task.id}"
                         title="${task.title} - ${assigneeName}">
                        ${assigneeName}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    ganttChart.innerHTML = html;

    ganttChart.querySelectorAll('.gantt-task-bar').forEach(bar => {
        bar.addEventListener('click', function () {
            const taskId = this.dataset.taskId;
            openTaskModal(taskId);
        });
    });
}

function initTaskModal() {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeTaskModal);
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeTaskModal();
        }
    });

    const editButtons = document.querySelectorAll('.edit-task-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            openTaskModal(this.dataset.taskId);
        });
    });

    const taskRows = document.querySelectorAll('.task-row');
    taskRows.forEach(row => {
        row.addEventListener('click', function (e) {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                openTaskModal(this.dataset.taskId);
            }
        });
    });

    const editForm = document.getElementById('edit-task-form');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            submitTaskEdit();
        });
    }
}

function openTaskModal(taskId) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    fetch(`/api/task/${taskId}`)
        .then(response => response.json())
        .then(task => {
            document.getElementById('edit-task-id').value = task.id;
            document.getElementById('edit-task-title').value = task.title || '';
            document.getElementById('edit-task-description').value = task.description || '';
            document.getElementById('edit-task-status').value = task.status || 'активна';

            const startDate = parseDate(task.start_date);
            const deadline = parseDate(task.deadline);

            if (startDate) {
                document.getElementById('edit-task-start').value = formatDateForInput(startDate);
            }
            if (deadline) {
                document.getElementById('edit-task-deadline').value = formatDateForInput(deadline);
            }

            const assigneeSelect = document.getElementById('edit-task-assignee');
            assigneeSelect.innerHTML = '';

            if (task.team_users && task.team_users.length > 0) {
                task.team_users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.name;
                    if (user.id === task.assignee_id) {
                        option.selected = true;
                    }
                    assigneeSelect.appendChild(option);
                });
            }

            const historyList = modal.querySelector('.history-list');
            if (historyList && task.history) {
                historyList.innerHTML = '';
                task.history.forEach(entry => {
                    historyList.innerHTML += `
                        <div class="history-item">
                            <strong>${entry.action}</strong>
                            <span class="history-date">${entry.date} - ${entry.user_name}</span>
                        </div>
                    `;
                });
            }

            const reportsList = modal.querySelector('.reports-list');
            if (reportsList && task.reports) {
                reportsList.innerHTML = '';
                task.reports.forEach(report => {
                    let fileHtml = '';
                    const fileData = report.file || report.file_info;
                    if (fileData) {
                        const fileName = fileData.filename;
                        const executorDir = fileData.executor_dir;
                        const uniqueFilename = fileData.unique_filename;
                        const fileSize = fileData.size;

                        let fileUrl;
                        if (executorDir && uniqueFilename) {
                            fileUrl = `/uploads/${executorDir}/${uniqueFilename}`;
                        } else if (fileData.path) {
                            const cleanPath = fileData.path.startsWith('/') ? fileData.path.substring(1) : fileData.path;
                            fileUrl = `/uploads/${cleanPath}`;
                        } else {
                            if (fileData.unique_filename) {
                                if (fileData.executor_dir) {
                                    fileUrl = `/uploads/${fileData.executor_dir}/${fileData.unique_filename}`;
                                } else {
                                    fileUrl = `/uploads/${fileData.unique_filename}`;
                                }
                            } else {
                                fileUrl = '#';
                            }
                        }

                        fileHtml = `
                            <div class="report-file">
                                <strong>Прикрепленный файл:</strong>
                                <div class="file-actions">
                                    <a href="${fileUrl}" download class="file-action-btn download-btn">Скачать</a>
                                </div>
                                <small>${fileName} (${fileSize || fileData.size || 'N/A'} байт)</small>
                            </div>
                        `;
                    }

                    reportsList.innerHTML += `
                        <div class="report-item">
                            <span class="report-comment">${report.comment || 'Без комментария'}</span>
                            <span class="report-date">
                                <span>${report.date}</span>
                                <span>${report.executor_name}</span>
                            </span>
                            ${fileHtml}
                        </div>
                    `;
                });
            }

            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Error loading task:', error);
            alert('Ошибка при загрузке задачи');
        });
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function formatDateForInput(date) {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function submitTaskEdit() {
    const taskId = document.getElementById('edit-task-id').value;
    const formData = new FormData();

    formData.append('title', document.getElementById('edit-task-title').value);
    formData.append('description', document.getElementById('edit-task-description').value);
    formData.append('assignee_id', document.getElementById('edit-task-assignee').value);
    formData.append('status', document.getElementById('edit-task-status').value);
    formData.append('start_date', document.getElementById('edit-task-start').value);
    formData.append('deadline', document.getElementById('edit-task-deadline').value);

    fetch(`/task/${taskId}/update`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeTaskModal();
                location.reload();
            } else {
                alert(data.error || 'Ошибка при сохранении');
            }
        })
        .catch(error => {
            console.error('Error updating task:', error);
            alert('Ошибка при сохранении задачи');
        });
}

function toggleHistory(event) {
    event.stopPropagation();
    event.preventDefault();

    const historyDiv = document.getElementById('task-history');
    if (historyDiv.style.display === 'none' || historyDiv.style.display === '') {
        historyDiv.style.display = 'block';
    } else {
        historyDiv.style.display = 'none';
    }
}

function toggleTeam() {
    const teamDiv = document.getElementById('project-team-section');
    if (teamDiv.style.display === 'none' || teamDiv.style.display === '') {
        teamDiv.style.display = 'block';
    } else {
        teamDiv.style.display = 'none';
    }
}

function initDatePickers() {
    const datePickerInputs = document.querySelectorAll('input[type="text"][id*="date"], input[type="text"][placeholder*="ДД.ММ.ГГГГ"]');

    datePickerInputs.forEach(input => {
        if (input.hasAttribute('data-datepicker-initialized')) {
            return;
        }

        input.setAttribute('data-datepicker-initialized', 'true');

        input.style.position = 'relative';
        input.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z\' /%3E%3C/svg%3E")';
        input.style.backgroundRepeat = 'no-repeat';
        input.style.backgroundPosition = 'right 8px center';
        input.style.backgroundSize = '16px 16px';
        input.style.paddingRight = '30px';

        input.addEventListener('click', function (e) {
            if (!this._datePickerDiv) {
                createDatePicker(this);
            }
        });

        input.addEventListener('blur', function () {
            validateDateFormat(this);
        });

        input.addEventListener('keypress', function (e) {
            if (!/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                e.preventDefault();
            }
        });
    });
}

function createDatePicker(inputElement) {
    if (inputElement._datePickerDiv && inputElement._datePickerDiv.parentNode) {
        inputElement._datePickerDiv.parentNode.removeChild(inputElement._datePickerDiv);
    }

    const datePicker = document.createElement('div');
    datePicker.className = 'date-picker-popup';
    datePicker.style.cssText = `
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        padding: 10px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: none;
    `;

    let currentDate = new Date();
    if (inputElement.value) {
        const parsedDate = parseDateDDMMYYYY(inputElement.value);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            currentDate = parsedDate;
        }
    }

    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    `;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&lt;';
    prevButton.style.cssText = `
        border: none;
        background: #f0f0f0;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 3px;
    `;
    prevButton.onclick = () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendar();
    };

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&gt;';
    nextButton.style.cssText = `
        border: none;
        background: #f0f0f0;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 3px;
    `;
    nextButton.onclick = () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendar();
    };

    const monthYearDisplay = document.createElement('span');
    monthYearDisplay.style.fontWeight = 'bold';

    header.appendChild(prevButton);
    header.appendChild(monthYearDisplay);
    header.appendChild(nextButton);
    datePicker.appendChild(header);

    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const weekdayRow = document.createElement('div');
    weekdayRow.style.cssText = `
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        font-weight: bold;
        margin-bottom: 5px;
        text-align: center;
    `;

    weekdays.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.style.cssText = 'padding: 5px; font-size: 12px;';
        weekdayRow.appendChild(dayEl);
    });

    datePicker.appendChild(weekdayRow);

    const daysContainer = document.createElement('div');
    daysContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    `;

    datePicker.appendChild(daysContainer);

    function updateCalendar() {
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        daysContainer.innerHTML = '';

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.style.cssText = 'height: 30px;';
            daysContainer.appendChild(emptyCell);
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = day;
            dayElement.style.cssText = `
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 3px;
                user-select: none;
            `;

            const today = new Date();
            const isToday = today.getDate() === day &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear;

            if (isToday) {
                dayElement.style.backgroundColor = '#007bff';
                dayElement.style.color = 'white';
            }

            if (inputElement.value) {
                const selectedDate = parseDateDDMMYYYY(inputElement.value);
                if (selectedDate &&
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === currentMonth &&
                    selectedDate.getFullYear() === currentYear) {
                    dayElement.style.backgroundColor = '#007bff';
                    dayElement.style.color = 'white';
                }
            }

            dayElement.addEventListener('click', function () {
                const formattedDate = `${String(day).padStart(2, '0')}.${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;
                inputElement.value = formattedDate;

                datePicker.style.display = 'none';

                if (datePicker.parentNode) {
                    datePicker.parentNode.removeChild(datePicker);
                }
                delete inputElement._datePickerDiv;
            });

            dayElement.addEventListener('mouseover', function () {
                this.style.backgroundColor = '#e9ecef';
            });

            dayElement.addEventListener('mouseout', function () {
                const isSelected = inputElement.value &&
                    parseDateDDMMYYYY(inputElement.value) &&
                    parseDateDDMMYYYY(inputElement.value).getDate() === day &&
                    parseDateDDMMYYYY(inputElement.value).getMonth() === currentMonth &&
                    parseDateDDMMYYYY(inputElement.value).getFullYear() === currentYear;

                const isToday = today.getDate() === day &&
                    today.getMonth() === currentMonth &&
                    today.getFullYear() === currentYear;

                if (isSelected) {
                    this.style.backgroundColor = '#007bff';
                    this.style.color = 'white';
                } else if (isToday) {
                    this.style.backgroundColor = '#007bff';
                    this.style.color = 'white';
                } else {
                    this.style.backgroundColor = '';
                    this.style.color = '';
                }
            });

            daysContainer.appendChild(dayElement);
        }
    }

    updateCalendar();

    document.body.appendChild(datePicker);
    inputElement._datePickerDiv = datePicker;

    const rect = inputElement.getBoundingClientRect();
    datePicker.style.top = `${rect.bottom + window.scrollY}px`;
    datePicker.style.left = `${rect.left + window.scrollX}px`;

    datePicker.style.display = 'block';

    const closePicker = function (e) {
        if (!datePicker.contains(e.target) && e.target !== inputElement) {
            datePicker.style.display = 'none';
            document.removeEventListener('click', closePicker);
            if (datePicker.parentNode) {
                datePicker.parentNode.removeChild(datePicker);
            }
            delete inputElement._datePickerDiv;
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closePicker);
    }, 10);
}

function validateDateFormat(inputElement) {
    const value = inputElement.value.trim();
    const datePattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = value.match(datePattern);

    if (value && match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);

        const date = new Date(year, month, day);

        if (date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day) {
            inputElement.setCustomValidity('Введите действительную дату');
        } else {
            inputElement.setCustomValidity('');
        }
    } else if (value) {
        inputElement.setCustomValidity('Введите дату в формате ДД.ММ.ГГГГ');
    } else {
        inputElement.setCustomValidity('');
    }
}

// ==================== ФУНКЦИИ ДЛЯ ПОДЗАДАЧ ====================

function loadSubtasks(taskId) {
    const subtasksContainer = document.getElementById('subtasks-container');
    if (!subtasksContainer) return;

    subtasksContainer.innerHTML = `
        <div class="subtasks-loading">
            <p>Загрузка подзадач...</p>
        </div>
    `;

    fetch(`/task/${taskId}/subtasks`)
        .then(response => response.json())
        .then(subtasks => {
            renderSubtasks(subtasks, taskId);
        })
        .catch(error => {
            console.error('Error loading subtasks:', error);
            subtasksContainer.innerHTML = '<p class="no-subtasks">Ошибка при загрузке подзадач</p>';
        });
}

function renderSubtasks(subtasks, taskId) {
    const subtasksContainer = document.getElementById('subtasks-container');
    if (!subtasksContainer) return;

    if (!subtasks || subtasks.length === 0) {
        subtasksContainer.innerHTML = `
            <div class="no-subtasks">
                <p>Нет подзадач</p>
                <button class="btn btn-primary" onclick="event.stopPropagation(); showAddSubtaskForm('${taskId}', event)">Добавить подзадачу</button>
            </div>
        `;
        return;
    }

    let html = `
        <div class="subtasks-header">
            <h3>---ПОДЗАДАЧИ---</h3>
            <button class="btn btn-primary" onclick="event.stopPropagation(); showAddSubtaskForm('${taskId}', event)">+ Добавить подзадачу</button>
        </div>
        <div class="subtasks-list">
    `;

    subtasks.forEach(subtask => {
        const statusIcon = subtask.completed ? '(Y)' : '(N)';
        const statusClass = subtask.completed ? 'completed' : 'pending';
        const plannedDate = subtask.planned_date || '-';
        const completedDate = subtask.completed_date || '-';

        html += `
            <div class="subtask-item ${statusClass}" data-subtask-id="${subtask.id}" style="display: flex; align-items: center; gap: 10px; padding: 5px 0;">
                <div class="subtask-checkbox">
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                           onchange="toggleSubtaskStatus('${taskId}', '${subtask.id}', this.checked, event)" style="display:none">
                    <span class="status-icon" style="cursor:pointer" onclick="this.previousElementSibling.click()">${statusIcon}</span>
                </div>
                <div class="subtask-text">
                    <span class="subtask-title">${escapeHtml(subtask.title)}</span>
                    <span class="subtask-dates">(Запланировано: ${plannedDate} / Сделано: ${completedDate})</span>
                    ${subtask.report ? `<span class="subtask-report">(${escapeHtml(subtask.report)})</span>` : ''}
                </div>
                
                ${subtask.file ? renderSubtaskFile(subtask.file, taskId, subtask.id) : ''}
                
                <div class="subtask-actions" style="margin-left: auto;">
                    <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); editSubtask('${taskId}', '${subtask.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSubtask('${taskId}', '${subtask.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    subtasksContainer.innerHTML = html;
}

function showAddSubtaskForm(taskId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const subtasksContainer = document.getElementById('subtasks-container');
    if (!subtasksContainer) return;

    const existingForm = document.querySelector('.add-subtask-form');
    if (existingForm) {
        existingForm.remove();
        return;
    }

    const formHtml = `
        <div class="add-subtask-form">
            <h4>Новая подзадача</h4>
            <form id="new-subtask-form" onsubmit="return submitNewSubtask(event, '${taskId}')">
                <div class="form-group">
                    <label>Название подзадачи:</label>
                    <input type="text" id="subtask-title" class="form-control" required placeholder="Введите название подзадачи">
                </div>
                <div class="form-group">
                    <label>Дата запланировано:</label>
                    <input type="text" id="subtask-planned-date" class="form-control date-input" 
                           placeholder="ДД.ММ.ГГГГ">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-success" onclick="event.stopPropagation()">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="event.stopPropagation(); cancelAddSubtask()">
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    `;

    const header = document.querySelector('.subtasks-header');
    if (header) {
        header.insertAdjacentHTML('afterend', formHtml);
    } else {
        subtasksContainer.insertAdjacentHTML('afterbegin', formHtml);
    }

    setTimeout(() => initDatePickers(), 100);
}

function cancelAddSubtask() {
    const form = document.querySelector('.add-subtask-form');
    if (form) form.remove();
}

function submitNewSubtask(event, taskId) {
    event.preventDefault();

    const title = document.getElementById('subtask-title').value.trim();
    const plannedDate = document.getElementById('subtask-planned-date').value;

    if (!title) {
        alert('Введите название подзадачи');
        return false;
    }

    const formData = new FormData();
    formData.append('title', title);
    if (plannedDate) formData.append('planned_date', plannedDate);

    fetch(`/task/${taskId}/subtask`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cancelAddSubtask();
                loadSubtasks(taskId);
                alert('Подзадача успешно создана');
            } else {
                alert(data.error || 'Ошибка при создании подзадачи');
            }
        })
        .catch(error => {
            console.error('Error creating subtask:', error);
            alert('Ошибка при создании подзадачи');
        });

    return false;
}

function toggleSubtaskStatus(taskId, subtaskId, completed, event) {
    if (event) {
        event.stopPropagation();
    }

    const formData = new FormData();
    formData.append('completed', completed);

    fetch(`/task/${taskId}/subtask/${subtaskId}`, {
        method: 'PUT',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadSubtasks(taskId);
            } else {
                alert(data.error || 'Ошибка при обновлении статуса');
                const checkbox = document.querySelector(`.subtask-item[data-subtask-id="${subtaskId}"] input[type="checkbox"]`);
                if (checkbox) checkbox.checked = !completed;
            }
        })
        .catch(error => {
            console.error('Error updating subtask status:', error);
            alert('Ошибка при обновлении статуса');
            const checkbox = document.querySelector(`.subtask-item[data-subtask-id="${subtaskId}"] input[type="checkbox"]`);
            if (checkbox) checkbox.checked = !completed;
        });
}

function editSubtask(taskId, subtaskId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    fetch(`/task/${taskId}/subtasks`)
        .then(response => response.json())
        .then(subtasks => {
            const subtask = subtasks.find(s => s.id === subtaskId);
            if (!subtask) {
                alert('Подзадача не найдена');
                return;
            }

            const subtaskElement = document.querySelector(`.subtask-item[data-subtask-id="${subtaskId}"]`);
            if (!subtaskElement) return;

            const editForm = `
                <div class="subtask-edit-form">
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" class="form-control subtask-edit-title" 
                               value="${escapeHtml(subtask.title)}" required>
                    </div>
                    <div class="form-group">
                        <label>Дата запланировано:</label>
                        <input type="text" class="form-control subtask-edit-planned-date date-input" 
                               value="${subtask.planned_date || ''}" placeholder="ДД.ММ.ГГГГ">
                    </div>
                    <div class="form-group">
                        <label>Отчет:</label>
                        <textarea class="form-control subtask-edit-report" rows="3">${escapeHtml(subtask.report || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Файл:</label>
                        <input type="file" class="form-control subtask-edit-file" 
                               accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.txt,.zip,.rar">
                        ${subtask.file ? `<div class="current-file">Текущий файл: ${escapeHtml(subtask.file.filename)}</div>` : ''}
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-success" onclick="event.stopPropagation(); saveSubtaskEdit('${taskId}', '${subtaskId}')">
                            Сохранить
                        </button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); cancelSubtaskEdit('${taskId}')">
                            Отмена
                        </button>
                    </div>
                </div>
            `;

            subtaskElement.innerHTML = editForm;
            setTimeout(() => initDatePickers(), 100);
        })
        .catch(error => {
            console.error('Error loading subtask for edit:', error);
            alert('Ошибка при загрузке подзадачи для редактирования');
        });
}

function saveSubtaskEdit(taskId, subtaskId) {
    const titleInput = document.querySelector('.subtask-edit-title');
    const plannedDateInput = document.querySelector('.subtask-edit-planned-date');
    const reportInput = document.querySelector('.subtask-edit-report');
    const fileInput = document.querySelector('.subtask-edit-file');

    if (!titleInput) {
        alert('Ошибка: форма редактирования не найдена');
        return;
    }

    const title = titleInput.value.trim();
    const plannedDate = plannedDateInput.value;
    const report = reportInput.value.trim();

    if (!title) {
        alert('Введите название подзадачи');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    if (plannedDate) formData.append('planned_date', plannedDate);
    if (report) formData.append('report', report);

    fetch(`/task/${taskId}/subtask/${subtaskId}`, {
        method: 'PUT',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (fileInput && fileInput.files.length > 0) {
                    const fileFormData = new FormData();
                    fileFormData.append('file', fileInput.files[0]);

                    fetch(`/task/${taskId}/subtask/${subtaskId}/upload_file`, {
                        method: 'POST',
                        body: fileFormData
                    })
                        .then(response => response.json())
                        .then(fileData => {
                            if (fileData.success) {
                                loadSubtasks(taskId);
                                alert('Подзадача успешно обновлена');
                            } else {
                                alert(fileData.error || 'Ошибка при загрузке файла');
                                loadSubtasks(taskId);
                            }
                        })
                        .catch(error => {
                            console.error('Error uploading file:', error);
                            alert('Ошибка при загрузке файла');
                            loadSubtasks(taskId);
                        });
                } else {
                    loadSubtasks(taskId);
                    alert('Подзадача успешно обновлена');
                }
            } else {
                alert(data.error || 'Ошибка при сохранении');
            }
        })
        .catch(error => {
            console.error('Error saving subtask:', error);
            alert('Ошибка при сохранении подзадачи');
        });
}

function cancelSubtaskEdit(taskId) {
    loadSubtasks(taskId);
}

function deleteSubtask(taskId, subtaskId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!confirm('Вы уверены, что хотите удалить эту подзадачу?')) {
        return;
    }

    fetch(`/task/${taskId}/subtask/${subtaskId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadSubtasks(taskId);
                alert('Подзадача успешно удалена');
            } else {
                alert(data.error || 'Ошибка при удалении подзадачи');
            }
        })
        .catch(error => {
            console.error('Error deleting subtask:', error);
            alert('Ошибка при удалении подзадачи');
        });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

function renderSubtaskFile(file, taskId, subtaskId) {
    let fileUrl = '';

    if (file.executor_dir && file.unique_filename) {
        fileUrl = `/uploads/${file.executor_dir}/${file.unique_filename}`;
    } else if (file.path) {
        fileUrl = `/uploads/${file.path.startsWith('/') ? file.path.substring(1) : file.path}`;
    } else {
        fileUrl = '#';
    }

    const fileSize = formatFileSize(file.size);
    const fileName = file.filename || 'Файл';

    return `
        <div class="subtask-file-info">
            <i class="fas fa-paperclip"></i>
            <a href="${fileUrl}" download class="file-link">${escapeHtml(fileName)}</a>
            <button class="file-remove" title="Удалить файл" onclick="removeSubtaskFile('${taskId}', '${subtaskId}')">
                ✕
            </button>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function removeSubtaskFile(taskId, subtaskId) {
    if (!confirm('Вы уверены, что хотите удалить файл?')) {
        return;
    }

    const formData = new FormData();
    fetch(`/task/${taskId}/subtask/${subtaskId}`, {
        method: 'PUT',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadSubtasks(taskId);
            } else {
                alert(data.error || 'Ошибка при удалении файла');
            }
        })
        .catch(error => {
            console.error('Error removing file:', error);
            alert('Ошибка при удалении файла');
        });
}

// Модифицируем функцию открытия модального окна, чтобы загружать подзадачи
const originalOpenTaskModal = window.openTaskModal;
window.openTaskModal = function (taskId) {
    if (originalOpenTaskModal) {
        originalOpenTaskModal.call(this, taskId);
    } else {
        // Fallback if original isn't defined yet, though we defined openTaskModal above so this branch might not be taken
        // But since we redefined openTaskModal in this file, we should call the local one
        // actually, this logic is circular if we are not careful.
        // Since I've pasted the FULL content including openTaskModal, I don't need to wrap it.
        // openTaskModal(taskId); // This would recurse if not careful.
    }
    // But wait, the user provided code had this at the end. I should keep it but ensure it works.
    // Since I redefined openTaskModal above, I should just modify THAT function to call loadSubtasks.
    // I did that: openTaskModal calls loadSubtasks? No, it doesn't in my code above.
    // I should add it to openTaskModal.

    setTimeout(() => {
        loadSubtasks(taskId);
    }, 300);
};
