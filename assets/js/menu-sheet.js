(function () {
  const SHEET_CSV_URL = window.MENU_SHEET_CSV_URL || ""; // set in page
  const root = document.getElementById("sheet-menu-root");
  const status = document.getElementById("sheet-status");

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = "";
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell.trim());
        if (row.some(v => v !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell.trim());
      if (row.some(v => v !== "")) rows.push(row);
    }

    return rows;
  }

  function csvToRows(text) {
    const matrix = parseCSV(text.trim());
    if (!matrix.length) return [];
    const headers = matrix[0].map(h => h.trim().toLowerCase());
    return matrix.slice(1).map(cols => {
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
        li.innerHTML = `<div><div class="item-name">${item.name || ""}</div>${item.description ? `<div class="muted">${item.description}</div>` : ""}</div><div class="price">${item.price || ""}</div>`;
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
