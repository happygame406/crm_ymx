let token = localStorage.getItem('token');
let pendingDelete = null;
let editingAppId = null;
let editingCourseId = null;

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
            localStorage.setItem('token', token);
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('main-screen').style.display = 'block';
            showTab('applications');
        } else {
            alert('Неверный логин или пароль');
        }
    } catch (err) {
        alert('Ошибка подключения');
    }
}

async function apiCall(url, method = 'GET', body = null) {
    const headers = { 'Authorization': 'Bearer ' + token };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error('Ошибка ' + res.status);
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

        const data = await apiCall(url);

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
                    <table border="1" style="width:100%; margin-top:10px;">
                    <tr><th>№</th><th>Ученик</th><th>Класс</th><th>Телефон</th><th>Курс</th><th>Статус</th><th>Действия</th></tr>`;

        if (data.length === 0) {
            html += `<tr><td colspan="7">Заявки не найдены</td></tr>`;
        } else {
            data.forEach(a => {
                const courseName = a.course && a.course.name ? a.course.name : '-';
                
                let statusClass = '';
                let statusText = a.status;

                switch(a.status) {
                    case 'new': statusClass = 'status-new'; statusText = 'Новая'; break;
                    case 'waiting_call': statusClass = 'status-waiting'; statusText = 'Ожидает звонка'; break;
                    case 'overdue': statusClass = 'status-overdue'; statusText = 'Просрочена'; break;
                    case 'enrolled': statusClass = 'status-enrolled'; statusText = 'Записан'; break;
                    case 'rejected': statusClass = 'status-rejected'; statusText = 'Отказ'; break;
                }

                html += `<tr>
                    <td>${a.number || ''}</td>
                    <td>${a.student_name}</td>
                    <td>${a.grade}</td>
                    <td>${a.phone}</td>
                    <td>${courseName}</td>
                    <td class="${statusClass}">
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
        document.getElementById('content').innerHTML = '<p>Ошибка загрузки заявок</p>';
    }
}

