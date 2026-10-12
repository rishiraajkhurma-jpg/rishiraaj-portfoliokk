(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const onView = (el, cb, opts = { threshold: 0.35 }) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
    }, opts);
    io.observe(el);
  };

  /* ---------- 3D card deck ---------- */
  const hero = document.querySelector('.hero');
  const deck = document.querySelector('.deck');
  const rig = document.querySelector('.deck__rig');
  if (deck && rig) {
    if (reduce) {
      deck.classList.add('is-dealt', 'is-settled');
    } else {
      // deal the cards once the name has opened up
      requestAnimationFrame(() => setTimeout(() => deck.classList.add('is-dealt'), 60));
      setTimeout(() => deck.classList.add('is-settled'), 2600);
    }

    // tilt the whole deck toward the pointer
    if (!reduce && fine) {
      let tx = 0, ty = 0, cx = 0, cy = 0, running = false, visible = true;
      const loop = () => {
        cx += (tx - cx) * 0.07;
        cy += (ty - cy) * 0.07;
        rig.style.setProperty('--ry', (cx * 16).toFixed(2) + 'deg');
        rig.style.setProperty('--rx', (-cy * 10 + 4).toFixed(2) + 'deg');
        rig.style.setProperty('--sheen', (cx * 60).toFixed(1) + 'deg');
        if (visible && (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001)) requestAnimationFrame(loop);
        else running = false;
      };
      const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
        kick();
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(hero);
      }
      rig.style.setProperty('--rx', '4deg');
    }
  }

  /* ---------- Shrink card figures until they fit their card ---------- */
  const fitCards = () => {
    document.querySelectorAll('.card__big').forEach((el) => {
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      let guard = 40;
      while (guard-- > 0 && (el.scrollWidth > el.clientWidth + 1) && size > 12) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
    });
  };
  fitCards();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCards);
  let fitTimer;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitCards, 150); });

  /* ---------- Card belt: cards drift left to right forever ---------- */
  if (deck && rig && !reduce) {
    // 12 unique cards cover the width, so the belt never shows a repeat on screen
    const cards = [...rig.querySelectorAll('.card')];
    const N = cards.length;
    const half = N / 2;
    const base = cards.map((c) => +c.style.getPropertyValue('--i'));
    const emph = cards.map(() => 0);
    const SPEED = 0.16; // cards per second
    let offset = 0, last = null, running = false, inView = true, hovered = null, holdUntil = 0;

    const wrap = (v) => ((v + half) % N + N) % N - half;
    const frame = (t) => {
      if (last === null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!hovered && t > holdUntil) offset += SPEED * dt;
      cards.forEach((c, k) => {
        const i = wrap(base[k] + offset);
        const a = Math.abs(i);
        // the card passing the centre rises; a hovered or tapped card takes over
        const target = hovered ? (c === hovered ? 1 : 0) : Math.max(0, 1 - a / 0.6);
        emph[k] += (target - emph[k]) * 0.12;
        const e = emph[k];
        c.style.setProperty('--i', i.toFixed(4));
        c.style.setProperty('--a', a.toFixed(4));
        c.style.setProperty('--lift', (e * 50).toFixed(1) + 'px');
        c.style.setProperty('--z', (e * 120).toFixed(1) + 'px');
        c.style.setProperty('--tilt', (1 - e).toFixed(3));
        c.style.setProperty('--scale', (1 + e * 0.06).toFixed(3));
        c.style.opacity = Math.max(0, Math.min(1, (half - a) / 1.5)).toFixed(3);
        c.classList.toggle('is-active', e > 0.55);
        c.classList.toggle('no-show', a > half - 0.4);
      });
      if (inView) requestAnimationFrame(frame); else { running = false; last = null; }
    };
    const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

    // hand over from the deal-in animation to the belt
    setTimeout(() => { deck.classList.add('is-belt'); start(); }, 2700);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        inView = es[0].isIntersecting;
        if (inView && deck.classList.contains('is-belt')) start();
      }).observe(deck);
    }

    cards.forEach((c) => {
      c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = c; });
      c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && hovered === c) hovered = null; });
      c.addEventListener('focus', () => { hovered = c; });
      c.addEventListener('blur', () => { if (hovered === c) hovered = null; });
      // touch: first tap brings a card forward, second tap opens it
      c.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: none)').matches && hovered !== c) {
          e.preventDefault();
          e.stopImmediatePropagation();
          hovered = c;
          clearTimeout(c._release);
          c._release = setTimeout(() => { if (hovered === c) hovered = null; holdUntil = performance.now() + 800; }, 5000);
        }
      }, true);
    });
  }

  /* ---------- Flight path (draws when Experience comes into view) ---------- */
  const flight = document.querySelector('.flight');
  if (flight) {
    const NOW = 0.8;
    // each label has its own offset (dx, dy from the point) so none touch the line or each other
    const stops = [
      { at: 0.06, when: 'Apr 2024', what: 'E-Cell IITB', dx: -32, dy: -45, anchor: 'start' },
      { at: 0.25, when: 'Jan 2025', what: 'IITB Rocket Team', dx: -12, dy: -68, anchor: 'end' },
      { at: 0.42, when: 'May 2025', what: 'NextStopIIT', dx: 12, dy: 26, anchor: 'start' },
      { at: 0.58, when: 'Jun 2026', what: "Tripole Gears, Founder's Office", dx: -14, dy: -32, anchor: 'end' },
      { at: 0.69, when: 'Jun 2026', what: 'IITB Sports Media Head', dx: -14, dy: -34, anchor: 'end' },
      { at: NOW,  when: 'Oct 2026', what: 'TestRelic AI, product strategy', dx: -14, dy: -33, anchor: 'end', now: true },
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const path = flight.querySelector('.flight__path');
    const ahead = flight.querySelector('.flight__ahead');
    const group = flight.querySelector('.flight__points');
    const L = path.getTotalLength();

    let d = '';
    for (let i = 0; i <= 40; i++) {
      const p = path.getPointAtLength(L * (NOW + (1 - NOW) * i / 40));
      d += (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }
    ahead.setAttribute('d', d);
    const drawn = L * NOW;
    path.style.strokeDasharray = `${drawn} ${L}`;
    path.style.strokeDashoffset = reduce ? 0 : drawn;

    const el = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    const gap = window.matchMedia('(max-width: 860px)').matches ? 21 : 18; // line spacing for the larger phone labels
    const pts = stops.map((s) => {
      const p = path.getPointAtLength(L * s.at);
      const g = el('g', { class: 'flight__pt' + (s.next ? ' flight__next' : '') });
      const tx = p.x + s.dx;
      const ty = p.y + s.dy;
      if (s.now) g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 6, class: 'flight__ring' }));
      if (!s.next) g.appendChild(el('circle', { cx: p.x, cy: p.y, r: s.now ? 7 : 6, class: 'flight__dot' + (s.now ? ' flight__dot--now' : '') }));
      const t1 = el('text', { x: tx, y: ty, 'text-anchor': s.anchor, class: 'flight__when' });
      t1.textContent = s.when;
      const t2 = el('text', { x: tx, y: ty + gap, 'text-anchor': s.anchor, class: 'flight__what' });
      t2.textContent = s.what;
      g.append(t1, t2);
      group.appendChild(g);
      return { g, s };
    });

    const draw = () => {
      flight.classList.add('is-building');
      if (reduce) {
        pts.forEach(({ g }) => g.classList.add('is-on'));
        flight.classList.add('is-drawn');
        return;
      }
      const DUR = 2400, DELAY = 900; // let the axes and grid build first
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      let t0 = null;
      const tick = (ts) => {
        if (t0 === null) t0 = ts;
        const t = Math.max(0, Math.min(1, (ts - t0 - DELAY) / DUR));
        const e = ease(t);
        path.style.strokeDashoffset = drawn * (1 - e);
        const reached = e * NOW;
        pts.forEach(({ g, s }) => { if (!s.next && reached >= s.at - 0.005) g.classList.add('is-on'); });
        if (t < 1) requestAnimationFrame(tick);
        else {
          flight.classList.add('is-drawn');
        }
      };
      requestAnimationFrame(tick);
    };
    onView(flight, draw, { threshold: 0.45 });
  }

  /* ---------- Scroll-linked bits ---------- */
  const barEl = document.querySelector('.bar');
  const bar = document.querySelector('.bar__progress span');
  const track = document.querySelector('.track__fill');
  const groups = document.querySelector('.work__groups');
  const giant = document.querySelector('.contact__giant');
  let ticking = false;
  const onScroll = () => {
    const doc = document.documentElement;
    const y = doc.scrollTop;
    const max = doc.scrollHeight - doc.clientHeight;
    barEl.classList.toggle('is-scrolled', y > 20);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (track && groups) {
      const r = groups.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      track.style.transform = `scaleY(${p})`;
    }
    if (giant && !reduce) {
      const r = giant.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - r.top / window.innerHeight));
      giant.style.setProperty('--gx', (-p * 12).toFixed(2) + '%');
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Current section in nav ---------- */
  const links = [...document.querySelectorAll('.bar__nav a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Figures count up once ---------- */
  const figs = document.querySelectorAll('.figures dd[data-count]');
  if (!reduce && figs.length) {
    onView(document.querySelector('.figures'), () => {
      figs.forEach((dd) => {
        const target = +dd.dataset.count, suf = dd.dataset.suffix || '';
        const t0 = performance.now(), D = 1300;
        const step = (now) => {
          const t = Math.min(1, (now - t0) / D);
          dd.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suf;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
  }

  /* ---------- Case tabs (wide screens) ---------- */
  const layout = document.querySelector('.cases__layout');
  let selectCase = () => {};
  if (layout) {
    const tabs = [...layout.querySelectorAll('.case-tab')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const wide = window.matchMedia('(min-width: 901px)');
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        panels[j].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
    };
    const apply = () => {
      layout.classList.toggle('is-tabs', wide.matches);
      panels.forEach((p) => (wide.matches ? p.setAttribute('role', 'tabpanel') : p.removeAttribute('role')));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0);
    apply();
    wide.addEventListener('change', apply);

    selectCase = (id) => {
      const i = tabs.findIndex((t) => t.id === 't-' + id);
      if (i < 0) return;
      if (wide.matches) select(i);
      else panels[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
  }

  // hero cards that point at a specific case open that case
  document.querySelectorAll('.card[data-case]').forEach((c) => {
    c.addEventListener('click', () => {
      const id = c.dataset.case;
      setTimeout(() => selectCase(id), window.matchMedia('(min-width: 901px)').matches ? 0 : 600);
    });
  });

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement;
  const themeBtn = document.querySelector('.theme');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const syncTheme = () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', dark);
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (metaTheme) metaTheme.setAttribute('content', dark ? '#0D1322' : '#E9EAE6');
  };
  if (themeBtn) {
    syncTheme();
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (!reduce) {
        root.classList.add('theme-anim');
        setTimeout(() => root.classList.remove('theme-anim'), 500);
      }
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncTheme();
    });
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll('.copy').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Press Ctrl+C';
        const r = document.createRange();
        r.selectNodeContents(document.querySelector('.contact__email'));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      btn.classList.add('is-done');
      setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 2000);
    });
  });
})();
