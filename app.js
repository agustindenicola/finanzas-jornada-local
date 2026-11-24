const STORAGE_KEY = "finanzas-jornada-local-v1";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const initialState = {
  profile: {
    name: "Agustin"
  },
  finances: [],
  investments: [],
  workLogs: [],
  studyBlocks: [],
  dglabLogs: [],
  gymLogs: [],
  reminders: {
    enabled: false,
    frequencyMinutes: 120,
    lastSentAt: ""
  }
};

const motivationMessages = [
  "100% foco. Un paso concreto hoy vale mas que una idea perfecta manana.",
  "Pensamiento positivo, accion clara y perseverancia. Hoy se construye.",
  "Constancia antes que intensidad. Agustin, hace lo simple y hacelo bien.",
  "No hace falta resolver toda la vida hoy. Solo ganar el proximo bloque.",
  "Trabajo, estudio y DGLAB: foco tranquilo, energia alta, avance real.",
  "La disciplina tambien es cuidarte. Orden, calma y movimiento."
];

let state = loadState();

function loadState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setDefaultDates() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today();
  });
  document.querySelector("#month-filter").value = currentMonth();
  document.querySelector("#close-month").value = currentMonth();
}

function byDateDesc(a, b) {
  return `${b.date}`.localeCompare(`${a.date}`);
}

function sameMonth(item, month) {
  return item.date && item.date.startsWith(month);
}

function parseAmount(value) {
  return Number.parseFloat(value || "0") || 0;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderEmpty(target) {
  target.innerHTML = document.querySelector("#empty-template").innerHTML;
}

function render() {
  renderGreeting();
  renderHome();
  renderReminderSettings();
  renderDashboard();
  renderFinances();
  renderInvestments();
  renderWork();
  renderStudy();
  renderDglab();
  renderGym();
  renderRecords();
}

function renderGreeting() {
  const hour = new Date().getHours();
  const name = state.profile?.name || "Agustin";
  const moment = hour < 12 ? "Buen dia" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  document.querySelector("#daily-greeting").textContent = `${moment}, ${name}. Aca tenes tu plata, tu jornada y tu estudio en un solo lugar.`;
}

function renderHome() {
  const name = state.profile?.name || "Agustin";
  const messageIndex = new Date().getDate() % motivationMessages.length;
  const todaysWork = state.workLogs.find((item) => item.date === today());
  const todaysStudy = state.studyBlocks.filter((item) => item.date === today());
  const todaysGym = state.gymLogs.find((item) => item.date === today());
  const pendingDglab = [...state.dglabLogs].filter((item) => item.status !== "hecho").sort(byDateDesc)[0];
  const nextStudy = [...state.studyBlocks].filter((item) => item.status !== "hecho").sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))[0];
  const todayParts = [];

  if (todaysWork) todayParts.push("trabajo cerrado");
  if (todaysStudy.length) todayParts.push(`${todaysStudy.length} bloque de estudio`);
  if (todaysGym) todayParts.push(todaysGym.went === "si" ? "gym hecho" : "gym registrado");

  document.querySelector("#home-title").textContent = `Hola, ${name}`;
  document.querySelector("#motivation-message").textContent = motivationMessages[messageIndex];
  document.querySelector("#home-date").textContent = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  document.querySelector("#today-summary").textContent = todayParts.length ? todayParts.join(" · ") : "Todavia no registraste tu rutina de hoy";
  document.querySelector("#next-focus-summary").textContent = pendingDglab?.next || pendingDglab?.focus || nextStudy?.goal || "Elegir una accion simple y empezarla";
}

function renderDashboard() {
  const month = document.querySelector("#month-filter").value || currentMonth();
  const finances = state.finances.filter((item) => sameMonth(item, month));
  const income = finances.filter((item) => item.type === "ingreso").reduce((sum, item) => sum + item.amount, 0);
  const expense = finances.filter((item) => item.type === "gasto").reduce((sum, item) => sum + item.amount, 0);
  const workLogs = state.workLogs.filter((item) => sameMonth(item, month));
  const normalHours = workLogs.reduce((sum, item) => sum + item.normalHours, 0);
  const extraHours = workLogs.reduce((sum, item) => sum + item.extraHours, 0);

  document.querySelector("#metric-income").textContent = money.format(income);
  document.querySelector("#metric-expense").textContent = money.format(expense);
  document.querySelector("#metric-balance").textContent = money.format(income - expense);
  document.querySelector("#metric-hours").textContent = `${normalHours.toFixed(1)} h / ${extraHours.toFixed(1)} h`;

  renderCategoryBars(finances);
  renderFocusList();
}

