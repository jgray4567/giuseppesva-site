const header = document.getElementById('site-header');
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });
    hamburger?.addEventListener('click', () => mobileNav.classList.toggle('open'));
    mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

    /* Food slider arrows */
    (function () {
      var slider = document.getElementById('foodSlider');
      var leftBtn = document.querySelector('.slider-arrow-left');
      var rightBtn = document.querySelector('.slider-arrow-right');
      if (slider && leftBtn && rightBtn) {
        var scrollAmt = 320;
        leftBtn.addEventListener('click', function () { slider.scrollBy({ left: -scrollAmt, behavior: 'smooth' }); });
        rightBtn.addEventListener('click', function () { slider.scrollBy({ left: scrollAmt, behavior: 'smooth' }); });
      }
    })();

    /* Food gallery lightbox */
    (function () {
      var foodPhotos = [
        { src: 'assets/images/food-01.jpg', alt: 'Arancini' },
        { src: 'assets/images/food-02.jpg', alt: 'Buffalo Wings' },
        { src: 'assets/images/food-03.jpg', alt: 'Cannoli' },
        { src: 'assets/images/food-04.jpg', alt: 'Cheese Pizza' },
        { src: 'assets/images/food-05.jpg', alt: 'Fettuccine Adriatico' },
        { src: 'assets/images/food-06.jpg', alt: 'Fresh Cut Fries' },
        { src: 'assets/images/food-07.jpg', alt: 'Hero Sandwich' },
        { src: 'assets/images/food-08.jpg', alt: 'Caesar Salad' },
        { src: 'assets/images/food-09.jpg', alt: 'Garden Salad' },
        { src: 'assets/images/food-10.jpg', alt: 'Spaghetti with Meatballs' },
        { src: 'assets/images/food-11.jpg', alt: 'Zep Hoagie Italian' }
      ];
      var overlay = document.getElementById('foodLightbox');
      var img = document.getElementById('foodLightboxImg');
      var counter = document.getElementById('foodLightboxCounter');
      var idx = 0;

      function show(i) {
        idx = (i + foodPhotos.length) % foodPhotos.length;
        img.src = foodPhotos[idx].src;
        img.alt = foodPhotos[idx].alt;
        counter.textContent = (idx + 1) + ' / ' + foodPhotos.length;
      }

      document.querySelectorAll('.food-thumb').forEach(function (thumb) {
        thumb.addEventListener('click', function (e) {
          e.preventDefault();
          show(parseInt(this.getAttribute('data-index'), 10));
          overlay.classList.add('active');
        });
      });

      overlay.querySelector('.food-lightbox-close').addEventListener('click', function () {
        overlay.classList.remove('active');
      });
      overlay.querySelector('.food-lightbox-prev').addEventListener('click', function (e) {
        e.stopPropagation();
        show(idx - 1);
      });
      overlay.querySelector('.food-lightbox-next').addEventListener('click', function (e) {
        e.stopPropagation();
        show(idx + 1);
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('active');
      });
      document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('active')) return;
        if (e.key === 'Escape') overlay.classList.remove('active');
        if (e.key === 'ArrowLeft') show(idx - 1);
        if (e.key === 'ArrowRight') show(idx + 1);
      });
    })();
