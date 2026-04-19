// Dynamic Events Fetcher with Pagination & Date Filtering
document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-fallback');
  if (!eventsContainer) return;

  fetch('events.json?v=' + Date.now())
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(events => {
      if (!events || events.length === 0) return;
      
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Keep today's events even if past the exact hour

      // Parse and filter past events
      const validEvents = events.map(event => {
        // Clean up string like "Fri, Apr 24 at 9 PM" -> "Fri, Apr 24 9 PM"
        let cleanDate = event.date
          .replace(' at ', ' ')
          .replace(/[\u202F\u00A0]/g, ' ') // Fix narrow non-breaking spaces
          .replace(/am/i, ' AM')
          .replace(/pm/i, ' PM');
          
        let d = new Date(cleanDate);
        if (isNaN(d.getTime())) {
          // Fallback: strip day of week
          d = new Date(cleanDate.replace(/^[a-zA-Z]+,\s*/, ''));
        }
        return { ...event, parsedDate: d };
      }).filter(e => {
        // If we absolutely cannot parse it, keep it just in case
        if (isNaN(e.parsedDate.getTime())) return true;
        // Keep only future/present events
        return e.parsedDate >= now;
      }).sort((a, b) => {
        if (isNaN(a.parsedDate) || isNaN(b.parsedDate)) return 0;
        return a.parsedDate - b.parsedDate;
      });

      if (validEvents.length === 0) {
        eventsContainer.innerHTML = '<p>No upcoming events currently scheduled. Check back soon!</p>';
        return;
      }

      // Group by Month-Year
      const grouped = {};
      validEvents.forEach(e => {
        let monthKey = "Upcoming";
        if (!isNaN(e.parsedDate.getTime())) {
          monthKey = e.parsedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(e);
      });

      const months = Object.keys(grouped);

      // Render UI
      eventsContainer.innerHTML = '';
      
      const tabsDiv = document.createElement('div');
      tabsDiv.className = 'event-months-tabs';
      eventsContainer.appendChild(tabsDiv);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'event-months-content';
      eventsContainer.appendChild(contentDiv);

      function renderMonth(month) {
        // Update tabs active state
        Array.from(tabsDiv.children).forEach(btn => {
          if (btn.dataset.month === month) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        
        // Render events for this month
        contentDiv.innerHTML = '';
        grouped[month].forEach(event => {
          const item = document.createElement('div');
          item.className = 'event-item';
          item.innerHTML = \`
            <span class="event-date">\${event.date}</span>
            <h3>\${event.title}</h3>
            <p>\${event.description}</p>
            <a class="event-link" href="\${event.url}" target="_blank" rel="noopener">View on Facebook &rarr;</a>
          \`;
          contentDiv.appendChild(item);
        });
      }

      // Create tabs
      months.forEach(month => {
        const btn = document.createElement('button');
        btn.className = 'month-tab-btn';
        btn.dataset.month = month;
        btn.innerText = month;
        btn.addEventListener('click', () => renderMonth(month));
        tabsDiv.appendChild(btn);
      });

      // Inject some base styles for tabs
      const style = document.createElement('style');
      style.textContent = \`
        .event-months-tabs { display: flex; gap: 10px; margin-bottom: 30px; flex-wrap: wrap; }
        .month-tab-btn { 
          background: transparent; 
          border: 1px solid var(--gold-light, #c8a250); 
          color: var(--ivory, #fff); 
          padding: 8px 16px; 
          cursor: pointer; 
          font-family: inherit; 
          font-size: 1rem;
          border-radius: 4px; 
          transition: 0.2s; 
        }
        .month-tab-btn:hover { background: rgba(200,162,80,0.2); }
        .month-tab-btn.active { 
          background: var(--gold-light, #c8a250); 
          color: #111; 
          font-weight: 600;
        }
      \`;
      document.head.appendChild(style);

      // Select first month by default
      if (months.length > 0) {
        renderMonth(months[0]);
      }
    })
    .catch(error => {
      console.error('Error loading events:', error);
    });
});

const header = document.getElementById('site-header');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});
hamburger?.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));