function renderCategoryBars(finances) {
  const target = document.querySelector("#category-bars");
  const expenses = finances.filter((item) => item.type === "gasto");
  const totals = expenses.reduce((map, item) => {
    map[item.category] = (map[item.category] || 0) + item.amount;
    return map;
  }, {});
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return renderEmpty(target);
  const max = Math.max(...entries.map(([, amount]) => amount));
  target.innerHTML = entries.map(([category, amount]) => `
    <div class="bar-row">
      <div class="bar-label"><strong>${escapeHtml(category)}</strong><span>${money.format(amount)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="--value:${Math.max(4, (amount / max) * 100)}%"></div></div>
    </div>
  `).join("");
}

function renderFocusList() {
  const target = document.querySelector("#focus-list");
  const pendingStudy = state.studyBlocks.filter((item) => item.status !== "hecho").sort(byDateDesc).slice(0, 3);
  const lastWork = [...state.workLogs].sort(byDateDesc)[0];
  const goals = state.investments.filter((item) => item.target > item.amount).slice(0, 3);
  const items = [];

  if (lastWork?.next) items.push(["Trabajo", lastWork.next]);
  pendingStudy.forEach((item) => items.push(["Estudio", `${item.topic}: ${item.goal || `${item.minutes} minutos`}`]));
  goals.forEach((item) => items.push(["Ahorro", `${item.name}: faltan ${money.format(item.target - item.amount)}`]));

  if (!items.length) return renderEmpty(target);
  target.innerHTML = items.slice(0, 5).map(([label, text]) => `
    <div class="record-item"><strong>${escapeHtml(label)}</strong><span class="muted">${escapeHtml(text)}</span></div>
  `).join("");
}

function renderFinances() {
  const target = document.querySelector("#finance-table");
  if (!state.finances.length) {
    target.innerHTML = `<tr><td colspan="6">Todavia no cargaste movimientos.</td></tr>`;
    return;
  }
  target.innerHTML = [...state.finances].sort(byDateDesc).map((item) => `
    <tr>
      <td>${item.date}</td>
      <td><span class="tag ${item.type}">${item.type}</span></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.note)}</td>
      <td class="amount">${money.format(item.amount)}</td>
      <td><button class="danger-button" data-delete="finances" data-id="${item.id}">Borrar</button></td>
    </tr>
  `).join("");
}

function renderInvestments() {
  const target = document.querySelector("#investment-cards");
  if (!state.investments.length) return renderEmpty(target);
  target.innerHTML = [...state.investments].sort(byDateDesc).map((item) => {
    const percent = item.target ? Math.min(100, (item.amount / item.target) * 100) : 100;
    return `
      <article class="card">
        <div class="card-head">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p class="muted">${item.date}</p>
          </div>
          <span class="tag ${item.type}">${item.type}</span>
        </div>
        <div>
          <strong>${money.format(item.amount)}</strong>
          <p class="muted">${item.target ? `Objetivo: ${money.format(item.target)}` : "Sin objetivo definido"}</p>
        </div>
        <div class="progress-track"><div class="progress-fill" style="--value:${percent}%"></div></div>
        <p class="muted">${escapeHtml(item.note)}</p>
        <button class="danger-button" data-delete="investments" data-id="${item.id}">Borrar</button>
      </article>
    `;
  }).join("");
}

