const authView = document.querySelector("#auth-view");
const workspaceView = document.querySelector("#workspace-view");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const jobList = document.querySelector("#jobs-list");
const state = {
  accessToken: null,
  user: null,
  jobs: [],
  applications: [],
  view: "jobs",
  authMode: "login",
  toastTimeout: null
};

async function api(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (state.accessToken) headers.set("Authorization", `Bearer ${state.accessToken}`);

  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && canRefresh && path !== "/api/auth/refresh") {
    if (await renewSession()) return api(path, options, false);
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

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === "register";
  document.querySelector("#name-field").hidden = !registering;
  document.querySelector("#role-field").hidden = !registering;
  document.querySelector("#auth-eyebrow").textContent = registering ? "A GOOD PLACE TO START" : "WELCOME BACK";
  document.querySelector("#auth-heading").textContent = registering ? "Let’s make it yours." : "Good to see you.";
  document.querySelector("#auth-subheading").textContent = registering
    ? "Create an account and find your next opportunity."
    : "Sign in and keep moving forward.";
  document.querySelector("#auth-submit").innerHTML = registering ? "Create my account <span>→</span>" : "Sign in <span>→</span>";
  authForm.elements.name.required = registering;
  authForm.elements.password.autocomplete = registering ? "new-password" : "current-password";
  document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  authMessage.textContent = "";
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function todayLabel() {
  const now = new Date();
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric"
  }).format(now);
  document.querySelector("#welcome-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric"
  }).format(now).toUpperCase();
}

function setRoleNavigation() {
  const role = state.user.role;
  document.querySelectorAll(".student-nav").forEach((element) => { element.hidden = role !== "student"; });
  document.querySelectorAll(".recruiter-nav").forEach((element) => { element.hidden = role !== "recruiter"; });
  document.querySelectorAll(".admin-nav").forEach((element) => { element.hidden = role !== "admin"; });
  document.querySelector("#create-job-button").hidden = role !== "recruiter";
  document.querySelector("#welcome-heading").textContent = role === "recruiter"
    ? "Build your next great team."
    : role === "admin" ? "Keep opportunity open to everyone." : "Find your next step.";
  document.querySelector("#welcome-subtitle").textContent = role === "recruiter"
    ? "Share a thoughtful opportunity with people ready to grow."
    : role === "admin" ? "Review listings and help keep the portal trustworthy."
      : "Explore opportunities chosen for where you want to go.";
  document.querySelector("#profile-name").textContent = state.user.name;
  document.querySelector("#profile-role").textContent = role === "student"
    ? "Student / job seeker" : role.charAt(0).toUpperCase() + role.slice(1);
  document.querySelector("#profile-avatar").textContent = state.user.name.trim().charAt(0).toUpperCase();
}

async function showWorkspace() {
  authView.hidden = true;
  workspaceView.hidden = false;
  setRoleNavigation();
  todayLabel();
  const initialView = state.user.role === "recruiter" ? "my-jobs" : state.user.role === "admin" ? "moderation" : "jobs";
  await navigate(initialView);
}

