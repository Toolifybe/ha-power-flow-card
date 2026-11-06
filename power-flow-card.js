/**
 * Power Flow Card v3.2.0
 *
 * Layout:
 *   Links kolom (boven→onder): Net, Zonne-energie, Batterij
 *   Midden: Huis
 *   Rechts kolom: Verbruikers (verticale bus)
 *
 * Stromen worden berekend uit de energiebalans:
 *   huis = zon + net-import + batterij-ontladen − export − laden
 *   Zon gaat eerst naar het huis, dan naar de batterij, de rest naar het net.
 *   Laden dat niet uit de zon komt, loopt huis → batterij (van het net).
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
 * home_entity: sensor.home_power      # optioneel; zonder wordt het huisverbruik berekend
 * min_power: 10                       # optioneel; kleinere stromen worden niet geanimeerd
 * title: Energiestroom
 * entities:
 *   - entity: sensor.pc_power
 *     name: PC
 *     icon: mdi:desktop-classic
 *     color: '#22c55e'
 */

const PFC_VERSION = '3.2.0';
const PFC_AUTO_COLORS = ['#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#ef4444'];
const PFC_CONSUMER_MIN_W = 5;     // een verbruiker telt als "aan" boven deze waarde
const PFC_SPAWN_MS       = 300;   // om de hoeveel ms er nieuwe stippen vertrekken
const PFC_POWER_UNITS    = { w: 1, kw: 1000, mw: 1e6 };
const PFC_ENERGY_UNITS   = { wh: 0.001, kwh: 1, mwh: 1000 };   // naar kWh

function pfcEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

