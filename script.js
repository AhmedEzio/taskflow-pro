const STORAGE_KEY = 'taskflow-pro-data';
const THEME_KEY = 'taskflow-pro-theme';

const seededTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Finalize Q4 Wireframes',
    description: 'Complete the main dashboard and settings views for the new release.',
    category: 'Work',
    date: new Date().toISOString().slice(0, 10),
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: 'Client Review Meeting',
    description: 'Prepare the project summary and action points before the weekly sync.',
    category: 'Work',
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    completed: false,
    completedAt: null,
  },
  {
    id: crypto.randomUUID(),
    title: 'Workout Session',
    description: 'Finish a 45-minute workout and log the session.',
    category: 'Personal',
    date: new Date().toISOString().slice(0, 10),
    completed: true,
    completedAt: new Date().toISOString(),
  }
];

let tasks = loadTasks();
let activeFilter = 'all';
let activeCategory = 'all';
let draggedId = null;

const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const taskTemplate = document.getElementById('taskTemplate');
const searchInput = document.getElementById('searchInput');

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seededTasks;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : seededTasks;
  } catch {
    return seededTasks;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(value) {
  if (!value) return 'No due date';
  return new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  return tasks.filter(task => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'completed' && task.completed) ||
      (activeFilter === 'pending' && !task.completed);

    const matchesCategory = activeCategory === 'all' || task.category === activeCategory;

    const matchesSearch = !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.category.toLowerCase().includes(query);

    return matchesFilter && matchesCategory && matchesSearch;
  });
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.innerHTML = '';

  if (!visibleTasks.length) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  visibleTasks.forEach(task => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.toggle('completed', task.completed);

    const title = node.querySelector('.task-title');
    const desc = node.querySelector('.task-desc');
    const category = node.querySelector('.task-category');
    const date = node.querySelector('.task-date');
    const check = node.querySelector('.task-check');
    const editBtn = node.querySelector('.edit-btn');
    const deleteBtn = node.querySelector('.delete-btn');

    title.textContent = task.title;
    desc.textContent = task.description || 'No description added.';
    category.textContent = task.category;
    category.classList.add(task.category.toLowerCase());
    date.textContent = `Due: ${formatDate(task.date)}`;
    check.checked = task.completed;

    check.addEventListener('change', () => toggleTask(task.id));
    editBtn.addEventListener('click', () => openModal(task));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    node.addEventListener('dragstart', () => {
      draggedId = task.id;
      node.classList.add('dragging');
    });

    node.addEventListener('dragend', () => {
      draggedId = null;
      node.classList.remove('dragging');
    });

    node.addEventListener('dragover', event => {
      event.preventDefault();
    });

    node.addEventListener('drop', event => {
      event.preventDefault();
      if (!draggedId || draggedId === task.id) return;
      reorderTasks(draggedId, task.id);
    });

    taskList.appendChild(node);
  });

  renderStats();
}

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const workCount = tasks.filter(task => task.category === 'Work').length;
  const personalCount = tasks.filter(task => task.category === 'Personal').length;
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = tasks.filter(task => task.completedAt && task.completedAt.slice(0, 10) === today).length;

  document.getElementById('totalTasks').textContent = total;
  document.getElementById('completedTasks').textContent = completed;
  document.getElementById('pendingTasks').textContent = pending;
  document.getElementById('progressPercent').textContent = progress;
  document.getElementById('progressBar').style.width = `${progress}%`;
  document.getElementById('workCount').textContent = workCount;
  document.getElementById('personalCount').textContent = personalCount;
  document.getElementById('doneCount').textContent = doneToday;
}

function openModal(task = null) {
  taskModal.classList.remove('hidden');
  modalTitle.textContent = task ? 'Edit Task' : 'Add New Task';
  document.getElementById('taskId').value = task?.id || '';
  document.getElementById('taskTitle').value = task?.title || '';
  document.getElementById('taskDescription').value = task?.description || '';
  document.getElementById('taskCategory').value = task?.category || 'Work';
  document.getElementById('taskDate').value = task?.date || '';
}

function closeModal() {
  taskModal.classList.add('hidden');
  taskForm.reset();
  document.getElementById('taskId').value = '';
}

function upsertTask(event) {
  event.preventDefault();

  const id = document.getElementById('taskId').value;
  const payload = {
    id: id || crypto.randomUUID(),
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    category: document.getElementById('taskCategory').value,
    date: document.getElementById('taskDate').value,
    completed: false,
    completedAt: null,
  };

  if (!payload.title) return;

  if (id) {
    const existing = tasks.find(task => task.id === id);
    payload.completed = existing?.completed ?? false;
    payload.completedAt = existing?.completedAt ?? null;
    tasks = tasks.map(task => task.id === id ? payload : task);
  } else {
    tasks.unshift(payload);
  }

  saveTasks();
  closeModal();
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id
      ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
      : task
  );
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
}

function reorderTasks(sourceId, targetId) {
  const sourceIndex = tasks.findIndex(task => task.id === sourceId);
  const targetIndex = tasks.findIndex(task => task.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;

  const [movedItem] = tasks.splice(sourceIndex, 1);
  tasks.splice(targetIndex, 0, movedItem);
  saveTasks();
  renderTasks();
}

function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function syncDate() {
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  });
}

function bindFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    });
  });

  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      document.querySelectorAll('.category-btn').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    });
  });
}

function init() {
  setTheme(localStorage.getItem(THEME_KEY) || 'light');
  syncDate();
  bindFilters();
  renderTasks();

  document.getElementById('openTaskModalBtn').addEventListener('click', () => openModal());
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('mobileThemeToggle').addEventListener('click', toggleTheme);
  taskForm.addEventListener('submit', upsertTask);
  searchInput.addEventListener('input', renderTasks);

  taskModal.addEventListener('click', event => {
    if (event.target === taskModal) closeModal();
  });
}

init();
