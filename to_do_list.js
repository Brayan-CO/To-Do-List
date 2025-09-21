
(function () {
  const AUTH_KEY = 'authUser';
  const USER_TODOS_KEY = 'user_todos';
  const API_ENDPOINT = 'https://dummyjson.com/c/28e8-a101-4223-a35c';
  const LOGIN_PAGE = 'login.html';

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  function showMessage(msg, type = 'info', timeout = 3000) {
    const el = $('#message');
    if (!el) {
      console.info('Mensaje:', msg);
      return;
    }
    el.textContent = msg;
    el.className = ''; 
    el.classList.add(type);
    el.style.opacity = '1';
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => { el.style.opacity = '0'; }, timeout);
  }

  function now() { return Date.now(); }

  function loadUserTodos() {
    try {
      const raw = localStorage.getItem(USER_TODOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error parseando user_todos', e);
      return [];
    }
  }

  function saveUserTodos(todos) {
    localStorage.setItem(USER_TODOS_KEY, JSON.stringify(todos));
  }

  function isOnlyNumbers(str) {
    return /^\s*\d+\s*$/.test(str);
  }

  function normalizeText(t) {
    return t.trim().toLowerCase();
  }

  function validateTaskText(text, existingAllTexts, currentId = null) {
    if (text === null || text === undefined) return { ok: false, msg: 'El texto no puede ser nulo.' };
    const t = text.trim();
    if (t.length === 0) return { ok: false, msg: 'El texto no puede estar vacío.' };
    if (isOnlyNumbers(t)) return { ok: false, msg: 'El texto no puede contener solo números.' };
    if (t.length < 10) return { ok: false, msg: 'El texto debe tener al menos 10 caracteres.' };

    const norm = normalizeText(t);
    const duplicate = existingAllTexts.find(item => item.norm === norm && item.id !== currentId);
    if (duplicate) return { ok: false, msg: 'Ya existe una tarea con ese texto.' };

    return { ok: true };
  }


  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.id = task.id;
    if (task.source) li.dataset.source = task.source;


    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.gap = '8px';
    li.style.padding = '8px';
    li.style.borderBottom = '1px solid #eee';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';
    left.style.flex = '1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.done;
    checkbox.addEventListener('change', () => toggleDone(task.id, task.source));

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;
    textSpan.style.minWidth = '200px';
    textSpan.style.flex = '1';
    if (task.done) textSpan.style.textDecoration = 'line-through';

    const meta = document.createElement('small');
    meta.style.marginLeft = '8px';
    meta.textContent = task.createdAt ? new Date(task.createdAt).toLocaleString() : '';
    meta.title = 'Creado';

    left.appendChild(checkbox);
    left.appendChild(textSpan);
    left.appendChild(meta);

    // right: acciones
    const right = document.createElement('div');
    right.className = 'task-actions';
    right.style.display = 'flex';
    right.style.gap = '6px';
    right.style.alignItems = 'center';

    if (task.source === 'user') {
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Editar';

      editBtn.addEventListener('click', () => startEdit(task.id, editBtn));
      right.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', () => deleteTask(task.id));
      right.appendChild(delBtn);
    } else {
      const readOnly = document.createElement('span');
      readOnly.textContent = ' (API)';
      readOnly.style.fontSize = '0.8em';
      readOnly.style.color = '#888';
      right.appendChild(readOnly);
    }

    li.appendChild(left);
    li.appendChild(right);

    return li;
  }

  function renderList(allTasks) {
    const container = $('#todo-list');
    if (!container) {
      console.error('No existe #todo-list en el DOM');
      return;
    }
    container.innerHTML = '';
    if (!allTasks.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No hay tareas aún. Agrega la primera.';
      container.appendChild(empty);
      return;
    }

    allTasks.forEach(task => {
      const el = createTaskElement(task);
      container.appendChild(el);
    });
  }

  let apiTodos = [];
  let userTodos = [];

  function mergeAndSortTasks() {
    const all = [
      ...userTodos.map(t => ({ ...t, source: 'user' })),
      ...apiTodos.map(t => ({ ...t, source: 'api' }))
    ];

    all.sort((a, b) => b.createdAt - a.createdAt);
    return all;
  }

  function getAllTextsForValidation() {
    const merged = mergeAndSortTasks();
    return merged.map(t => ({ id: t.source === 'user' ? t.id : `api-${t.id}`, norm: normalizeText(t.text) }));
  }

  function createTask(text) {
    const allTexts = getAllTextsForValidation();
    const validation = validateTaskText(text, allTexts);
    if (!validation.ok) {
      showMessage(validation.msg, 'error');
      return false;
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const timestamp = now();
    const task = {
      id,
      text: text.trim(),
      done: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    userTodos.unshift(task); 
    saveUserTodos(userTodos);
    renderList(mergeAndSortTasks());
    showMessage('Tarea creada ✅', 'success');
    return true;
  }

  function deleteTask(id) {
    const beforeLen = userTodos.length;
    userTodos = userTodos.filter(t => t.id !== id);
    if (userTodos.length === beforeLen) {
      showMessage('No se encontró la tarea para borrar.', 'error');
      return;
    }
    saveUserTodos(userTodos);
    renderList(mergeAndSortTasks());
    showMessage('Tarea eliminada 🗑️', 'success');
  }

  function toggleDone(id, source) {
    if (source === 'api') {
      const idx = apiTodos.findIndex(t => t.id === id);
      if (idx >= 0) {
        apiTodos[idx].done = !apiTodos[idx].done;
        apiTodos[idx].updatedAt = now();
        renderList(mergeAndSortTasks());
        showMessage('Estado actualizado (API task).', 'info');
      }
      return;
    }
    const idx = userTodos.findIndex(t => t.id === id);
    if (idx >= 0) {
      userTodos[idx].done = !userTodos[idx].done;
      userTodos[idx].updatedAt = now();
      saveUserTodos(userTodos);
      renderList(mergeAndSortTasks());
      showMessage('Estado actualizado ✅', 'success');
    } else {
      showMessage('Tarea no encontrada para actualizar.', 'error');
    }
  }

  function startEdit(id, editBtn) {
    const idx = userTodos.findIndex(t => t.id === id);
    if (idx < 0) { showMessage('Tarea no encontrada para editar.', 'error'); return; }
    const current = userTodos[idx];

    const li = document.querySelector(`li.task[data-id="${id}"]`);
    if (!li) return;

    if (li.querySelector('.edit-input')) return;

    const textSpan = li.querySelector('.task-text');
    const actions = li.querySelector('.task-actions');


    const input = document.createElement('input');
    input.type = 'text';
    input.value = current.text;
    input.className = 'edit-input';
    input.style.flex = '1';
    input.style.padding = '4px';
    input.style.fontSize = '0.95rem';

    textSpan.replaceWith(input);
    input.focus();

    input.setSelectionRange(0, input.value.length);


    const delBtn = actions.querySelector('.del-btn');
    if (delBtn) delBtn.style.display = 'none';


    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {

      renderList(mergeAndSortTasks());
    });

    editBtn.textContent = 'Guardar';

    editBtn.onclick = () => finishEdit(id, input.value);


    actions.appendChild(cancelBtn);
  }

  function finishEdit(id, newText) {
    const idx = userTodos.findIndex(t => t.id === id);
    if (idx < 0) { showMessage('Tarea no encontrada para editar.', 'error'); return; }

    const allTexts = getAllTextsForValidation();
    const validation = validateTaskText(newText, allTexts, id);
    if (!validation.ok) {
      showMessage(validation.msg, 'error');
      return;
    }

    userTodos[idx].text = newText.trim();
    userTodos[idx].updatedAt = now();
    saveUserTodos(userTodos);
    renderList(mergeAndSortTasks());
    showMessage('Tarea editada ✏️', 'success');
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = LOGIN_PAGE;
  }

  async function fetchApiTodos() {
    try {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.warn('Respuesta API inesperada - se esperaba un array.', data);
        apiTodos = [];
        return;
      }

      apiTodos = data.map(item => ( {
        id: item.id,
        text: item.text,
        done: !!item.done,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : parseInt(item.createdAt) || 0,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : parseInt(item.updatedAt) || 0
      } ));
    } catch (e) {
      console.error('Error fetching API todos:', e);
      apiTodos = [];
      showMessage('Error cargando tareas externas — funcionando con locales.', 'error');
    }
  }

  async function init() {
    const authRaw = localStorage.getItem(AUTH_KEY);
    if (!authRaw) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    userTodos = loadUserTodos();

    await fetchApiTodos();

    renderList(mergeAndSortTasks());

    const form = $('#todo-form');
    const input = $('#todo-input');
    if (!form || !input) {
      console.error('Falta #todo-form o #todo-input en el HTML.');
    } else {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value || '';
        const ok = createTask(text);
        if (ok) input.value = '';
      });
    }

    const logoutBtn = $('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }

    // ctrl+enter para crear (opcional)
    input && input.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const text = input.value || '';
        const ok = createTask(text);
        if (ok) input.value = '';
      }
    });

    showMessage('Lista lista. Bienvenido — puedes editar en línea.', 'info');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
