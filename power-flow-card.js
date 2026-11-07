/**
 * Power Flow Card v4.0.2
 *
 * Layout:
 *   Kop: icoon, titel, ondertitel met wat er gebeurt, pil met de nettoestand
 *   Links kolom (boven→onder): Net, Zonne-energie, Batterij
 *   Midden: Huis
 *   Rechts: verbruikers als tegels aan een verticale bus
 *
 * Stromen worden berekend uit de energiebalans:
 *   huis = zon + net-import + batterij-ontladen − export − laden
 *   Zon gaat eerst naar het huis, dan naar de batterij, de rest naar het net.
 *   Laden dat niet uit de zon komt, loopt huis → batterij (van het net).
 *
 * type: custom:power-flow-card
 * title: Energiestroom
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
 * entities:
 *   - entity: sensor.pc_power
 *     name: PC
 *     icon: mdi:desktop-classic
 */

const PFC_VERSION = '4.0.2';
const PFC_CONSUMER_MIN_W = 5;     // een verbruiker telt als "aan" boven deze waarde
const PFC_SPAWN_MS       = 420;   // om de hoeveel ms er nieuwe stippen vertrekken
const PFC_POWER_UNITS    = { w: 1, kw: 1000, mw: 1e6 };
const PFC_ENERGY_UNITS   = { wh: 0.001, kwh: 1, mwh: 1000 };   // naar kWh

// Afmetingen (viewBox-eenheden; de kaart schaalt mee met de breedte)
const PFC = {
  W: 372, PAD: 12,
  RS: 22, RH: 30,                 // straal bron / huis
  SX: 46, HX: 170,                // x bron / huis
  BX: 222,                        // x van de verticale bus
  PX: 236, PW: 128, PH: 38,       // verbruikerstegel: x, breedte, hoogte
  S_GAP: 108, C_GAP: 52,          // verticale afstand bronnen / verbruikers
  ABOVE: 18, BELOW: 34,           // ruimte voor label boven en waarde+subtekst onder een bron
  BEND: 10,                       // hoekradius van de bus-bochten
};

