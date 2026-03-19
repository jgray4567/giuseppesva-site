(function () {
  const url = window.SPEAKEASY_EVENTS_CSV_URL || "";
  const root = document.getElementById('speakeasy-events-root');
  const status = document.getElementById('speakeasy-events-status');

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(x => x.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
      return obj;
    });
  }

  function render(items) {
    if (!items.length) {
      status.textContent = 'No events listed at the moment.';
      return;
    }

    const active = items
      .filter(x => (x.active || 'yes').toLowerCase() !== 'no')
      .sort((a,b) => Number(a.sort || 999) - Number(b.sort || 999));

    root.innerHTML = '';
    active.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'event-item';
      const link = ev.link && ev.link.length ? ev.link : 'https://www.dopoora.com';
      card.innerHTML = `
        <h3>${ev.title || 'Untitled Event'}</h3>
        <p class="event-meta">${ev.date || ''}${ev.time ? ' • ' + ev.time : ''}</p>
        <p>${ev.description || ''}</p>
        <div class="cta-row" style="margin-top:.55rem">
          <a class="cta" href="${link}" target="_blank" rel="noopener">Learn More</a>
        </div>
      `;
      root.appendChild(card);
    });

    status.textContent = `Showing ${active.length} upcoming event${active.length === 1 ? '' : 's'}.`;
  }

  async function load() {
    if (!url) {
      status.textContent = 'Events feed URL not configured.';
      return;
    }
    try {
      status.textContent = 'Loading events…';
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = await r.text();
      render(parseCsv(txt));
    } catch (e) {
      status.textContent = 'Could not load events feed right now.';
    }
  }

  load();
})();