function renderWork() {
  const target = document.querySelector("#work-table");
  if (!state.workLogs.length) {
    target.innerHTML = `<tr><td colspan="7">Todavia no cerraste ninguna jornada.</td></tr>`;
    return;
  }
  target.innerHTML = [...state.workLogs].sort(byDateDesc).map((item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.normalHours.toFixed(1)} h</td>
      <td>${item.extraHours.toFixed(1)} h</td>
      <td>${escapeHtml(item.extraDetails)}</td>
      <td>${escapeHtml(item.progress)}</td>
      <td>${escapeHtml(item.next)}</td>
      <td><button class="danger-button" data-delete="workLogs" data-id="${item.id}">Borrar</button></td>
    </tr>
  `).join("");
}

function renderStudy() {
  const target = document.querySelector("#study-cards");
  if (!state.studyBlocks.length) return renderEmpty(target);
  target.innerHTML = [...state.studyBlocks].sort(byDateDesc).map((item) => `
    <article class="card">
      <div class="card-head">
        <div>
          <strong>${escapeHtml(item.topic)}</strong>
          <p class="muted">${item.date} · ${item.minutes} min</p>
        </div>
        <span class="tag ${item.status.replace(" ", "-")}">${item.status}</span>
      </div>
      <p>${escapeHtml(item.goal)}</p>
      <div class="card-head">
        <button class="text-button" data-cycle-study="${item.id}">Cambiar estado</button>
        <button class="danger-button" data-delete="studyBlocks" data-id="${item.id}">Borrar</button>
      </div>
    </article>
  `).join("");
}

function renderDglab() {
  const target = document.querySelector("#dglab-cards");
  if (!state.dglabLogs.length) return renderEmpty(target);
  target.innerHTML = [...state.dglabLogs].sort(byDateDesc).map((item) => `
    <article class="card">
      <div class="card-head">
        <div>
          <strong>${escapeHtml(item.focus)}</strong>
          <p class="muted">${item.date}</p>
        </div>
        <span class="tag ${item.status.replace(" ", "-")}">${item.status}</span>
      </div>
      <p>${escapeHtml(item.progress)}</p>
      <p class="muted">${escapeHtml(item.next)}</p>
      <button class="danger-button" data-delete="dglabLogs" data-id="${item.id}">Borrar</button>
    </article>
  `).join("");
}

function renderGym() {
  const target = document.querySelector("#gym-cards");
  if (!state.gymLogs.length) return renderEmpty(target);
  target.innerHTML = [...state.gymLogs].sort(byDateDesc).map((item) => `
    <article class="card">
      <div class="card-head">
        <div>
          <strong>${item.went === "si" ? "Fui al gimnasio" : "No fui al gimnasio"}</strong>
          <p class="muted">${item.date}</p>
        </div>
        <span class="tag ${item.went === "si" ? "hecho" : "pendiente"}">${item.went}</span>
      </div>
      <button class="danger-button" data-delete="gymLogs" data-id="${item.id}">Borrar</button>
    </article>
  `).join("");
}

function renderReminderSettings() {
  const reminders = state.reminders || initialState.reminders;
  const permission = "Notification" in window ? Notification.permission : "unavailable";
  const status = document.querySelector("#reminder-status");
  const toggle = document.querySelector("#toggle-reminders");
  document.querySelector("#reminder-frequency").value = String(reminders.frequencyMinutes || 120);
  toggle.textContent = reminders.enabled ? "Desactivar" : "Activar";

  if (permission === "unavailable") {
    status.textContent = "Tu navegador no soporta notificaciones.";
  } else if (!reminders.enabled) {
    status.textContent = "Desactivados";
  } else if (permission === "granted") {
    status.textContent = `Activos cada ${reminders.frequencyMinutes} minutos mientras la app este abierta.`;
  } else {
    status.textContent = "Falta permitir notificaciones en el navegador.";
  }
}

function renderRecords() {
  const search = document.querySelector("#search").value.trim().toLowerCase();
  const entries = [
    ...state.finances.map((item) => ({ kind: "Movimiento", date: item.date, text: `${item.type} ${item.category} ${item.note} ${money.format(item.amount)}` })),
    ...state.investments.map((item) => ({ kind: "Ahorro/Inversion", date: item.date, text: `${item.type} ${item.name} ${item.note} ${money.format(item.amount)}` })),
    ...state.workLogs.map((item) => ({ kind: "Trabajo", date: item.date, text: `${item.progress} ${item.extraDetails || ""} ${item.next}` })),
    ...state.studyBlocks.map((item) => ({ kind: "Estudio", date: item.date, text: `${item.topic} ${item.goal} ${item.status}` })),
    ...state.dglabLogs.map((item) => ({ kind: "DGLAB", date: item.date, text: `${item.focus} ${item.progress} ${item.next} ${item.status}` })),
    ...state.gymLogs.map((item) => ({ kind: "Gimnasio", date: item.date, text: `fui: ${item.went}` }))
  ].filter((item) => !search || `${item.kind} ${item.date} ${item.text}`.toLowerCase().includes(search));

  const target = document.querySelector("#records-list");
  if (!entries.length) return renderEmpty(target);
  target.innerHTML = entries.sort(byDateDesc).map((item) => `
    <div class="record-item">
      <strong>${escapeHtml(item.kind)} · ${item.date}</strong>
      <span class="muted">${escapeHtml(item.text)}</span>
    </div>
  `).join("");
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function resetForm(form) {
  form.reset();
  setDefaultDates();
}

function diffHours(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return Math.max(0, minutes / 60);
}

function bindForms() {
  document.querySelector("#finance-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    state.finances.push({
      id: uid(),
      type: data.type,
      amount: parseAmount(data.amount),
      category: data.category.trim(),
      date: data.date,
      note: data.note.trim()
    });
    saveState();
    resetForm(form);
    render();
  });

  document.querySelector("#investment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    state.investments.push({
      id: uid(),
      type: data.type,
      name: data.name.trim(),
      amount: parseAmount(data.amount),
      target: parseAmount(data.target),
      date: data.date,
      note: data.note.trim()
    });
    saveState();
    resetForm(form);
    render();
  });

  document.querySelector("#work-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    const extraHours = parseAmount(data.extraHours);
    const totalHours = diffHours(data.start, data.end);
    state.workLogs.push({
      id: uid(),
      date: data.date,
      start: data.start,
      end: data.end,
      normalHours: Math.max(0, totalHours - extraHours),
      extraHours,
      extraDetails: data.extraDetails.trim(),
      progress: data.progress.trim(),
      next: data.next.trim()
    });
    saveState();
    resetForm(form);
    render();
  });

  document.querySelector("#study-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    state.studyBlocks.push({
      id: uid(),
      topic: data.topic.trim(),
      date: data.date,
      minutes: parseAmount(data.minutes),
      status: data.status,
      goal: data.goal.trim()
    });
    saveState();
    resetForm(form);
    render();
  });

  document.querySelector("#dglab-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    state.dglabLogs.push({
      id: uid(),
      date: data.date,
      focus: data.focus.trim(),
      status: data.status,
      progress: data.progress.trim(),
      next: data.next.trim()
    });
    saveState();
    resetForm(form);
    render();
  });

  document.querySelector("#gym-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = readForm(form);
    state.gymLogs.push({
      id: uid(),
      date: data.date,
      went: data.went
    });
    saveState();
    resetForm(form);
    render();
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      document.querySelector(`.nav-item[data-view="${button.dataset.view}"]`)?.classList.add("active");
      document.querySelector(`#${button.dataset.view}`).classList.add("active");
    });
  });
}

