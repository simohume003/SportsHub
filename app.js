const state = {
  fixtures: [],
  currentFilter: "All",
  search: "",
  month: "all"
};

const hero = document.getElementById("hero");
const heroEyebrow = document.getElementById("heroEyebrow");
const heroLogo = document.getElementById("heroLogo");
const heroTitle = document.getElementById("heroTitle");
const heroMeta = document.getElementById("heroMeta");
const heroLink = document.getElementById("heroLink");
const countdown = document.getElementById("countdown");
const nextDetail = document.getElementById("nextDetail");
const fixtureList = document.getElementById("fixtureList");
const calendarTitle = document.getElementById("calendarTitle");
const summaryStrip = document.getElementById("summaryStrip");
const searchInput = document.getElementById("searchInput");
const monthFilter = document.getElementById("monthFilter");
const nav = document.getElementById("nav");

const today = new Date();
today.setHours(0, 0, 0, 0);

async function init() {
  try {
    const response = await fetch("fixtures.csv");
    const text = await response.text();

    state.fixtures = parseCSV(text)
      .map(normaliseFixture)
      .filter(item => item.startDate instanceof Date && !isNaN(item.startDate))
      .sort((a, b) => a.startDate - b.startDate);

    populateMonthFilter();
    render();
  } catch (error) {
    heroTitle.textContent = "Could not load fixtures.csv";
    nextDetail.textContent = "Check that fixtures.csv is in the same folder as index.html.";
    console.error(error);
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      value = "";
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift().map(header => header.trim());

  return rows.map(rowValues => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (rowValues[index] || "").trim();
    });
    return item;
  });
}

function normaliseFixture(item) {
  const startTime = item.start_time && item.start_time !== "TBC" ? item.start_time : "12:00";
  const dateTimeString = `${item.start_date}T${startTime}`;

  return {
    ...item,
    startDate: new Date(dateTimeString),
    safeStartTime: item.start_time || "TBC",
    searchText: Object.values(item).join(" ").toLowerCase()
  };
}

function getUpcomingFixtures(filter = state.currentFilter) {
  return state.fixtures
    .filter(item => item.startDate >= today)
    .filter(item => matchesFilter(item, filter));
}

function matchesFilter(item, filter) {
  if (filter === "All" || filter === "All Fixtures") return true;
  return item.hub === filter || item.team === filter || item.sport === filter;
}

function getVisibleFixtures() {
  return getUpcomingFixtures()
    .filter(item => item.searchText.includes(state.search.toLowerCase()))
    .filter(item => {
      if (state.month === "all") return true;
      return getMonthKey(item.startDate) === state.month;
    });
}

function render() {
  const upcomingForHero = getUpcomingFixtures(state.currentFilter);
  const nextEvent = upcomingForHero[0] || getUpcomingFixtures("All")[0];

  renderHero(nextEvent);
  renderSummary();
  renderCalendar(getVisibleFixtures());
}

function renderHero(event) {
  if (!event) {
    heroTitle.textContent = "No upcoming fixtures found";
    heroMeta.innerHTML = "";
    countdown.textContent = "No date";
    nextDetail.textContent = "Add more rows to fixtures.csv.";
    return;
  }

  heroEyebrow.textContent = state.currentFilter === "All" || state.currentFilter === "All Fixtures"
    ? "Next Up"
    : `Next Up · ${state.currentFilter}`;

  hero.style.setProperty(
    "--hero-image",
    `linear-gradient(90deg, rgba(0,0,0,0.76), rgba(0,0,0,0.28), rgba(0,0,0,0.74)), url("assets/${event.image}")`
  );

  heroLogo.src = `assets/${event.logo}`;
  heroLogo.alt = `${event.hub} logo`;
  heroLogo.onerror = () => {
    heroLogo.style.display = "none";
  };
  heroLogo.onload = () => {
    heroLogo.style.display = "block";
  };

  heroTitle.textContent = event.event;
  heroLink.href = event.link || event.source_url || "#";

  const dateLabel = formatLongDate(event.startDate);
  const endLabel = event.end_date ? ` to ${formatShortDate(new Date(event.end_date + "T12:00"))}` : "";
  const timeLabel = event.safeStartTime || "TBC";

  heroMeta.innerHTML = `
    <span class="meta-pill">🏷️ ${event.competition || event.hub}</span>
    <span class="meta-pill">📅 ${dateLabel}${endLabel}</span>
    <span class="meta-pill">⏰ ${timeLabel}</span>
    <span class="meta-pill">📍 ${cleanLocation(event)}</span>
    <span class="meta-pill">📺 ${event.watch || "TBC"}</span>
  `;

  const days = daysUntil(event.startDate);
  countdown.textContent = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
  nextDetail.textContent = `${event.hub} · ${event.round_or_type || event.sport}`;
}

