/**
 * Power Flow Card v3.0.4
 *
 * Layout:
 *   Links kolom (boven→onder): Net, Zonne-energie, Batterij
 *   Midden: Huis
 *   Rechts kolom: Verbruikers (verticale bus)
 *
 * Flow regels:
 *   - Zon > huis verbruik → geel: zon→huis EN zon→batterij
 *   - Zon < huis verbruik → geel: zon→huis alleen
 *   - Net import → blauw: net→huis
 *   - Net export → blauw: huis→net
 *   - Batterij laden door zon → geel: zon→batterij
 *   - Batterij ontladen → roze: batterij→huis
 *   - Verbruiker 0W → vervaagd (opacity 0.25), geen stroom
 *   - Bus lijn kleur = groen als actieve verbruikers
 *
 * type: custom:power-flow-card
 * solar_entity: sensor.solar_power
 * grid_entity: sensor.grid_power
 * grid_inverted: false
 * battery_entities:
 *   - sensor.bat1
 *   - sensor.bat2
 * battery_inverted: true
 * battery_stored_energy_entities:
 *   - sensor.bat1_energy
 * battery_capacity_kwh: 15.36
 * home_entity: sensor.home_power
 * title: Energiestroom
 * entities:
 *   - entity: sensor.pc_power
 *     name: PC
 *     icon: mdi:desktop-classic
 *     color: '#22c55e'
 */

const PFC_ICONS = {
  'mdi:solar-panel':        'M4,2H20A2,2 0 0,1 22,4V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,4V20H20V4H4M6,6H10V10H6V6M12,6H16V10H12V6M6,12H10V16H6V12M12,12H16V16H12V12Z',
  'mdi:transmission-tower': 'M11,3H13V5.07C15.26,5.38 17.28,6.54 18.71,8.27L20.35,7.06L21.57,8.65L19.93,9.85C20.61,11.04 21,12.48 21,14C21,16.21 20.12,18.21 18.66,19.66L20,21H4L5.34,19.66C3.88,18.21 3,16.21 3,14C3,12.48 3.39,11.04 4.07,9.85L2.43,8.65L3.65,7.06L5.29,8.27C6.72,6.54 8.74,5.38 11,5.07V3M12,7A7,7 0 0,0 5,14A7,7 0 0,0 12,21A7,7 0 0,0 19,14A7,7 0 0,0 12,7Z',
  'mdi:battery-high':       'M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z',
  'mdi:home':               'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
  'mdi:desktop-classic':    'M2,3H22A1,1 0 0,1 23,4V16A1,1 0 0,1 22,17H13V19H15V21H9V19H11V17H2A1,1 0 0,1 1,16V4A1,1 0 0,1 2,3M2,4V14H22V4H2Z',
  'mdi:television':         'M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z',
  'mdi:television-classic': 'M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z',
  'mdi:washing-machine':    'M13,12A2,2 0 0,1 15,14A2,2 0 0,1 13,16A2,2 0 0,1 11,14A2,2 0 0,1 13,12M13,10A4,4 0 0,0 9,14A4,4 0 0,0 13,18A4,4 0 0,0 17,14A4,4 0 0,0 13,10M20,20H4V8H20V20M20,2H4C2.89,2 2,2.89 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4C22,2.89 21.1,2 20,2Z',
  'mdi:dishwasher':         'M18,4V20H6V4H18M18,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V4A2,2 0 0,0 18,2M12,10A3,3 0 0,0 9,13A3,3 0 0,0 12,16A3,3 0 0,0 15,13A3,3 0 0,0 12,10M8,5H10V7H8V5M11,5H13V7H11V5Z',
  'mdi:heat-pump':          'M17.5,12A5.5,5.5 0 0,1 12,17.5A5.5,5.5 0 0,1 6.5,12A5.5,5.5 0 0,1 12,6.5A5.5,5.5 0 0,1 17.5,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  'mdi:car-electric':       'M16,6L19,10H21A1,1 0 0,1 22,11V15H20A3,3 0 0,1 17,18A3,3 0 0,1 14,15H10A3,3 0 0,1 7,18A3,3 0 0,1 4,15H2V11A1,1 0 0,1 3,10H6L9,6H16M7,11.5A1.5,1.5 0 0,0 5.5,13A1.5,1.5 0 0,0 7,14.5A1.5,1.5 0 0,0 8.5,13A1.5,1.5 0 0,0 7,11.5M17,11.5A1.5,1.5 0 0,0 15.5,13A1.5,1.5 0 0,0 17,14.5A1.5,1.5 0 0,0 18.5,13A1.5,1.5 0 0,0 17,11.5M15.5,7.5H9.5L8,10H18L15.5,7.5Z',
  'mdi:water-heater':       'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z',
  'mdi:lightning-bolt':     'M11,21H5L13,3H19L15.5,10H21L11,21M13.5,12H9.4L6.7,19H10.8L13.5,12M16.6,5H12.5L10.4,10H14.5L16.6,5Z',
  'mdi:lightbulb':          'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z',
  'mdi:power-socket-eu':    'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M9,8A2,2 0 0,0 7,10A2,2 0 0,0 9,12A2,2 0 0,0 11,10A2,2 0 0,0 9,8M15,8A2,2 0 0,0 13,10A2,2 0 0,0 15,12A2,2 0 0,0 17,10A2,2 0 0,0 15,8M12,13C10.5,13 9.19,13.63 8.27,14.63L9.68,16.04C10.24,15.4 11.07,15 12,15C12.93,15 13.76,15.4 14.32,16.04L15.73,14.63C14.81,13.63 13.5,13 12,13Z',
  'default':                'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
};

