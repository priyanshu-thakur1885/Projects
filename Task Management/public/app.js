const authView = document.querySelector("#auth-view");
const workspaceView = document.querySelector("#workspace-view");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const taskForm = document.querySelector("#task-form");
const taskMessage = document.querySelector("#task-message");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");

const state = {
  accessToken: null,
  user: null,
  tasks: [],
  filter: "all",
  authMode: "login",
  toastTimeout: null
};

function localDateString(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

async function api(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (state.accessToken) headers.set("Authorization", `Bearer ${state.accessToken}`);

  let response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && canRefresh && path !== "/api/auth/refresh") {
    const refreshed = await renewSession();
    if (refreshed) return api(path, options, false);
  }

  if (!response.ok) {
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    throw new Error(payload.message || "Something went wrong. Please try again.");
  }
  return response.status === 204 ? null : response.json();
}

async function renewSession() {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
    if (!response.ok) return false;
    const session = await response.json();
    state.accessToken = session.accessToken;
    state.user = session.user;
    return true;
  } catch {
    return false;
  }
}

function showAuthMessage(message = "") {
  authMessage.textContent = message;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === "register";
  document.querySelector("#name-field").hidden = !registering;
  document.querySelector("#auth-eyebrow").textContent = registering ? "A GOOD PLACE TO START" : "WELCOME BACK";
  document.querySelector("#auth-heading").textContent = registering ? "Let’s make it yours." : "Good to see you.";
  document.querySelector("#auth-subheading").textContent = registering
    ? "Create an account and make space for your next big thing."
    : "Sign in and pick up where you left off.";
  document.querySelector("#auth-submit").innerHTML = registering ? "Create my account <span>→</span>" : "Sign in <span>→</span>";
  authForm.elements.name.required = registering;
  authForm.elements.password.autocomplete = registering ? "new-password" : "current-password";
  document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  showAuthMessage();
}

function showWorkspace() {
  authView.hidden = true;
  workspaceView.hidden = false;
  document.querySelector("#profile-name").textContent = state.user.name;
  document.querySelector("#profile-email").textContent = state.user.email;
  document.querySelector("#profile-avatar").textContent = state.user.name.trim().charAt(0).toUpperCase();
  updateGreeting();
  return loadTasks();
}

function updateGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  document.querySelector("#welcome-heading").textContent = `${greeting}`;
  const now = new Date();
  document.querySelector("#today-label").textContent = formatDate(now, { weekday: "short", month: "short", day: "numeric" });
  document.querySelector("#welcome-date").textContent = formatDate(now, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function updateCounts() {
  const pending = state.tasks.filter((task) => task.status === "pending").length;
  const completed = state.tasks.length - pending;
  document.querySelector("#all-count").textContent = state.tasks.length;
  document.querySelector("#pending-count").textContent = pending;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#list-count").textContent = visibleTasks().length;

  const percentage = state.tasks.length ? Math.round((completed / state.tasks.length) * 100) : 0;
  document.querySelector("#progress-value").textContent = `${percentage}%`;
  document.querySelector("#progress-bar").style.width = `${percentage}%`;
  document.querySelector("#progress-caption").textContent = state.tasks.length
    ? `${completed} of ${state.tasks.length} tasks complete. Keep it up.`
    : "A fresh start. You’ve got this.";
}

function visibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const matchesFilter = state.filter === "all" || task.status === state.filter;
    const matchesSearch = !query || `${task.title} ${task.description ?? ""}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
}

function makeTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.status === "completed" ? " is-completed" : ""}`;

  const check = document.createElement("button");
  check.className = "task-check";
  check.type = "button";
  check.setAttribute("aria-label", task.status === "completed" ? "Mark as pending" : "Mark as completed");
  check.textContent = task.status === "completed" ? "✓" : "";
  check.addEventListener("click", () => toggleTask(task));

  const copy = document.createElement("div");
  copy.className = "task-copy";
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;
  copy.append(title);
  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    copy.append(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  if (task.dueDate) {
    const date = document.createElement("span");
    const due = new Date(task.dueDate);
    date.className = `task-date${task.status === "pending" && localDateString(due) < localDateString(new Date()) ? " overdue" : ""}`;
    date.textContent = `◷ ${formatDate(new Date(`${localDateString(due)}T12:00:00`))}`;
    meta.append(date);
  }
  const status = document.createElement("span");
  status.className = `status-pill${task.status === "completed" ? " done" : ""}`;
  status.textContent = task.status === "completed" ? "Done" : "To do";
  meta.append(status);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const edit = document.createElement("button");
  edit.className = "icon-button";
  edit.type = "button";
  edit.setAttribute("aria-label", `Edit ${task.title}`);
  edit.title = "Edit";
  edit.textContent = "✎";
  edit.addEventListener("click", () => beginEdit(task));
  const remove = document.createElement("button");
  remove.className = "icon-button";
  remove.type = "button";
  remove.setAttribute("aria-label", `Delete ${task.title}`);
  remove.title = "Delete";
  remove.textContent = "×";
  remove.addEventListener("click", () => removeTask(task));
  actions.append(edit, remove);
  card.append(check, copy, meta, actions);
  return card;
}

function renderTasks() {
  const tasks = visibleTasks();
  taskList.replaceChildren(...tasks.map(makeTaskCard));
  document.querySelector("#list-count").textContent = tasks.length;
  document.querySelector("#list-title").childNodes[0].textContent = {
    all: "All tasks ",
    pending: "To do ",
    completed: "Completed "
  }[state.filter];

  const noTasks = tasks.length === 0;
  taskList.hidden = noTasks;
  emptyState.hidden = !noTasks;
  document.querySelector("#empty-title").textContent = state.tasks.length === 0
    ? "A little space to begin."
    : "Nothing here right now.";
  document.querySelector("#empty-description").textContent = searchInput.value
    ? "Try another search, or clear the search field."
    : state.tasks.length === 0
      ? "Add your first task above. Future you says thanks."
      : "Switch filters to see the rest of your tasks.";
  updateCounts();
}

async function loadTasks() {
  const result = await api("/api/tasks");
  state.tasks = result.tasks;
  renderTasks();
}

async function toggleTask(task) {
  try {
    const result = await api(`/api/tasks/${task._id}`, {
      method: "PUT",
      body: JSON.stringify({ status: task.status === "completed" ? "pending" : "completed" })
    });
    replaceTask(result.task);
  } catch (error) {
    showToast(error.message);
  }
}

function replaceTask(updatedTask) {
  state.tasks = state.tasks.map((task) => task._id === updatedTask._id ? updatedTask : task);
  renderTasks();
}

async function removeTask(task) {
  try {
    await api(`/api/tasks/${task._id}`, { method: "DELETE" });
    state.tasks = state.tasks.filter((item) => item._id !== task._id);
    renderTasks();
    showToast("Task removed.");
  } catch (error) {
    showToast(error.message);
  }
}

function beginEdit(task) {
  taskForm.elements.taskId.value = task._id;
  taskForm.elements.title.value = task.title;
  taskForm.elements.description.value = task.description ?? "";
  taskForm.elements.dueDate.value = task.dueDate ? localDateString(new Date(task.dueDate)) : "";
  document.querySelector("#composer-title").textContent = "Edit your task";
  document.querySelector("#task-submit").innerHTML = "Save changes <span>✓</span>";
  document.querySelector("#cancel-edit").hidden = false;
  document.querySelector("#task-form").scrollIntoView({ behavior: "smooth", block: "center" });
  taskForm.elements.title.focus({ preventScroll: true });
}

function resetTaskForm() {
  taskForm.reset();
  taskForm.elements.taskId.value = "";
  document.querySelector("#composer-title").textContent = "Add a task";
  document.querySelector("#task-submit").innerHTML = "Add task <span>＋</span>";
  document.querySelector("#cancel-edit").hidden = true;
  taskMessage.textContent = "";
}

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showAuthMessage();
  const formData = new FormData(authForm);
  const body = state.authMode === "register"
    ? { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") }
    : { email: formData.get("email"), password: formData.get("password") };
  const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";
  try {
    const session = await api(endpoint, { method: "POST", body: JSON.stringify(body) }, false);
    state.accessToken = session.accessToken;
    state.user = session.user;
    await showWorkspace();
  } catch (error) {
    showAuthMessage(error.message);
  }
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  taskMessage.textContent = "";
  const formData = new FormData(taskForm);
  const taskId = formData.get("taskId");
  const body = {
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate") || null
  };
  try {
    if (taskId) {
      const result = await api(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(body) });
      replaceTask(result.task);
      showToast("Changes saved.");
    } else {
      const result = await api("/api/tasks", { method: "POST", body: JSON.stringify(body) });
      state.tasks.unshift(result.task);
      renderTasks();
      showToast("Task added. One step closer.");
    }
    resetTaskForm();
  } catch (error) {
    taskMessage.textContent = error.message;
  }
});

document.querySelector("#cancel-edit").addEventListener("click", resetTaskForm);
document.querySelector("#refresh-button").addEventListener("click", async () => {
  try {
    await loadTasks();
    showToast("Your list is up to date.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    showToast(error.message);
  }
  state.accessToken = null;
  state.user = null;
  state.tasks = [];
  workspaceView.hidden = true;
  authView.hidden = false;
  authForm.reset();
  setAuthMode("login");
});

async function initialize() {
  if (!(await renewSession())) return;
  try {
    await showWorkspace();
  } catch {
    state.accessToken = null;
    state.user = null;
    workspaceView.hidden = true;
    authView.hidden = false;
  }
}

setAuthMode("login");
initialize();
