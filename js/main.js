/* ===== IndianElucidBiology - Main JS ===== */

// ---- Page Loader (circular spinner ring around logo) ----
(function () {
  // Resolve logo path relative to main.js location (js/main.js is always one level below site root)
  const scriptEl = document.currentScript ||
    Array.from(document.querySelectorAll('script[src]')).find(s => s.src.includes('main.js'));
  const scriptBase = scriptEl
    ? scriptEl.src.replace(/\/js\/main\.js.*$/, '')
    : window.location.origin;
  const logoSrc = scriptBase + '/indian_elucid_biology.png';

  const loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.innerHTML = `
    <div class="loader-ring-wrap">
      <svg class="loader-ring-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d6efd"/>
            <stop offset="100%" stop-color="#20c997"/>
          </linearGradient>
        </defs>
        <circle class="loader-ring-track" cx="60" cy="60" r="54"/>
        <circle class="loader-ring-arc"   cx="60" cy="60" r="54"/>
      </svg>
      <img src="${logoSrc}" alt="IndianElucidBiology" class="loader-logo-img">
    </div>
    <div class="loader-site-name">
      <span class="li">Indian</span><span class="le">Elucid</span><span class="lb">Biology</span>
    </div>
    <div class="loader-sub">Loading&hellip;</div>
  `;
  document.body.insertBefore(loader, document.body.firstChild);

  function hideLoader() {
    loader.classList.add('loader-hidden');
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 520);
  }

  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 350);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 350));
    setTimeout(hideLoader, 5000);
  }
})();

// ---- Visitor Counter ----
// Strategy:
//   1. localStorage per-page view counter  — shows a real number INSTANTLY on every device/page.
//      Counts are stored in the visitor's own browser (localStorage key = page pathname).
//      This is perfect for GitHub Pages (no server needed).
//   2. GoatCounter analytics (optional, see README) — real cross-device global stats.
//      Sign up free at https://www.goatcounter.com, get your script tag, and replace
//      the placeholder script src below with your own endpoint.
function initVisitorCounter() {
  const path = window.location.pathname;
  const isHomepage      = !path.includes('/tutorials/');
  const isTutorialsIdx  = path.endsWith('/tutorials/index.html') || path.endsWith('/tutorials/');
  const isTutorial      = path.includes('/tutorials/') && path.endsWith('.html') && !isTutorialsIdx;

  // --- localStorage counter ---
  // Key: 'ieb_views_' + sanitised pathname
  const storageKey = 'ieb_views_' + path.replace(/[^a-z0-9]/gi, '_');
  let views = parseInt(localStorage.getItem(storageKey) || '0', 10);
  // Only count once per session per page (use sessionStorage flag)
  const sessionKey = 'ieb_counted_' + storageKey;
  if (!sessionStorage.getItem(sessionKey)) {
    views += 1;
    localStorage.setItem(storageKey, views);
    sessionStorage.setItem(sessionKey, '1');
  }
  const viewsFormatted = views >= 1000
    ? (views / 1000).toFixed(1) + 'k'
    : views.toString();

  // --- GoatCounter analytics ping ---
  // Replace 'YOURCODE' with your GoatCounter site code after signing up at goatcounter.com
  // This fires silently in the background and gives you a real analytics dashboard.
  (function injectGoatCounter() {
    const gc = document.createElement('script');
    gc.async = true;
    gc.setAttribute('data-goatcounter', 'https://YOURCODE.goatcounter.com/count');
    gc.src = '//gc.zgo.at/count.js';
    document.head.appendChild(gc);
  })();

  // --- Render counter badge ---
  function makeHomepageBadge() {
    // Replace the last stat item (♥ Open Source) with a views counter
    const statsRow = document.querySelector('.stats-row');
    if (!statsRow) return;
    // Add views item before the last stat
    const lastStat = statsRow.querySelector('.stat-item:last-child');
    if (!lastStat) return;
    const el = document.createElement('div');
    el.className = 'stat-item';
    el.innerHTML = `
      <div class="stat-number visitor-count-num" id="homepage-views">${viewsFormatted}</div>
      <div class="stat-label">Page Visits</div>
    `;
    statsRow.insertBefore(el, lastStat);
  }

  function makeTutorialBadge() {
    // Inject compact badge into tutorial hero
    const hero = document.querySelector('.tutorial-hero');
    if (!hero) return;
    // Try to find an existing meta/tag row to append to
    const tagRow = hero.querySelector('.d-flex.gap-2, .d-flex.flex-wrap, .tut-tags, .tutorial-meta');
    const badge = document.createElement('span');
    badge.className = 'tutorial-visitor-badge';
    badge.innerHTML = `<i class="bi bi-eye-fill me-1"></i>${viewsFormatted} visits`;
    if (tagRow) {
      tagRow.appendChild(badge);
    } else {
      // Fall back: append a row at bottom of hero container
      const heroContainer = hero.querySelector('.container') || hero;
      const row = document.createElement('div');
      row.className = 'mt-3';
      row.appendChild(badge);
      heroContainer.appendChild(row);
    }
  }

  function makeTutorialsIndexBadge() {
    const heroHeading = document.querySelector('.category-hero h1, .category-hero .display-5, .category-hero .display-6');
    if (!heroHeading) return;
    const badge = document.createElement('div');
    badge.className = 'mt-2 d-flex align-items-center gap-2';
    badge.innerHTML = `
      <span class="tutorial-visitor-badge"><i class="bi bi-eye-fill me-1"></i>${viewsFormatted} page visits</span>
    `;
    heroHeading.insertAdjacentElement('afterend', badge);
  }

  if (isHomepage)     makeHomepageBadge();
  if (isTutorial)     makeTutorialBadge();
  if (isTutorialsIdx) makeTutorialsIndexBadge();
}