const PFC_AUTO_COLORS = ['#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#ef4444'];

function pfcPath(icon) { return PFC_ICONS[icon] || PFC_ICONS['default']; }
function pfcEl(tag)    { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

class PowerFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cfg  = null;
    this._hass = null;
    this._D    = null;
    this._L    = null;   // layout
    this._E    = null;   // element references
    this._pts  = [];     // animation particles
    this._tick = 0;
    this._raf  = null;
    this._vis  = null;
  }

  static getConfigElement() { return document.createElement('power-flow-card-editor'); }
  static getStubConfig() {
    return { solar_entity: 'sensor.solar_power', grid_entity: 'sensor.grid_power', home_entity: 'sensor.home_power' };
  }

  setConfig(cfg) {
    this._cfg = {
      solar_entity:   cfg.solar_entity   || null,
      grid_entity:    cfg.grid_entity    || null,
      home_entity:    cfg.home_entity    || null,
      battery_entity: cfg.battery_entity || null,
      battery_entities: Array.isArray(cfg.battery_entities) ? cfg.battery_entities : null,
      battery_soc_entity: cfg.battery_soc_entity || null,
      battery_stored_energy_entities: Array.isArray(cfg.battery_stored_energy_entities) ? cfg.battery_stored_energy_entities : null,
      battery_capacity_kwh: cfg.battery_capacity_kwh || null,
      title:          cfg.title || null,
      debounce_seconds: cfg.debounce_seconds !== undefined ? Math.max(0, parseInt(cfg.debounce_seconds)) : 8,
      grid_inverted:    cfg.grid_inverted    !== undefined ? !!cfg.grid_inverted    : false,
      battery_inverted: cfg.battery_inverted !== undefined ? !!cfg.battery_inverted : true,
      entities: Array.isArray(cfg.entities)
        ? cfg.entities.map((e, i) => ({
            entity: e.entity,
            name:   e.name  || e.entity,
            icon:   e.icon  || 'default',
            color:  e.color || PFC_AUTO_COLORS[i % PFC_AUTO_COLORS.length],
          }))
        : [],
      colors: {
        solar:   (cfg.colors && cfg.colors.solar)   || '#f59e0b',
        grid:    (cfg.colors && cfg.colors.grid)    || '#6366f1',
        battery: (cfg.colors && cfg.colors.battery) || '#ec4899',
        home:    (cfg.colors && cfg.colors.home)    || '#f97316',
      },
      labels: {
        solar:   (cfg.labels && cfg.labels.solar)   || 'Zonne-energie',
        grid:    (cfg.labels && cfg.labels.grid)    || 'Net',
        battery: (cfg.labels && cfg.labels.battery) || 'Batterij',
        home:    (cfg.labels && cfg.labels.home)    || 'Huis',
      },
    };
    this._buildDOM();
  }

  set hass(h) { this._hass = h; this._updateData(); }

  // ── Sensor helpers ─────────────────────────────────────────────────────────

  _val(entity) {
    if (!entity || !this._hass) return 0;
    const s = this._hass.states[entity];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return 0;
    const n = parseFloat(s.state);
    return isNaN(n) ? 0 : n;
  }

  _fmt(v) {
    const a = Math.abs(v);
    if (a >= 1000) return (v < 0 ? '-' : '') + (a / 1000).toFixed(2) + ' kW';
    return Math.round(v) + ' W';
  }

  // ── Flow state helpers ─────────────────────────────────────────────────────

  _solar()       { return this._D ? this._D.solar > 5 : false; }
  _gridImp()     { const g = this._D ? this._D.grid : 0; return this._cfg.grid_inverted ? g < 0 : g > 0; }
  _gridExp()     { const g = this._D ? this._D.grid : 0; return this._cfg.grid_inverted ? g > 0 : g < 0; }
  _batDis()      { const b = this._D ? this._D.bat  : 0; return this._cfg.battery_inverted ? b > 5 : b < -5; }
  _batCha()      { const b = this._D ? this._D.bat  : 0; return this._cfg.battery_inverted ? b < -5 : b > 5; }

  // Debounced consumer active check:
  // Een verbruiker wordt pas als "uit" beschouwd na 8 opeenvolgende lage metingen (~8 sec).
  // Zo verdwijnt een verbruiker niet door een korte sensor-glitch.
  _exOn(i) {
    if (!this._D) return false;
    const val = (this._D['ex' + i] || 0) > 5;
    if (!this._exDebounce) this._exDebounce = {};
    if (val) {
      this._exDebounce[i] = 0;  // reset counter als actief
      return true;
    } else {
      this._exDebounce[i] = (this._exDebounce[i] || 0) + 1;
      return this._exDebounce[i] <= this._cfg.debounce_seconds;
    }
  }

  // Solar surplus: solar > home consumption → also charge battery
  _solarSurplus() {
    if (!this._D || !this._solar()) return false;
    return this._D.solar > (this._D.home || 0);
  }

  // ── Build DOM (once) ───────────────────────────────────────────────────────

  _buildDOM() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._vis) { document.removeEventListener('visibilitychange', this._vis); this._vis = null; }
    this._pts = []; this._tick = 0;

    const cfg  = this._cfg;
    const c    = cfg.colors;
    const ents = cfg.entities;

    // ── Layout ────────────────────────────────────────────────────────────────
    const W       = 480;
    const R_H     = 46;   // home radius
    const R_S     = 36;   // source radius
    const R_C     = 30;   // consumer radius
    const S_GAP   = 130;  // source vertical gap
    const C_GAP   = 88;   // consumer vertical gap
    const PAD_TOP = 40;
    const LBL_H   = 18;   // label height above circle

    // Source column X / consumer column X / bus X / home center
    const SX   = 78;      // source X
    const HX   = 255;     // home X
    const BX   = HX + R_H + 18;  // bus X
    const CX   = W - 50;  // consumer X

    // Source Y positions: Net=top, Solar=middle, Battery=bottom
    // Center the source block around home Y
    const hasSolar = !!cfg.solar_entity;
    const hasGrid  = !!cfg.grid_entity;
    const hasBat   = !!(cfg.battery_entity || cfg.battery_entities);
    const srcList  = [];
    if (hasGrid)  srcList.push({ key: 'grid',  col: c.grid,    lbl: this._cfg.labels.grid,    icon: 'mdi:transmission-tower' });
    if (hasSolar) srcList.push({ key: 'solar', col: c.solar,   lbl: this._cfg.labels.solar,   icon: 'mdi:solar-panel' });
    if (hasBat)   srcList.push({ key: 'bat',   col: c.battery, lbl: this._cfg.labels.battery, icon: 'mdi:battery-high' });

    const srcBlockH = srcList.length > 0 ? (srcList.length - 1) * S_GAP + R_S * 2 + LBL_H : 0;
    // Fixed content height based on sources only — viewBox height grows dynamically
    const contentH  = Math.max(srcBlockH, R_H * 2 + LBL_H);
    const H         = contentH + PAD_TOP * 2 + 24;
    const midY      = PAD_TOP + contentH / 2;  // FIXED — never changes

    // Source Y: centered around fixed midY
    const srcStartY = midY - ((srcList.length - 1) * S_GAP) / 2;
    const srcPos    = {};
    srcList.forEach((s, i) => {
      srcPos[s.key] = { x: SX, y: srcStartY + i * S_GAP };
    });

    // Consumer Y positions — used as base offsets, actual positions computed dynamically
    const conStartY = PAD_TOP + LBL_H + R_C;
    const conYs     = ents.map((e, i) => conStartY + i * C_GAP);

    // Bus extents (initial, updated dynamically)
    const busTop    = conYs.length > 0 ? conYs[0]                : midY;
    const busBottom = conYs.length > 0 ? conYs[conYs.length - 1] : midY;

    // Store layout — HY and srcPos are FIXED, only viewBox height changes
    this._L = { W, H, R_H, R_S, R_C, SX, HX, HY: midY, BX, CX, C_GAP, PAD_TOP, LBL_H, srcBlockH, srcPos, srcList, conYs, busTop, busBottom, c };

    // ── HTML shell ────────────────────────────────────────────────────────────
    this.shadowRoot.innerHTML = `<style>
      :host { display: block }
      .card {
        background: var(--card-background-color, #fff);
        border-radius: 16px;
        border: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        padding: 12px 8px 16px;
        font-family: 'Helvetica Neue', system-ui, sans-serif;
      }
      .ttl {
        font-size: 11px; font-weight: 700; letter-spacing: .12em;
        text-transform: uppercase; text-align: center; margin-bottom: 4px;
        color: var(--secondary-text-color, #999);
      }
      svg { width: 100%; display: block; overflow: visible }
    </style>
    <div class="card">
      ${cfg.title ? `<div class="ttl">${cfg.title}</div>` : ''}
      <svg id="svg" viewBox="0 0 ${W} ${H}">
        <g id="lines"></g>
        <g id="dots"></g>
        <g id="nodes"></g>
      </svg>
    </div>`;

    const sr    = this.shadowRoot;
    const svg    = sr.getElementById('svg');
    const linesG = sr.getElementById('lines');
    const dotsG  = sr.getElementById('dots');
    const nodesG = sr.getElementById('nodes');

    this._E = { svg, dotsG, L: {}, V: {}, S: {}, CG: {} };  // L=lines, V=values, S=subs, CG=consumer groups

    // ── Lines ─────────────────────────────────────────────────────────────────

    // Source → Home lines (one per source)
    srcList.forEach(s => {
      const el = pfcEl('line');
      el.setAttribute('stroke', s.col);
      el.setAttribute('stroke-linecap', 'round');
      linesG.appendChild(el);
      this._E.L['src_' + s.key] = el;
    });

    // Solar → battery dashed line (always present when both configured)
    const hasSolarBat = !!(cfg.solar_entity && (cfg.battery_entity || cfg.battery_entities));
    if (hasSolarBat) {
      const el = pfcEl('line');
      el.setAttribute('stroke-linecap', 'round');
      linesG.appendChild(el);
      this._E.L['solar_bat'] = el;
    }

    // Home → bus (horizontal connector)
    if (ents.length > 0) {
      const el = pfcEl('line');
      el.setAttribute('stroke-linecap', 'round');
      linesG.appendChild(el);
      this._E.L['home_bus'] = el;

      // Bus vertical line
      const bv = pfcEl('line');
      bv.setAttribute('stroke-linecap', 'round');
      linesG.appendChild(bv);
      this._E.L['bus_v'] = bv;

      // Bus → each consumer: use <path> for rounded corners
      ents.forEach((e, i) => {
        const el = pfcEl('path');
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', e.color);
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
        linesG.appendChild(el);
        this._E.L['con_' + i] = el;
      });
    }

    // ── Source nodes ──────────────────────────────────────────────────────────

    srcList.forEach(s => {
      const pos   = srcPos[s.key];
      const isBat = s.key === 'bat';
      const g     = pfcEl('g');

      // Label above circle
      const lbl = pfcEl('text');
      lbl.setAttribute('x', pos.x); lbl.setAttribute('y', pos.y - R_S - 6);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-size', '11'); lbl.setAttribute('font-weight', '600');
      lbl.setAttribute('fill', 'var(--secondary-text-color, #777)');
      lbl.textContent = s.lbl; g.appendChild(lbl);

      // Circle
      const circ = pfcEl('circle');
      circ.setAttribute('cx', pos.x); circ.setAttribute('cy', pos.y); circ.setAttribute('r', R_S);
      circ.setAttribute('fill', 'none'); circ.setAttribute('stroke', s.col); circ.setAttribute('stroke-width', '2.5');
      g.appendChild(circ);

      // Icon
      const iconY = isBat ? pos.y - R_S + 10 : pos.y - 8;
      const ig = pfcEl('g');
      ig.setAttribute('transform', `translate(${pos.x - 9},${iconY - 9}) scale(0.75)`);
      const ip = pfcEl('path'); ip.setAttribute('d', pfcPath(s.icon)); ip.setAttribute('fill', s.col);
      ig.appendChild(ip); g.appendChild(ig);

      // Battery: SOC text + watt text
      if (isBat) {
        const socT = pfcEl('text');
        socT.setAttribute('x', pos.x); socT.setAttribute('y', pos.y + 4);
        socT.setAttribute('text-anchor', 'middle');
        socT.setAttribute('font-size', '12'); socT.setAttribute('font-weight', '700');
        socT.setAttribute('fill', s.col); socT.textContent = '--%';
        g.appendChild(socT); this._E.V['bat-soc'] = socT;

        const watT = pfcEl('text');
        watT.setAttribute('x', pos.x); watT.setAttribute('y', pos.y + 18);
        watT.setAttribute('text-anchor', 'middle');
        watT.setAttribute('font-size', '12'); watT.setAttribute('font-weight', '700');
        watT.setAttribute('fill', s.col); watT.textContent = '--';
        g.appendChild(watT); this._E.V['bat'] = watT;
      } else {
        // Single value text
        const valT = pfcEl('text');
        valT.setAttribute('x', pos.x); valT.setAttribute('y', pos.y + 14);
        valT.setAttribute('text-anchor', 'middle');
        valT.setAttribute('font-size', '12'); valT.setAttribute('font-weight', '700');
        valT.setAttribute('fill', s.col); valT.textContent = '--';
        g.appendChild(valT); this._E.V[s.key] = valT;
      }

      // Grid: import/export sub-labels below circle
      if (s.key === 'grid') {
        const gi = pfcEl('text');
        gi.setAttribute('x', pos.x); gi.setAttribute('y', pos.y + R_S + 14);
        gi.setAttribute('text-anchor', 'middle');
        gi.setAttribute('font-size', '9'); gi.setAttribute('font-weight', '500');
        gi.setAttribute('fill', s.col); g.appendChild(gi); this._E.S['gi'] = gi;

        const ge = pfcEl('text');
        ge.setAttribute('x', pos.x); ge.setAttribute('y', pos.y + R_S + 25);
        ge.setAttribute('text-anchor', 'middle');
        ge.setAttribute('font-size', '9'); ge.setAttribute('font-weight', '500');
        ge.setAttribute('fill', s.col); g.appendChild(ge); this._E.S['ge'] = ge;
      }

      nodesG.appendChild(g);
    });

    // ── Home node ─────────────────────────────────────────────────────────────
    {
      const g = pfcEl('g');
      const lbl = pfcEl('text');
      lbl.setAttribute('x', HX); lbl.setAttribute('y', midY - R_H - 6);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-size', '11'); lbl.setAttribute('font-weight', '600');
      lbl.setAttribute('fill', 'var(--secondary-text-color, #777)');
      lbl.textContent = this._cfg.labels.home; g.appendChild(lbl);

      const circ = pfcEl('circle');
      circ.setAttribute('cx', HX); circ.setAttribute('cy', midY); circ.setAttribute('r', R_H);
      circ.setAttribute('fill', 'none'); circ.setAttribute('stroke', c.home); circ.setAttribute('stroke-width', '3');
      g.appendChild(circ);

      const ig = pfcEl('g');
      ig.setAttribute('transform', `translate(${HX - 11},${midY - 11 - 9}) scale(0.916)`);
      const ip = pfcEl('path'); ip.setAttribute('d', pfcPath('mdi:home')); ip.setAttribute('fill', c.home);
      ig.appendChild(ip); g.appendChild(ig);

      const valT = pfcEl('text');
      valT.setAttribute('x', HX); valT.setAttribute('y', midY + 20);
      valT.setAttribute('text-anchor', 'middle');
      valT.setAttribute('font-size', '14'); valT.setAttribute('font-weight', '700');
      valT.setAttribute('fill', c.home); valT.textContent = '--';
      g.appendChild(valT); this._E.V['home'] = valT;
      this._E.homeG = g;
      nodesG.appendChild(g);
    }

    // ── Consumer nodes ────────────────────────────────────────────────────────
    ents.forEach((e, i) => {
      const cy = conYs[i];
      const g  = pfcEl('g');

      const lbl = pfcEl('text');
      lbl.setAttribute('x', CX); lbl.setAttribute('y', cy - R_C - 6);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-size', '11'); lbl.setAttribute('font-weight', '600');
      lbl.setAttribute('fill', 'var(--secondary-text-color, #777)');
      lbl.textContent = e.name; g.appendChild(lbl);

      const circ = pfcEl('circle');
      circ.setAttribute('cx', CX); circ.setAttribute('cy', cy); circ.setAttribute('r', R_C);
      circ.setAttribute('fill', 'none'); circ.setAttribute('stroke', e.color); circ.setAttribute('stroke-width', '2.5');
      g.appendChild(circ);

      if (e.icon && e.icon !== 'default') {
        const ig = pfcEl('g');
        ig.setAttribute('transform', `translate(${CX - 8},${cy - 8 - 4}) scale(0.666)`);
        const ip = pfcEl('path'); ip.setAttribute('d', pfcPath(e.icon)); ip.setAttribute('fill', e.color);
        ig.appendChild(ip); g.appendChild(ig);
      }

      const valT = pfcEl('text');
      valT.setAttribute('x', CX);
      valT.setAttribute('y', (e.icon && e.icon !== 'default') ? cy + 12 : cy + 5);
      valT.setAttribute('text-anchor', 'middle');
      valT.setAttribute('font-size', '12'); valT.setAttribute('font-weight', '700');
      valT.setAttribute('fill', e.color); valT.textContent = '--';
      g.appendChild(valT); this._E.V['ex' + i] = valT;

      this._E.CG[i] = g;
      nodesG.appendChild(g);
    });

    this._updateData();
    this._startAnim();
  }

  // ── Data update ────────────────────────────────────────────────────────────

  _updateData() {
    if (!this._hass || !this._cfg || !this._E) return;
    const cfg = this._cfg;

    this._D = {
      solar: this._val(cfg.solar_entity),
      grid:  this._val(cfg.grid_entity),
      bat:   cfg.battery_entities
               ? cfg.battery_entities.reduce((s, e) => s + this._val(e), 0)
               : this._val(cfg.battery_entity),
      home:  this._val(cfg.home_entity),
      soc:   cfg.battery_stored_energy_entities && cfg.battery_capacity_kwh
               ? Math.min(100, Math.round(
                   cfg.battery_stored_energy_entities.reduce((s, e) => s + this._val(e), 0)
                   / cfg.battery_capacity_kwh * 100))
               : this._val(cfg.battery_soc_entity),
    };
    cfg.entities.forEach((e, i) => { this._D['ex' + i] = this._val(e.entity); });

    this._updateLabels();
    this._updateLines();
  }

  _updateLabels() {
    if (!this._D || !this._E) return;
    const D = this._D, cfg = this._cfg, V = this._E.V, S = this._E.S;

    if (V.solar) V.solar.textContent = this._fmt(D.solar);
    if (V.home)  V.home.textContent  = this._fmt(D.home);
    if (V.bat) {
      V.bat.textContent = this._fmt(Math.abs(D.bat));
      if (V['bat-soc'] && (cfg.battery_soc_entity || (cfg.battery_stored_energy_entities && cfg.battery_capacity_kwh))) {
        V['bat-soc'].textContent = Math.round(D.soc) + '%';
      }
    }
    if (V.grid) {
      V.grid.textContent = this._fmt(Math.abs(D.grid));
      const gi = cfg.grid_inverted;
      const imp = gi ? Math.max(0, -D.grid) : Math.max(0,  D.grid);
      const exp = gi ? Math.max(0,  D.grid) : Math.max(0, -D.grid);
      if (S.gi) S.gi.textContent = '→ ' + this._fmt(imp);
      if (S.ge) S.ge.textContent = '← ' + this._fmt(exp);
    }
    cfg.entities.forEach((e, i) => {
      if (V['ex' + i]) V['ex' + i].textContent = this._fmt(D['ex' + i] || 0);
    });
  }

  _updateLines() {
    if (!this._E || !this._L) return;
    const L   = this._L;
    const EL  = this._E.L;
    const cfg = this._cfg;
    const c   = L.c;

    // ── Dynamic SVG height: grows downward based on active consumers ──────────
    // Sources and home stay at their fixed Y positions (L.HY never changes)
    const activeCount = cfg.entities.filter((e, i) => this._exOn(i)).length;
    const HX = L.HX, HY = L.HY, RH = L.R_H;  // FIXED positions

    if (this._E.svg) {
      const conBlockH = activeCount > 0 ? (activeCount - 1) * L.C_GAP + L.R_C * 2 + L.LBL_H : 0;
      // ViewBox height = enough to show sources AND active consumers, starting from top
      const neededH = Math.max(
        L.srcBlockH + L.PAD_TOP * 2 + 24,          // source column height
        HY + conBlockH / 2 + L.R_C + L.PAD_TOP     // consumers below home center
      );
      this._E.svg.setAttribute('viewBox', `0 0 ${L.W} ${neededH}`);
    }

    // Home node stays at fixed HY — no transform needed
    if (this._E.homeG) this._E.homeG.setAttribute('transform', '');

    // Helper: set line from circle edge to circle edge
    const setLine = (el, x1, y1, r1, x2, y2, r2, col, on) => {
      if (!el) return;
      const dx = x2 - x1, dy = y2 - y1;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const sx = x1 + dx / d * r1, sy = y1 + dy / d * r1;
      const ex = x2 - dx / d * r2, ey = y2 - dy / d * r2;
      el.setAttribute('x1', sx); el.setAttribute('y1', sy);
      el.setAttribute('x2', ex); el.setAttribute('y2', ey);
      el.setAttribute('stroke', col);
      el.setAttribute('stroke-width', on ? '2.5' : '1.5');
      el.setAttribute('stroke-dasharray', on ? 'none' : '5 5');
      el.setAttribute('opacity', on ? '0.8' : '0.15');
    };

    // Grid → home (or home → grid)
    const gp = L.srcPos['grid'];
    if (gp && EL['src_grid']) {
      const on = this._gridImp() || this._gridExp();
      setLine(EL['src_grid'], gp.x, gp.y, L.R_S, HX, HY, RH, c.grid, on);
    }

    // Solar → home
    const sp = L.srcPos['solar'];
    if (sp && EL['src_solar']) {
      const on = this._solar();
      setLine(EL['src_solar'], sp.x, sp.y, L.R_S, HX, HY, RH, c.solar, on);
    }

    // Battery → home (or home → battery)
    const bp = L.srcPos['bat'];
    if (bp && EL['src_bat']) {
      const on = this._batDis() || this._batCha();
      setLine(EL['src_bat'], bp.x, bp.y, L.R_S, HX, HY, RH, c.battery, on);
    }

    // Solar → battery dashed line (always shown, active when charging from solar)
    if (sp && bp && EL['solar_bat']) {
      const on = this._solar() && this._batCha();
      setLine(EL['solar_bat'], sp.x, sp.y, L.R_S, bp.x, bp.y, L.R_S, c.solar, on);
    }

    // Move home node group to new vertical center
    if (this._E.homeG) {
      const dy = HY - L.HY;
      this._E.homeG.setAttribute('transform', dy !== 0 ? `translate(0,${dy})` : '');
    }

    // Bus vertical en horizontal: dynamisch herpositioneren gecentreerd op huis
    const activeIdxs = cfg.entities.map((e, i) => i).filter(i => this._exOn(i));
    const anyOn = activeIdxs.length > 0;

    // Herbereken Y-posities gecentreerd rond nieuw HY
    const activeConYs = {};
    if (anyOn) {
      const n = activeIdxs.length;
      const startY = HY - ((n - 1) * L.C_GAP) / 2;
      activeIdxs.forEach((origIdx, pos) => {
        activeConYs[origIdx] = startY + pos * L.C_GAP;
      });
    }

    const hbEl = EL['home_bus'];
    if (hbEl) hbEl.setAttribute('display', anyOn ? '' : 'none');
    if (anyOn && hbEl) {
      hbEl.setAttribute('x1', HX + RH); hbEl.setAttribute('y1', HY);
      hbEl.setAttribute('x2', L.BX);    hbEl.setAttribute('y2', HY);
      hbEl.setAttribute('stroke', '#22c55e'); hbEl.setAttribute('stroke-width', '2');
      hbEl.setAttribute('stroke-dasharray', 'none'); hbEl.setAttribute('opacity', '0.6');
    }

    const bvEl = EL['bus_v'];
    if (bvEl) {
      if (anyOn) {
        const ys = Object.values(activeConYs);
        bvEl.setAttribute('display', '');
        bvEl.setAttribute('x1', L.BX); bvEl.setAttribute('x2', L.BX);
        bvEl.setAttribute('y1', Math.min(...ys)); bvEl.setAttribute('y2', Math.max(...ys));
        bvEl.setAttribute('stroke', '#22c55e'); bvEl.setAttribute('stroke-width', '2');
        bvEl.setAttribute('stroke-dasharray', 'none'); bvEl.setAttribute('opacity', '0.6');
      } else {
        bvEl.setAttribute('display', 'none');
      }
    }

    cfg.entities.forEach((e, i) => {
      const el = EL['con_' + i];
      const on = this._exOn(i);
      const cg = this._E.CG[i];
      if (cg) cg.setAttribute('display', on ? '' : 'none');
      if (on && cg && activeConYs[i] !== undefined) {
        const oldY = L.conYs[i];
        const newY = activeConYs[i];
        const dy   = newY - oldY;
        cg.setAttribute('transform', dy !== 0 ? `translate(0,${dy})` : '');
      }
      if (el) {
        el.setAttribute('display', on ? '' : 'none');
        if (on && activeConYs[i] !== undefined) {
          const cy  = activeConYs[i];
          const r   = 18; // corner radius — larger for smoother look
          // Rounded L-path from bus vertical line down/up to consumer
          let d;
          if (Math.abs(cy - HY) < 2) {
            d = `M${L.BX},${HY} L${L.CX - L.R_C},${cy}`;
          } else if (cy < HY) {
            d = `M${L.BX},${HY} L${L.BX},${cy + r} Q${L.BX},${cy} ${L.BX + r},${cy} L${L.CX - L.R_C},${cy}`;
          } else {
            d = `M${L.BX},${HY} L${L.BX},${cy - r} Q${L.BX},${cy} ${L.BX + r},${cy} L${L.CX - L.R_C},${cy}`;
          }
          el.setAttribute('d', d);
          el.setAttribute('stroke-width', '2.5');
          el.setAttribute('stroke-dasharray', 'none');
          el.setAttribute('opacity', '0.8');
        }
      }
    });
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  _startAnim() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._vis = () => {
      if (!document.hidden) {
        this._pts.forEach(p => p.dot && p.dot.remove());
        this._pts = []; this._tick = 0;
        this._startAnim();
      }
    };
    document.removeEventListener('visibilitychange', this._vis);
    document.addEventListener('visibilitychange', this._vis);

    const loop = () => {
      if (document.hidden) { this._raf = null; return; }

      if (this._tick % 18 === 0 && this._D && this._L) {
        const L   = this._L;
        const cfg = this._cfg;
        const c   = L.c;
        const dG  = this._E.dotsG;

        // Spawn a dot along a polyline path (array of {x,y} points)
        const spawn = (pts, col, r) => {
          if (!pts || pts.length < 2) return;
          const dot = pfcEl('circle');
          dot.setAttribute('r', r || '5');
          dot.setAttribute('fill', col);
          dot.setAttribute('opacity', '0.92');
          dG.appendChild(dot);
          this._pts.push({ dot, pts, t: 0, spd: 0.006 + Math.random() * 0.003 });
        };

        // Edge point from circle A toward B
        const ep = (ax, ay, R, bx, by) => {
          const dx = bx - ax, dy = by - ay, d = Math.sqrt(dx*dx+dy*dy)||1;
          return { x: ax+dx/d*R, y: ay+dy/d*R };
        };

        // Use fixed HY — sources and home never move
        const HX = L.HX, HY = L.HY, RH = L.R_H, RS = L.R_S, RC = L.R_C;
        const sp = L.srcPos['solar'];
        const gp = L.srcPos['grid'];
        const bp = L.srcPos['bat'];

        // ── Solar → Huis (altijd als zon actief)
        if (this._solar() && sp) {
          const p1 = ep(sp.x, sp.y, RS, HX, HY);
          const p2 = ep(HX, HY, RH, sp.x, sp.y);
          spawn([p1, p2], c.solar);
          spawn([p1, p2], c.solar);  // 2 stippen per flow
        }

        // ── Solar → Batterij (als surplus EN batterij laadt)
        if (this._solar() && this._solarSurplus() && this._batCha() && sp && bp) {
          const p1 = ep(sp.x, sp.y, RS, bp.x, bp.y);
          const p2 = ep(bp.x, bp.y, RS, sp.x, sp.y);
          spawn([p1, p2], c.solar);
        }

        // ── Net → Huis (import)
        if (this._gridImp() && gp) {
          const p1 = ep(gp.x, gp.y, RS, HX, HY);
          const p2 = ep(HX, HY, RH, gp.x, gp.y);
          spawn([p1, p2], c.grid);
          spawn([p1, p2], c.grid);
        }

        // ── Huis → Net (export)
        if (this._gridExp() && gp) {
          const p1 = ep(HX, HY, RH, gp.x, gp.y);
          const p2 = ep(gp.x, gp.y, RS, HX, HY);
          spawn([p1, p2], c.grid);
        }

        // ── Batterij → Huis (ontladen)
        if (this._batDis() && bp) {
          const p1 = ep(bp.x, bp.y, RS, HX, HY);
          const p2 = ep(HX, HY, RH, bp.x, bp.y);
          spawn([p1, p2], c.battery);
          spawn([p1, p2], c.battery);
        }

        // ── Huis → Batterij (laden zonder zon)
        if (this._batCha() && !this._solar() && bp) {
          const p1 = ep(HX, HY, RH, bp.x, bp.y);
          const p2 = ep(bp.x, bp.y, RS, HX, HY);
          spawn([p1, p2], c.battery);
        }

        // ── Huis → Verbruikers (via bus, afgeronde hoeken)
        const activeIdxs2 = cfg.entities.map((e, i) => i).filter(i => this._exOn(i));
        if (activeIdxs2.length > 0) {
          const n2 = activeIdxs2.length;
          const startY2 = HY - ((n2 - 1) * L.C_GAP) / 2;
          activeIdxs2.forEach((origIdx, pos) => {
            const cy = startY2 + pos * L.C_GAP;
            const e  = cfg.entities[origIdx];
            const r  = 18;
            if (Math.abs(cy - HY) < 2) {
              // Straight line
              spawn([
                { x: HX + RH,   y: HY },
                { x: L.CX - RC, y: cy },
              ], e.color, 4);
            } else {
              // Rounded bend — approximate with extra waypoints
              const bendY = cy < HY ? cy + r : cy - r;
              spawn([
                { x: HX + RH,   y: HY },
                { x: L.BX,      y: HY },
                { x: L.BX,      y: bendY },
                { x: L.BX + r,  y: cy },
                { x: L.CX - RC, y: cy },
              ], e.color, 4);
            }
          });
        }      }

      // Move dots
      for (let i = this._pts.length - 1; i >= 0; i--) {
        const p = this._pts[i];
        p.t += p.spd;
        if (p.t >= 1) { p.dot.remove(); this._pts.splice(i, 1); continue; }
        const segs = p.pts.length - 1;
        const seg  = Math.min(Math.floor(p.t * segs), segs - 1);
        const lt   = p.t * segs - seg;
        const A    = p.pts[seg], B = p.pts[seg + 1];
        p.dot.setAttribute('cx', A.x + (B.x - A.x) * lt);
        p.dot.setAttribute('cy', A.y + (B.y - A.y) * lt);
      }

      this._tick++;
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  connectedCallback() {
    if (this._cfg && !this._raf) {
      this._pts.forEach(p => p.dot && p.dot.remove());
      this._pts = []; this._tick = 0;
      this._startAnim();
    }
  }

  disconnectedCallback() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._vis) { document.removeEventListener('visibilitychange', this._vis); this._vis = null; }
  }

  getCardSize() { return 5; }
}

if (!customElements.get('power-flow-card')) {
  customElements.define('power-flow-card', PowerFlowCard);
}
window.customCards = window.customCards || [];
window.customCards.push({ type: 'power-flow-card', name: 'Power Flow Card', description: 'Animated power flow card', preview: true });
