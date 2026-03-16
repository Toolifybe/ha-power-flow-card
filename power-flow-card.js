/**
 * Power Flow Card - v2.0
 * Layout: hub-and-spoke rond het Huis-knooppunt
 * Ondersteunt individuele entiteiten via YAML
 *
 * Voorbeeld YAML config:
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
 *   - entity: sensor.tv_power
 *     name: TV Living
 *     icon: mdi:television
 *     color: '#a855f7'
 *   - entity: sensor.bureau_muur_power
 *     name: Bureau muur
 *     icon: mdi:power-socket-eu
 *     color: '#f59e0b'
 */

const MDI_PATHS = {
  'mdi:solar-panel':        'M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,4V20H20V4H4M6,6H10V10H6V6M12,6H16V10H12V6M6,12H10V16H6V12M12,12H16V16H12V12Z',
  'mdi:transmission-tower': 'M11,3H13V5.07C15.26,5.38 17.28,6.54 18.71,8.27L20.35,7.06L21.57,8.65L19.93,9.85C20.61,11.04 21,12.48 21,14C21,16.21 20.12,18.21 18.66,19.66L20,21H4L5.34,19.66C3.88,18.21 3,16.21 3,14C3,12.48 3.39,11.04 4.07,9.85L2.43,8.65L3.65,7.06L5.29,8.27C6.72,6.54 8.74,5.38 11,5.07V3M12,7A7,7 0 0,0 5,14A7,7 0 0,0 12,21A7,7 0 0,0 19,14A7,7 0 0,0 12,7M12,9A5,5 0 0,1 17,14A5,5 0 0,1 12,19A5,5 0 0,1 7,14A5,5 0 0,1 12,9M12,11A3,3 0 0,0 9,14A3,3 0 0,0 12,17A3,3 0 0,0 15,14A3,3 0 0,0 12,11Z',
  'mdi:battery-high':       'M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z',
  'mdi:home':               'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
  'mdi:desktop-classic':    'M2,3H22A1,1 0 0,1 23,4V16A1,1 0 0,1 22,17H13V19H15V21H9V19H11V17H2A1,1 0 0,1 1,16V4A1,1 0 0,1 2,3M2,4V14H22V4H2Z',
  'mdi:television':         'M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z',
  'mdi:power-socket-eu':    'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M9,8A2,2 0 0,0 7,10A2,2 0 0,0 9,12A2,2 0 0,0 11,10A2,2 0 0,0 9,8M15,8A2,2 0 0,0 13,10A2,2 0 0,0 15,12A2,2 0 0,0 17,10A2,2 0 0,0 15,8M12,13C10.5,13 9.19,13.63 8.27,14.63L9.68,16.04C10.24,15.4 11.07,15 12,15C12.93,15 13.76,15.4 14.32,16.04L15.73,14.63C14.81,13.63 13.5,13 12,13Z',
  'mdi:lightning-bolt':     'M11,21H5L13,3H19L15.5,10H21L11,21M13.5,12H9.4L6.7,19H10.8L13.5,12M16.6,5H12.5L10.4,10H14.5L16.6,5Z',
  'mdi:car-electric':       'M16,6L19,10H21A1,1 0 0,1 22,11V15H20A3,3 0 0,1 17,18A3,3 0 0,1 14,15H10A3,3 0 0,1 7,18A3,3 0 0,1 4,15H2V11A1,1 0 0,1 3,10H6L9,6H16M7,11.5A1.5,1.5 0 0,0 5.5,13A1.5,1.5 0 0,0 7,14.5A1.5,1.5 0 0,0 8.5,13A1.5,1.5 0 0,0 7,11.5M17,11.5A1.5,1.5 0 0,0 15.5,13A1.5,1.5 0 0,0 17,14.5A1.5,1.5 0 0,0 18.5,13A1.5,1.5 0 0,0 17,11.5M15.5,7.5H9.5L8,10H18L15.5,7.5Z',
  'mdi:washing-machine':    'M13,12A2,2 0 0,1 15,14A2,2 0 0,1 13,16A2,2 0 0,1 11,14A2,2 0 0,1 13,12M13,10A4,4 0 0,0 9,14A4,4 0 0,0 13,18A4,4 0 0,0 17,14A4,4 0 0,0 13,10M19,3A1,1 0 0,1 20,4A1,1 0 0,1 19,5A1,1 0 0,1 18,4A1,1 0 0,1 19,3M15,3A1,1 0 0,1 16,4A1,1 0 0,1 15,5A1,1 0 0,1 14,4A1,1 0 0,1 15,3M20,20H4V8H20V20M20,2H4C2.89,2 2,2.89 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4C22,2.89 21.1,2 20,2Z',
  'mdi:heat-pump':          'M17.5,12A5.5,5.5 0 0,1 12,17.5A5.5,5.5 0 0,1 6.5,12A5.5,5.5 0 0,1 12,6.5A5.5,5.5 0 0,1 17.5,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  'mdi:lightbulb':          'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z',
  'default':                'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
};