function renderSummary() {
  const hubs = ["West Ham", "Leinster", "Darts", "Formula 1"];

  summaryStrip.innerHTML = hubs.map(hub => {
    const next = getUpcomingFixtures(hub)[0];
    if (!next) {
      return `
        <button class="summary-card" data-filter="${hub}">
          <span>${hub}</span>
          <strong>No upcoming rows</strong>
          <small>Add more to the CSV</small>
        </button>
      `;
    }

    return `
      <button class="summary-card" data-filter="${hub}">
        <span>${hub}</span>
        <strong>${next.event}</strong>
        <small>${formatShortDate(next.startDate)} · ${next.safeStartTime}</small>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".summary-card").forEach(card => {
    card.addEventListener("click", () => setFilter(card.dataset.filter));
  });
}

function renderCalendar(fixtures) {
  calendarTitle.textContent = state.currentFilter === "All" || state.currentFilter === "All Fixtures"
    ? "All Upcoming Fixtures"
    : `${state.currentFilter} Calendar`;

  if (!fixtures.length) {
    fixtureList.innerHTML = `<div class="empty">No fixtures match this view.</div>`;
    return;
  }

  const grouped = groupByMonth(fixtures);

  fixtureList.innerHTML = Object.entries(grouped).map(([month, items]) => `
    <div class="month-group">
      <h3 class="month-title">${month}</h3>
      ${items.map(renderFixtureRow).join("")}
    </div>
  `).join("");
}

function renderFixtureRow(item) {
  return `
    <article class="fixture-row">
      <div class="date-box">
        <div>
          <span>${item.startDate.toLocaleDateString("en-IE", { month: "short" })}</span>
          <strong>${item.startDate.toLocaleDateString("en-IE", { day: "numeric" })}</strong>
        </div>
      </div>

      <div class="fixture-main">
        <h3>${item.event}</h3>
        <p>${item.competition || item.round_or_type}</p>
        <p>${formatLongDate(item.startDate)} · ${item.safeStartTime} · ${cleanLocation(item)}</p>
        <div class="fixture-tags">
          <span>${item.hub}</span>
          <span>${item.round_or_type || item.sport}</span>
          <span>${item.data_status || "confirmed"}</span>
        </div>
      </div>

      <img class="fixture-logo" src="assets/${item.logo}" alt="${item.hub} logo" onerror="this.style.display='none'" />
    </article>
  `;
}

function populateMonthFilter() {
  const months = [...new Set(
    state.fixtures
      .filter(item => item.startDate >= today)
      .map(item => getMonthKey(item.startDate))
  )];

  monthFilter.innerHTML = `<option value="all">All months</option>` + months.map(month => {
    const [year, monthIndex] = month.split("-");
    const label = new Date(Number(year), Number(monthIndex) - 1, 1)
      .toLocaleDateString("en-IE", { month: "long", year: "numeric" });

    return `<option value="${month}">${label}</option>`;
  }).join("");
}

function groupByMonth(fixtures) {
  return fixtures.reduce((groups, item) => {
    const key = item.startDate.toLocaleDateString("en-IE", { month: "long", year: "numeric" });
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function cleanLocation(item) {
  const parts = [item.venue, item.city, item.country]
    .filter(part => part && part !== "TBC");
  return parts.length ? parts.join(", ") : "TBC";
}

function daysUntil(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target - today) / 86400000));
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function setFilter(filter) {
  state.currentFilter = filter;
  state.search = "";
  state.month = "all";
  searchInput.value = "";
  monthFilter.value = "all";

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  nav.classList.remove("open");
  render();
  document.getElementById("calendar").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    setFilter(button.dataset.filter);
  });
});

searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  render();
});

monthFilter.addEventListener("change", event => {
  state.month = event.target.value;
  render();
});

document.getElementById("jumpToCalendar").addEventListener("click", () => {
  document.getElementById("calendar").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("menuToggle").addEventListener("click", () => {
  nav.classList.toggle("open");
});

init();
