(function () {
  const SHEET_CSV_URL = window.MENU_SHEET_CSV_URL || ""; // set in page
  const root = document.getElementById("sheet-menu-root");
  const status = document.getElementById("sheet-status");

  function csvToRows(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(",").map(h => h.trim());
    return lines.map(line => {
      const cols = line.split(",");
      const o = {};
      headers.forEach((h, i) => (o[h] = (cols[i] || "").trim()));
      return o;
    });
  }

  function groupByCategory(rows) {
    const map = new Map();
    rows.forEach(r => {
      const cat = r.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    });
    return map;
  }

  function render(rows) {
    if (!rows.length) {
      status.textContent = "No menu rows found.";
      return;
    }
    const grouped = groupByCategory(rows.filter(r => (r.active || "yes").toLowerCase() !== "no"));
    root.innerHTML = "";

    grouped.forEach((items, category) => {
      const section = document.createElement("section");
      section.className = "menu-section";

      const h = document.createElement("h2");
      h.textContent = category;
      section.appendChild(h);

      const ul = document.createElement("ul");
      ul.className = "menu-list";

      items.forEach(item => {
        const li = document.createElement("li");
        li.className = "menu-item-row";
        li.innerHTML = `<div><strong>${item.name || ""}</strong>${item.description ? `<div class="muted">${item.description}</div>` : ""}</div><div class="price">${item.price || ""}</div>`;
        ul.appendChild(li);
      });

      section.appendChild(ul);
      root.appendChild(section);
    });

    status.textContent = `Loaded ${rows.length} items from Google Sheets.`;
  }

  async function load() {
    if (!SHEET_CSV_URL) {
      status.textContent = "Sheet URL not configured yet.";
      return;
    }
    status.textContent = "Loading menu from sheet...";
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = csvToRows(text);
      render(rows);
    } catch (e) {
      status.textContent = `Could not load sheet: ${e.message}`;
    }
  }

  load();
})();
