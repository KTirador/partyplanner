// === Constants ===
const BASE = "https://fsa-crud-2aa9294fe819.herokuapp.com/api";
const COHORT = "/2507"; // <-- keep your cohort here
const API = `${BASE}${COHORT}/events`;

// === State ===
let events = [];
let selectedEventId = null;
let selectedEvent = null; // detailed event (may include guests)
let loading = false;
let error = null;

// === Boot ===
document.addEventListener("DOMContentLoaded", () => {
  getEvents();
});

// === API ===
async function getEvents() {
  try {
    loading = true;
    render();
    const res = await fetch(API);
    if (!res.ok) throw new Error(`Failed to load events: ${res.status}`);
    const json = await res.json();
    events = json.data || [];

    if (!selectedEventId && events.length) {
      selectedEventId = events[0].id;
    }
    if (selectedEventId) await getEvent(selectedEventId);
    loading = false;
    render();
  } catch (e) {
    error = e.message;
    loading = false;
    render();
  }
}

async function getEvent(id) {
  try {
    selectedEventId = id;
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error(`Failed to load event ${id}: ${res.status}`);
    const json = await res.json();
    selectedEvent = json.data;
    render();
  } catch (e) {
    error = e.message;
    render();
  }
}

async function createEvent({ name, description, date, location }) {
  try {
    const isoDate = new Date(`${date}T00:00`).toISOString();
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, date: isoDate, location }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Create failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    await getEvents();
    selectedEventId = json.data?.id ?? selectedEventId;
    if (selectedEventId) await getEvent(selectedEventId);
  } catch (e) {
    error = e.message;
    render();
  }
}

async function deleteSelected() {
  if (!selectedEventId) return;
  try {
    const res = await fetch(`${API}/${selectedEventId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    selectedEventId = null;
    selectedEvent = null;
    await getEvents();
  } catch (e) {
    error = e.message;
    render();
  }
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c == null) return;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return el;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function FormComponent() {
  const form = h(
    "form",
    {
      class: "party-form",
      style: { display: "grid", gap: "0.5rem", maxWidth: "520px" },
    },
    h("h2", {}, "Add a New Party"),
    h(
      "label",
      {},
      "Name",
      h("input", { name: "name", required: true, placeholder: "Gala Night" })
    ),
    h(
      "label",
      {},
      "Description",
      h("textarea", {
        name: "description",
        required: true,
        placeholder: "Theme, attire, and more...",
      })
    ),
    h(
      "label",
      {},
      "Date",
      h("input", { name: "date", type: "date", required: true })
    ),
    h(
      "label",
      {},
      "Location",
      h("input", {
        name: "location",
        required: true,
        placeholder: "Main Hall A",
      })
    ),
    h("button", { type: "submit" }, "Create Party")
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    await createEvent(payload);
    form.reset();
  });

  return form;
}

function ListItem(event) {
  const isSelected = event.id === selectedEventId;
  return h(
    "li",
    {
      class: "party-item",
      style: {
        padding: "0.5rem 0.75rem",
        cursor: "pointer",
        borderRadius: "8px",
        background: isSelected ? "#eef5ff" : "transparent",
      },
      onClick: () => getEvent(event.id),
      title: formatDate(event.date),
    },
    h("strong", {}, event.name),
    " ",
    h(
      "span",
      { style: { opacity: 0.7 } },
      `• ${new Date(event.date).toLocaleDateString()} • ${event.location}`
    )
  );
}

function ListComponent() {
  const list = h(
    "section",
    { class: "party-list", style: { flex: "1 1 320px", minWidth: "280px" } },
    h("h2", {}, "Upcoming Parties"),
    h(
      "ul",
      { style: { listStyle: "none", padding: 0, margin: 0 } },
      events.length
        ? events.map(ListItem)
        : h("li", { style: { opacity: 0.7 } }, "No events yet.")
    )
  );
  return list;
}

function DetailsComponent() {
  const section = h(
    "section",
    { class: "party-details", style: { flex: "2 1 520px" } },
    h("h2", {}, "Details")
  );

  if (!selectedEvent) {
    section.append(
      h("p", { style: { opacity: 0.7 } }, "Select a party to see details.")
    );
    return section;
  }

  section.append(
    h(
      "div",
      { style: { display: "grid", gap: "0.25rem" } },
      h("h3", {}, selectedEvent.name),
      h("div", {}, h("strong", {}, "When: "), formatDate(selectedEvent.date)),
      h("div", {}, h("strong", {}, "Where: "), selectedEvent.location),
      h("p", {}, selectedEvent.description || "No description.")
    )
  );
  if (Array.isArray(selectedEvent.guests) && selectedEvent.guests.length) {
    section.append(
      h("h4", {}, "Guest List"),
      h(
        "ul",
        {},
        selectedEvent.guests.map((g) =>
          h("li", {}, `${g.name}${g.email ? ` — ${g.email}` : ""}`)
        )
      )
    );
  }

  section.append(
    h(
      "button",
      {
        style: {
          marginTop: "0.75rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "8px",
          border: "1px solid #d00",
          background: "#fff0f0",
          cursor: "pointer",
        },
        onClick: async () => {
          const ok = confirm("Delete this party?");
          if (!ok) return;
          await deleteSelected();
        },
      },
      "Delete Party"
    )
  );
  return section;
}
function render() {
  const root = document.querySelector("#app") || document.body;
  root.innerHTML = "";
  const header = h("header", {}, h("h1", {}, "Party Planner Admin"));
  const msg = error
    ? h(
        "div",
        { style: { color: "#b00", marginBottom: "0.5rem" } },
        `Error: ${error}`
      )
    : loading
    ? h("div", { style: { opacity: 0.7, marginBottom: "0.5rem" } }, "Loading…")
    : null;
  const layout = h(
    "main",
    { style: { display: "grid", gap: "1rem" } },
    FormComponent(),
    h(
      "div",
      { style: { display: "flex", gap: "1rem", flexWrap: "wrap" } },
      ListComponent(),
      DetailsComponent()
    )
  );
  root.append(header);
  if (msg) root.append(msg);
  root.append(layout);
}