function bindActions() {
  document.body.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      const collection = deleteButton.dataset.delete;
      state[collection] = state[collection].filter((item) => item.id !== deleteButton.dataset.id);
      saveState();
      render();
    }

    const cycleButton = event.target.closest("[data-cycle-study]");
    if (cycleButton) {
      const statuses = ["pendiente", "en curso", "hecho"];
      const item = state.studyBlocks.find((block) => block.id === cycleButton.dataset.cycleStudy);
      item.status = statuses[(statuses.indexOf(item.status) + 1) % statuses.length];
      saveState();
      render();
    }
  });

  document.querySelector("#month-filter").addEventListener("change", renderDashboard);
  document.querySelector("#search").addEventListener("input", renderRecords);
  document.querySelector("#export-json").addEventListener("click", exportJson);
  document.querySelector("#export-csv").addEventListener("click", exportCsv);
  document.querySelector("#export-monthly-excel").addEventListener("click", exportMonthlyExcel);
  document.querySelector("#toggle-reminders").addEventListener("click", toggleReminders);
  document.querySelector("#test-reminder").addEventListener("click", () => sendReminder(true));
  document.querySelector("#reminder-frequency").addEventListener("change", updateReminderFrequency);
  document.querySelector("#import-json").addEventListener("change", importJson);
  document.querySelector("#reset-demo").addEventListener("click", loadDemoData);
}

async function toggleReminders() {
  if (!("Notification" in window)) {
    alert("Este navegador no soporta notificaciones de escritorio.");
    return;
  }

  if (!state.reminders) state.reminders = { ...initialState.reminders };

  if (!state.reminders.enabled && Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      state.reminders.enabled = false;
      saveState();
      renderReminderSettings();
      return;
    }
  }

  state.reminders.enabled = !state.reminders.enabled;
  state.reminders.lastSentAt = state.reminders.enabled ? new Date().toISOString() : "";
  saveState();
  renderReminderSettings();
  if (state.reminders.enabled) sendReminder(true);
}

