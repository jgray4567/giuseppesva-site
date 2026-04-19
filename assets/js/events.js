const header = document.getElementById('site-header');
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });
    hamburger?.addEventListener('click', () => mobileNav.classList.toggle('open'));
    mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

// Dynamic Events Fetcher
document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-fallback');
  if (!eventsContainer) return;

  fetch('events.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(events => {
      if (!events || events.length === 0) return; // Keep fallback if empty
      
      // Clear fallback
      eventsContainer.innerHTML = '';
      
      events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        
        item.innerHTML = `
          <span class="event-date">${event.date}</span>
          <h3>${event.title}</h3>
          <p>${event.description}</p>
          <a class="event-link" href="${event.url}" target="_blank" rel="noopener">View on Facebook &rarr;</a>
        `;
        
        eventsContainer.appendChild(item);
      });
    })
    .catch(error => {
      console.error('Error loading events:', error);
      // Fallback remains visible
    });
});
