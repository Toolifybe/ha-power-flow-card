/**
 * Power Flow Card - v2.1
 *
 * type: custom:power-flow-card
 * solar_entity: sensor.solar_power
 * grid_entity: sensor.grid_power
 * battery_entity: sensor.battery_power
 * battery_soc_entity: sensor.battery_soc
 * home_entity: sensor.home_power
 * title: Energiestroom
 * entities:
 *   - entity: sensor.pc_power
 *     name: PC
 *     icon: mdi:desktop-classic
 *     color: '#22c55e'
 */

const MDI_PATHS = {
  'mdi:solar-panel':        'M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,4V20H20V4H4M6,6H10V10H6V6M12,6H16V10H12V6M6,12H10V16H6V12M12,12H16V16H12V12Z',
  'mdi:transmission-tower': 'M11,3H13V5.07C15.26,5.38 17.28,6.54 18.71,8.27L20.35,7.06L21.57,8.65L19.93,9.85C20.61,11.04 21,12.48 21,14C21,16.21 20.12,18.21 18.66,19.66L20,21H4L5.34,19.66C3.88,18.21 3,16.21 3,14C3,12.48 3.39,11.04 4.07,9.85L2.43,8.65L3.65,7.06L5.29,8.27C6.72,6.54 8.74,5.38 11,5.07V3M12,7A7,7 0 0,0 5,14A7,7 0 0,0 12,21A7,7 0 0,0 19,14A7,7 0 0,0 12,7Z',
  'mdi:battery-high':       'M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z',
  'mdi:home':               'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
  'mdi:desktop-classic':    'M2,3H22A1,1 0 0,1 23,4V16A1,1 0 0,1 22,17H13V19H15V21H9V19H11V17H2A1,1 0 0,1 1,16V4A1,1 0 0,1 2,3M2,4V14H22V4H2Z',
  'mdi:television':         'M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z',
  'mdi:power-socket-eu':    'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M9,8A2,2 0 0,0 7,10A2,2 0 0,0 9,12A2,2 0 0,0 11,10A2,2 0 0,0 9,8M15,8A2,2 0 0,0 13,10A2,2 0 0,0 15,12A2,2 0 0,0 17,10A2,2 0 0,0 15,8M12,13C10.5,13 9.19,13.63 8.27,14.63L9.68,16.04C10.24,15.4 11.07,15 12,15C12.93,15 13.76,15.4 14.32,16.04L15.73,14.63C14.81,13.63 13.5,13 12,13Z',
  'mdi:lightning-bolt':     'M11,21H5L13,3H19L15.5,10H21L11,21M13.5,12H9.4L6.7,19H10.8L13.5,12M16.6,5H12.5L10.4,10H14.5L16.6,5Z',
  'mdi:car-electric':       'M16,6L19,10H21A1,1 0 0,1 22,11V15H20A3,3 0 0,1 17,18A3,3 0 0,1 14,15H10A3,3 0 0,1 7,18A3,3 0 0,1 4,15H2V11A1,1 0 0,1 3,10H6L9,6H16M7,11.5A1.5,1.5 0 0,0 5.5,13A1.5,1.5 0 0,0 7,14.5A1.5,1.5 0 0,0 8.5,13A1.5,1.5 0 0,0 7,11.5M17,11.5A1.5,1.5 0 0,0 15.5,13A1.5,1.5 0 0,0 17,14.5A1.5,1.5 0 0,0 18.5,13A1.5,1.5 0 0,0 17,11.5M15.5,7.5H9.5L8,10H18L15.5,7.5Z',
  'mdi:washing-machine':    'M13,12A2,2 0 0,1 15,14A2,2 0 0,1 13,16A2,2 0 0,1 11,14A2,2 0 0,1 13,12M13,10A4,4 0 0,0 9,14A4,4 0 0,0 13,18A4,4 0 0,0 17,14A4,4 0 0,0 13,10M20,20H4V8H20V20M20,2H4C2.89,2 2,2.89 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4C22,2.89 21.1,2 20,2Z',
  'mdi:heat-pump':          'M17.5,12A5.5,5.5 0 0,1 12,17.5A5.5,5.5 0 0,1 6.5,12A5.5,5.5 0 0,1 12,6.5A5.5,5.5 0 0,1 17.5,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  'mdi:lightbulb':          'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z',
  'default':                'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
};

