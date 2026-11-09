/**
 * Home Energy Flow Card v4.5.0   (vroeger: Power Flow Card)
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
 * type: custom:home-energy-flow-card     # custom:power-flow-card werkt ook nog
 * title: Energiestroom
 * language: fr                           # optioneel; nl / en / fr / de, standaard de taal van HA
 * show_summary: true                     # optioneel; korte samenvatting onder de titel (standaard uit)
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
 * battery_names: [Marstek 1, Marstek 2]   # optioneel; tegels per batterij onderaan
 * battery_style: battery                 # optioneel; batterij die volloopt i.p.v. een cirkel
 * solar_style: panel                     # optioneel; zonnepaneel waarvan de cellen oplichten
 * solar_max_power: 5000                  #   piekvermogen (W) voor solar_style: panel
 * grid_style: gauge                      # optioneel; boogmeter: afname t.o.v. de piekgrens
 * grid_max_power: 5000                   #   schaal (W) als er geen piekgrens is
 * home_style: house                      # optioneel; huisje dat vult met het eigen aandeel
 * peak_entity: sensor.maandpiek           # optioneel; capaciteitstarief
 * peak_limit: 2680                        # of peak_limit_entity: sensor.piekgrens
 * home_entity: sensor.home_power      # optioneel; zonder wordt het huisverbruik berekend
 * min_power: 10                       # optioneel; kleinere stromen worden niet geanimeerd
 * entities:
 *   - entity: sensor.pc_power
 *     name: PC
 *     icon: mdi:desktop-classic
 */

const PFC_VERSION = '4.5.0';
const PFC_WARN = '#f97316';       // net-afname nadert de piekgrens
const PFC_OVER = '#dc2626';       // net-afname boven de piekgrens
const PFC_BAT_LOW = 20, PFC_BAT_MID = 50;   // battery_style: battery → rood / oranje / groen
const PFC_BAT_W = 30, PFC_BAT_H = 40;       // batterijvorm (viewBox-eenheden), knopje komt erbovenop
const PFC_PANEL_W = 46, PFC_PANEL_H = 32, PFC_PANEL_COLS = 4, PFC_PANEL_ROWS = 3;   // solar_style: panel
const PFC_GAUGE_R = 23;                     // grid_style: gauge
const PFC_GREEN = '#22a55a';

// Teksten per taal. De kaart volgt de taal van HA (of `language:`), anders Engels.
const PFC_I18N = {
  nl: { title: 'Energiestroom', solar: 'Zon', grid: 'Net', battery: 'Batterij', home: 'Huis',
        import: 'Import', export: 'Export', neutral: 'Neutraal', peak_warn: 'Bijna piekgrens', peak_over: 'Boven piekgrens',
        imp: 'import', exp: 'export', peak: 'piek', limit: 'grens',
        charging: 'laden', discharging: 'ontladen', idle: 'rust', left: 'nog',
        sum_solar: 'zon', sum_dis: 'batterij ontlaadt', sum_cha: 'batterij laadt', sum_grid: 'net', no_power: 'Geen stroom',
        self_share: 'deel van het verbruik uit eigen zon en batterij', no_config: 'Geen configuratie' },
  en: { title: 'Energy flow', solar: 'Solar', grid: 'Grid', battery: 'Battery', home: 'Home',
        import: 'Import', export: 'Export', neutral: 'Neutral', peak_warn: 'Near peak limit', peak_over: 'Above peak limit',
        imp: 'import', exp: 'export', peak: 'peak', limit: 'limit',
        charging: 'charging', discharging: 'discharging', idle: 'idle', left: '',
        sum_solar: 'solar', sum_dis: 'battery discharging', sum_cha: 'battery charging', sum_grid: 'grid', no_power: 'No power',
        self_share: 'share of consumption from own solar and battery', no_config: 'No configuration' },
  fr: { title: "Flux d'énergie", solar: 'Solaire', grid: 'Réseau', battery: 'Batterie', home: 'Maison',
        import: 'Import', export: 'Export', neutral: 'Neutre', peak_warn: 'Proche du pic', peak_over: 'Au-dessus du pic',
        imp: 'import', exp: 'export', peak: 'pic', limit: 'limite',
        charging: 'charge', discharging: 'décharge', idle: 'repos', left: 'encore',
        sum_solar: 'solaire', sum_dis: 'batterie se décharge', sum_cha: 'batterie se charge', sum_grid: 'réseau', no_power: 'Pas de courant',
        self_share: 'part de la consommation venant du solaire et de la batterie', no_config: 'Aucune configuration' },
  de: { title: 'Energiefluss', solar: 'Solar', grid: 'Netz', battery: 'Batterie', home: 'Haus',
        import: 'Bezug', export: 'Einspeisung', neutral: 'Neutral', peak_warn: 'Nahe Spitzenlast', peak_over: 'Über Spitzenlast',
        imp: 'Bezug', exp: 'Einspeisung', peak: 'Spitze', limit: 'Grenze',
        charging: 'lädt', discharging: 'entlädt', idle: 'Ruhe', left: 'noch',
        sum_solar: 'Solar', sum_dis: 'Batterie entlädt', sum_cha: 'Batterie lädt', sum_grid: 'Netz', no_power: 'Kein Strom',
        self_share: 'Anteil des Verbrauchs aus eigener Solaranlage und Batterie', no_config: 'Keine Konfiguration' },
};
const pfcTaal = (l) => { l = String(l || '').toLowerCase().split(/[-_]/)[0]; return PFC_I18N[l] ? l : 'en'; };
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