// Dark Mode Toggle
function initTheme() {
  const saved = localStorage.getItem('ieb-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', next);
  localStorage.setItem('ieb-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.innerHTML = theme === 'dark' ? '&#9728;' : '&#9790;';
  });
}

// Copy Code Button
function initCopyButtons() {
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function () {
      const wrapper = this.closest('.code-block-wrapper');
      const code = wrapper.querySelector('pre').innerText;
      navigator.clipboard.writeText(code).then(() => {
        this.classList.add('copied');
        this.textContent = 'Copied!';
        setTimeout(() => {
          this.classList.remove('copied');
          this.textContent = 'Copy';
        }, 2000);
      });
    });
  });
}

// Reading Progress Bar
function initProgressBar() {
  const bar = document.querySelector('.progress-tracker');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const winH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = (window.scrollY / winH) * 100;
    bar.style.width = Math.min(pct, 100) + '%';
  });
}

// Scroll-reveal animations (supports all animation classes)
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-up, .fade-left, .fade-right, .scale-in').forEach(el => observer.observe(el));
}

// Navbar scroll effect
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// Back to top button
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
  btn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Typing animation for hero text
function initTypingAnimation() {
  const el = document.querySelector('.typing-text');
  if (!el) return;
  const words = (el.dataset.words || '').split(',');
  if (!words.length) return;
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const current = words[wordIndex];
    if (isDeleting) {
      el.textContent = current.substring(0, charIndex--);
    } else {
      el.textContent = current.substring(0, charIndex++);
    }

    let delay = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex > current.length) {
      delay = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex < 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 400;
    }
    setTimeout(type, delay);
  }
  type();
}

// Card tilt effect on mousemove
function initCardTilt() {
  document.querySelectorAll('.tutorial-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      card.style.transform = `translateY(-10px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// Active TOC tracking
function initTocTracking() {
  const tocLinks = document.querySelectorAll('.toc-sidebar .nav-link');
  if (!tocLinks.length) return;

  const sections = [];
  tocLinks.forEach(link => {
    const id = link.getAttribute('href')?.replace('#', '');
    if (id) {
      const el = document.getElementById(id);
      if (el) sections.push({ el, link });
    }
  });

  window.addEventListener('scroll', () => {
    let current = sections[0];
    sections.forEach(s => {
      if (s.el.getBoundingClientRect().top <= 120) current = s;
    });
    tocLinks.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');
  });
}

// Animated counter for stats
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.target);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
  let current = 0;
  const increment = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current.toLocaleString() + (el.dataset.suffix || '');
  }, 30);
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Search filter for tutorial cards
function initSearch() {
  const input = document.getElementById('tutorial-search');
  if (!input) return;
  input.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.tutorial-card-col').forEach(col => {
      const text = col.textContent.toLowerCase();
      col.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// Download script as file
function downloadScript(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize download buttons — each has data-filename and targets a <pre> inside data-script-id
function initDownloadButtons() {
  document.querySelectorAll('.btn-download-script').forEach(btn => {
    btn.addEventListener('click', function () {
      const scriptId = this.dataset.scriptId;
      const filename = this.dataset.filename || 'script.txt';
      const pre = document.getElementById(scriptId);
      if (pre) {
        downloadScript(filename, pre.innerText);
        this.innerHTML = '<i class="bi bi-check-circle me-1"></i> Downloaded!';
        setTimeout(() => {
          this.innerHTML = '<i class="bi bi-download me-1"></i> ' + filename;
        }, 2000);
      }
    });
  });
}

// Copy AI prompt to clipboard
function initAIPromptCopy() {
  document.querySelectorAll('.btn-copy-prompt').forEach(btn => {
    btn.addEventListener('click', function () {
      const box = this.closest('.ai-prompt-box');
      const text = box.querySelector('.ai-prompt-text').innerText;
      navigator.clipboard.writeText(text).then(() => {
        this.classList.add('copied');
        this.innerHTML = '<i class="bi bi-check-circle me-1"></i> Copied!';
        setTimeout(() => {
          this.classList.remove('copied');
          this.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy Prompt';
        }, 2000);
      });
    });
  });
}

// Collapsible sections
function initCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', function () {
      const body = this.nextElementSibling;
      const icon = this.querySelector('.collapse-icon');
      body.classList.toggle('show');
      if (icon) icon.classList.toggle('bi-chevron-down');
      if (icon) icon.classList.toggle('bi-chevron-up');
    });
  });
}

// Initialize everything on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCopyButtons();
  initProgressBar();
  initScrollReveal();
  initNavbarScroll();
  initBackToTop();
  initTypingAnimation();
  initCardTilt();
  initTocTracking();
  initCounters();
  initSmoothScroll();
  initSearch();
  initDownloadButtons();
  initAIPromptCopy();
  initCollapsibles();
  initVisitorCounter();
});
