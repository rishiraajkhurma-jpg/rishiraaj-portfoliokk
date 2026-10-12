(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Flight path ---------- */
  const flight = document.querySelector('.flight');
  if (flight) {
    const NOW = 0.8; // how far along the curve "today" sits
    const stops = [
      { at: 0.06, when: 'Apr 2024', what: 'E-Cell IITB' },
      { at: 0.30, when: 'May 2025', what: 'NextStopIIT' },
      { at: 0.50, when: 'Mar 2026', what: 'McKinsey Forward' },
      { at: 0.64, when: 'Jun 2026', what: 'IITB Sports Media Head' },
      { at: NOW,  when: 'Oct 2026', what: 'TestRelic AI', now: true },
      { at: 1.0,  when: 'Next', what: 'Open to product and strategy roles', next: true },
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const path = flight.querySelector('.flight__path');
    const ahead = flight.querySelector('.flight__ahead');
    const group = flight.querySelector('.flight__points');
    const L = path.getTotalLength();

    // Dashed "ahead" segment: sample the curve from NOW to the end
    let d = '';
    for (let i = 0; i <= 40; i++) {
      const p = path.getPointAtLength(L * (NOW + (1 - NOW) * i / 40));
      d += (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }
    ahead.setAttribute('d', d);

    const drawn = L * NOW;
    path.style.strokeDasharray = `${drawn} ${L}`;

    const el = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };

    const pts = stops.map((s) => {
      const p = path.getPointAtLength(L * s.at);
      const g = el('g', { class: 'flight__pt' + (s.next ? ' flight__next' : '') });
      // Low on the curve: label below-right. High on the curve: above-left.
      // Both sit on the empty side of the line.
      const right = s.at < 0.55;
      const tx = right ? p.x + 12 : p.x - 18;
      const anchor = right ? 'start' : 'end';
      let ty = right ? p.y + 26 : p.y - 26;
      if (s.at < 0.15) ty = p.y - 34; // first stop sits on the axis, so go above

      if (s.now) g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 6, class: 'flight__ring' }));
      if (!s.next) {
        g.appendChild(el('circle', { cx: p.x, cy: p.y, r: s.now ? 7 : 6, class: 'flight__dot' + (s.now ? ' flight__dot--now' : '') }));
      }
      const t1 = el('text', { x: tx, y: ty, 'text-anchor': anchor, class: 'flight__when' });
      t1.textContent = s.when;
      const t2 = el('text', { x: tx, y: ty + 18, 'text-anchor': anchor, class: 'flight__what' });
      t2.textContent = s.what;
      g.append(t1, t2);
      group.appendChild(g);
      return { g, s };
    });

    if (reduce) {
      path.style.strokeDashoffset = 0;
      pts.forEach(({ g }) => g.classList.add('is-on'));
      flight.classList.add('is-drawn');
    } else {
      const DUR = 1900, START = 450;
      path.style.strokeDashoffset = drawn;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      let t0 = null;
      const tick = (ts) => {
        if (t0 === null) t0 = ts;
        const t = Math.min(1, Math.max(0, (ts - t0 - START) / DUR));
        const e = ease(t);
        path.style.strokeDashoffset = drawn * (1 - e);
        const reached = e * NOW;
        pts.forEach(({ g, s }) => { if (!s.next && reached >= s.at - 0.005) g.classList.add('is-on'); });
        if (t < 1) requestAnimationFrame(tick);
        else {
          flight.classList.add('is-drawn');
          setTimeout(() => pts[pts.length - 1].g.classList.add('is-on'), 450);
        }
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Scroll-linked bits ---------- */
  const bar = document.querySelector('.bar__progress span');
  const track = document.querySelector('.track__fill');
  const groups = document.querySelector('.work__groups');
  let ticking = false;

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    if (track && groups) {
      const r = groups.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      track.style.transform = `scaleY(${p})`;
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Current section in nav ---------- */
  const links = [...document.querySelectorAll('.bar__nav a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id));
        links.forEach((a) => { if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'true'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Figures count up once ---------- */
  const figs = document.querySelectorAll('.figures dd[data-count]');
  if (!reduce && 'IntersectionObserver' in window && figs.length) {
    const fo = new IntersectionObserver((entries, obs) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      figs.forEach((dd) => {
        const target = +dd.dataset.count, suf = dd.dataset.suffix || '';
        const t0 = performance.now(), D = 1200;
        const step = (now) => {
          const t = Math.min(1, (now - t0) / D);
          dd.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suf;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    fo.observe(document.querySelector('.figures'));
  }

  /* ---------- Case tabs (wide screens) ---------- */
  const layout = document.querySelector('.cases__layout');
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
      panels.forEach((p) => wide.matches ? p.setAttribute('role', 'tabpanel') : p.removeAttribute('role'));
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        let n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (k === 'Home') n = 0;
        if (k === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });

    select(0);
    apply();
    wide.addEventListener('change', apply);
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
