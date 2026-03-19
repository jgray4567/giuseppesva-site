// Sticky header scroll state
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    });

    // Hamburger toggle
    const ham = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    ham.addEventListener('click', () => mobileNav.classList.toggle('open'));
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('open'));
    });

    // Scroll reveal
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach(el => revealObserver.observe(el));

    // Active category nav highlight — tracks whichever section is nearest the top
    const sections = document.querySelectorAll('.menu-section[id]');
    const catLinks = document.querySelectorAll('#cat-nav a');
    const catSelect = document.getElementById('cat-nav-select');

    // Dropdown: navigate on change
    catSelect.addEventListener('change', () => {
      const target = document.querySelector(catSelect.value);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    function updateActiveSection() {
      const navOffset = 140; // header + cat-nav height
      let activeId = null;
      let closestDist = Infinity;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const dist = Math.abs(rect.top - navOffset);
        // Only consider sections that have entered the viewport from the top
        if (rect.top <= navOffset + 10 && dist < closestDist) {
          closestDist = dist;
          activeId = section.id;
        }
      });

      // Fallback: if nothing has passed the offset yet, use the first section
      if (!activeId && sections.length) activeId = sections[0].id;

      catLinks.forEach(a => a.classList.remove('active'));
      const activeLink = document.querySelector(`#cat-nav a[href="#${activeId}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      const matchingOption = catSelect.querySelector(`option[value="#${activeId}"]`);
      if (matchingOption) catSelect.value = matchingOption.value;
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