function updateReminderFrequency(event) {
  if (!state.reminders) state.reminders = { ...initialState.reminders };
  state.reminders.frequencyMinutes = Number.parseInt(event.target.value, 10) || 120;
  saveState();
  renderReminderSettings();
}

function reminderText() {
  const options = [
    "Agustin, anota lo importante antes de que se escape: plata, trabajo, estudio o DGLAB.",
    "Chequeo rapido: si avanzaste algo, registralo. Ese habito te ordena.",
    "Dos minutos ahora valen mucho despues: carga gastos, horas, gym o estudio.",
    "Momento de rutina: deja asentado lo que hiciste y segui liviano."
  ];
  return options[new Date().getHours() % options.length];
}

function sendReminder(force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!state.reminders) state.reminders = { ...initialState.reminders };
  if (!force && !state.reminders.enabled) return;

  new Notification("Agustin Control", {
    body: reminderText(),
    tag: "agustin-control-reminder"
  });

  state.reminders.lastSentAt = new Date().toISOString();
  saveState();
  renderReminderSettings();
}

function startReminderLoop() {
  setInterval(() => {
    const reminders = state.reminders;
    if (!reminders?.enabled || !reminders.lastSentAt) return;
    const elapsed = Date.now() - new Date(reminders.lastSentAt).getTime();
    const interval = (reminders.frequencyMinutes || 120) * 60 * 1000;
    if (elapsed >= interval) sendReminder();
  }, 60 * 1000);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  download(`backup-finanzas-jornada-${today()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const rows = [["fecha", "tipo", "categoria", "detalle", "monto"]];
  state.finances.sort(byDateDesc).forEach((item) => rows.push([item.date, item.type, item.category, item.note, item.amount]));
  download(`movimientos-${today()}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function xmlCell(value, type = "String") {
  const safe = escapeHtml(value ?? "");
  return `<Cell><Data ss:Type="${type}">${safe}</Data></Cell>`;
}

function worksheet(name, rows) {
  const safeName = escapeHtml(name.slice(0, 31));
  const body = rows.map((row) => `<Row>${row.map((cell) => {
    const value = typeof cell === "object" && cell !== null ? cell.value : cell;
    const type = typeof cell === "object" && cell !== null ? cell.type : "String";
    return xmlCell(value, type);
  }).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${safeName}"><Table>${body}</Table></Worksheet>`;
}

function exportMonthlyExcel() {
  const month = document.querySelector("#close-month").value || currentMonth();
  const monthLabel = month.split("-").reverse().join("-");
  const finances = state.finances.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const investments = state.investments.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const workLogs = state.workLogs.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const studyBlocks = state.studyBlocks.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const dglabLogs = state.dglabLogs.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const gymLogs = state.gymLogs.filter((item) => sameMonth(item, month)).sort(byDateDesc);
  const income = finances.filter((item) => item.type === "ingreso").reduce((sum, item) => sum + item.amount, 0);
  const expense = finances.filter((item) => item.type === "gasto").reduce((sum, item) => sum + item.amount, 0);
  const normalHours = workLogs.reduce((sum, item) => sum + item.normalHours, 0);
  const extraHours = workLogs.reduce((sum, item) => sum + item.extraHours, 0);
  const studyMinutes = studyBlocks.reduce((sum, item) => sum + item.minutes, 0);
  const gymYes = gymLogs.filter((item) => item.went === "si").length;

  const sheets = [
    worksheet("Resumen", [
      ["Mes", month],
      ["Ingresos", { value: income, type: "Number" }],
      ["Gastos", { value: expense, type: "Number" }],
      ["Balance", { value: income - expense, type: "Number" }],
      ["Horas normales", { value: normalHours, type: "Number" }],
      ["Horas extra", { value: extraHours, type: "Number" }],
      ["Minutos de estudio", { value: studyMinutes, type: "Number" }],
      ["Dias de gimnasio", { value: gymYes, type: "Number" }],
      ["Avances DGLAB", { value: dglabLogs.length, type: "Number" }]
    ]),
    worksheet("Trabajo", [
      ["Fecha", "Inicio", "Fin", "Horas normales", "Horas extra", "Detalle horas extra", "Avance", "Recordatorio"],
      ...workLogs.map((item) => [item.date, item.start, item.end, { value: item.normalHours, type: "Number" }, { value: item.extraHours, type: "Number" }, item.extraDetails || "", item.progress, item.next])
    ]),
    worksheet("Horas Extra", [
      ["Fecha", "Horas extra", "Que se hizo en horas extra", "Avance general"],
      ...workLogs.filter((item) => item.extraHours > 0).map((item) => [item.date, { value: item.extraHours, type: "Number" }, item.extraDetails || item.progress, item.progress])
    ]),
    worksheet("Ingresos y gastos", [
      ["Fecha", "Tipo", "Categoria", "Detalle", "Monto"],
      ...finances.map((item) => [item.date, item.type, item.category, item.note, { value: item.amount, type: "Number" }])
    ]),
    worksheet("Estudio", [
      ["Fecha", "Tema", "Minutos", "Estado", "Objetivo"],
      ...studyBlocks.map((item) => [item.date, item.topic, { value: item.minutes, type: "Number" }, item.status, item.goal])
    ]),
    worksheet("DGLAB", [
      ["Fecha", "Foco", "Estado", "Avance", "Proximo paso"],
      ...dglabLogs.map((item) => [item.date, item.focus, item.status, item.progress, item.next])
    ]),
    worksheet("Gimnasio", [
      ["Fecha", "Fui"],
      ...gymLogs.map((item) => [item.date, item.went])
    ]),
    worksheet("Ahorros", [
      ["Fecha", "Tipo", "Nombre", "Monto actual", "Objetivo", "Notas"],
      ...investments.map((item) => [item.date, item.type, item.name, { value: item.amount, type: "Number" }, { value: item.target, type: "Number" }, item.note])
    ])
  ];

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${sheets.join("")}
</Workbook>`;

  download(`cierre-mensual-agustin-${monthLabel}.xls`, workbook, "application/vnd.ms-excel");
}

function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      state = { ...initialState, ...incoming };
      saveState();
      render();
    } catch {
      alert("No pude leer ese backup JSON.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function loadDemoData() {
  const month = currentMonth();
  state = {
    profile: {
      name: "Agustin"
    },
    finances: [
      { id: uid(), type: "ingreso", amount: 850000, category: "Sueldo", date: `${month}-01`, note: "Trabajo mensual" },
      { id: uid(), type: "ingreso", amount: 90000, category: "Extra", date: `${month}-12`, note: "Horas extra" },
      { id: uid(), type: "gasto", amount: 125000, category: "Comida", date: `${month}-05`, note: "Supermercado" },
      { id: uid(), type: "gasto", amount: 46000, category: "Transporte", date: `${month}-08`, note: "Combustible" },
      { id: uid(), type: "gasto", amount: 38000, category: "Estudio", date: `${month}-10`, note: "Curso" }
    ],
    investments: [
      { id: uid(), type: "ahorro", name: "Fondo emergencia", amount: 420000, target: 1000000, date: `${month}-03`, note: "Objetivo: seis meses de gastos base" },
      { id: uid(), type: "inversion", name: "Cartera largo plazo", amount: 760000, target: 1500000, date: `${month}-11`, note: "Revisar una vez por mes" }
    ],
    workLogs: [
      { id: uid(), date: `${month}-14`, start: "09:00", end: "18:00", normalHours: 8, extraHours: 1, extraDetails: "Cierre de pendientes y seguimiento de tareas urgentes.", progress: "Ordene pendientes y avance con tareas criticas.", next: "Arrancar por el presupuesto." }
    ],
    studyBlocks: [
      { id: uid(), topic: "Robotica", date: `${month}-16`, minutes: 90, status: "en curso", goal: "Repasar conceptos de simulacion." },
      { id: uid(), topic: "Ingles", date: `${month}-18`, minutes: 45, status: "pendiente", goal: "Practicar speaking." }
    ],
    dglabLogs: [
      { id: uid(), date: `${month}-15`, focus: "Oferta inicial", status: "en curso", progress: "Defini una idea de servicio para validar.", next: "Armar lista de posibles clientes." }
    ],
    gymLogs: [
      { id: uid(), date: `${month}-15`, went: "si" }
    ],
    reminders: {
      enabled: false,
      frequencyMinutes: 120,
      lastSentAt: ""
    }
  };
  saveState();
  render();
}

setDefaultDates();
bindNavigation();
bindForms();
bindActions();
render();
startReminderLoop();