// Lichtere tint van een kleur voor de glans van de bol. Geen #rgb/#rrggbb → zelfde kleur.
function pfcLighter(col) {
  let m = /^#([0-9a-f]{3})$/i.exec(col);
  if (m) col = '#' + m[1].split('').map(ch => ch + ch).join('');
  m = /^#([0-9a-f]{6})$/i.exec(col);
  if (!m) return col;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${Math.min(255, r + 90)},${Math.min(255, g + 90)},${Math.min(255, b + 90)})`;
}

class PowerFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cfg   = null;
    this._hass  = null;
    this._D     = null;    // laatste meetwaarden
    this._F     = null;    // berekende stromen
    this._L     = null;    // layout
    this._E     = null;    // element-referenties
    this._pts   = [];      // bewegende stippen
    this._flows = [];      // paden waarlangs stippen vertrekken
    this._raf   = null;
    this._timer = null;
    this._lastSpawn = 0;
    this._lastFrame = 0;
    this._lastOn    = {};  // verbruiker i → tijdstip (ms) waarop hij laatst "aan" was
    this._active    = [];  // indexen van zichtbare verbruikers
    this._layoutKey = null;
    this._seen      = null; // laatst geziene state-objecten, om onnodig werk te vermijden
    this._onVis = () => {
      if (document.hidden) return;
      this._clearDots();
      if (this.isConnected) this._startAnim();
    };
  }

  // Geen getConfigElement: er is geen visuele editor, HA toont dan de YAML-editor.
  static getStubConfig() {
    return { solar_entity: 'sensor.solar_power', grid_entity: 'sensor.grid_power' };
  }

  setConfig(cfg) {
    if (!cfg) throw new Error('Geen configuratie');
    const list = (v) => Array.isArray(v) ? v.filter(Boolean) : null;
    const num  = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    this._cfg = {
      solar_entity:   cfg.solar_entity   || null,
      grid_entity:    cfg.grid_entity    || null,
      home_entity:    cfg.home_entity    || null,
      battery_entity: cfg.battery_entity || null,
      battery_entities: list(cfg.battery_entities),
      battery_soc_entity: cfg.battery_soc_entity || null,
      battery_stored_energy_entities: list(cfg.battery_stored_energy_entities),
      battery_capacity_kwh: num(cfg.battery_capacity_kwh, 0) || null,
      title:          cfg.title || null,
      debounce_seconds: Math.max(0, num(cfg.debounce_seconds, 8)),
      min_power:        Math.max(0, num(cfg.min_power, 10)),
      grid_inverted:    cfg.grid_inverted    !== undefined ? !!cfg.grid_inverted    : false,
      battery_inverted: cfg.battery_inverted !== undefined ? !!cfg.battery_inverted : true,
      entities: Array.isArray(cfg.entities)
        ? cfg.entities.filter(e => e && e.entity).map((e, i) => ({
            entity: e.entity,
            name:   e.name  || e.entity,
            icon:   e.icon && e.icon !== 'default' ? e.icon : null,
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
    const c = this._cfg;
    this._entityIds = [
      c.solar_entity, c.grid_entity, c.home_entity, c.battery_entity, c.battery_soc_entity,
      ...(c.battery_entities || []), ...(c.battery_stored_energy_entities || []),
      ...c.entities.map(e => e.entity),
    ].filter(Boolean);
    this._lastOn = {};
    this._seen = null;
    this._buildDOM();
  }

  set hass(h) {
    this._hass = h;
    // HA roept dit aan bij élke statuswijziging in het hele systeem: alleen werken als
    // één van onze sensoren veranderde.
    if (this._entityIds && this._seen) {
      const changed = this._entityIds.some((id, i) => h.states[id] !== this._seen[i]);
      if (!changed) return;
    }
    if (this._entityIds) this._seen = this._entityIds.map(id => h.states[id]);
    this._updateData();
  }

  // ── Sensor helpers ─────────────────────────────────────────────────────────

  // Getal uit een sensor, omgerekend naar W (power) of kWh (energy). null = niet beschikbaar.
  _num(entity, kind) {
    if (!entity || !this._hass) return null;
    const s = this._hass.states[entity];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    const n = parseFloat(s.state);
    if (isNaN(n)) return null;
    const unit = String((s.attributes && s.attributes.unit_of_measurement) || '').toLowerCase().trim();
    const table = kind === 'energy' ? PFC_ENERGY_UNITS : kind === 'power' ? PFC_POWER_UNITS : null;
    const f = table && table[unit];
    return f ? n * f : n;
  }

  // Som van meerdere sensoren; null als ze allemaal onbeschikbaar zijn.
  _sum(entities, kind) {
    let tot = 0, any = false;
    entities.forEach(e => { const v = this._num(e, kind); if (v !== null) { tot += v; any = true; } });
    return any ? tot : null;
  }

  _nf(digits) {
    const lang = (this._hass && ((this._hass.locale && this._hass.locale.language) || this._hass.language)) || undefined;
    const key = lang + '|' + digits;
    this._nfCache = this._nfCache || {};
    if (!this._nfCache[key]) {
      try {
        this._nfCache[key] = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      } catch (e) {
        this._nfCache[key] = new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      }
    }
    return this._nfCache[key];
  }

  _fmt(v) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    const a = Math.abs(v);
    if (a >= 1000) return this._nf(2).format(v / 1000) + ' kW';
    return this._nf(0).format(Math.round(v)) + ' W';
  }

  // ── Build DOM (once per config) ────────────────────────────────────────────

  _buildDOM() {
    this._stopAnim();
    this._clearDots();
    this._layoutKey = null;

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

    const SX   = 78;              // source X
    const HX   = 255;             // home X
    const BX   = HX + R_H + 18;   // bus X
    const CX   = W - 50;          // consumer X

    const hasSolar = !!cfg.solar_entity;
    const hasGrid  = !!cfg.grid_entity;
    const hasBat   = !!(cfg.battery_entity || cfg.battery_entities);
    const srcList  = [];
    if (hasGrid)  srcList.push({ key: 'grid',  col: c.grid,    lbl: cfg.labels.grid,    icon: 'mdi:transmission-tower' });
    if (hasSolar) srcList.push({ key: 'solar', col: c.solar,   lbl: cfg.labels.solar,   icon: 'mdi:solar-panel' });
    if (hasBat)   srcList.push({ key: 'bat',   col: c.battery, lbl: cfg.labels.battery, icon: 'mdi:battery-high' });

    const srcBlockH = srcList.length > 0 ? (srcList.length - 1) * S_GAP + R_S * 2 + LBL_H : 0;
    const contentH  = Math.max(srcBlockH, R_H * 2 + LBL_H);
    const H         = contentH + PAD_TOP * 2 + 24;
    const midY      = PAD_TOP + contentH / 2;   // vast: bronnen en huis bewegen nooit

    const srcStartY = midY - ((srcList.length - 1) * S_GAP) / 2;
    const srcPos    = {};
    srcList.forEach((s, i) => { srcPos[s.key] = { x: SX, y: srcStartY + i * S_GAP }; });

    // Basispositie van de verbruikers; de echte positie volgt via een translate.
    const conStartY = PAD_TOP + LBL_H + R_C;
    const conYs     = ents.map((e, i) => conStartY + i * C_GAP);

    this._L = { W, H, R_H, R_S, R_C, SX, HX, HY: midY, BX, CX, C_GAP, PAD_TOP, LBL_H, srcBlockH, srcPos, srcList, conYs, c };

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
      foreignObject { overflow: visible }
      ha-icon { display: block; color: #fff; opacity: .9; line-height: 0 }
    </style>
    <div class="card">
      <div class="ttl" id="ttl"></div>
      <svg id="svg" viewBox="0 0 ${W} ${H}">
        <defs id="defs"></defs>
        <g id="lines"></g>
        <g id="dots"></g>
        <g id="nodes"></g>
      </svg>
    </div>`;

    const sr     = this.shadowRoot;
    const ttl    = sr.getElementById('ttl');
    if (cfg.title) ttl.textContent = cfg.title; else ttl.remove();
    const svg    = sr.getElementById('svg');
    const defs   = sr.getElementById('defs');
    const linesG = sr.getElementById('lines');
    const dotsG  = sr.getElementById('dots');
    const nodesG = sr.getElementById('nodes');

    this._E = { svg, dotsG, L: {}, V: {}, S: {}, CG: {} };  // L=lines, V=values, S=subs, CG=consumer groups

    // ── Lines ─────────────────────────────────────────────────────────────────
    const mkLine = (key) => {
      const el = pfcEl('line');
      el.setAttribute('stroke-linecap', 'round');
      linesG.appendChild(el);
      this._E.L[key] = el;
    };
    srcList.forEach(s => mkLine('src_' + s.key));
    if (hasSolar && hasBat) mkLine('solar_bat');

    if (ents.length > 0) {
      const hb = pfcEl('line');
      hb.setAttribute('stroke-linecap', 'round');
      hb.setAttribute('stroke', '#22c55e'); hb.setAttribute('stroke-width', '2'); hb.setAttribute('opacity', '0.6');
      linesG.appendChild(hb);
      this._E.L['home_bus'] = hb;

      ents.forEach((e, i) => {
        const el = pfcEl('path');
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', e.color);
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
        el.setAttribute('stroke-width', '2.5');
        el.setAttribute('opacity', '0.8');
        linesG.appendChild(el);
        this._E.L['con_' + i] = el;
      });
    }

    // ── Radiale verlopen voor de 3D-look ─────────────────────────────────────
    const makeGrad = (id, col) => {
      const rg = pfcEl('radialGradient');
      rg.setAttribute('id', id);
      rg.setAttribute('cx', '35%'); rg.setAttribute('cy', '30%'); rg.setAttribute('r', '65%');
      const s1 = pfcEl('stop'); s1.setAttribute('offset', '0%');   s1.setAttribute('stop-color', pfcLighter(col));
      const s2 = pfcEl('stop'); s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', col);
      rg.appendChild(s1); rg.appendChild(s2); defs.appendChild(rg);
    };
    makeGrad('pfc_g_solar',   c.solar);
    makeGrad('pfc_g_grid',    c.grid);
    makeGrad('pfc_g_bat',     c.battery);
    makeGrad('pfc_g_home',    c.home);
    ents.forEach((e, i) => makeGrad(`pfc_g_ex${i}`, e.color));

    const draw3DSphere = (g, cx, cy, r, gradId, col) => {
      const shadow = pfcEl('ellipse');
      shadow.setAttribute('cx', cx); shadow.setAttribute('cy', cy + r + 4);
      shadow.setAttribute('rx', r * 0.85); shadow.setAttribute('ry', r * 0.22);
      shadow.setAttribute('fill', col); shadow.setAttribute('opacity', '0.18');
      g.appendChild(shadow);
      const circ = pfcEl('circle');
      circ.setAttribute('cx', cx); circ.setAttribute('cy', cy); circ.setAttribute('r', r);
      circ.setAttribute('fill', `url(#${gradId})`);
      g.appendChild(circ);
      const hl = pfcEl('ellipse');
      hl.setAttribute('cx', cx - r * 0.25); hl.setAttribute('cy', cy - r * 0.28);
      hl.setAttribute('rx', r * 0.32); hl.setAttribute('ry', r * 0.18);
      hl.setAttribute('fill', 'white'); hl.setAttribute('opacity', '0.28');
      hl.setAttribute('transform', `rotate(-25,${cx - r * 0.25},${cy - r * 0.28})`);
      g.appendChild(hl);
    };

    // Icoon via HA's eigen <ha-icon>: kent alle mdi-iconen.
    const drawIcon = (g, name, cx, cy, size) => {
      const fo = pfcEl('foreignObject');
      fo.setAttribute('x', cx - size / 2); fo.setAttribute('y', cy - size / 2);
      fo.setAttribute('width', size); fo.setAttribute('height', size);
      const hi = document.createElement('ha-icon');
      hi.setAttribute('icon', name);
      hi.style.setProperty('--mdc-icon-size', size + 'px');
      hi.style.width = size + 'px'; hi.style.height = size + 'px';
      fo.appendChild(hi);
      g.appendChild(fo);
    };

    const drawText = (g, x, y, size, weight, fill, txt) => {
      const t = pfcEl('text');
      t.setAttribute('x', x); t.setAttribute('y', y);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', size); t.setAttribute('font-weight', weight);
      t.setAttribute('fill', fill); t.textContent = txt;
      g.appendChild(t);
      return t;
    };
    const LBL_FILL = 'var(--secondary-text-color, #777)';

    // ── Source nodes ──────────────────────────────────────────────────────────
    srcList.forEach(s => {
      const pos = srcPos[s.key];
      const g   = pfcEl('g');
      drawText(g, pos.x, pos.y - R_S - 6, '11', '600', LBL_FILL, s.lbl);
      draw3DSphere(g, pos.x, pos.y, R_S, `pfc_g_${s.key}`, s.col);

      if (s.key === 'bat') {
        drawIcon(g, s.icon, pos.x, pos.y - 17, 16);
        this._E.V['bat-soc'] = drawText(g, pos.x, pos.y + 4,  '12', '700', 'white', '--%');
        this._E.V['bat']     = drawText(g, pos.x, pos.y + 18, '12', '700', 'white', '--');
      } else {
        drawIcon(g, s.icon, pos.x, pos.y - 8, 18);
        this._E.V[s.key] = drawText(g, pos.x, pos.y + 14, '12', '700', 'white', '--');
      }

      if (s.key === 'grid') {
        this._E.S['gi'] = drawText(g, pos.x, pos.y + R_S + 14, '9', '500', s.col, '');
        this._E.S['ge'] = drawText(g, pos.x, pos.y + R_S + 25, '9', '500', s.col, '');
      }
      nodesG.appendChild(g);
    });

    // ── Home node ─────────────────────────────────────────────────────────────
    {
      const g = pfcEl('g');
      drawText(g, HX, midY - R_H - 6, '11', '600', LBL_FILL, cfg.labels.home);
      draw3DSphere(g, HX, midY, R_H, 'pfc_g_home', c.home);
      drawIcon(g, 'mdi:home', HX, midY - 9, 22);
      this._E.V['home'] = drawText(g, HX, midY + 20, '14', '700', 'white', '--');
      nodesG.appendChild(g);
    }

    // ── Consumer nodes ────────────────────────────────────────────────────────
    ents.forEach((e, i) => {
      const cy = conYs[i];
      const g  = pfcEl('g');
      drawText(g, CX, cy - R_C - 6, '11', '600', LBL_FILL, e.name);
      draw3DSphere(g, CX, cy, R_C, `pfc_g_ex${i}`, e.color);
      if (e.icon) drawIcon(g, e.icon, CX, cy - 4, 16);
      this._E.V['ex' + i] = drawText(g, CX, e.icon ? cy + 12 : cy + 5, '12', '700', 'white', '--');
      g.setAttribute('display', 'none');
      this._E.CG[i] = g;
      nodesG.appendChild(g);
    });

    this._updateData();
    if (this.isConnected) this._startAnim();
  }

  // ── Data update ────────────────────────────────────────────────────────────

  _updateData() {
    if (!this._hass || !this._cfg || !this._E) return;
    const cfg = this._cfg;

    const solarRaw = this._num(cfg.solar_entity, 'power');
    const gridRaw  = this._num(cfg.grid_entity, 'power');
    const batRaw   = cfg.battery_entities ? this._sum(cfg.battery_entities, 'power') : this._num(cfg.battery_entity, 'power');

    let soc = null;
    if (cfg.battery_stored_energy_entities && cfg.battery_capacity_kwh) {
      const kwh = this._sum(cfg.battery_stored_energy_entities, 'energy');
      if (kwh !== null) soc = Math.max(0, Math.min(100, kwh / cfg.battery_capacity_kwh * 100));
    } else if (cfg.battery_soc_entity) {
      soc = this._num(cfg.battery_soc_entity, null);
    }

    // Genormaliseerd: grid > 0 = import, bat > 0 = ontladen. Zon nooit negatief.
    const solar = Math.max(0, solarRaw || 0);
    const grid  = gridRaw === null ? 0 : (cfg.grid_inverted ? -gridRaw : gridRaw);
    const bat   = batRaw  === null ? 0 : (cfg.battery_inverted ? batRaw : -batRaw);

    const imp = Math.max(0, grid), exp = Math.max(0, -grid);
    const dis = Math.max(0, bat),  cha = Math.max(0, -bat);
    const homeCalc  = Math.max(0, solar + imp + dis - exp - cha);
    const homeShown = cfg.home_entity ? this._num(cfg.home_entity, 'power') : homeCalc;

    // Verdeling van de zon: eerst huis, dan batterij, rest naar het net.
    const solarToHome = Math.min(solar, homeCalc);
    const solarToBat  = Math.min(solar - solarToHome, cha);

    this._D = {
      solarRaw, gridRaw, batRaw, soc, homeShown,
      grid, imp, exp, dis, cha, solar,
    };
    this._F = {
      gridIn:   imp,                  // net → huis
      gridOut:  exp,                  // huis → net
      solarHome: solar - solarToBat,  // zon → huis (wat het huis gebruikt + wat via het huis naar het net gaat)
      solarBat: solarToBat,           // zon → batterij
      batOut:   dis,                  // batterij → huis
      batIn:    cha - solarToBat,     // huis → batterij (laden van het net)
    };

    const ex = {};
    cfg.entities.forEach((e, i) => { ex[i] = this._num(e.entity, 'power'); });
    this._D.ex = ex;

    this._updateLabels();
    this._updateActive();
    this._updateLines();
  }

  // Bepaalt welke verbruikers zichtbaar zijn. Pas na debounce_seconds (echte seconden)
  // onder de drempel verdwijnt een verbruiker.
  _updateActive() {
    if (!this._D || !this._cfg) return;
    const now = Date.now();
    const keep = this._cfg.debounce_seconds * 1000;
    this._active = [];
    this._cfg.entities.forEach((e, i) => {
      const on = (this._D.ex[i] || 0) > PFC_CONSUMER_MIN_W;
      if (on) this._lastOn[i] = now;
      if (on || (this._lastOn[i] !== undefined && now - this._lastOn[i] < keep)) this._active.push(i);
    });
  }

  _updateLabels() {
    const D = this._D, cfg = this._cfg, V = this._E.V, S = this._E.S;

    if (V.solar) V.solar.textContent = this._fmt(D.solarRaw === null ? null : D.solar);
    if (V.home)  V.home.textContent  = this._fmt(D.homeShown);
    if (V.bat) {
      V.bat.textContent = this._fmt(D.batRaw === null ? null : Math.abs(D.batRaw));
      if (V['bat-soc']) V['bat-soc'].textContent = D.soc === null ? '--%' : Math.round(D.soc) + '%';
    }
    if (V.grid) {
      const ok = D.gridRaw !== null;
      V.grid.textContent = this._fmt(ok ? Math.abs(D.gridRaw) : null);
      if (S.gi) S.gi.textContent = '→ ' + this._fmt(ok ? D.imp : null);
      if (S.ge) S.ge.textContent = '← ' + this._fmt(ok ? D.exp : null);
    }
    cfg.entities.forEach((e, i) => {
      if (V['ex' + i]) V['ex' + i].textContent = this._fmt(D.ex[i]);
    });
  }

  _updateLines() {
    if (!this._E || !this._L || !this._F) return;
    const L = this._L, EL = this._E.L, cfg = this._cfg, c = L.c, F = this._F;
    const HX = L.HX, HY = L.HY, RH = L.R_H, RS = L.R_S, RC = L.R_C;
    const th = cfg.min_power;
    const flows = [];

    // Punt op de rand van cirkel A in de richting van B
    const ep = (ax, ay, R, bx, by) => {
      const dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: ax + dx / d * R, y: ay + dy / d * R };
    };

    const setLine = (el, a, b, col, on) => {
      if (!el) return;
      el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
      el.setAttribute('x2', b.x); el.setAttribute('y2', b.y);
      el.setAttribute('stroke', col);
      el.setAttribute('stroke-width', on ? '2.5' : '1.5');
      el.setAttribute('stroke-dasharray', on ? 'none' : '5 5');
      el.setAttribute('opacity', on ? '0.8' : '0.15');
    };

    // Bron ↔ huis. fwd = bron → huis, back = huis → bron.
    const source = (key, col, fwd, back) => {
      const p = L.srcPos[key];
      if (!p || !EL['src_' + key]) return;
      const a = ep(p.x, p.y, RS, HX, HY), b = ep(HX, HY, RH, p.x, p.y);
      setLine(EL['src_' + key], a, b, col, fwd >= th || back >= th);
      if (fwd  >= th) flows.push({ pts: [a, b], col, r: 5, n: 2 });
      if (back >= th) flows.push({ pts: [b, a], col, r: 5, n: 1 });
    };
    source('grid',  c.grid,    F.gridIn,    F.gridOut);
    source('solar', c.solar,   F.solarHome, 0);
    source('bat',   c.battery, F.batOut,    F.batIn);

    const sp = L.srcPos['solar'], bp = L.srcPos['bat'];
    if (sp && bp && EL['solar_bat']) {
      const a = ep(sp.x, sp.y, RS, bp.x, bp.y), b = ep(bp.x, bp.y, RS, sp.x, sp.y);
      const on = F.solarBat >= th;
      setLine(EL['solar_bat'], a, b, c.solar, on);
      if (on) flows.push({ pts: [a, b], col: c.solar, r: 5, n: 1 });
    }

    // ── Verbruikers ───────────────────────────────────────────────────────────
    const act = this._active;
    const n   = act.length;
    let offset = 0;
    if (this._E.svg) {
      const firstConY = n > 0 ? HY - (n - 1) * L.C_GAP / 2 : HY;
      const lastConY  = n > 0 ? HY + (n - 1) * L.C_GAP / 2 : HY;
      const topNeeded = firstConY - RC - L.LBL_H - 10;
      offset = topNeeded < L.PAD_TOP ? L.PAD_TOP - topNeeded : 0;
      const neededH = Math.max(L.srcBlockH + L.PAD_TOP * 2 + 24, lastConY + RC + 28 + offset);
      this._E.svg.setAttribute('viewBox', `0 0 ${L.W} ${neededH}`);
    }

    const conY = {};
    act.forEach((idx, pos) => { conY[idx] = HY - ((n - 1) * L.C_GAP) / 2 + offset + pos * L.C_GAP; });

    const hbEl = EL['home_bus'];
    if (hbEl) {
      hbEl.setAttribute('display', n > 0 ? '' : 'none');
      hbEl.setAttribute('x1', HX + RH); hbEl.setAttribute('y1', HY);
      hbEl.setAttribute('x2', L.BX);    hbEl.setAttribute('y2', HY);
    }

    const r = 18;   // hoekradius van de bus-bochten
    cfg.entities.forEach((e, i) => {
      const el = EL['con_' + i];
      const cg = this._E.CG[i];
      const on = conY[i] !== undefined;
      if (cg) {
        cg.setAttribute('display', on ? '' : 'none');
        if (on) {
          const dy = conY[i] - L.conYs[i];
          cg.setAttribute('transform', dy !== 0 ? `translate(0,${dy})` : '');
        }
      }
      if (el) el.setAttribute('display', on ? '' : 'none');
      if (!on || !el) return;

      const cy = conY[i];
      const endX = L.CX - RC;
      if (Math.abs(cy - HY) < 2) {
        el.setAttribute('d', `M${L.BX},${HY} L${endX},${cy}`);
        flows.push({ pts: [{ x: HX + RH, y: HY }, { x: endX, y: cy }], col: e.color, r: 4, n: 1, consumer: i });
      } else {
        const bendY = cy < HY ? cy + r : cy - r;
        el.setAttribute('d', `M${L.BX},${HY} L${L.BX},${bendY} Q${L.BX},${cy} ${L.BX + r},${cy} L${endX},${cy}`);
        const curve = [];
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          curve.push({
            x: (1 - t) * (1 - t) * L.BX + 2 * (1 - t) * t * L.BX + t * t * (L.BX + r),
            y: (1 - t) * (1 - t) * bendY + 2 * (1 - t) * t * cy + t * t * cy,
          });
        }
        flows.push({ pts: [{ x: HX + RH, y: HY }, { x: L.BX, y: HY }, ...curve, { x: endX, y: cy }], col: e.color, r: 4, n: 1, consumer: i });
      }
    });

    // Verbruikers in hun "nalooptijd" (0 W, nog zichtbaar) krijgen geen stippen.
    this._flows = flows.filter(f => f.consumer === undefined || (this._D.ex[f.consumer] || 0) > PFC_CONSUMER_MIN_W);

    // Layout verschoven → oude stippen staan op verkeerde plaatsen.
    const key = act.join(',');
    if (key !== this._layoutKey) {
      this._clearDots();
      this._layoutKey = key;
    }
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  _clearDots() {
    this._pts.forEach(p => p.dot.remove());
    this._pts = [];
  }

  _stopAnim() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _startAnim() {
    this._stopAnim();
    this._lastFrame = 0;
    this._lastSpawn = 0;

    const loop = (now) => {
      if (document.hidden || !this.isConnected) { this._raf = null; return; }
      // Tijdgebaseerd, zodat 60/120/144 Hz-schermen even snel lopen.
      const dt = this._lastFrame ? Math.min(0.1, (now - this._lastFrame) / 1000) : 0;
      this._lastFrame = now;

      if (now - this._lastSpawn >= PFC_SPAWN_MS && this._E) {
        this._lastSpawn = now;
        const dG = this._E.dotsG;
        this._flows.forEach(f => {
          for (let k = 0; k < f.n; k++) {
            const dot = pfcEl('circle');
            dot.setAttribute('r', f.r);
            dot.setAttribute('fill', f.col);
            dot.setAttribute('opacity', '0.92');
            dot.setAttribute('cx', f.pts[0].x); dot.setAttribute('cy', f.pts[0].y);
            dG.appendChild(dot);
            this._pts.push({ dot, pts: f.pts, t: 0, spd: 0.36 + Math.random() * 0.18 });   // fractie van het pad per seconde
          }
        });
      }

      for (let i = this._pts.length - 1; i >= 0; i--) {
        const p = this._pts[i];
        p.t += p.spd * dt;
        if (p.t >= 1) { p.dot.remove(); this._pts.splice(i, 1); continue; }
        const segs = p.pts.length - 1;
        const seg  = Math.min(Math.floor(p.t * segs), segs - 1);
        const lt   = p.t * segs - seg;
        const A    = p.pts[seg], B = p.pts[seg + 1];
        p.dot.setAttribute('cx', A.x + (B.x - A.x) * lt);
        p.dot.setAttribute('cy', A.y + (B.y - A.y) * lt);
      }

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  connectedCallback() {
    document.addEventListener('visibilitychange', this._onVis);
    // Ook zonder nieuwe sensorwaarden moet een verbruiker na de nalooptijd verdwijnen.
    if (!this._timer) {
      this._timer = setInterval(() => {
        if (!this._D) return;
        const before = this._active.join(',');
        this._updateActive();
        if (this._active.join(',') !== before) this._updateLines();
      }, 1000);
    }
    if (this._cfg) {
      this._clearDots();
      this._startAnim();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('visibilitychange', this._onVis);
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._stopAnim();
  }

  getCardSize() { return 5; }
}

if (!customElements.get('power-flow-card')) {
  customElements.define('power-flow-card', PowerFlowCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'power-flow-card', name: 'Power Flow Card', description: 'Animated power flow card', preview: true });
  console.info(`%c POWER-FLOW-CARD %c v${PFC_VERSION} `, 'background:#6366f1;color:#fff;font-weight:700', 'background:#eee;color:#333');
}
