(() => {
  let accessToken = null;
  let authMode = "login";
  let currentUser = null;
  let plans = [];
  let searchTimer;

  const $ = (selector) => document.querySelector(selector);
  const setMessage = (selector, message, success = false) => {
    const node = $(selector);
    node.textContent = message || "";
    node.classList.toggle("success", success);
  };
  const request = async (url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let response = await fetch(url, { ...options, headers, credentials: "same-origin" });
    if (response.status === 401 && !url.endsWith("/auth/refresh") && !url.endsWith("/auth/login")) {
      const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
      if (refreshed.ok) {
        accessToken = (await refreshed.json()).accessToken;
        headers.Authorization = `Bearer ${accessToken}`;
        response = await fetch(url, { ...options, headers, credentials: "same-origin" });
      }
    }
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Something went wrong");
    return body;
  };

  function showApp(user) {
    currentUser = user;
    $("#auth-panel").classList.add("hidden");
    $("#app-panel").classList.remove("hidden");
    $("#session-label").textContent = user.email;
    $("#logout").classList.remove("hidden");
    $("#welcome-email").textContent = user.email;
    $("#role-pill").textContent = user.role === "ADMIN" ? "ADMINISTRATOR" : "MEMBER";
    $("#admin-tab").classList.toggle("hidden", user.role !== "ADMIN");
    loadProfile();
  }

  async function loadProfile() {
    try {
      const { user } = await request("/api/user/profile");
      currentUser = user;
      $("#profile-email").textContent = user.email;
      $("#profile-created").textContent = new Date(user.createdAt).toLocaleDateString();
      $("#profile-status").textContent = user.status;
      const sub = user.subscription;
      $("#current-plan").textContent = sub?.plan?.name || "No plan";
      $("#plan-details").textContent = sub?.currentPeriodEnd
        ? `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()} · Demo subscription`
        : "Included features for your account";
      $("#feature-list").replaceChildren(...(sub?.plan?.features || []).map((feature) => {
        const chip = document.createElement("span");
        chip.className = "feature";
        chip.textContent = feature.replaceAll("_", " ");
        return chip;
      }));
    } catch (error) {
      setMessage("#account-message", error.message);
    }
  }

  async function loadPlans() {
    try {
      const result = await request("/api/subscription/plans");
      plans = result.plans;
      const grid = $("#plans-grid");
      grid.replaceChildren(...plans.map((plan) => {
        const card = document.createElement("article");
        card.className = `card plan-option${currentUser?.subscription?.plan?.slug === plan.slug ? " current" : ""}`;
        const price = plan.priceCents === 0 ? "Free" : `$${(plan.priceCents / 100).toFixed(0)}`;
        const title = document.createElement("h3");
        title.textContent = plan.name;
        const priceNode = document.createElement("p");
        priceNode.className = "price";
        priceNode.textContent = price;
        if (plan.priceCents > 0) {
          const interval = document.createElement("small");
          interval.textContent = ` / ${plan.interval}`;
          priceNode.append(interval);
        }
        const featureList = document.createElement("ul");
        for (const feature of plan.features) {
          const item = document.createElement("li");
          item.textContent = feature.replaceAll("_", " ");
          featureList.append(item);
        }
        const button = document.createElement("button");
        button.className = "button button-primary";
        button.type = "button";
        const isCurrent = currentUser?.subscription?.plan?.slug === plan.slug;
        button.textContent = isCurrent ? "Current plan" : plan.priceCents > 0 ? "Upgrade plan" : "Free plan";
        button.disabled = isCurrent || plan.priceCents === 0;
        button.addEventListener("click", () => upgrade(plan.slug));
        card.append(title, priceNode, featureList, button);
        return card;
      }));
    } catch (error) {
      setMessage("#plans-message", error.message);
    }
  }

  async function upgrade(planSlug) {
    try {
      const result = await request("/api/subscription/upgrade", {
        method: "POST",
        body: JSON.stringify({ planSlug }),
      });
      setMessage("#plans-message", result.notice, true);
      await loadProfile();
      await loadPlans();
    } catch (error) {
      setMessage("#plans-message", error.message);
    }
  }

  async function loadAdmin(search = "") {
    if (currentUser?.role !== "ADMIN") return;
    try {
      const [summary, userResult] = await Promise.all([
        request("/api/admin/summary"),
        request(`/api/admin/users?limit=50&search=${encodeURIComponent(search)}`),
      ]);
      $("#admin-stats").replaceChildren(
        statCard("Total accounts", summary.totalUsers),
        statCard("Active members", summary.activeUsers),
        statCard("Paid subscriptions", summary.paidSubscriptions),
      );
      const tbody = $("#users-body");
      tbody.replaceChildren(...userResult.users.map((user) => {
        const row = document.createElement("tr");
        const fields = [
          user.email,
          user.subscription?.plan?.name || "—",
          user.status,
          new Date(user.createdAt).toLocaleDateString(),
        ];
        for (const [index, value] of fields.entries()) {
          const cell = document.createElement("td");
          if (index === 2) {
            const badge = document.createElement("span");
            badge.className = `status ${user.status}`;
            badge.textContent = user.status;
            cell.append(badge);
          } else {
            cell.textContent = value;
          }
          row.append(cell);
        }
        const actions = document.createElement("td");
        const group = document.createElement("div");
        group.className = "row-actions";
        const planButton = document.createElement("button");
        planButton.className = "small-button";
        planButton.textContent = "Set Pro";
        planButton.addEventListener("click", () => adminSetPlan(user.id, "pro"));
        const statusButton = document.createElement("button");
        statusButton.className = `small-button${user.status === "ACTIVE" ? " danger" : ""}`;
        statusButton.textContent = user.status === "ACTIVE" ? "Suspend" : "Restore";
        statusButton.disabled = user.id === currentUser.id;
        statusButton.addEventListener("click", () => adminSetSuspension(user.id, user.status !== "SUSPENDED"));
        group.append(planButton, statusButton);
        actions.append(group);
        row.append(actions);
        return row;
      }));
    } catch (error) {
      setMessage("#admin-message", error.message);
    }
  }

  function statCard(label, value) {
    const card = document.createElement("article");
    card.className = "stat";
    const title = document.createElement("span");
    title.textContent = label;
    const number = document.createElement("strong");
    number.textContent = value;
    card.append(title, number);
    return card;
  }

  async function adminSetPlan(userId, planSlug) {
    try {
      await request(`/api/admin/users/${encodeURIComponent(userId)}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planSlug }),
      });
      setMessage("#admin-message", "Plan updated.", true);
      loadAdmin($("#user-search").value);
    } catch (error) {
      setMessage("#admin-message", error.message);
    }
  }

  async function adminSetSuspension(userId, suspended) {
    try {
      await request(`/api/admin/users/${encodeURIComponent(userId)}/suspension`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      });
      setMessage("#admin-message", suspended ? "Account suspended." : "Account restored.", true);
      loadAdmin($("#user-search").value);
    } catch (error) {
      setMessage("#admin-message", error.message);
    }
  }

  document.querySelectorAll(".segment").forEach((button) => button.addEventListener("click", () => {
    authMode = button.dataset.mode;
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    const registering = authMode === "register";
    $("#auth-eyebrow").textContent = registering ? "START YOUR ACCOUNT" : "WELCOME BACK";
    $("#auth-title").textContent = registering ? "Create your Orbit account" : "Sign in to Orbit";
    $("#auth-submit").textContent = registering ? "Create account" : "Sign in";
    $('input[name="password"]').autocomplete = registering ? "new-password" : "current-password";
    $("#forgot").classList.toggle("hidden", registering);
    setMessage("#auth-message", "");
  }));

  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    try {
      const result = await request(endpoint, {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      accessToken = result.accessToken;
      const profile = await request("/api/user/profile");
      showApp(profile.user);
    } catch (error) {
      setMessage("#auth-message", error.message);
    }
  });

  $("#forgot").addEventListener("click", async () => {
    const email = $('input[name="email"]').value;
    if (!email) return setMessage("#auth-message", "Enter your email address first.");
    try {
      const result = await request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("#auth-message", result.message, true);
    } catch (error) {
      setMessage("#auth-message", error.message);
    }
  });

  $("#logout").addEventListener("click", async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Sign-out failed", error);
    }
    accessToken = null;
    currentUser = null;
    $("#app-panel").classList.add("hidden");
    $("#auth-panel").classList.remove("hidden");
    $("#logout").classList.add("hidden");
    $("#session-label").textContent = "Not signed in";
  });

  document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("hidden", view.id !== `view-${button.dataset.view}`));
    if (button.dataset.view === "plans") loadPlans();
    if (button.dataset.view === "admin") loadAdmin($("#user-search").value);
  }));

  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector('[data-view="plans"]').click();
  }));
  $("#try-feature").addEventListener("click", async () => {
    try {
      const result = await request("/api/user/advanced-reports");
      setMessage("#account-message", result.message, true);
    } catch (error) {
      setMessage("#account-message", error.message);
    }
  });
  $("#reload-users").addEventListener("click", () => loadAdmin($("#user-search").value));
  $("#user-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadAdmin($("#user-search").value), 250);
  });

  fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) return;
      accessToken = (await response.json()).accessToken;
      const { user } = await request("/api/user/profile");
      showApp(user);
    })
    .catch((error) => console.error("Session restore failed", error));
})();
