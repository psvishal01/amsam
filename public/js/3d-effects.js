/* =====================================================
   AMSAM Portal — 3D Effects Engine
   Pure vanilla JS, no dependencies
   ===================================================== */

// ── 3D CARD TILT ──────────────────────────────────────
function initTilt() {
  const cards = document.querySelectorAll('.nav-card, .tilt-card, .card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const mx = e.clientX - cx;
      const my = e.clientY - cy;
      const rx = (-my / (rect.height / 2)) * 6;
      const ry = ( mx / (rect.width  / 2)) * 6;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      card.style.boxShadow = `${-ry}px ${rx + 12}px 40px rgba(26,32,64,.18)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}

// ── FLOATING PARTICLES (login page) ──────────────────
function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const NUM = 55;
  const particles = Array.from({ length: NUM }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    o: Math.random() * 0.5 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,230,225,${p.o})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(180,230,225,${(1 - dist / 100) * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

// ── SCROLL REVEAL ─────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.card, .nav-card, .stat-item, .event-preview, .section-header');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = 'slideUp 0.45s cubic-bezier(.25,.8,.25,1) both';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => observer.observe(el));
}

// ── ANIMATED COUNTERS ─────────────────────────────────
function animateCounters() {
  const nums = document.querySelectorAll('.stat-num');
  nums.forEach(el => {
    const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
    if (isNaN(target) || target === 0) return;
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// ── HERO PARALLAX ─────────────────────────────────────
function initParallax() {
  const hero = document.querySelector('.home-hero, .page-hero');
  if (!hero) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    hero.style.backgroundPositionY = `${y * 0.3}px`;
  }, { passive: true });
}

// ── MAGNETIC BUTTON EFFECT ────────────────────────────
function initMagneticButtons() {
  document.querySelectorAll('.btn-primary, .login-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top  + rect.height / 2);
      btn.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px) translateY(-2px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ── NAV LOGO 3D SPIN ──────────────────────────────────
function initNavLogo() {
  const logo = document.querySelector('.nav-logo-circle');
  if (!logo) return;
  let deg = 0;
  logo.addEventListener('mouseenter', () => {
    deg += 360;
    logo.style.transform = `rotateY(${deg}deg)`;
    logo.style.transition = 'transform 0.6s cubic-bezier(.25,.8,.25,1)';
  });
}

// ── BOOT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTilt();
  initScrollReveal();
  initParallax();
  initMagneticButtons();
  initNavLogo();

  // Trigger stat counter only when visible
  const statsEl = document.getElementById('statsStrip');
  if (statsEl) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); }
    });
    obs.observe(statsEl);
  }
});
