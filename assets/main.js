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

  /* ---------- Each card takes a turn in the spotlight ---------- */
  if (deck && !reduce) {
    const cards = [...deck.querySelectorAll('.card')];
    const order = [3, 4, 2, 5, 1, 6, 0]; // centre outwards
    let k = 0, timer = null, paused = false, inView = true;
    const visibleCards = () => order.map((i) => cards[i]).filter((c) => c && c.offsetParent !== null && getComputedStyle(c).display !== 'none');
    const step = () => {
      if (paused || !inView || !deck.classList.contains('is-settled')) return;
      const list = visibleCards();
      cards.forEach((c) => c.classList.remove('is-active'));
      list[k % list.length].classList.add('is-active');
      k++;
    };
    const start = () => { if (!timer) timer = setInterval(step, 2200); };
    setTimeout(() => { step(); start(); }, 2800);
    deck.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') { paused = true; cards.forEach((c) => c.classList.remove('is-active')); }
    });
    deck.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') paused = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; }).observe(deck);

    // touch: first tap highlights a card, second tap follows its link
    cards.forEach((c) => c.addEventListener('click', (e) => {
      if (window.matchMedia('(hover: none)').matches && !c.classList.contains('is-active')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        paused = true;
        cards.forEach((x) => x.classList.remove('is-active'));
        c.classList.add('is-active');
        clearTimeout(c._resume);
        c._resume = setTimeout(() => { paused = false; }, 6000);
      }
    }, true));
  }

  /* ---------- Flight path (draws when Experience comes into view) ---------- */
  const flight = document.querySelector('.flight');
  if (flight) {
    const NOW = 0.8;
    const stops = [
      { at: 0.06, when: 'Apr 2024', what: 'E-Cell IITB' },
      { at: 0.25, when: 'Jan 2025', what: 'IITB Rocket Team' },
      { at: 0.42, when: 'May 2025', what: 'NextStopIIT' },
      { at: 0.58, when: 'Jun 2026', what: "Tripole Gears, Founder's Office" },
      { at: 0.69, when: 'Jun 2026', what: 'IITB Sports Media Head' },
      { at: NOW,  when: 'Oct 2026', what: 'TestRelic AI, product strategy', now: true },
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
    const pts = stops.map((s) => {
      const p = path.getPointAtLength(L * s.at);
      const g = el('g', { class: 'flight__pt' + (s.next ? ' flight__next' : '') });
      // low on the curve: label below-right; high: above-left. Both sit on the empty side.
      const right = s.at < 0.55;
      const tx = right ? p.x + 12 : p.x - 18;
      let ty = right ? p.y + 26 : p.y - 26;
      if (s.at < 0.3) ty = p.y - 46; // early stops sit near the axis, so label above
      if (s.now) g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 6, class: 'flight__ring' }));
      if (!s.next) g.appendChild(el('circle', { cx: p.x, cy: p.y, r: s.now ? 7 : 6, class: 'flight__dot' + (s.now ? ' flight__dot--now' : '') }));
      const t1 = el('text', { x: tx, y: ty, 'text-anchor': right ? 'start' : 'end', class: 'flight__when' });
      t1.textContent = s.when;
      const t2 = el('text', { x: tx, y: ty + 18, 'text-anchor': right ? 'start' : 'end', class: 'flight__what' });
      t2.textContent = s.what;
      g.append(t1, t2);
      group.appendChild(g);
      return { g, s };
    });

    const draw = () => {
      if (reduce) {
        pts.forEach(({ g }) => g.classList.add('is-on'));
        flight.classList.add('is-drawn');
        return;
      }
      const DUR = 1900;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      let t0 = null;
      const tick = (ts) => {
        if (t0 === null) t0 = ts;
        const t = Math.min(1, (ts - t0) / DUR);
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