class HomeEnergyFlowCard extends HTMLElement {
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
    if (!cfg) throw new Error(PFC_I18N[this._taal()].no_config);
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
      battery_soc_entities: list(cfg.battery_soc_entities),
      battery_names:  Array.isArray(cfg.battery_names) ? cfg.battery_names.map(String) : null,
      show_batteries: cfg.show_batteries !== false,
      battery_style:  cfg.battery_style === 'battery' ? 'battery' : 'circle',
      solar_style:    cfg.solar_style === 'panel' ? 'panel' : 'circle',
      solar_max_power: Math.max(1, num(cfg.solar_max_power, 5000)),
      grid_style:     cfg.grid_style === 'gauge' ? 'gauge' : 'circle',
      grid_max_power: Math.max(1, num(cfg.grid_max_power, 5000)),
      home_style:     cfg.home_style === 'house' ? 'house' : 'circle',
      peak_entity:       cfg.peak_entity       || null,
      peak_limit_entity: cfg.peak_limit_entity || null,
      peak_limit:        num(cfg.peak_limit, 0) || null,
      peak_warn_percent: Math.max(1, num(cfg.peak_warn_percent, 90)),
      icon:   cfg.icon || 'mdi:lightning-bolt',
      show_summary: cfg.show_summary === true,
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
      language: cfg.language || null,
    };
    this._ruw = { title: cfg.title, labels: lab };
    this._zetTaal();
    const c = this._cfg;
    this._entityIds = [
      c.solar_entity, c.grid_entity, c.home_entity, c.battery_entity, c.battery_soc_entity,
      ...(c.battery_entities || []), ...(c.battery_stored_energy_entities || []),
      ...(c.battery_soc_entities || []), c.peak_entity, c.peak_limit_entity,
      ...c.entities.map(e => e.entity),
    ].filter(Boolean);
    this._lastOn = {};
    this._seen = null;
    this._hw = 0;
    this._buildDOM();
  }

  set hass(h) {
    this._hass = h;
    // Taal van HA pas nu gekend (of gewijzigd): opnieuw tekenen in die taal.
    if (this._cfg && !this._cfg.language && this._taal() !== this._lang) {
      this._zetTaal();
      this._seen = null;
      this._buildDOM();
    }
    // HA roept dit aan bij élke statuswijziging in het hele systeem: alleen werken als
    // één van onze sensoren veranderde.
    if (this._entityIds && this._seen) {
      const changed = this._entityIds.some((id, i) => h.states[id] !== this._seen[i]);
      if (!changed) return;
    }
    if (this._entityIds) this._seen = this._entityIds.map(id => h.states[id]);
    this._updateData();
  }

  // ── Taal ───────────────────────────────────────────────────────────────────
  _taal() {
    const h = this._hass;
    return pfcTaal((this._cfg && this._cfg.language)
      || (h && ((h.locale && h.locale.language) || h.language))
      || (typeof document !== 'undefined' && document.documentElement.lang)
      || (typeof navigator !== 'undefined' && navigator.language));
  }

  // Titel en namen in de gekozen taal; eigen `title`/`labels` gaan altijd voor.
  _zetTaal() {
    this._lang = this._taal();
    const T = this._T = PFC_I18N[this._lang];
    const r = this._ruw, lab = r.labels;
    this._cfg.title = r.title === false ? null : (r.title || T.title);
    this._cfg.labels = {
      solar: lab.solar || T.solar, grid: lab.grid || T.grid,
      battery: lab.battery || T.battery, home: lab.home || T.home,
    };
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
    // Extra regel "piek …" onder Net → bronnen iets verder uit elkaar
    const sGap = P.S_GAP + (cfg.grid_entity && (cfg.peak_entity || cfg.peak_limit || cfg.peak_limit_entity) ? 12 : 0);
    let HY = P.PAD + P.RS + P.ABOVE + ((Math.max(nS, 1) - 1) * sGap) / 2;
    HY = Math.max(HY, P.PAD + consH / 2, P.PAD + P.RH + 22);
    const firstY = HY - ((nS - 1) * sGap) / 2;
    const srcPos = {};
    srcList.forEach((s, i) => { srcPos[s.key] = { x: P.SX, y: firstY + i * sGap }; });
    const lastY = nS ? firstY + (nS - 1) * sGap : HY;
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
      :host { --pfc-bat: ${c.battery}; --pfc-cha: ${c.consumers}; }
      .chip { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
              background: ${tint(c.grid, 14)}; color: ${c.grid}; --mdc-icon-size: 20px; }
      .kop-tekst { min-width: 0; }
      .kop h2 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.25; }
      .kop p  { margin: 1px 0 0; font-size: 12px; line-height: 1.35; color: var(--pfc-sub);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
      .bat-fill { transition: y .6s, height .6s, fill .6s; }
      .cell { transition: fill .4s; }
      .gauge-bg, .gauge-v { fill: none; stroke-width: 6; stroke-linecap: round; }
      .gauge-bg { stroke: var(--pfc-line); }
      .gauge-v { transition: stroke-dasharray .6s, stroke .4s; }
      .hit { fill: transparent; }
      .huis-pct { font-size: 14px; font-weight: 700; }
      .bat-bolt { filter: drop-shadow(0 0 1.5px rgba(0,0,0,.55)); }
      .tile { fill: var(--pfc-tile); }
      .line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: opacity .3s; }
      .line.off { stroke: var(--pfc-line) !important; stroke-width: 1.5; stroke-dasharray: 4 4; opacity: 1; }
      .line.on  { opacity: .55; }
      .klik { cursor: pointer; }
      .klik:hover .node, .klik:hover .tile { filter: brightness(.96); }
      .bats { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; padding: 0 12px 12px; }
      .bats:empty { display: none; }
      .bat { background: var(--pfc-tile); border-radius: 10px; padding: 7px 10px 8px; cursor: pointer; min-width: 0; }
      .bat:hover { filter: brightness(.96); }
      .bat-n { min-width: 0; font-size: 11px; color: var(--pfc-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bat-r { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: 6px; margin-top: 4px; }
      .bat-w { font-size: 11px; font-weight: 600; color: var(--pfc-sub); white-space: nowrap; }
      .bat-w.dis { color: var(--pfc-bat); }
      .bat-w.cha { color: var(--pfc-cha); }
      .u { font-size: .75em; font-weight: 500; color: var(--pfc-sub); }
      /* Getekende batterij: romp met vulling volgens laadtoestand, knopje rechts, % erin */
      .accu { display: flex; align-items: center; margin-top: 6px; }
      .accu-romp { position: relative; flex: 1; height: 24px; border: 2px solid var(--pfc-sub); border-radius: 6px;
                   padding: 2px; box-sizing: border-box; }
      .accu-romp > i { display: block; height: 100%; width: 0; border-radius: 3px; background: var(--pfc-line);
                       transition: width .6s, background .6s; }
      .accu-knop { flex: none; width: 4px; height: 10px; margin-left: 1px; border-radius: 0 2px 2px 0; background: var(--pfc-sub); }
      .accu-pct { position: absolute; inset: 0; display: grid; place-items: center; font-size: 13px; font-weight: 700;
                  color: var(--pfc-txt); text-shadow: 0 0 3px var(--pfc-tile), 0 0 3px var(--pfc-tile); }
      .bat-kwh { flex-basis: 100%; font-size: 11px; color: var(--pfc-sub); white-space: nowrap; }
      .bat-kwh b { font-weight: 700; color: var(--pfc-txt); }
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
      <div class="bats" id="bats"></div>
    </ha-card>`;

    const sr = this.shadowRoot;
    if (cfg.title) {
      sr.getElementById('kopTitel').textContent = cfg.title;
      sr.getElementById('kopIcon').setAttribute('icon', cfg.icon);
      // De samenvatting herhaalt wat het schema al toont: standaard weg.
      if (!cfg.show_summary) sr.getElementById('kopSub').remove();
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
      sub: cfg.show_summary ? sr.getElementById('kopSub') : null, pil: sr.getElementById('kopPil'),
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

    // Klik → standaard HA-venster met de geschiedenis van die sensor.
    const klik = (el, entity) => {
      if (!entity) return;
      el.classList.add('klik');
      el.addEventListener('click', (ev) => { ev.stopPropagation(); this._moreInfo(entity); });
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
      if (s.key === 'bat' && cfg.battery_style === 'battery') {
        // Staande batterij: rand + knopje in de toestandskleur, vulling stijgt met de laadtoestand.
        const bw = PFC_BAT_W, bh = PFC_BAT_H, top = y - bh / 2 + 2, inset = 3.5;
        const cap  = pfcEl('rect', { x: x - 6, y: top - 5, width: 12, height: 5, rx: 1.5 });
        const body = pfcEl('rect', { x: x - bw / 2, y: top, width: bw, height: bh, rx: 6, class: 'node' });
        const fill = pfcEl('rect', { x: x - bw / 2 + inset, y: top + bh - inset, width: bw - 2 * inset, height: 0, rx: 3, class: 'bat-fill' });
        g.appendChild(cap); g.appendChild(body); g.appendChild(fill);
        this._E.N[s.key] = { circ: body, cap, col: s.col };
        this._E.BAT = { fill, top: top + inset, h: bh - 2 * inset };
        const bolt = icon('mdi:lightning-bolt', x, y + 2, 18, '#fff');
        bolt.classList.add('bat-bolt');
        bolt.style.display = 'none';
        this._E.BAT.bolt = bolt;
      } else if (s.key === 'solar' && cfg.solar_style === 'panel') {
        // Zonnepaneel: kader in de toestandskleur, cellen lichten op met het vermogen t.o.v. solar_max_power.
        const pw = PFC_PANEL_W, ph = PFC_PANEL_H, pad = 3, gap = 2;
        const frame = pfcEl('rect', { x: x - pw / 2, y: y - ph / 2, width: pw, height: ph, rx: 3, class: 'node' });
        g.appendChild(frame);
        const cw = (pw - 2 * pad - (PFC_PANEL_COLS - 1) * gap) / PFC_PANEL_COLS;
        const ch = (ph - 2 * pad - (PFC_PANEL_ROWS - 1) * gap) / PFC_PANEL_ROWS;
        const cells = [];
        for (let r = PFC_PANEL_ROWS - 1; r >= 0; r--) {          // onderste rij eerst
          for (let k = 0; k < PFC_PANEL_COLS; k++) {
            const cell = pfcEl('rect', { x: x - pw / 2 + pad + k * (cw + gap), y: y - ph / 2 + pad + r * (ch + gap),
                                         width: cw, height: ch, rx: 1, class: 'cell' });
            g.appendChild(cell);
            cells.push(cell);
          }
        }
        this._E.N[s.key] = { circ: frame, col: s.col };
        this._E.PANEL = cells;
      } else if (s.key === 'grid' && cfg.grid_style === 'gauge') {
        // Boogmeter: afname (blauw → oranje → rood t.o.v. de piekgrens) vult van links, teruglevering (groen) van rechts.
        const R = PFC_GAUGE_R, cy = y + 9;
        const links  = `M${x - R},${cy} A${R},${R} 0 0 1 ${x + R},${cy}`;
        const rechts = `M${x + R},${cy} A${R},${R} 0 0 0 ${x - R},${cy}`;
        g.appendChild(pfcEl('rect', { x: x - R - 4, y: cy - R - 4, width: 2 * R + 8, height: R + 10, class: 'hit' }));
        g.appendChild(pfcEl('path', { d: links, class: 'gauge-bg' }));
        const imp = pfcEl('path', { d: links, class: 'gauge-v', pathLength: 100, 'stroke-dasharray': '0 100' });
        const exp = pfcEl('path', { d: rechts, class: 'gauge-v', pathLength: 100, 'stroke-dasharray': '0 100' });
        exp.style.stroke = PFC_GREEN;
        g.appendChild(imp); g.appendChild(exp);
        this._E.N[s.key] = { circ: pfcEl('circle', { r: 0 }), col: s.col };   // geen rand om te kleuren
        this._E.GAUGE = { imp, exp };
        this._E.I[s.key] = icon(s.icon, x, cy - 7, 18, s.col);
      } else {
        const circ = pfcEl('circle', { cx: x, cy: y, r: P.RS, class: 'node' });
        g.appendChild(circ);
        this._E.N[s.key] = { circ, col: s.col };
        this._E.I[s.key] = icon(s.icon, x, y, 22, s.col);
      }
      this._E.V[s.key] = value(g, x, y + P.RS + 17, 15);
      const sub = pfcEl('text', { x, y: y + P.RS + 30, 'text-anchor': 'middle', class: 'sub' }, '');
      g.appendChild(sub);
      this._E.S[s.key] = sub;
      if (s.key === 'grid' && (cfg.peak_entity || cfg.peak_limit || cfg.peak_limit_entity)) {
        const pk = pfcEl('text', { x, y: y + P.RS + 41, 'text-anchor': 'middle', class: 'sub' }, '');
        g.appendChild(pk);
        this._E.S.peak = pk;
      }
      klik(g, s.key === 'grid' ? cfg.grid_entity : s.key === 'solar' ? cfg.solar_entity
            : (cfg.battery_entity || cfg.battery_soc_entity || (cfg.battery_entities || [])[0]));
      nodesG.appendChild(g);
    });

    // ── Huis ──────────────────────────────────────────────────────────────────
    {
      const g = pfcEl('g');
      g.appendChild(pfcEl('text', { x: P.HX, y: HY - P.RH - 8, 'text-anchor': 'middle', class: 'lbl' }, cfg.labels.home));
      if (cfg.home_style === 'house') {
        // Huisje: vult van onder met het aandeel uit eigen zon en batterij.
        const x = P.HX, y = HY;
        const vorm = `M${x - 30},${y - 4} L${x},${y - 30} L${x + 30},${y - 4} L${x + 23},${y - 4} L${x + 23},${y + 28} L${x - 23},${y + 28} L${x - 23},${y - 4} Z`;
        const clip = pfcEl('clipPath', { id: 'pfcHuisClip' });
        clip.appendChild(pfcEl('path', { d: vorm }));
        g.appendChild(clip);
        g.appendChild(pfcEl('path', { d: vorm, class: 'node', 'stroke-linejoin': 'round' }));
        const fill = pfcEl('rect', { x: x - 31, y: y + 28, width: 62, height: 0, 'clip-path': 'url(#pfcHuisClip)', class: 'bat-fill' });
        fill.style.fill = `color-mix(in srgb, ${PFC_GREEN} 38%, transparent)`;
        g.appendChild(fill);
        const omtrek = pfcEl('path', { d: vorm, fill: 'none', 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
        omtrek.style.stroke = c.home;
        g.appendChild(omtrek);
        const pct = pfcEl('text', { x, y: y + 18, 'text-anchor': 'middle', class: 'huis-pct' }, '');
        pct.appendChild(pfcEl('title', {}, this._T.self_share));
        g.appendChild(pct);
        this._E.HUIS = { fill, pct, top: y - 30, bodem: y + 28 };
        icon('mdi:home', x, y - 9, 18, c.home);
      } else {
        const circ = pfcEl('circle', { cx: P.HX, cy: HY, r: P.RH, class: 'node' });
        circ.style.stroke = c.home; circ.style.strokeWidth = '2.5';
        g.appendChild(circ);
        icon('mdi:home', P.HX, HY, 28, c.home);
      }
      this._E.V.home = value(g, P.HX, HY + P.RH + 21, 18);
      klik(g, cfg.home_entity);
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
      klik(g, e.entity);
      nodesG.appendChild(g);
    });

    // ── Batterijen apart (tegels onderaan) ───────────────────────────────────
    this._E.B = [];
    const bl = cfg.battery_entities || [];
    if (cfg.show_batteries && bl.length > 1) {
      const wrap = sr.getElementById('bats');
      bl.forEach((ent, i) => {
        const d = document.createElement('div');
        d.className = 'bat';
        d.innerHTML = '<div class="bat-n"></div>'
          + '<div class="accu"><div class="accu-romp"><i></i><span class="accu-pct"></span></div><div class="accu-knop"></div></div>'
          + '<div class="bat-r"><span class="bat-kwh"></span><span class="bat-w"></span></div>';
        const name = (cfg.battery_names && cfg.battery_names[i]) || `${cfg.labels.battery} ${i + 1}`;
        d.querySelector('.bat-n').textContent = name;
        d.title = name;
        d.addEventListener('click', () => this._moreInfo(ent));
        wrap.appendChild(d);
        this._E.B.push({ soc: d.querySelector('.accu-pct'), w: d.querySelector('.bat-w'), bar: d.querySelector('.accu-romp > i'),
                         kwh: d.querySelector('.bat-kwh') });
      });
    }

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

    // Capaciteitstarief: hoe dicht zit de huidige afname bij de piekgrens?
    const limit = cfg.peak_limit_entity ? this._num(cfg.peak_limit_entity, 'power') : cfg.peak_limit;
    this._D.peak  = this._num(cfg.peak_entity, 'power');
    this._D.limit = limit;
    this._D.peakLevel = !limit || gridRaw === null ? null
      : imp >= limit ? 'over' : imp >= limit * cfg.peak_warn_percent / 100 ? 'warn' : null;

    // Per batterij: vermogen (genormaliseerd: > 0 = ontladen) en laadtoestand
    const bl = cfg.battery_entities || [];
    const capEach = cfg.battery_capacity_kwh && bl.length ? cfg.battery_capacity_kwh / bl.length : null;
    this._D.bats = bl.map((ent, i) => {
      const raw = this._num(ent, 'power');
      let s = null;
      // Opgeslagen energie (kWh): eigen sensor per batterij, anders laadtoestand × capaciteit
      const eigen = cfg.battery_stored_energy_entities && cfg.battery_stored_energy_entities.length === bl.length;
      let kwh = eigen ? this._num(cfg.battery_stored_energy_entities[i], 'energy') : null;
      if (cfg.battery_soc_entities && cfg.battery_soc_entities[i]) s = this._num(cfg.battery_soc_entities[i], null);
      else if (kwh !== null && capEach) s = Math.max(0, Math.min(100, kwh / capEach * 100));
      if (kwh === null && s !== null && capEach) kwh = capEach * s / 100;
      return { p: raw === null ? null : (cfg.battery_inverted ? raw : -raw), soc: s, kwh };
    });

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
      if (N.cap) N.cap.style.fill = on ? N.col : 'var(--pfc-line)';
      if (I) I.style.color = on ? N.col : 'var(--pfc-off)';
    };

    put(V.solar, D.solarRaw === null ? null : D.solar);
    state('solar', D.solar >= th);

    put(V.grid, D.gridRaw === null ? null : Math.abs(D.gridRaw));
    const T = this._T;
    if (S.grid) S.grid.textContent = D.gridRaw === null ? '' : D.imp >= th ? T.imp : D.exp >= th ? T.exp : '';
    // Piekgrens: Net (cirkel, icoon, lijn en stippen) kleurt oranje of rood
    const gridCol = D.peakLevel === 'over' ? PFC_OVER : D.peakLevel === 'warn' ? PFC_WARN : cfg.colors.grid;
    if (E.N.grid) E.N.grid.col = gridCol;
    if (E.L && E.L.src_grid) E.L.src_grid.style.stroke = gridCol;
    this._gridCol = gridCol;
    state('grid', D.imp >= th || D.exp >= th);
    if (S.peak) {
      S.peak.textContent = D.peak !== null ? T.peak + ' ' + this._fmt(D.peak)
                         : D.limit ? T.limit + ' ' + this._fmt(D.limit) : '';
      S.peak.style.fill = D.peakLevel ? gridCol : '';
    }

    put(V.bat, D.batRaw === null ? null : Math.abs(D.batRaw));
    if (S.bat) {
      const soc  = D.soc === null ? '' : Math.round(D.soc) + ' %';
      const mode = D.dis >= th ? T.discharging : D.cha >= th ? T.charging : '';
      S.bat.textContent = [soc, mode].filter(Boolean).join(' · ');
    }
    if (E.I.bat) {
      const s = D.soc === null ? null : Math.round(D.soc / 10) * 10;
      const ic = D.cha >= th ? 'mdi:battery-charging' + (s === null || s === 100 ? '' : s === 0 ? '-outline' : '-' + s)
               : s === null || s === 100 ? 'mdi:battery' : s === 0 ? 'mdi:battery-outline' : 'mdi:battery-' + s;
      if (E.I.bat.getAttribute('icon') !== ic) E.I.bat.setAttribute('icon', ic);
    }
    if (E.PANEL) {
      const aan = Math.round(Math.min(1, D.solar / cfg.solar_max_power) * E.PANEL.length);
      const n = D.solar >= th ? Math.max(1, aan) : 0;
      E.PANEL.forEach((cell, k) => { cell.style.fill = k < n ? cfg.colors.solar : 'var(--pfc-line)'; });
    }
    if (E.GAUGE) {
      const schaal = D.limit || cfg.grid_max_power;
      const pi = D.imp >= th ? Math.min(100, D.imp / schaal * 100) : 0;
      const pe = D.exp >= th ? Math.min(100, D.exp / schaal * 100) : 0;
      E.GAUGE.imp.setAttribute('stroke-dasharray', `${pi} 100`);
      E.GAUGE.exp.setAttribute('stroke-dasharray', `${pe} 100`);
      E.GAUGE.imp.style.stroke = gridCol;
      E.GAUGE.imp.style.opacity = pi ? 1 : 0;
      E.GAUGE.exp.style.opacity = pe ? 1 : 0;
    }
    if (E.HUIS) {
      const h = D.homeShown || 0;
      const eigen = h >= th ? Math.max(0, Math.min(100, (h - D.imp) / h * 100)) : null;
      const hoog = (E.HUIS.bodem - E.HUIS.top) * (eigen || 0) / 100;
      E.HUIS.fill.setAttribute('y', E.HUIS.bodem - hoog);
      E.HUIS.fill.setAttribute('height', hoog);
      E.HUIS.pct.textContent = eigen === null ? '' : Math.round(eigen) + '%';
    }
    if (E.BAT) {
      const soc = D.soc === null ? 0 : Math.max(0, Math.min(100, D.soc));
      const h = E.BAT.h * soc / 100;
      E.BAT.fill.setAttribute('y', E.BAT.top + E.BAT.h - h);
      E.BAT.fill.setAttribute('height', h);
      E.BAT.fill.style.fill = D.soc === null ? 'var(--pfc-line)'
        : soc < PFC_BAT_LOW ? PFC_OVER : soc < PFC_BAT_MID ? '#f59e0b' : '#22a55a';
      E.BAT.bolt.style.display = D.cha >= th ? '' : 'none';
    }
    state('bat', D.dis >= th || D.cha >= th);

    put(V.home, D.homeShown);
    cfg.entities.forEach((e, i) => put(V['ex' + i], D.ex[i]));

    // Tegels per batterij
    (E.B || []).forEach((b, i) => {
      const d = D.bats[i] || { p: null, soc: null, kwh: null };
      b.soc.textContent = d.soc === null ? '–' : Math.round(d.soc) + ' %';
      const mode = d.p === null ? '' : d.p >= th ? 'dis' : d.p <= -th ? 'cha' : '';
      b.w.className = 'bat-w ' + mode;
      b.w.textContent = d.p === null ? '–' : (mode === 'dis' ? '▼ ' : mode === 'cha' ? '▲ ' : '') + this._fmt(Math.abs(d.p));
      b.w.title = mode === 'dis' ? T.discharging : mode === 'cha' ? T.charging : T.idle;
      const soc = d.soc === null ? 0 : Math.max(0, Math.min(100, d.soc));
      b.bar.style.width = soc + '%';
      b.bar.style.background = d.soc === null ? '' : soc < PFC_BAT_LOW ? PFC_OVER : soc < PFC_BAT_MID ? '#f59e0b' : PFC_GREEN;
      b.kwh.style.display = d.kwh === null || d.kwh === undefined ? 'none' : '';
      if (d.kwh !== null && d.kwh !== undefined) b.kwh.innerHTML = (T.left ? T.left + ' ' : '') + `<b>${this._nf(2).format(d.kwh)}</b> kWh`;
    });

    // ── Kop: wat gebeurt er? ──
    if (E.sub) {
      const parts = [];
      if (D.solar >= th) parts.push(T.sum_solar + ' ' + this._fmt(D.solar));
      if (D.dis >= th) parts.push(T.sum_dis);
      else if (D.cha >= th) parts.push(T.sum_cha);
      // Richting (import/export) staat al in de pil, dus kort houden.
      if (D.imp >= th) parts.push(T.sum_grid + ' ' + this._fmt(D.imp));
      else if (D.exp >= th) parts.push(T.sum_grid + ' ' + this._fmt(D.exp));
      let s = parts.join(' · ') || T.no_power;
      E.sub.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      E.sub.title = E.sub.textContent;   // volledige tekst als het afgekapt wordt
    }
    if (E.pil) {
      E.pil.textContent = !cfg.grid_entity || D.gridRaw === null ? ''
        : D.peakLevel === 'over' ? T.peak_over : D.peakLevel === 'warn' ? T.peak_warn
        : D.imp >= th ? T.import : D.exp >= th ? T.export : T.neutral;
      const pc = D.peakLevel === 'over' ? PFC_OVER : D.peakLevel === 'warn' ? PFC_WARN : null;
      E.pil.style.background = pc ? `color-mix(in srgb, ${pc} 15%, transparent)` : '';
      E.pil.style.color = pc || '';
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
    const rBat = cfg.battery_style === 'battery' ? PFC_BAT_W / 2 + 1 : RS;
    const rSol = cfg.solar_style === 'panel' ? PFC_PANEL_W / 2 + 1 : RS;
    const rHuis = cfg.home_style === 'house' ? 26 : RH;
    const rSrc = { bat: rBat, solar: rSol, grid: RS };
    const source = (key, col, fwd, back) => {
      const p = L.srcPos[key];
      if (!p) return;
      const a = ep(p.x, p.y, rSrc[key] || RS, HX, HY), b = ep(HX, HY, rHuis, p.x, p.y);
      setPath(EL['src_' + key], [a, b], null, fwd >= th || back >= th);
      if (fwd  >= th) flows.push({ pts: [a, b], col });
      if (back >= th) flows.push({ pts: [b, a], col });
    };
    source('grid',  this._gridCol || c.grid, F.gridIn, F.gridOut);
    source('solar', c.solar,   F.solarHome, 0);
    source('bat',   c.battery, F.batOut,    F.batIn);

    // Zon → batterij: boog links van de kolom, zodat de lijn niet door de tekst loopt.
    const sp = L.srcPos.solar, bp = L.srcPos.bat;
    if (sp && bp && EL.solar_bat) {
      const x = P.SX - rSol, cx = P.SX - RS - 20, xb = P.SX - rBat;
      const on = F.solarBat >= th;
      setPath(EL.solar_bat, null, `M${x},${sp.y} C${cx},${sp.y} ${cx},${bp.y} ${xb},${bp.y}`, on);
      if (on) {
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8, u = 1 - t;
          pts.push({ x: u * u * u * x + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * xb,
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
      const hb = cfg.home_style === 'house' ? 23 : RH;
      setPath(EL.home_bus, [{ x: HX + hb, y: HY }, { x: P.BX, y: HY }], null, n > 0);
      EL.home_bus.style.display = n > 0 ? '' : 'none';
      // Eén gedeelde stroom huis → bus; vanaf de bus heeft elke verbruiker zijn eigen stippen.
      if (busOn) flows.push({ pts: [{ x: HX + hb, y: HY }, { x: P.BX, y: HY }], col: c.consumers, spd: 1.1 });
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

  _moreInfo(entityId) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  getCardSize() {
    const h = this._L ? this._L.H : 330;
    const bats = this._E && this._E.B && this._E.B.length ? 100 : 0;
    return Math.ceil((h + bats + (this._cfg && this._cfg.title ? 66 : 0)) / 50);
  }
}

if (!customElements.get('home-energy-flow-card')) {
  customElements.define('home-energy-flow-card', HomeEnergyFlowCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'home-energy-flow-card', name: 'Home Energy Flow Card', description: 'Animated energy flow between grid, solar, battery, home and consumers', preview: true });
  console.info(`%c HOME-ENERGY-FLOW-CARD %c v${PFC_VERSION} `, 'background:#3b82f6;color:#fff;font-weight:700', 'background:#eee;color:#333');
}
// Oude naam blijft werken, tenzij een andere kaart (bv. ulic75/power-flow-card) die al gebruikt.
if (!customElements.get('power-flow-card')) {
  customElements.define('power-flow-card', class extends HomeEnergyFlowCard {});
}