function getMdiPath(icon) {
  if (!icon) return MDI_PATHS['default'];
  return MDI_PATHS[icon] || MDI_PATHS['default'];
}

// ─── Palette voor automatische kleurtoewijzing aan extra entiteiten ───
const AUTO_COLORS = [
  '#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899',
  '#84cc16','#f97316','#6366f1','#14b8a6','#ef4444',
];

class PowerFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._animFrame = null;
    this._particles = [];
    this._tick = 0;
    this._animating = false;
    this._nodeEls = {};      // SVG circle elements per node key
    this._lineEls = {};      // SVG path elements per flow key
    this._labelEls = {};     // value label elements per node key
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
      entities: [
        { entity: 'sensor.pc_power',    name: 'PC',         icon: 'mdi:desktop-classic', color: '#22c55e' },
        { entity: 'sensor.tv_power',    name: 'TV Living',  icon: 'mdi:television',       color: '#a855f7' },
      ],
    };
  }

  setConfig(config) {
    if (!config.solar_entity && !config.grid_entity && !config.home_entity) {
      throw new Error('Minimaal één van solar_entity, grid_entity of home_entity is vereist');
    }
    this._config = {
      solar_entity:       config.solar_entity       || null,
      grid_entity:        config.grid_entity        || null,
      battery_entity:     config.battery_entity     || null,
      battery_soc_entity: config.battery_soc_entity || null,
      home_entity:        config.home_entity        || null,
      title:              config.title              || null,
      entities:           Array.isArray(config.entities) ? config.entities.map((e, i) => ({
        entity: e.entity,
        name:   e.name   || e.entity,
        icon:   e.icon   || null,
        color:  e.color  || AUTO_COLORS[i % AUTO_COLORS.length],
      })) : [],
      colors: {
        solar:   (config.colors && config.colors.solar)   || '#f59e0b',
        grid:    (config.colors && config.colors.grid)    || '#64748b',
        battery: (config.colors && config.colors.battery) || '#3b82f6',
        home:    (config.colors && config.colors.home)    || '#3b82f6',
      },
    };
    this._buildLayout();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateData();
  }

  _getState(entity) {
    if (!entity || !this._hass) return null;
    const s = this._hass.states[entity];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _fmtW(v) {
    const abs = Math.abs(v);
    if (abs >= 1000) return (v < 0 ? '-' : '') + (abs / 1000).toFixed(2) + ' kW';
    return v + ' W';
  }

  // ─── Bereken knooppuntposities ─────────────────────────────────────────────
  _calcLayout() {
    const cfg = this._config;
    const extras = cfg.entities;

    // Hoogte afh. van aantal extra entiteiten
    const extraCount = extras.length;
    const W = 480;
    // Elke rij extra entiteiten: max 3 per rij
    const extraRows = Math.ceil(extraCount / 3);
    const H = 300 + extraRows * 110;

    const cx = W / 2, cy = 160; // Huis centrum

    const nodes = {};

    // Huis: altijd midden
    if (cfg.home_entity) {
      nodes.home = { x: cx, y: cy, col: cfg.colors.home, lbl: 'Huis', icon: 'mdi:home', val: 0 };
    }

    // Solar: boven midden
    if (cfg.solar_entity) {
      nodes.solar = { x: cx, y: 50, col: cfg.colors.solar, lbl: 'Zonne-energie', icon: 'mdi:solar-panel', val: 0 };
    }

    // Grid: links midden
    if (cfg.grid_entity) {
      nodes.grid = { x: 60, y: cy, col: cfg.colors.grid, lbl: 'Net', icon: 'mdi:transmission-tower', val: 0, gridMode: true };
    }

    // Batterij: rechts midden (of rechts-boven als geen solar)
    if (cfg.battery_entity) {
      nodes.bat = { x: W - 60, y: cy, col: cfg.colors.battery, lbl: 'Batterij', icon: 'mdi:battery-high', val: 0 };
    }

    // Extra entiteiten: verdeeld in rijen onder het huis
    // Posities: rij 1 max 3 nodes, gecentreerd
    const rowY0 = cy + 120;
    const rowSpacing = 110;
    const colSpacings = [0, 160, 110, 90]; // spacing per aantal nodes in rij

    for (let i = 0; i < extras.length; i++) {
      const e = extras[i];
      const row = Math.floor(i / 3);
      const col = i % 3;
      const rowCount = Math.min(3, extras.length - row * 3);
      const spacing = colSpacings[rowCount] || 110;
      const rowStartX = cx - (spacing * (rowCount - 1)) / 2;
      nodes[`extra_${i}`] = {
        x:   rowStartX + col * spacing,
        y:   rowY0 + row * rowSpacing,
        col: e.color,
        lbl: e.name,
        icon: e.icon,
        val: 0,
        isExtra: true,
        extraIdx: i,
      };
    }

    return { nodes, W, H };
  }

  // ─── Bouw de volledige SVG + HTML structuur ────────────────────────────────
  _buildLayout() {
    const cfg = this._config;
    const { nodes, W, H } = this._calcLayout();
    this._nodes = nodes;
    this._W = W;
    this._H = H;

    const shadow = this.shadowRoot;

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        * { box-sizing: border-box; }
        .card {
          background: var(--card-background-color, var(--primary-background-color, #1c1c1e));
          border-radius: 16px;
          border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
          padding: 16px 12px 12px;
          font-family: var(--paper-font-body1_-_font-family, 'Helvetica Neue', sans-serif);
          position: relative;
          overflow: hidden;
        }
        .card-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--secondary-text-color, #888);
          margin-bottom: 4px;
          text-align: center;
        }
        svg.flow-svg {
          width: 100%;
          display: block;
          overflow: visible;
        }
        .node-label {
          font-size: 11px;
          font-weight: 600;
          text-anchor: middle;
          fill: var(--primary-text-color, #212121);
        }
        .node-value {
          font-size: 13px;
          font-weight: 700;
          text-anchor: middle;
        }
        .grid-sub {
          font-size: 10px;
          font-weight: 500;
          text-anchor: middle;
        }
        .flow-line {
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
        }
      </style>
      <div class="card">
        ${cfg.title ? `<div class="card-title">${cfg.title}</div>` : ''}
        <svg class="flow-svg" id="flow-svg" viewBox="0 0 ${W} ${H}">
          <g id="lines-layer"></g>
          <g id="dots-layer"></g>
          <g id="nodes-layer"></g>
        </svg>
      </div>
    `;

    this._svg    = shadow.getElementById('flow-svg');
    this._linesG = shadow.getElementById('lines-layer');
    this._dotsG  = shadow.getElementById('dots-layer');
    this._nodesG = shadow.getElementById('nodes-layer');

    this._buildFlows();
    this._buildNodes();
    this._updateData();
  }

  // ─── Definieer flows (verbindingen) ───────────────────────────────────────
  _buildFlows() {
    const cfg = this._config;
    const c = cfg.colors;

    this._flows = [];

    const push = (from, to, col, activeF) => {
      const key = `${from}__${to}`;
      this._flows.push({ from, to, col, active: activeF, key });
    };

    const D = () => this._D || {};

    if (cfg.solar_entity && cfg.home_entity)
      push('solar','home', c.solar,   () => (D().solar||0) > 0);
    if (cfg.solar_entity && cfg.battery_entity)
      push('solar','bat',  c.solar,   () => (D().solar||0) > 0 && (D().bat||0) < 0);
    if (cfg.solar_entity && cfg.grid_entity)
      push('solar','grid', c.solar,   () => (D().solar||0) > 0 && (D().grid||0) < 0);
    if (cfg.grid_entity && cfg.home_entity)
      push('grid', 'home', c.grid,    () => (D().grid||0) > 0);
    if (cfg.battery_entity && cfg.home_entity)
      push('bat',  'home', c.battery, () => (D().bat||0) > 0);
    if (cfg.home_entity && cfg.battery_entity)
      push('home', 'bat',  '#f97316', () => (D().bat||0) < 0 && (D().solar||0) <= 0);

    // Extra entiteiten → huis
    cfg.entities.forEach((e, i) => {
      push(`extra_${i}`, 'home', e.color, () => (D()[`extra_${i}`] || 0) > 0);
    });

    // Teken de lijnen in SVG
    this._linesG.innerHTML = '';
    this._lineEls = {};
    this._flows.forEach(fl => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'flow-line');
      path.setAttribute('id', `line-${fl.key}`);
      path.setAttribute('stroke', fl.col);
      path.setAttribute('stroke-dasharray', '5 5');
      path.setAttribute('opacity', '0.3');
      this._linesG.appendChild(path);
      this._lineEls[fl.key] = path;
    });
  }

  // ─── Bouw SVG knooppunten ─────────────────────────────────────────────────
  _buildNodes() {
    this._nodesG.innerHTML = '';
    this._nodeValEls = {};
    this._nodeSubEls = {};

    Object.entries(this._nodes).forEach(([key, n]) => {
      const R = key === 'home' ? 36 : 28;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', `node-${key}`);

      // Achtergrond cirkel (gevuld)
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', n.x);
      bgCircle.setAttribute('cy', n.y);
      bgCircle.setAttribute('r', R);
      bgCircle.setAttribute('fill', n.col);
      bgCircle.setAttribute('opacity', '0.12');
      g.appendChild(bgCircle);

      // Border cirkel
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', n.x);
      circle.setAttribute('cy', n.y);
      circle.setAttribute('r', R);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', n.col);
      circle.setAttribute('stroke-width', key === 'home' ? '3' : '2.5');
      g.appendChild(circle);

      // MDI icoon via path (gecentreerd in cirkel)
      const iconSize = key === 'home' ? 22 : 18;
      const iconOff  = iconSize / 2;
      // SVG path: origin 0,0 in 24x24 viewbox → schalen + vertalen
      const iconG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const scale = iconSize / 24;
      iconG.setAttribute('transform',
        `translate(${n.x - iconOff}, ${n.y - iconOff - (key === 'home' ? 4 : 3)}) scale(${scale})`
      );
      const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      iconPath.setAttribute('d', getMdiPath(n.icon));
      iconPath.setAttribute('fill', n.col);
      iconG.appendChild(iconPath);
      g.appendChild(iconG);

      // Waarde label (onder icoon)
      const valY = key === 'home' ? n.y + 16 : n.y + 13;
      const valTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valTxt.setAttribute('x', n.x);
      valTxt.setAttribute('y', valY);
      valTxt.setAttribute('class', 'node-value');
      valTxt.setAttribute('font-size', key === 'home' ? '13' : '11');
      valTxt.setAttribute('fill', n.col);
      valTxt.textContent = '— W';
      g.appendChild(valTxt);
      this._nodeValEls[key] = valTxt;

      // Grid: extra sub-label (← import / → export)
      if (key === 'grid') {
        const sub1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub1.setAttribute('x', n.x); sub1.setAttribute('y', n.y + 24);
        sub1.setAttribute('class', 'grid-sub'); sub1.setAttribute('fill', n.col);
        sub1.setAttribute('opacity','0.8');
        g.appendChild(sub1);
        this._nodeSubEls['grid-import'] = sub1;

        const sub2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub2.setAttribute('x', n.x); sub2.setAttribute('y', n.y + 34);
        sub2.setAttribute('class', 'grid-sub'); sub2.setAttribute('fill', n.col);
        sub2.setAttribute('opacity','0.8');
        g.appendChild(sub2);
        this._nodeSubEls['grid-export'] = sub2;
      }

      // Naam label (boven of onder knooppunt)
      const lblY = n.y > this._H / 2
        ? n.y + (key === 'home' ? 36 : 28) + 12   // onder
        : n.y - (key === 'home' ? 36 : 28) - 5;   // boven
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', n.x);
      lbl.setAttribute('y', lblY);
      lbl.setAttribute('class', 'node-label');
      lbl.textContent = n.lbl;
      g.appendChild(lbl);

      this._nodesG.appendChild(g);
    });
  }

  // ─── Animatie (bewegende stippen in SVG) ─────────────────────────────────
  _startAnimation() {
    if (this._animating) return;
    this._animating = true;
    this._tick = 0;
    this._animLoop();
  }

  _animLoop() {
    if (!this._dotsG) { this._animating = false; return; }

    // Nieuwe stippen toevoegen elke 20 frames per actieve flow
    if (this._tick % 20 === 0 && this._D) {
      this._flows.filter(f => f.active()).forEach(fl => {
        const nFrom = this._nodes[fl.from];
        const nTo   = this._nodes[fl.to];
        if (!nFrom || !nTo) return;
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', '5');
        dot.setAttribute('fill', fl.col);
        dot.setAttribute('opacity', '0.9');
        this._dotsG.appendChild(dot);
        this._particles.push({
          fl, dot,
          t:    Math.random() * 0.15,
          spd:  0.007 + Math.random() * 0.005,
          nFrom, nTo,
        });
      });
    }

    // Stippen bewegen en verwijderen
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.t += p.spd;
      if (p.t >= 1 || !p.fl.active()) {
        p.dot.remove();
        this._particles.splice(i, 1);
        continue;
      }
      const mx = (p.nFrom.x + p.nTo.x) / 2;
      const my = (p.nFrom.y + p.nTo.y) / 2;
      const t = p.t;
      const px = (1-t)*(1-t)*p.nFrom.x + 2*(1-t)*t*mx + t*t*p.nTo.x;
      const py = (1-t)*(1-t)*p.nFrom.y + 2*(1-t)*t*my + t*t*p.nTo.y;
      p.dot.setAttribute('cx', px);
      p.dot.setAttribute('cy', py);
    }

    this._tick++;
    this._animFrame = requestAnimationFrame(() => this._animLoop());
  }

  // ─── Data bijwerken ───────────────────────────────────────────────────────
  _updateData() {
    if (!this._hass || !this._nodeValEls) return;
    const cfg = this._config;

    this._D = {
      solar: Math.round(this._getState(cfg.solar_entity) ?? 0),
      grid:  Math.round(this._getState(cfg.grid_entity)  ?? 0),
      bat:   Math.round(this._getState(cfg.battery_entity) ?? 0),
      home:  Math.round(this._getState(cfg.home_entity)  ?? 0),
      soc:   Math.round(this._getState(cfg.battery_soc_entity) ?? 0),
    };

    cfg.entities.forEach((e, i) => {
      this._D[`extra_${i}`] = Math.round(this._getState(e.entity) ?? 0);
    });

    this._updateSVG();
    if (!this._animating) this._startAnimation();
  }

  // ─── SVG labels en lijnen bijwerken ──────────────────────────────────────
  _updateSVG() {
    if (!this._D || !this._nodeValEls) return;
    const D = this._D;
    const cfg = this._config;

    // Knooppunt waarden
    if (this._nodeValEls.solar)
      this._nodeValEls.solar.textContent = this._fmtW(D.solar);
    if (this._nodeValEls.grid) {
      const gv = D.grid;
      this._nodeValEls.grid.textContent = this._fmtW(Math.abs(gv));
      if (this._nodeSubEls['grid-import'])
        this._nodeSubEls['grid-import'].textContent = `← ${this._fmtW(gv > 0 ? gv : 0)}`;
      if (this._nodeSubEls['grid-export'])
        this._nodeSubEls['grid-export'].textContent = `→ ${this._fmtW(gv < 0 ? Math.abs(gv) : 0)}`;
    }
    if (this._nodeValEls.bat) {
      const socTxt = cfg.battery_soc_entity ? ` ${D.soc}%` : '';
      this._nodeValEls.bat.textContent = this._fmtW(Math.abs(D.bat)) + socTxt;
    }
    if (this._nodeValEls.home)
      this._nodeValEls.home.textContent = this._fmtW(D.home);

    cfg.entities.forEach((e, i) => {
      const el = this._nodeValEls[`extra_${i}`];
      if (el) el.textContent = this._fmtW(D[`extra_${i}`] || 0);
    });

    // Lijnen: actief / inactief
    this._flows.forEach(fl => {
      const el = this._lineEls[fl.key];
      if (!el) return;
      const nFrom = this._nodes[fl.from];
      const nTo   = this._nodes[fl.to];
      if (!nFrom || !nTo) return;

      const mx = (nFrom.x + nTo.x) / 2;
      const my = (nFrom.y + nTo.y) / 2;
      el.setAttribute('d', `M${nFrom.x},${nFrom.y} Q${mx},${my} ${nTo.x},${nTo.y}`);

      const on = fl.active();
      el.setAttribute('stroke', fl.col);
      el.setAttribute('stroke-dasharray', on ? 'none' : '5 5');
      el.setAttribute('opacity',   on ? '0.7' : '0.2');
      el.setAttribute('stroke-width', on ? '2.5' : '1.5');
    });
  }

  disconnectedCallback() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._animating = false;
  }

  getCardSize() { return 5; }
}

customElements.define('power-flow-card', PowerFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'power-flow-card',
  name:        'Power Flow Card',
  description: 'Visualiseert energiestromen tussen zonnepanelen, net, batterij, verbruik en individuele apparaten.',
  preview:     true,
});