async function changeStatus(app_id, new_status) {
    if (!new_status) return;
    
    try {
        await apiCall(`/api/applications/${app_id}`, 'PUT', { status: new_status });
        // Не обновляем всю таблицу, чтобы не сбрасывать фильтры
        console.log(`Статус заявки ${app_id} изменён на ${new_status}`);
    } catch(e) {
        console.error(e);
        alert('Ошибка изменения статуса');
        loadApplications(); // обновляем при ошибке
    }
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
// ===================== ИЗМЕНЕНИЕ СТАТУСА =====================
async function changeStatus(app_id, new_status) {
    try {
        await apiCall(`/api/applications/${app_id}`, 'PUT', { status: new_status });
        alert('✅ Статус обновлён!');
        loadApplications();
    } catch(e) {
        alert('Ошибка изменения статуса');
        loadApplications(); // обновляем на случай ошибки
    }
}

async function editApplication(id) {
    try {
        const app = await apiCall(`/api/applications/${id}`);
        editingAppId = id;

        document.getElementById('edit_student_name').value = app.student_name || '';
        document.getElementById('edit_grade').value = app.grade || '';
        document.getElementById('edit_phone').value = app.phone || '';
        document.getElementById('edit_email').value = app.email || '';

        await loadCoursesForEdit(app.course_id);
        await loadManagersForEdit(app.manager_id);

        document.getElementById('edit-app-modal').style.display = 'flex';
    } catch(e) {
        console.error(e);
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
            if (c.id === selectedCourseId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch(e) {
        console.error("Не удалось загрузить курсы", e);
        document.getElementById('edit_course_id').innerHTML = '<option value="">Ошибка загрузки курсов</option>';
    }
}

async function loadManagersForEdit(selectedManagerId = null) {
    try {
        const users = await apiCall('/api/users');  // Нужно добавить этот роутер
        const select = document.getElementById('edit_manager_id');
        select.innerHTML = '<option value="">Не назначен</option>';

        users.forEach(u => {
            if (u.role === 'manager' || u.role === 'senior_manager' || u.role === 'admin') {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = `${u.full_name} (${u.role})`;
                if (u.id === selectedManagerId) option.selected = true;
                select.appendChild(option);
            }
        });
    } catch(e) {
        console.error("Не удалось загрузить менеджеров", e);
        document.getElementById('edit_manager_id').innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function saveApplicationEdit() {
    if (!editingAppId) {
        alert("ID заявки не найден");
        return;
    }

    const managerId = document.getElementById('edit_manager_id').value;
    
    const formData = {
        student_name: document.getElementById('edit_student_name').value.trim(),
        grade: parseInt(document.getElementById('edit_grade').value),
        phone: document.getElementById('edit_phone').value.trim(),
        email: document.getElementById('edit_email').value.trim() || null,
        course_id: document.getElementById('edit_course_id').value ? 
                  parseInt(document.getElementById('edit_course_id').value) : null,
        manager_id: managerId ? parseInt(managerId) : null
    };

    console.log("Сохраняем данные:", formData); // для отладки

    try {
        const result = await apiCall(`/api/applications/${editingAppId}`, 'PUT', formData);
        console.log("Ответ сервера:", result);
        
        alert('✅ Изменения успешно сохранены!');
        closeEditAppModal();
        loadApplications();
    } catch(e) {
        console.error("Ошибка сохранения:", e);
        alert('Ошибка сохранения изменений. Посмотри консоль (F12)');
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
        email: document.getElementById('edit_email').value.trim() || null
    };

    try {
        await apiCall(`/api/applications/${editingAppId}`, 'PUT', formData);
        alert('✅ Изменения сохранены!');
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
                  parseInt(document.getElementById('edit_course_id').value) : null
    };

    try {
        await apiCall(`/api/applications/${editingAppId}`, 'PUT', formData);
        alert('✅ Изменения успешно сохранены!');
        closeEditAppModal();
        loadApplications();   // обновляем таблицу
    } catch(e) {
        console.error(e);
        alert('Ошибка сохранения изменений');
    }
}

// ===================== КУРСЫ =====================
async function loadCourses() {
    try {
        const data = await apiCall('/api/courses');
        let html = `<h2>Курсы</h2>
                    <button onclick="openCourseModal()">+ Новый курс</button>
                    <table border="1" style="width:100%; margin-top:10px;">
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

async function loadCoursesForEdit(selectedCourseId = null) {
    try {
        const courses = await apiCall('/api/courses');
        const select = document.getElementById('edit_course_id');
        select.innerHTML = '<option value="">Выберите курс</option>';

        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.name} (${c.grade} класс)`;
            if (c.id === selectedCourseId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch(e) {
        console.error("Не удалось загрузить курсы для редактирования");
    }
}

function editCourse(id) {
    alert("Редактирование курса №" + id + " пока в разработке");
}

// ===================== РЕДАКТИРОВАНИЕ КУРСА =====================
async function editCourse(id) {
    try {
        const course = await apiCall(`/api/courses/${id}`);
        editingCourseId = id;

        document.getElementById('edit_course_id').value = course.id;
        document.getElementById('edit_course_name').value = course.name;
        document.getElementById('edit_course_subject').value = course.subject;
        document.getElementById('edit_course_grade').value = course.grade;
        document.getElementById('edit_course_format').value = course.format || '';
        document.getElementById('edit_course_price').value = course.price;
        document.getElementById('edit_course_free_places').value = course.free_places;

        document.getElementById('edit-course-modal').style.display = 'flex';
    } catch(e) {
        alert('Не удалось загрузить данные курса');
    }
}

async function saveCourseEdit() {
    if (!editingCourseId) return;

    const formData = {
        name: document.getElementById('edit_course_name').value.trim(),
        subject: document.getElementById('edit_course_subject').value.trim(),
        grade: parseInt(document.getElementById('edit_course_grade').value),
        format: document.getElementById('edit_course_format').value.trim() || null,
        price: parseInt(document.getElementById('edit_course_price').value),
        free_places: parseInt(document.getElementById('edit_course_free_places').value)
    };

    try {
        await apiCall(`/api/courses/${editingCourseId}`, 'PUT', formData);
        alert('✅ Курс обновлён!');
        closeEditCourseModal();
        loadCourses();
    } catch(e) {
        alert('Ошибка сохранения курса');
    }
}

function closeEditCourseModal() {
    document.getElementById('edit-course-modal').style.display = 'none';
    editingCourseId = null;
}

// ===================== УДАЛЕНИЕ =====================
function confirmDelete(type, id) {
    pendingDelete = { type, id };
    document.getElementById('confirm-title').textContent = type === 'application' ? 'Удалить заявку?' : 'Удалить курс?';
    document.getElementById('confirm-text').textContent = 'Это действие нельзя отменить!';
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

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeCourseModal() { document.getElementById('course-modal').style.display = 'none'; }

function logout() {
    localStorage.removeItem('token');
    location.reload();
}
if (token) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    showTab('applications');
}