async function navigate(view) {
  state.view = view;
  document.querySelectorAll(".view-panel").forEach((panel) => { panel.hidden = panel.id !== `${view}-view`; });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "jobs") await loadJobs();
  if (view === "applications") await loadApplications("student");
  if (view === "my-jobs") await loadJobs();
  if (view === "applicants") await loadApplications("recruiter");
  if (view === "moderation") await loadModeration();
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function dateText(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function textOr(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatStipend(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) return "";
  return `₹${new Intl.NumberFormat("en-IN").format(amount)} / month`;
}

function renderJobs() {
  const query = document.querySelector("#job-search").value.trim().toLowerCase();
  const type = document.querySelector("#type-filter").value;
  const jobs = state.jobs.filter((job) => {
    const matchesText = !query || `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query);
    return matchesText && (!type || job.type === type);
  });
  jobList.replaceChildren(...jobs.map(makeJobCard));
  document.querySelector("#jobs-count").textContent = jobs.length;
  document.querySelector("#jobs-empty").hidden = jobs.length > 0;

  if (state.user.role === "recruiter") {
    const ownJobs = state.jobs.filter((job) => String(job.recruiter?._id ?? job.recruiter) === state.user.id);
    document.querySelector("#my-jobs-count").textContent = ownJobs.length;
    const list = document.querySelector("#my-jobs-list");
    list.replaceChildren(...ownJobs.map(makeListingRow));
    document.querySelector("#my-jobs-empty").hidden = ownJobs.length > 0;
  }
}

function makeJobCard(job) {
  const card = createElement("article", "job-card");
  const top = createElement("div", "job-card-top");
  top.append(createElement("div", "company-mark", (job.company || "C").trim().charAt(0).toUpperCase()));
  const badges = createElement("div", "job-badges");
  badges.append(createElement("span", `type-pill ${job.type}`, job.type.replace("-", " ")));
  if (job.moderationStatus && job.moderationStatus !== "approved") {
    badges.append(createElement("span", `status-pill ${job.moderationStatus}`, job.moderationStatus));
  }
  top.append(badges);
  card.append(top);

  const heading = createElement("h3", "job-title", job.title);
  const company = createElement("p", "job-company", job.company);
  const meta = createElement("div", "job-meta");
  meta.append(createElement("span", "", `⌖ ${job.location}`));
  meta.append(createElement("span", "", `◉ ${job.workplace || "onsite"}`));
  const stipend = formatStipend(job.stipend);
  if (stipend) meta.append(createElement("span", "", `Stipend: ${stipend}`));
  const description = createElement("p", "job-description", job.description);
  card.append(heading, company, meta, description);
  if (job.requirements) {
    const requirements = createElement("p", "job-requirements", `Looking for: ${job.requirements}`);
    card.append(requirements);
  }
  const footer = createElement("div", "job-card-footer");
  footer.append(createElement("span", "job-date", job.closingDate ? `Apply by ${dateText(job.closingDate)}` : `Posted ${dateText(job.createdAt)}`));
  if (state.user.role === "student") {
    const applied = state.applications.some((application) => String(application.job?._id ?? application.job) === String(job._id));
    const button = createElement("button", `button ${applied ? "button-quiet" : "button-primary"} button-small`, applied ? "Applied" : "View & apply");
    button.type = "button";
    button.disabled = applied;
    if (!applied) button.addEventListener("click", () => openApplyDialog(job));
    footer.append(button);
  } else if (state.user.role === "recruiter" && String(job.recruiter?._id ?? job.recruiter) === state.user.id) {
    const button = createElement("button", "button button-quiet button-small", "Edit listing");
    button.type = "button";
    button.addEventListener("click", () => openJobDialog(job));
    footer.append(button);
  }
  card.append(footer);
  return card;
}

function makeListingRow(job) {
  const row = createElement("article", "record-card");
  const copy = createElement("div", "record-copy");
  copy.append(createElement("h3", "", job.title), createElement("p", "", `${job.company} · ${job.location}`));
  const meta = createElement("div", "record-meta");
  meta.append(createElement("span", `status-pill ${job.moderationStatus}`, job.moderationStatus));
  meta.append(createElement("span", "subtle", `${job.type.replace("-", " ")} · ${dateText(job.createdAt)}`));
  row.append(copy, meta);
  return row;
}

async function loadJobs() {
  const { jobs } = await api("/api/jobs");
  state.jobs = jobs;
  if (state.user.role === "student") {
    const result = await api("/api/applications");
    state.applications = result.applications;
    document.querySelector("#application-count").textContent = state.applications.length;
  }
  renderJobs();
}

function openApplyDialog(job) {
  const dialog = document.querySelector("#apply-dialog");
  const form = document.querySelector("#apply-form");
  form.reset();
  form.elements.jobId.value = job._id;
  form.elements.resumeUrl.value = state.user.resumeUrl || "";
  document.querySelector("#apply-title").textContent = `Apply: ${job.title}`;
  document.querySelector("#apply-message").textContent = "";
  dialog.showModal();
}

function openJobDialog(job = null) {
  const dialog = document.querySelector("#job-dialog");
  const form = document.querySelector("#job-form");
  form.reset();
  form.elements.jobId.value = job?._id ?? "";
  document.querySelector("#job-dialog-title").textContent = job ? "Edit your listing" : "Post an opportunity";
  document.querySelector("#job-submit").innerHTML = job ? "Resubmit for review <span>→</span>" : "Submit for review <span>→</span>";
  document.querySelector("#job-message").textContent = "";
  if (job) {
    for (const name of ["title", "company", "location", "type", "workplace", "experienceLevel", "requirements"]) {
      form.elements[name].value = textOr(job[name]);
    }
    form.elements.stipend.value = job.stipend ?? "";
    form.elements.description.value = job.description || "";
    form.elements.closingDate.value = job.closingDate ? new Date(job.closingDate).toISOString().slice(0, 10) : "";
  } else if (state.user.companyName) {
    form.elements.company.value = state.user.companyName;
  }
  dialog.showModal();
}

async function loadApplications(mode) {
  const { applications } = await api("/api/applications");
  state.applications = applications;
  if (mode === "student") renderStudentApplications();
  if (mode === "recruiter") renderApplicants();
}

function makeApplicationCard(application, recruiterMode) {
  const row = createElement("article", "record-card application-card");
  const copy = createElement("div", "record-copy");
  const job = application.job || {};
  const student = application.student || {};
  const title = recruiterMode ? textOr(student.name, "Applicant") : textOr(job.title, "Job listing");
  const subtitle = recruiterMode
    ? `${textOr(job.title)} · ${textOr(student.email)}`
    : `${textOr(job.company)} · Applied ${dateText(application.createdAt)}`;
  copy.append(createElement("h3", "", title), createElement("p", "", subtitle));
  if (recruiterMode && student.headline) copy.append(createElement("p", "candidate-headline", student.headline));
  if (application.coverLetter) copy.append(createElement("p", "cover-letter", application.coverLetter));
  const extra = [];
  if (recruiterMode && student.location) extra.push(student.location);
  if (recruiterMode && Array.isArray(student.skills) && student.skills.length) extra.push(student.skills.join(", "));
  if (recruiterMode && student.resumeUrl) extra.push(`Resume: ${student.resumeUrl}`);
  if (extra.length) copy.append(createElement("p", "candidate-details", extra.join(" · ")));

  const actions = createElement("div", "record-actions");
  actions.append(createElement("span", `status-pill ${application.status}`, application.status));
  if (recruiterMode && ["submitted", "shortlisted"].includes(application.status)) {
    for (const [status, label] of [["shortlisted", "Shortlist"], ["accepted", "Accept"], ["rejected", "Decline"]]) {
      if (status === application.status) continue;
      const button = createElement("button", `button ${status === "rejected" ? "button-quiet" : "button-primary"} button-small`, label);
      button.type = "button";
      button.addEventListener("click", () => changeApplicationStatus(application._id, status));
      actions.append(button);
    }
  }
  row.append(copy, actions);
  return row;
}

function renderStudentApplications() {
  const list = document.querySelector("#my-applications-list");
  list.replaceChildren(...state.applications.map((application) => makeApplicationCard(application, false)));
  document.querySelector("#my-applications-count").textContent = state.applications.length;
  document.querySelector("#application-count").textContent = state.applications.length;
  document.querySelector("#my-applications-empty").hidden = state.applications.length > 0;
}

function renderApplicants() {
  const list = document.querySelector("#applicants-list");
  list.replaceChildren(...state.applications.map((application) => makeApplicationCard(application, true)));
  document.querySelector("#applicants-count").textContent = state.applications.length;
  document.querySelector("#applicants-empty").hidden = state.applications.length > 0;
}

async function changeApplicationStatus(id, status) {
  try {
    await api(`/api/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadApplications(state.user.role === "admin" ? "admin" : "recruiter");
    if (state.user.role === "admin") await loadModeration();
    showToast(`Application ${status}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadModeration() {
  const { jobs } = await api("/api/jobs/moderation");
  const pending = jobs.filter((job) => job.moderationStatus === "pending");
  const list = document.querySelector("#moderation-list");
  list.replaceChildren(...pending.map(makeModerationCard));
  document.querySelector("#moderation-count").textContent = pending.length;
  document.querySelector("#moderation-empty").hidden = pending.length > 0;
}

function makeModerationCard(job) {
  const row = createElement("article", "record-card moderation-card");
  const copy = createElement("div", "record-copy");
  const recruiter = job.recruiter || {};
  copy.append(createElement("h3", "", job.title), createElement("p", "", `${job.company} · ${job.location}`));
  copy.append(createElement("p", "candidate-details", `Submitted by ${recruiter.name || "Recruiter"}${recruiter.email ? ` · ${recruiter.email}` : ""}`));
  copy.append(createElement("p", "cover-letter", job.description));
  const actions = createElement("div", "record-actions");
  for (const [status, label] of [["approved", "Approve"], ["rejected", "Reject"]]) {
    const button = createElement("button", `button ${status === "approved" ? "button-primary" : "button-quiet"} button-small`, label);
    button.type = "button";
    button.addEventListener("click", () => moderateListing(job._id, status));
    actions.append(button);
  }
  row.append(copy, actions);
  return row;
}

async function moderateListing(id, status) {
  try {
    await api(`/api/jobs/${id}/moderation`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadModeration();
    showToast(`Listing ${status}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function openProfileDialog() {
  try {
    const { user } = await api("/api/profile");
    state.user = user;
    setRoleNavigation();
    const form = document.querySelector("#profile-form");
    for (const name of ["phone", "location", "headline", "resumeUrl", "education", "experience", "companyName", "companyWebsite", "companyDescription"]) {
      if (form.elements[name]) form.elements[name].value = user[name] || "";
    }
    form.elements.skills.value = (user.skills || []).join(", ");
    setProfileSection(".student-profile-fields", user.role === "student");
    setProfileSection(".recruiter-profile-fields", user.role === "recruiter");
    document.querySelector("#profile-message").textContent = "";
    document.querySelector("#profile-dialog").showModal();
  } catch (error) {
    showToast(error.message);
  }
}

function setProfileSection(selector, enabled) {
  const section = document.querySelector(selector);
  section.hidden = !enabled;
  section.querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = !enabled;
  });
}

function toJobPayload(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  delete payload.jobId;
  if (!payload.closingDate) delete payload.closingDate;
  return payload;
}

document.querySelectorAll("[data-auth-mode]").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", async () => {
  try { await navigate(button.dataset.view); } catch (error) { showToast(error.message); }
}));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";
  const registering = state.authMode === "register";
  const body = Object.fromEntries(new FormData(authForm).entries());
  if (!registering) {
    delete body.name;
    delete body.role;
  }
  try {
    const session = await api(`/api/auth/${registering ? "register" : "login"}`, {
      method: "POST", body: JSON.stringify(body)
    }, false);
    state.accessToken = session.accessToken;
    state.user = session.user;
    await showWorkspace();
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    showToast(error.message);
  }
  state.accessToken = null;
  state.user = null;
  state.jobs = [];
  state.applications = [];
  workspaceView.hidden = true;
  authView.hidden = false;
  authForm.reset();
  setAuthMode("login");
});

