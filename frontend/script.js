// ===================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====================
let token = localStorage.getItem('token');
let userRole = localStorage.getItem('userRole');
let pendingDelete = null;
let editingAppId = null;
let editingCourseId = null;

// ===================== АВТОРИЗАЦИЯ =====================
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (res.ok) {
            const data = await res.json();
            token = data.access_token;
            userRole = data.role || data.user?.role;

            localStorage.setItem('token', token);
            localStorage.setItem('userRole', userRole);

            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-screen').style.display = 'block';

            adaptUIByRole(userRole);
            showTab('applications');
        } else {
            alert('Неверный логин или пароль');
        }
    } catch (err) {
        alert('Ошибка подключения к серверу');
    }
}

// Адаптация интерфейса под роль пользователя
function adaptUIByRole(role) {
    if (!role) return;

    const isAdmin = role === 'admin';
    const isSenior = role === 'admin' || role === 'senior_manager';
    const isManager = role === 'manager';

    // Элементы только для Администратора
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });

    // Элементы для Старшего менеджера и Админа
    document.querySelectorAll('.senior-only').forEach(el => {
        el.style.display = isSenior ? 'block' : 'none';
    });

    // Кнопка создания новой заявки
    const createBtn = document.querySelector('button[onclick="openCreateModal()"]');
    if (createBtn) createBtn.style.display = 'inline-block';
}

// ===================== API =====================
async function apiCall(url, method = 'GET', body = null) {
    const headers = { 'Authorization': 'Bearer ' + token };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
        if (res.status === 403) {
            alert('❌ Недостаточно прав для выполнения действия');
        } else if (res.status === 401) {
            alert('Сессия истекла. Войдите заново.');
            logout();
        } else {
            throw new Error('Ошибка ' + res.status);
        }
        return null;
    }
    return res.json();
}

function showTab(tab) {
    if (tab === 'applications') loadApplications();
    else if (tab === 'courses') loadCourses();
}

// ===================== ЗАЯВКИ =====================
async function loadApplications(filter = {}) {
    try {
        let url = '/api/applications';
        const params = new URLSearchParams();

        if (filter.search) params.append('search', filter.search);
        if (filter.status) params.append('status', filter.status);

        if (params.toString()) url += '?' + params.toString();

        const data = await apiCall(url) || [];

        let html = `<h2>Заявки</h2>
                    <div style="margin-bottom:15px; padding:10px; background:#f8fafc; border-radius:6px;">
                        <input type="text" id="search-input" placeholder="Поиск по ФИО или телефону..." 
                               style="padding:8px; width:280px; margin-right:10px;" 
                               value="${filter.search || ''}" 
                               onkeyup="if(event.key==='Enter') applyFilters()">
                        
                        <select id="status-filter" onchange="applyFilters()" style="padding:8px; margin-right:10px;">
                            <option value="" ${!filter.status ? 'selected' : ''}>Все статусы</option>
                            <option value="new" ${filter.status === 'new' ? 'selected' : ''}>Новая</option>
                            <option value="waiting_call" ${filter.status === 'waiting_call' ? 'selected' : ''}>Ожидает звонка</option>
                            <option value="overdue" ${filter.status === 'overdue' ? 'selected' : ''}>Просрочена</option>
                            <option value="enrolled" ${filter.status === 'enrolled' ? 'selected' : ''}>Записан</option>
                            <option value="rejected" ${filter.status === 'rejected' ? 'selected' : ''}>Отказ</option>
                        </select>

                        <button onclick="applyFilters()" style="padding:8px 16px;">🔍 Поиск</button>
                        <button onclick="resetFilters()" style="padding:8px 16px; background:#e2e8f0;">Сбросить</button>
                    </div>
                    <button onclick="openCreateModal()">+ Новая заявка</button>
                    <table border="1" style="width:100%; margin-top:10px; border-collapse:collapse;">
                    <tr><th>№</th><th>Ученик</th><th>Класс</th><th>Телефон</th><th>Курс</th><th>Статус</th><th>Действия</th></tr>`;

        if (data.length === 0) {
            html += `<tr><td colspan="7">Заявки не найдены</td></tr>`;
        } else {
            data.forEach(a => {
                const courseName = a.course && a.course.name ? a.course.name : '-';
                
                html += `<tr>
                    <td>${a.number || ''}</td>
                    <td>${a.student_name}</td>
                    <td>${a.grade}</td>
                    <td>${a.phone}</td>
                    <td>${courseName}</td>
                        <td class="${getStatusClass(a.status)}">
                            <select onchange="changeStatus(${a.id}, this.value)" style="background:transparent; border:none; font-size:14px; padding:4px; width:100%;">
                                <option value="new" ${a.status === 'new' ? 'selected' : ''}>Новая</option>
                                <option value="waiting_call" ${a.status === 'waiting_call' ? 'selected' : ''}>Ожидает звонка</option>
                                <option value="overdue" ${a.status === 'overdue' ? 'selected' : ''}>Просрочена</option>
                                <option value="enrolled" ${a.status === 'enrolled' ? 'selected' : ''}>Записан</option>
                                <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>Отказ</option>
                            </select>
                        </td>
                    <td>
                        <button onclick="editApplication(${a.id})" style="margin-right:5px;">✏️</button>
                        <button onclick="confirmDelete('application', ${a.id})" style="color:red;">🗑</button>
                    </td>
                </tr>`;
            });
        }
        html += '</table>';
        document.getElementById('content').innerHTML = html;
    } catch(e) {
        console.error(e);
        document.getElementById('content').innerHTML = '<p>Ошибка загрузки заявок</p>';
    }
}