const AUTO_COLORS = [
  '#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899',
  '#84cc16','#f97316','#6366f1','#14b8a6','#ef4444',
];

function getMdiPath(icon) {
  return MDI_PATHS[icon] || MDI_PATHS['default'];
}

function svgEl(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

class PowerFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config    = null;
    this._hass      = null;
    this._D         = null;
    this._nodes     = {};
    this._flows     = [];
    this._lineEls   = {};
    this._valEls    = {};   // text elements voor waarden
    this._subEls    = {};   // text elements voor grid sub-labels
    this._dotsG     = null;
    this._particles = [];
    this._tick      = 0;
    this._raf       = null;
  }

  static getConfigElement() {
    return document.createElement('power-flow-card-editor');
  }

  static getStubConfig() {
    return {
      solar_entity:       'sensor.solar_power',
      grid_entity:        'sensor.grid_power',
      battery_entity:     'sensor.battery_power',
      battery_soc_entity: 'sensor.battery_soc',
      home_entity:        'sensor.home_power',
    };
  }

  // ── Config ─────────────────────────────────────────────────────────────────
  setConfig(config) {
    if (!config.solar_entity && !config.grid_entity && !config.home_entity) {
      throw new Error('At least one of solar_entity, grid_entity or home_entity is required');
    }
    this._config = {
      solar_entity:       config.solar_entity       || null,
      grid_entity:        config.grid_entity        || null,
      battery_entity:     config.battery_entity     || null,
      battery_soc_entity: config.battery_soc_entity || null,
      home_entity:        config.home_entity        || null,
      title:              config.title              || null,
      entities: Array.isArray(config.entities)
        ? config.entities.map((e, i) => ({
            entity: e.entity,
            name:   e.name  || e.entity,
            icon:   e.icon  || null,
            color:  e.color || AUTO_COLORS[i % AUTO_COLORS.length],
          }))
        : [],
      colors: {
        solar:   config.colors?.solar   || '#f59e0b',
        grid:    config.colors?.grid    || '#64748b',
        battery: config.colors?.battery || '#3b82f6',
        home:    config.colors?.home    || '#3b82f6',
      },
    };
    this._build();
  }

  // ── Hass updates ───────────────────────────────────────────────────────────
  set hass(hass) {
    this._hass = hass;
    this._refreshData();
  }

  // ── Sensor lezen ───────────────────────────────────────────────────────────
  _val(entity) {
    if (!entity || !this._hass) return 0;
    const s = this._hass.states[entity];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return 0;
    const n = parseFloat(s.state);
    return isNaN(n) ? 0 : n;
  }

  // ── Formattering ───────────────────────────────────────────────────────────
  _fmt(v) {
    const a = Math.abs(v);
    if (a >= 1000) return (v < 0 ? '-' : '') + (a / 1000).toFixed(2) + ' kW';
    return Math.round(v) + ' W';
  }

  // ── Volledige opbouw ───────────────────────────────────────────────────────
  _build() {
    // Stop eventuele lopende animatie
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._particles = [];
    this._tick = 0;

    const cfg = this._config;
    const extras = cfg.entities;
    const W = 480;
    const extraRows = Math.ceil(Math.max(extras.length, 0) / 3);
    const H = (extras.length > 0 ? 310 : 240) + extraRows * 120;
    const cx = W / 2;
    const cy = extras.length > 0 ? 155 : 120;

    // ── Knooppunten ──
    this._nodes = {};
    const N = this._nodes;
    const c = cfg.colors;

    if (cfg.solar_entity)   N.solar = { x: cx,      y: 52,         col: c.solar,   lbl: 'Zonne-energie', icon: 'mdi:solar-panel' };
    if (cfg.grid_entity)    N.grid  = { x: 62,       y: cy,         col: c.grid,    lbl: 'Net',           icon: 'mdi:transmission-tower' };
    if (cfg.battery_entity) N.bat   = { x: W - 62,   y: cy,         col: c.battery, lbl: 'Batterij',      icon: 'mdi:battery-high' };
    if (cfg.home_entity)    N.home  = { x: cx,       y: cy,         col: c.home,    lbl: 'Huis',          icon: 'mdi:home' };

    const rowY0 = cy + 130;
    const gaps = [0, 0, 150, 120];
    for (let i = 0; i < extras.length; i++) {
      const row      = Math.floor(i / 3);
      const col      = i % 3;
      const rowN     = Math.min(3, extras.length - row * 3);
      const gap      = gaps[rowN] || 120;
      const startX   = cx - gap * (rowN - 1) / 2;
      N[`ex${i}`] = {
        x:   startX + col * gap,
        y:   rowY0 + row * 130,
        col: extras[i].color,
        lbl: extras[i].name,
        icon: extras[i].icon,
      };
    }

    // ── Flows ──
    const D = () => this._D || {};
    this._flows = [];
    const f = (from, to, col, fn) => this._flows.push({ from, to, col, active: fn, key: `${from}_${to}` });

    if (N.solar && N.home)  f('solar','home', c.solar,   () => (D().solar||0) > 0);
    if (N.solar && N.bat)   f('solar','bat',  c.solar,   () => (D().solar||0) > 0 && (D().bat||0) < 0);
    if (N.solar && N.grid)  f('solar','grid', c.solar,   () => (D().solar||0) > 0 && (D().grid||0) < 0);
    if (N.grid  && N.home)  f('grid', 'home', c.grid,    () => (D().grid||0)  > 0);
    if (N.bat   && N.home)  f('bat',  'home', c.battery, () => (D().bat||0)   > 0);
    if (N.home  && N.bat)   f('home', 'bat',  '#f97316', () => (D().bat||0) < 0 && (D().solar||0) <= 0);
    extras.forEach((_, i) => f(`ex${i}`, 'home', extras[i].color, () => (D()[`ex${i}`]||0) > 0));

    // ── DOM ──
    this._renderDOM(W, H);
  }

  _renderDOM(W, H) {
    const cfg = this._config;
    const shadow = this.shadowRoot;

    shadow.innerHTML = `<style>
      :host { display: block; }
      .card {
        background: var(--card-background-color, #fff);
        border-radius: 12px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.1));
        padding: 12px;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--secondary-text-color, #888);
        text-align: center;
        margin-bottom: 4px;
      }
      svg { width: 100%; display: block; overflow: visible; }
      .lbl {
        font-size: 11px;
        font-weight: 600;
        text-anchor: middle;
        fill: var(--primary-text-color, #333);
      }
      .val {
        font-size: 12px;
        font-weight: 700;
        text-anchor: middle;
      }
      .sub {
        font-size: 9px;
        font-weight: 500;
        text-anchor: middle;
      }
    </style>
    <div class="card">
      ${cfg.title ? `<div class="title">${cfg.title}</div>` : ''}
      <svg id="svg" viewBox="0 0 ${W} ${H}">
        <g id="lines"></g>
        <g id="dots"></g>
        <g id="nodes"></g>
      </svg>
    </div>`;

    const svg = shadow.getElementById('svg');
    this._linesG = shadow.getElementById('lines');
    this._dotsG  = shadow.getElementById('dots');
    this._nodesG = shadow.getElementById('nodes');
    this._lineEls = {};
    this._valEls  = {};
    this._subEls  = {};

    // ── Lijnen tekenen ──
    this._flows.forEach(fl => {
      const path = svgEl('path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', fl.col);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      this._linesG.appendChild(path);
      this._lineEls[fl.key] = path;
    });

    // ── Knooppunten tekenen ──
    Object.entries(this._nodes).forEach(([key, n]) => {
      const isHome = key === 'home';
      const R = isHome ? 36 : 28;
      const g = svgEl('g');

      // Achtergrond
      const bg = svgEl('circle');
      bg.setAttribute('cx', n.x); bg.setAttribute('cy', n.y); bg.setAttribute('r', R);
      bg.setAttribute('fill', n.col); bg.setAttribute('opacity', '0.13');
      g.appendChild(bg);

      // Rand
      const border = svgEl('circle');
      border.setAttribute('cx', n.x); border.setAttribute('cy', n.y); border.setAttribute('r', R);
      border.setAttribute('fill', 'none');
      border.setAttribute('stroke', n.col);
      border.setAttribute('stroke-width', isHome ? '3' : '2.5');
      g.appendChild(border);

      // Icoon — gecentreerd in cirkel, boven het midden
      const sz = isHome ? 20 : 16;
      const sc = sz / 24;
      const ig = svgEl('g');
      ig.setAttribute('transform', `translate(${n.x - sz/2},${n.y - sz/2 - (isHome ? 7 : 5)}) scale(${sc})`);
      const ip = svgEl('path');
      ip.setAttribute('d', getMdiPath(n.icon));
      ip.setAttribute('fill', n.col);
      ig.appendChild(ip);
      g.appendChild(ig);

      // Waarde — onder icoon, binnen cirkel
      const vt = svgEl('text');
      vt.setAttribute('x', n.x);
      vt.setAttribute('y', n.y + (isHome ? 18 : 14));
      vt.setAttribute('class', 'val');
      vt.setAttribute('fill', n.col);
      vt.setAttribute('font-size', isHome ? '13' : '11');
      vt.textContent = '—';
      g.appendChild(vt);
      this._valEls[key] = vt;

      // Grid: import/export sub-labels buiten de cirkel
      if (key === 'grid') {
        const s1 = svgEl('text');
        s1.setAttribute('x', n.x); s1.setAttribute('y', n.y + R + 14);
        s1.setAttribute('class', 'sub'); s1.setAttribute('fill', n.col);
        g.appendChild(s1);
        this._subEls['gi'] = s1;

        const s2 = svgEl('text');
        s2.setAttribute('x', n.x); s2.setAttribute('y', n.y + R + 25);
        s2.setAttribute('class', 'sub'); s2.setAttribute('fill', n.col);
        g.appendChild(s2);
        this._subEls['ge'] = s2;
      }

      // Naam label — buiten de cirkel
      const above = n.y < 120;   // solar staat boven
      const lblY  = above
        ? n.y - R - 5
        : n.y + R + 14;
      const lt = svgEl('text');
      lt.setAttribute('x', n.x);
      lt.setAttribute('y', lblY);
      lt.setAttribute('class', 'lbl');
      lt.textContent = n.lbl;
      g.appendChild(lt);

      this._nodesG.appendChild(g);
    });

    // ── Eerste data ophalen en animatie starten ──
    this._refreshData();
    this._animate();
  }

  // ── Data verversen ─────────────────────────────────────────────────────────
  _refreshData() {
    if (!this._hass || !this._config) return;
    const cfg = this._config;

    this._D = {
      solar: this._val(cfg.solar_entity),
      grid:  this._val(cfg.grid_entity),
      bat:   this._val(cfg.battery_entity),
      home:  this._val(cfg.home_entity),
      soc:   this._val(cfg.battery_soc_entity),
    };
    cfg.entities.forEach((e, i) => {
      this._D[`ex${i}`] = this._val(e.entity);
    });

    this._updateLabels();
    this._updateLines();
  }

  // ── Labels bijwerken ───────────────────────────────────────────────────────
  _updateLabels() {
    if (!this._D) return;
    const D   = this._D;
    const cfg = this._config;

    if (this._valEls.solar) this._valEls.solar.textContent = this._fmt(D.solar);
    if (this._valEls.home)  this._valEls.home.textContent  = this._fmt(D.home);

    if (this._valEls.grid) {
      this._valEls.grid.textContent = this._fmt(Math.abs(D.grid));
      if (this._subEls.gi) this._subEls.gi.textContent = `← ${this._fmt(D.grid > 0 ? D.grid : 0)}`;
      if (this._subEls.ge) this._subEls.ge.textContent = `→ ${this._fmt(D.grid < 0 ? Math.abs(D.grid) : 0)}`;
    }

    if (this._valEls.bat) {
      const soc = cfg.battery_soc_entity ? ` ${Math.round(D.soc)}%` : '';
      this._valEls.bat.textContent = this._fmt(Math.abs(D.bat)) + soc;
    }

    cfg.entities.forEach((_, i) => {
      const el = this._valEls[`ex${i}`];
      if (el) el.textContent = this._fmt(D[`ex${i}`] || 0);
    });
  }

  // ── Lijnen bijwerken ───────────────────────────────────────────────────────
  _updateLines() {
    this._flows.forEach(fl => {
      const el = this._lineEls[fl.key];
      if (!el) return;
      const a = this._nodes[fl.from];
      const b = this._nodes[fl.to];
      if (!a || !b) return;

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      el.setAttribute('d', `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`);

      const on = fl.active();
      el.setAttribute('stroke-dasharray', on ? 'none' : '6 5');
      el.setAttribute('opacity',          on ? '0.75'  : '0.2');
      el.setAttribute('stroke-width',     on ? '2.5'   : '1.5');
    });
  }

  // ── Animatie loop ──────────────────────────────────────────────────────────
  _animate() {
    if (this._raf) cancelAnimationFrame(this._raf);

    const loop = () => {
      // Spawn elke 20 frames een nieuwe stip per actieve flow
      if (this._tick % 20 === 0) {
        this._flows.forEach(fl => {
          if (!fl.active()) return;
          const a = this._nodes[fl.from];
          const b = this._nodes[fl.to];
          if (!a || !b) return;
          const dot = svgEl('circle');
          dot.setAttribute('r', '5');
          dot.setAttribute('fill', fl.col);
          dot.setAttribute('opacity', '0.95');
          this._dotsG.appendChild(dot);
          this._particles.push({ fl, dot, a, b, t: Math.random() * 0.1, spd: 0.007 + Math.random() * 0.005 });
        });
      }

      // Beweeg en verwijder stippen
      for (let i = this._particles.length - 1; i >= 0; i--) {
        const p = this._particles[i];
        p.t += p.spd;
        if (p.t >= 1 || !p.fl.active()) {
          p.dot.remove();
          this._particles.splice(i, 1);
          continue;
        }
        const mx = (p.a.x + p.b.x) / 2;
        const my = (p.a.y + p.b.y) / 2;
        const t  = p.t;
        p.dot.setAttribute('cx', (1-t)*(1-t)*p.a.x + 2*(1-t)*t*mx + t*t*p.b.x);
        p.dot.setAttribute('cy', (1-t)*(1-t)*p.a.y + 2*(1-t)*t*my + t*t*p.b.y);
      }

      this._tick++;
      this._raf = requestAnimationFrame(loop);
    };

    this._raf = requestAnimationFrame(loop);
  }

  disconnectedCallback() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  getCardSize() { return 5; }
}

customElements.define('power-flow-card', PowerFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'power-flow-card',
  name:        'Power Flow Card',
  description: 'Animated power flow card with support for solar, grid, battery and individual consumers.',
  preview:     true,
});