document.querySelector("#job-search").addEventListener("input", renderJobs);
document.querySelector("#type-filter").addEventListener("change", renderJobs);
document.querySelector("#create-job-button").addEventListener("click", () => openJobDialog());
document.querySelectorAll("[data-open-job]").forEach((button) => button.addEventListener("click", () => openJobDialog()));
document.querySelector("#profile-button").addEventListener("click", openProfileDialog);
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", async () => {
  try {
    if (button.dataset.refresh === "moderation") await loadModeration();
    else await loadApplications(state.user.role);
  } catch (error) { showToast(error.message); }
}));

document.querySelector("#apply-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#apply-message");
  message.textContent = "";
  const body = { resumeUrl: form.elements.resumeUrl.value, coverLetter: form.elements.coverLetter.value };
  try {
    await api(`/api/jobs/${form.elements.jobId.value}/apply`, { method: "POST", body: JSON.stringify(body) });
    document.querySelector("#apply-dialog").close();
    await loadJobs();
    showToast("Your application has been sent.");
  } catch (error) { message.textContent = error.message; }
});

document.querySelector("#job-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#job-message");
  message.textContent = "";
  const id = form.elements.jobId.value;
  try {
    await api(id ? `/api/jobs/${id}` : "/api/jobs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(toJobPayload(form))
    });
    document.querySelector("#job-dialog").close();
    await loadJobs();
    showToast(id ? "Listing submitted for review." : "Listing submitted for review.");
  } catch (error) { message.textContent = error.message; }
});

document.querySelector("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#profile-message");
  message.textContent = "";
  const formValues = Object.fromEntries(new FormData(form).entries());
  const allowedFields = state.user.role === "student"
    ? ["phone", "location", "headline", "resumeUrl", "skills", "education", "experience"]
    : state.user.role === "recruiter"
      ? ["phone", "location", "companyName", "companyWebsite", "companyDescription"]
      : ["phone", "location"];
  const payload = Object.fromEntries(allowedFields.map((field) => [field, formValues[field] ?? ""]));
  if (state.user.role === "student") {
    payload.skills = formValues.skills ? formValues.skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [];
  }
  try {
    const result = await api("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
    state.user = result.user;
    setRoleNavigation();
    document.querySelector("#profile-dialog").close();
    showToast("Profile saved.");
  } catch (error) { message.textContent = error.message; }
});

async function boot() {
  if (!await renewSession()) return;
  try {
    const { user } = await api("/api/auth/me");
    state.user = user;
    await showWorkspace();
  } catch {
    state.accessToken = null;
    state.user = null;
  }
}

setAuthMode("login");
boot().catch((error) => showToast(error.message));