function pfcEl(tag, attrs, text) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  return e;
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
    const col  = cfg.colors || {};
    const lab  = cfg.labels || {};
    const colors = {
      solar:     col.solar     || '#f59e0b',
      grid:      col.grid      || '#3b82f6',
      battery:   col.battery   || '#e5484d',
      home:      col.home      || 'var(--primary-text-color, #475569)',
      consumers: col.consumers || '#22a55a',
    };
    this._cfg = {
      solar_entity:   cfg.solar_entity   || null,
      grid_entity:    cfg.grid_entity    || null,
      home_entity:    cfg.home_entity    || null,
      battery_entity: cfg.battery_entity || null,
      battery_entities: list(cfg.battery_entities),
      battery_soc_entity: cfg.battery_soc_entity || null,
      battery_stored_energy_entities: list(cfg.battery_stored_energy_entities),
      battery_capacity_kwh: num(cfg.battery_capacity_kwh, 0) || null,
      title:  cfg.title === false ? null : (cfg.title || 'Energiestroom'),
      icon:   cfg.icon || 'mdi:lightning-bolt',
      debounce_seconds: Math.max(0, num(cfg.debounce_seconds, 8)),
      min_power:        Math.max(0, num(cfg.min_power, 10)),
      grid_inverted:    cfg.grid_inverted    !== undefined ? !!cfg.grid_inverted    : false,
      battery_inverted: cfg.battery_inverted !== undefined ? !!cfg.battery_inverted : true,
      entities: Array.isArray(cfg.entities)
        ? cfg.entities.filter(e => e && e.entity).map(e => ({
            entity: e.entity,
            name:   e.name  || e.entity,
            icon:   e.icon && e.icon !== 'default' ? e.icon : 'mdi:power-plug-outline',
            color:  e.color || colors.consumers,
          }))
        : [],
      colors,
      labels: {
        solar:   lab.solar   || 'Zon',
        grid:    lab.grid    || 'Net',
        battery: lab.battery || 'Batterij',
        home:    lab.home    || 'Huis',
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
    this._hw = 0;
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

  // [getal, eenheid] — eenheid wordt kleiner en grijs getoond.
  _fmtParts(v) {
    if (v === null || v === undefined || isNaN(v)) return ['–', ''];
    if (Math.abs(v) >= 1000) return [this._nf(2).format(v / 1000), 'kW'];
    return [this._nf(0).format(Math.round(v)), 'W'];
  }

  _fmt(v) { const [n, u] = this._fmtParts(v); return u ? n + ' ' + u : n; }

  // ── Build DOM (once per config) ────────────────────────────────────────────

  _buildDOM() {
    this._stopAnim();
    this._clearDots();
    this._layoutKey = null;

    const cfg  = this._cfg;
    const c    = cfg.colors;
    const ents = cfg.entities;
    const P    = PFC;

    // ── Layout: hoogte voor de bronnen en voor het grootste aantal verbruikers dat sinds het
    //    laden tegelijk aan stond (this._hw). Zo groeit de kaart mee, maar krimpt ze niet bij
    //    elke verbruiker die uitvalt, en is er geen plaats nodig voor verbruikers die uit staan.
    const srcList = [];
    if (cfg.grid_entity)  srcList.push({ key: 'grid',  col: c.grid,    lbl: cfg.labels.grid,    icon: 'mdi:transmission-tower' });
    if (cfg.solar_entity) srcList.push({ key: 'solar', col: c.solar,   lbl: cfg.labels.solar,   icon: 'mdi:solar-power-variant' });
    if (cfg.battery_entity || cfg.battery_entities)
                          srcList.push({ key: 'bat',   col: c.battery, lbl: cfg.labels.battery, icon: 'mdi:battery' });

    const nS = srcList.length;
    const consH = Math.min(ents.length, this._hw || 0) * P.C_GAP;
    let HY = P.PAD + P.RS + P.ABOVE + ((Math.max(nS, 1) - 1) * P.S_GAP) / 2;
    HY = Math.max(HY, P.PAD + consH / 2, P.PAD + P.RH + 22);
    const firstY = HY - ((nS - 1) * P.S_GAP) / 2;
    const srcPos = {};
    srcList.forEach((s, i) => { srcPos[s.key] = { x: P.SX, y: firstY + i * P.S_GAP }; });
    const lastY = nS ? firstY + (nS - 1) * P.S_GAP : HY;
    const H = Math.ceil(Math.max(
      lastY + P.RS + P.BELOW + P.PAD,
      HY + consH / 2 + P.PAD,
      HY + P.RH + 30 + P.PAD,
    ));

    this._L = { H, HY, srcPos, srcList };

    // ── HTML shell ────────────────────────────────────────────────────────────
    const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
    this.shadowRoot.innerHTML = `<style>
      :host {
        display: block;
        --pfc-txt:  var(--primary-text-color, #1f1f1f);
        --pfc-sub:  var(--secondary-text-color, #6b6b6b);
        --pfc-off:  var(--disabled-text-color, #bdbdbd);
        --pfc-line: var(--divider-color, #e0e0e0);
        --pfc-bg:   var(--ha-card-background, var(--card-background-color, #fff));
        --pfc-tile: color-mix(in srgb, var(--pfc-txt) 5%, transparent);
      }
      ha-card {
        display: block; overflow: hidden;
        background: var(--pfc-bg);
        border-radius: var(--ha-card-border-radius, 12px);
        border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--pfc-line));
        color: var(--pfc-txt);
      }
      .kop { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--pfc-line); }
      .chip { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
              background: ${tint(c.grid, 14)}; color: ${c.grid}; --mdc-icon-size: 20px; }
      .kop-tekst { min-width: 0; }
      .kop h2 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.25; }
      .kop p  { margin: 1px 0 0; font-size: 12px; color: var(--pfc-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pil { margin-left: auto; flex: none; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
             background: var(--pfc-tile); color: var(--pfc-sub); }
      .pil:empty { display: none; }
      svg { width: 100%; display: block; font-family: inherit; }
      /* Iconen in een HTML-laag boven de SVG (geen foreignObject: WebKit in de app plaatst
         die verkeerd bij geschaalde SVG's). --pfc-s = schaal van de tekening. */
      .diag  { position: relative; }
      .icons { position: absolute; inset: 0; pointer-events: none; }
      .ico   { position: absolute; transform: translate(-50%, -50%); display: flex; line-height: 0; }
      text { fill: var(--pfc-txt); }
      .lbl  { fill: var(--pfc-sub); font-size: 11px; font-weight: 500; }
      .sub  { fill: var(--pfc-sub); font-size: 10px; }
      .unit { fill: var(--pfc-sub); font-weight: 500; }
      .val  { font-weight: 700; }
      .node { fill: var(--pfc-bg); stroke-width: 2; }
      .tile { fill: var(--pfc-tile); }
      .line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: opacity .3s; }
      .line.off { stroke: var(--pfc-line) !important; stroke-width: 1.5; stroke-dasharray: 4 4; opacity: 1; }
      .line.on  { opacity: .55; }
    </style>
    <ha-card>
      <div class="kop" id="kop">
        <div class="chip"><ha-icon id="kopIcon"></ha-icon></div>
        <div class="kop-tekst"><h2 id="kopTitel"></h2><p id="kopSub"></p></div>
        <div class="pil" id="kopPil"></div>
      </div>
      <div class="diag" id="diag">
        <svg id="svg" viewBox="0 0 ${P.W} ${H}">
          <g id="lines"></g>
          <g id="dots"></g>
          <g id="nodes"></g>
        </svg>
        <div class="icons" id="icons"></div>
      </div>
    </ha-card>`;

    const sr = this.shadowRoot;
    if (cfg.title) {
      sr.getElementById('kopTitel').textContent = cfg.title;
      sr.getElementById('kopIcon').setAttribute('icon', cfg.icon);
    } else {
      sr.getElementById('kop').remove();
    }
    const svg    = sr.getElementById('svg');
    const linesG = sr.getElementById('lines');
    const dotsG  = sr.getElementById('dots');
    const nodesG = sr.getElementById('nodes');
    const diag   = sr.getElementById('diag');
    const iconsL = sr.getElementById('icons');

    // Schaal bijhouden zodat de iconen even groot blijven als de tekening.
    if (this._ro) this._ro.disconnect();
    this._ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { if (diag.clientWidth) diag.style.setProperty('--pfc-s', diag.clientWidth / P.W); })
      : null;
    if (this._ro && this.isConnected) this._ro.observe(diag);
    this._diag = diag;

    this._E = {
      svg, dotsG, L: {}, V: {}, S: {}, CG: {}, CI: {}, N: {}, I: {},
      sub: sr.getElementById('kopSub'), pil: sr.getElementById('kopPil'),
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const line = (key, color) => {
      const el = pfcEl('path', { class: 'line off' });
      el.style.stroke = color;
      linesG.appendChild(el);
      this._E.L[key] = el;
      return el;
    };
    // Icoon via HA's eigen <ha-icon>, gecentreerd op (cx, cy) in viewBox-eenheden.
    const icon = (name, cx, cy, size, color) => {
      const hi = document.createElement('ha-icon');
      hi.className = 'ico';
      hi.setAttribute('icon', name);
      hi.style.left = (cx / P.W * 100) + '%';
      hi.style.top  = (cy / H * 100) + '%';
      hi.style.setProperty('--mdc-icon-size', `calc(var(--pfc-s, 1) * ${size}px)`);
      hi.style.color = color;
      iconsL.appendChild(hi);
      return hi;
    };
    // Waarde: groot getal + kleine grijze eenheid
    const value = (g, x, y, size, anchor) => {
      const t = pfcEl('text', { x, y, 'text-anchor': anchor || 'middle', class: 'val', 'font-size': size });
      const n = pfcEl('tspan', {}, '–');
      const u = pfcEl('tspan', { class: 'unit', dx: 2, 'font-size': Math.round(size * 0.72) }, '');
      t.appendChild(n); t.appendChild(u);
      g.appendChild(t);
      return { n, u };
    };

    // ── Lijnen ────────────────────────────────────────────────────────────────
    srcList.forEach(s => line('src_' + s.key, s.col));
    if (srcPos.solar && srcPos.bat) line('solar_bat', c.solar);
    if (ents.length) {
      line('home_bus', c.consumers);
      ents.forEach((e, i) => line('con_' + i, e.color));
    }

    // ── Bronnen ───────────────────────────────────────────────────────────────
    srcList.forEach(s => {
      const { x, y } = srcPos[s.key];
      const g = pfcEl('g');
      g.appendChild(pfcEl('text', { x, y: y - P.RS - 7, 'text-anchor': 'middle', class: 'lbl' }, s.lbl));
      const circ = pfcEl('circle', { cx: x, cy: y, r: P.RS, class: 'node' });
      g.appendChild(circ);
      this._E.N[s.key] = { circ, col: s.col };
      this._E.I[s.key] = icon(s.icon, x, y, 22, s.col);
      this._E.V[s.key] = value(g, x, y + P.RS + 17, 15);
      const sub = pfcEl('text', { x, y: y + P.RS + 30, 'text-anchor': 'middle', class: 'sub' }, '');
      g.appendChild(sub);
      this._E.S[s.key] = sub;
      nodesG.appendChild(g);
    });

    // ── Huis ──────────────────────────────────────────────────────────────────
    {
      const g = pfcEl('g');
      g.appendChild(pfcEl('text', { x: P.HX, y: HY - P.RH - 8, 'text-anchor': 'middle', class: 'lbl' }, cfg.labels.home));
      const circ = pfcEl('circle', { cx: P.HX, cy: HY, r: P.RH, class: 'node' });
      circ.style.stroke = c.home; circ.style.strokeWidth = '2.5';
      g.appendChild(circ);
      icon('mdi:home', P.HX, HY, 28, c.home);
      this._E.V.home = value(g, P.HX, HY + P.RH + 21, 18);
      nodesG.appendChild(g);
    }

    // ── Verbruikers (op y = 0 getekend, verschoven via transform) ─────────────
    ents.forEach((e, i) => {
      const g = pfcEl('g', { display: 'none' });
      g.appendChild(pfcEl('rect', { x: P.PX, y: -P.PH / 2, width: P.PW, height: P.PH, rx: 10, class: 'tile' }));
      const dot = pfcEl('circle', { cx: P.PX + 19, cy: 0, r: 12 });
      dot.style.fill = tint(e.color, 15);
      g.appendChild(dot);
      const ci = icon(e.icon, P.PX + 19, 0, 15, e.color);
      ci.style.display = 'none';
      this._E.CI[i] = ci;
      const name = e.name.length > 18 ? e.name.slice(0, 17) + '…' : e.name;
      const nt = pfcEl('text', { x: P.PX + 38, y: -3, class: 'lbl', 'font-size': '10.5' }, name);
      nt.appendChild(pfcEl('title', {}, e.name));
      g.appendChild(nt);
      this._E.V['ex' + i] = value(g, P.PX + 38, 12, 13, 'start');
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

    this._D = { solarRaw, gridRaw, batRaw, soc, homeShown, grid, imp, exp, dis, cha, solar };
    this._F = {
      gridIn:    imp,                  // net → huis
      gridOut:   exp,                  // huis → net
      solarHome: solar - solarToBat,   // zon → huis (wat het huis gebruikt + wat via het huis naar het net gaat)
      solarBat:  solarToBat,           // zon → batterij
      batOut:    dis,                  // batterij → huis
      batIn:     cha - solarToBat,     // huis → batterij (laden van het net)
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
    const D = this._D, F = this._F, cfg = this._cfg, E = this._E, V = E.V, S = E.S;
    const th = cfg.min_power;
    const put = (v, w) => { if (!v) return; const [n, u] = this._fmtParts(w); v.n.textContent = n; v.u.textContent = u; };

    // Knoop actief (gekleurd) of niet (grijs)
    const state = (key, on) => {
      const N = E.N[key], I = E.I[key];
      if (!N) return;
      N.circ.style.stroke = on ? N.col : 'var(--pfc-line)';
      if (I) I.style.color = on ? N.col : 'var(--pfc-off)';
    };

    put(V.solar, D.solarRaw === null ? null : D.solar);
    state('solar', D.solar >= th);

    put(V.grid, D.gridRaw === null ? null : Math.abs(D.gridRaw));
    if (S.grid) S.grid.textContent = D.gridRaw === null ? '' : D.imp >= th ? 'import' : D.exp >= th ? 'export' : '';
    state('grid', D.imp >= th || D.exp >= th);

    put(V.bat, D.batRaw === null ? null : Math.abs(D.batRaw));
    if (S.bat) {
      const soc  = D.soc === null ? '' : Math.round(D.soc) + ' %';
      const mode = D.dis >= th ? 'ontladen' : D.cha >= th ? 'laden' : '';
      S.bat.textContent = [soc, mode].filter(Boolean).join(' · ');
    }
    if (E.I.bat) {
      const s = D.soc === null ? null : Math.round(D.soc / 10) * 10;
      const ic = D.cha >= th ? 'mdi:battery-charging' + (s === null || s === 100 ? '' : s === 0 ? '-outline' : '-' + s)
               : s === null || s === 100 ? 'mdi:battery' : s === 0 ? 'mdi:battery-outline' : 'mdi:battery-' + s;
      if (E.I.bat.getAttribute('icon') !== ic) E.I.bat.setAttribute('icon', ic);
    }
    state('bat', D.dis >= th || D.cha >= th);

    put(V.home, D.homeShown);
    cfg.entities.forEach((e, i) => put(V['ex' + i], D.ex[i]));

    // ── Kop: wat gebeurt er? ──
    if (E.sub) {
      const parts = [];
      if (D.solar >= th) parts.push('zon ' + this._fmt(D.solar));
      if (D.dis >= th) parts.push('batterij ontlaadt');
      else if (D.cha >= th) parts.push('batterij laadt');
      if (D.imp >= th) parts.push(this._fmt(D.imp) + ' van het net');
      else if (D.exp >= th) parts.push(this._fmt(D.exp) + ' naar het net');
      let s = parts.join(' · ') || 'Geen stroom';
      E.sub.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    }
    if (E.pil) {
      E.pil.textContent = !cfg.grid_entity || D.gridRaw === null ? ''
        : D.imp >= th ? 'Import' : D.exp >= th ? 'Export' : 'Neutraal';
    }
  }

  _updateLines() {
    if (!this._E || !this._L || !this._F) return;
    const P = PFC, L = this._L, EL = this._E.L, cfg = this._cfg, c = cfg.colors, F = this._F;
    const HX = P.HX, HY = L.HY, RH = P.RH, RS = P.RS;
    const th = cfg.min_power;
    const flows = [];

    const ep = (ax, ay, R, bx, by) => {
      const dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: ax + dx / d * R, y: ay + dy / d * R };
    };
    const setPath = (el, pts, d, on) => {
      if (!el) return;
      el.setAttribute('d', d || `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`);
      el.classList.toggle('on', on);
      el.classList.toggle('off', !on);
    };

    // Bron ↔ huis. fwd = bron → huis, back = huis → bron.
    const source = (key, col, fwd, back) => {
      const p = L.srcPos[key];
      if (!p) return;
      const a = ep(p.x, p.y, RS, HX, HY), b = ep(HX, HY, RH, p.x, p.y);
      setPath(EL['src_' + key], [a, b], null, fwd >= th || back >= th);
      if (fwd  >= th) flows.push({ pts: [a, b], col });
      if (back >= th) flows.push({ pts: [b, a], col });
    };
    source('grid',  c.grid,    F.gridIn,    F.gridOut);
    source('solar', c.solar,   F.solarHome, 0);
    source('bat',   c.battery, F.batOut,    F.batIn);

    // Zon → batterij: boog links van de kolom, zodat de lijn niet door de tekst loopt.
    const sp = L.srcPos.solar, bp = L.srcPos.bat;
    if (sp && bp && EL.solar_bat) {
      const x = P.SX - RS, cx = x - 20;
      const on = F.solarBat >= th;
      setPath(EL.solar_bat, null, `M${x},${sp.y} C${cx},${sp.y} ${cx},${bp.y} ${x},${bp.y}`, on);
      if (on) {
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8, u = 1 - t;
          pts.push({ x: u * u * u * x + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * x,
                     y: u * u * u * sp.y + 3 * u * u * t * sp.y + 3 * u * t * t * bp.y + t * t * t * bp.y });
        }
        flows.push({ pts, col: c.solar });
      }
    }

    // ── Verbruikers: actieve gecentreerd rond het huis ────────────────────────
    const act = this._active, n = act.length;
    if (n > (this._hw || 0)) {      // meer verbruikers tegelijk aan dan ooit: kaart groeit
      this._hw = n;
      this._buildDOM();             // tekent opnieuw en roept _updateLines zelf weer aan
      return;
    }
    const conY = {};
    act.forEach((idx, pos) => { conY[idx] = HY - ((n - 1) * P.C_GAP) / 2 + pos * P.C_GAP; });

    const busOn = act.some(i => (this._D.ex[i] || 0) > PFC_CONSUMER_MIN_W);
    if (EL.home_bus) {
      setPath(EL.home_bus, [{ x: HX + RH, y: HY }, { x: P.BX, y: HY }], null, n > 0);
      EL.home_bus.style.display = n > 0 ? '' : 'none';
      // Eén gedeelde stroom huis → bus; vanaf de bus heeft elke verbruiker zijn eigen stippen.
      if (busOn) flows.push({ pts: [{ x: HX + RH, y: HY }, { x: P.BX, y: HY }], col: c.consumers, spd: 1.1 });
    }

    const r = P.BEND;
    cfg.entities.forEach((e, i) => {
      const el = EL['con_' + i], cg = this._E.CG[i], ci = this._E.CI[i];
      const on = conY[i] !== undefined;
      if (cg) {
        cg.setAttribute('display', on ? '' : 'none');
        if (on) cg.setAttribute('transform', `translate(0,${conY[i]})`);
      }
      if (ci) {
        ci.style.display = on ? '' : 'none';
        if (on) ci.style.top = (conY[i] / L.H * 100) + '%';
      }
      if (el) el.style.display = on ? '' : 'none';
      if (!on || !el) return;

      const y = conY[i];
      const start = [{ x: P.BX, y: HY }];
      if (Math.abs(y - HY) < 1) {
        setPath(el, null, `M${P.BX},${HY} L${P.PX},${y}`, true);
        flows.push({ pts: [...start, { x: P.PX, y }], col: e.color, consumer: i });
      } else {
        const bendY = y < HY ? y + r : y - r;
        setPath(el, null, `M${P.BX},${HY} L${P.BX},${bendY} Q${P.BX},${y} ${P.BX + r},${y} L${P.PX},${y}`, true);
        const curve = [];
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          curve.push({ x: (1 - t) * (1 - t) * P.BX + 2 * (1 - t) * t * P.BX + t * t * (P.BX + r),
                       y: (1 - t) * (1 - t) * bendY + 2 * (1 - t) * t * y + t * t * y });
        }
        flows.push({ pts: [...start, ...curve, { x: P.PX, y }], col: e.color, consumer: i });
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
          const dot = pfcEl('circle', { r: 3, cx: f.pts[0].x, cy: f.pts[0].y });
          dot.style.fill = f.col;
          dG.appendChild(dot);
          this._pts.push({ dot, pts: f.pts, t: 0, spd: (f.spd || 0.4) + Math.random() * 0.15 });   // fractie van het pad per seconde
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
    if (this._ro && this._diag) this._ro.observe(this._diag);
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
    if (this._ro) this._ro.disconnect();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._stopAnim();
  }

  getCardSize() {
    const h = this._L ? this._L.H : 330;
    return Math.ceil((h + (this._cfg && this._cfg.title ? 66 : 0)) / 50);
  }
}

if (!customElements.get('power-flow-card')) {
  customElements.define('power-flow-card', PowerFlowCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'power-flow-card', name: 'Power Flow Card', description: 'Animated power flow card', preview: true });
  console.info(`%c POWER-FLOW-CARD %c v${PFC_VERSION} `, 'background:#3b82f6;color:#fff;font-weight:700', 'background:#eee;color:#333');
}