async function changeStatus(app_id, new_status) {
    if (!new_status) return;
    try {
        await apiCall(`/api/applications/${app_id}`, 'PUT', { status: new_status });
        alert('✅ Статус обновлён!');
        loadApplications();
    } catch(e) {}
}

function applyFilters() {
    const search = document.getElementById('search-input').value.trim();
    const status = document.getElementById('status-filter').value;
    loadApplications({ search, status });
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';
    loadApplications();
}

function getStatusClass(status) {
    switch(status) {
        case 'new': return 'status-new';
        case 'waiting_call': return 'status-waiting';
        case 'overdue': return 'status-overdue';
        case 'enrolled': return 'status-enrolled';
        case 'rejected': return 'status-rejected';
        default: return '';
    }
}
// ===================== РЕДАКТИРОВАНИЕ ЗАЯВКИ =====================
async function editApplication(id) {
    try {
        const app = await apiCall(`/api/applications/${id}`);
        if (!app) return;

        editingAppId = id;

        document.getElementById('edit_student_name').value = app.student_name || '';
        document.getElementById('edit_grade').value = app.grade || '';
        document.getElementById('edit_phone').value = app.phone || '';
        document.getElementById('edit_email').value = app.email || '';

        await loadCoursesForEdit(app.course_id);
        await loadManagersForEdit(app.manager_id);

        document.getElementById('edit-app-modal').style.display = 'flex';
    } catch(e) {
        alert('Не удалось загрузить данные заявки');
    }
}

async function loadCoursesForEdit(selectedCourseId = null) {
    try {
        const courses = await apiCall('/api/courses');
        const select = document.getElementById('edit_course_id');
        select.innerHTML = '<option value="">Не выбран</option>';

        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.name} (${c.grade} класс)`;
            if (c.id === selectedCourseId) option.selected = true;
            select.appendChild(option);
        });
    } catch(e) {
        console.error("Не удалось загрузить курсы", e);
    }
}

async function loadManagersForEdit(selectedManagerId = null) {
    try {
        const users = await apiCall('/api/users');
        const select = document.getElementById('edit_manager_id');
        select.innerHTML = '<option value="">Не назначен</option>';

        users.forEach(u => {
            if (['manager', 'senior_manager', 'admin'].includes(u.role)) {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = `${u.full_name || u.username} (${u.role})`;
                if (u.id === selectedManagerId) option.selected = true;
                select.appendChild(option);
            }
        });
    } catch(e) {
        console.error("Не удалось загрузить менеджеров", e);
    }
}

async function saveApplicationEdit() {
    if (!editingAppId) {
        alert("ID заявки не найден");
        return;
    }

    const formData = {
        student_name: document.getElementById('edit_student_name').value.trim(),
        grade: parseInt(document.getElementById('edit_grade').value),
        phone: document.getElementById('edit_phone').value.trim(),
        email: document.getElementById('edit_email').value.trim() || null,
        course_id: document.getElementById('edit_course_id').value ? 
                  parseInt(document.getElementById('edit_course_id').value) : null,
        manager_id: document.getElementById('edit_manager_id').value ? 
                    parseInt(document.getElementById('edit_manager_id').value) : null
    };

    try {
        await apiCall(`/api/applications/${editingAppId}`, 'PUT', formData);
        alert('✅ Изменения успешно сохранены!');
        closeEditAppModal();
        loadApplications();
    } catch(e) {
        console.error(e);
        alert('Ошибка сохранения изменений');
    }
}

function closeEditAppModal() {
    document.getElementById('edit-app-modal').style.display = 'none';
    editingAppId = null;
}

// ===================== КУРСЫ =====================
async function loadCourses() {
    try {
        const data = await apiCall('/api/courses') || [];
        let html = `<h2>Курсы</h2>
                    <button onclick="openCourseModal()" class="admin-only">+ Новый курс</button>
                    <table border="1" style="width:100%; margin-top:10px; border-collapse:collapse;">
                    <tr><th>Название</th><th>Предмет</th><th>Класс</th><th>Цена</th><th>Места</th><th>Действия</th></tr>`;

        if (data.length === 0) {
            html += `<tr><td colspan="6">Пока нет курсов</td></tr>`;
        } else {
            data.forEach(c => {
                html += `<tr>
                    <td>${c.name}</td>
                    <td>${c.subject}</td>
                    <td>${c.grade}</td>
                    <td>${c.price} руб.</td>
                    <td>${c.free_places} свободно</td>
                    <td>
                        <button onclick="editCourse(${c.id})" style="margin-right:5px;">✏️</button>
                        <button onclick="confirmDelete('course', ${c.id})" style="color:red;">🗑</button>
                    </td>
                </tr>`;
            });
        }
        html += '</table>';
        document.getElementById('content').innerHTML = html;
    } catch(e) {
        document.getElementById('content').innerHTML = '<p>Ошибка загрузки курсов</p>';
    }
}

// ===================== УДАЛЕНИЕ =====================
function confirmDelete(type, id) {
    pendingDelete = { type, id };
    document.getElementById('confirm-title').textContent = type === 'application' ? 'Удалить заявку?' : 'Удалить курс?';
    document.getElementById('confirm-modal').style.display = 'flex';
}

function cancelConfirm() {
    document.getElementById('confirm-modal').style.display = 'none';
    pendingDelete = null;
}

async function executeConfirm() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    document.getElementById('confirm-modal').style.display = 'none';

    try {
        if (type === 'application') {
            await apiCall(`/api/applications/${id}`, 'DELETE');
            loadApplications();
        } else {
            await apiCall(`/api/courses/${id}`, 'DELETE');
            loadCourses();
        }
        alert('✅ Успешно удалено');
    } catch(e) {
        alert('Ошибка удаления');
    }
    pendingDelete = null;
}

// ===================== ФОРМЫ =====================
function openCreateModal() {
    loadCoursesForSelect();
    document.getElementById('modal').style.display = 'flex';
}

async function loadCoursesForSelect() {
    try {
        const courses = await apiCall('/api/courses');
        const select = document.getElementById('course_id');
        select.innerHTML = '<option value="">Выберите курс</option>';
        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            select.appendChild(option);
        });
    } catch(e) {}
}

async function submitApplication() {
    const formData = {
        student_name: document.getElementById('student_name').value.trim(),
        grade: parseInt(document.getElementById('grade').value),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        course_id: document.getElementById('course_id').value ? parseInt(document.getElementById('course_id').value) : null
    };

    try {
        await apiCall('/api/applications', 'POST', formData);
        alert('✅ Заявка создана!');
        closeModal();
        loadApplications();
    } catch(e) {
        alert('Ошибка создания заявки');
    }
}

function openCourseModal() {
    document.getElementById('course-modal').style.display = 'flex';
}

async function submitCourse() {
    const formData = {
        name: document.getElementById('course_name').value,
        subject: document.getElementById('course_subject').value,
        grade: parseInt(document.getElementById('course_grade').value),
        format: document.getElementById('course_format').value || null,
        price: parseInt(document.getElementById('course_price').value),
        free_places: parseInt(document.getElementById('course_free_places').value)
    };

    try {
        await apiCall('/api/courses', 'POST', formData);
        alert('✅ Курс создан!');
        closeCourseModal();
        loadCourses();
    } catch(e) {
        alert('Ошибка создания курса');
    }
}

function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
}

function closeCourseModal() { 
    document.getElementById('course-modal').style.display = 'none'; 
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    location.reload();
}

// ===================== АВТОЗАГРУЗКА =====================
if (token) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    adaptUIByRole(userRole);
    showTab('applications');
}