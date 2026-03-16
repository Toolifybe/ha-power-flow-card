class PowerFlowCardSimple extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._particles = [];
    this._tick = 0;
    this._animating = false;
    this._config = {};
  }

  static getConfigElement() {
    return document.createElement('power-flow-card-simple-editor');
  }

  static getStubConfig() {
    return {
      solar_entity:    'sensor.solar_power',
      grid_entity:     'sensor.grid_power',
      battery_entity:  'sensor.battery_power',
      home_entity:     'sensor.home_power',
      battery_soc_entity: 'sensor.battery_soc',
      max_power:       5000,
    };
  }

  setConfig(config) {
    if (!config.solar_entity && !config.grid_entity && !config.home_entity) {
      throw new Error('At least one entity must be configured');
    }
    this._config = {
      solar_entity:       config.solar_entity       || null,
      grid_entity:        config.grid_entity        || null,
      battery_entity:     config.battery_entity     || null,
      battery_soc_entity: config.battery_soc_entity || null,
      home_entity:        config.home_entity        || null,
      title:              config.title              || null,
      max_power:          config.max_power          || 5000,
      colors: {
        solar:   (config.colors && config.colors.solar)   || '#639922',
        grid:    (config.colors && config.colors.grid)    || '#888780',
        battery: (config.colors && config.colors.battery) || '#378ADD',
        home:    (config.colors && config.colors.home)    || '#D85A30',
      },
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateValues();
    this._updateSummary();
  }

  _getState(entity) {
    if (!entity || !this._hass) return null;
    const s = this._hass.states[entity];
    return s ? parseFloat(s.state) || 0 : null;
  }

  _updateValues() {
    if (!this._hass || !this._canvas) return;
    const cfg = this._config;
    this._D = {
      solar: Math.round(this._getState(cfg.solar_entity)   || 0),
      grid:  Math.round(this._getState(cfg.grid_entity)    || 0),
      bat:   Math.round(this._getState(cfg.battery_entity) || 0),
      home:  Math.round(this._getState(cfg.home_entity)    || 0),
      soc:   Math.round(this._getState(cfg.battery_soc_entity) || 0),
    };
    if (!this._animating) this._startAnimation();
  }

  _fmtW(v) {
    const abs = Math.abs(v);
    if (abs >= 1000) return (v < 0 ? '-' : '') + (abs / 1000).toFixed(1) + ' kW';
    return v + ' W';
  }

  _signW(v) {
    return (v > 0 ? '+' : '') + this._fmtW(v);
  }

  _updateSummary() {
    if (!this._shadow || !this._D) return;
    const D = this._D;
    const cfg = this._config;
    const colors = cfg.colors;

    const gridColor = D.grid  > 0 ? colors.home   : colors.solar;
    const batColor  = D.bat   > 0 ? colors.battery : '#D97706';
    const batLabel  = D.bat   > 0 ? 'Ontlaadt' : D.bat < 0 ? 'Laadt' : 'Standby';

    const el = (id) => this._shadow.getElementById(id);
    if (!el('v-solar')) return;

    if (cfg.solar_entity) {
      el('v-solar').textContent = this._fmtW(D.solar);
      el('v-solar').style.color = colors.solar;
      el('b-solar').style.display = '';
    } else {
      el('b-solar').style.display = 'none';
    }

    if (cfg.grid_entity) {
      el('v-grid').textContent = this._signW(D.grid);
      el('v-grid').style.color = gridColor;
      el('b-grid').style.display = '';
    } else {
      el('b-grid').style.display = 'none';
    }

    if (cfg.battery_entity) {
      const socTxt = cfg.battery_soc_entity ? ` (${D.soc}%)` : '';
      el('v-bat').textContent = batLabel;
      el('v-bat').style.color = batColor;
      el('l-bat').textContent = 'Batterij' + socTxt;
      el('b-bat').style.display = '';
    } else {
      el('b-bat').style.display = 'none';
    }

    if (cfg.home_entity) {
      el('v-home').textContent = this._fmtW(D.home);
      el('v-home').style.color = colors.home;
      el('b-home').style.display = '';
    } else {
      el('b-home').style.display = 'none';
    }
  }

  _render() {
    const cfg = this._config;
    const colors = cfg.colors;

    this._shadow = this.shadowRoot;
    this._shadow.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: var(--card-background-color, var(--primary-background-color, #fff));
          border-radius: 12px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.08));
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
          box-sizing: border-box;
        }
        .title {
          font-size: 13px;
          font-weight: 500;
          color: var(--secondary-text-color, #888);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        canvas { width: 100%; display: block; border-radius: 6px; }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 10px;
        }
        .sum-block {
          border-radius: 8px;
          padding: 8px 6px;
          text-align: center;
        }
        .sum-label {
          font-size: 11px;
          color: var(--secondary-text-color, #888);
          margin-bottom: 2px;
        }
        .sum-value {
          font-size: 15px;
          font-weight: 600;
        }
      </style>
      <div class="card">
        ${cfg.title ? `<div class="title">${cfg.title}</div>` : ''}
        <canvas id="pfc-canvas"></canvas>
        <div class="summary">
          <div class="sum-block" id="b-solar" style="background:${colors.solar}15">
            <div class="sum-label">Zonnepanelen</div>
            <div class="sum-value" id="v-solar" style="color:${colors.solar}">— W</div>
          </div>
          <div class="sum-block" id="b-grid" style="background:${colors.grid}15">
            <div class="sum-label">Net</div>
            <div class="sum-value" id="v-grid" style="color:${colors.grid}">— W</div>
          </div>
          <div class="sum-block" id="b-bat" style="background:${colors.battery}15">
            <div class="sum-label" id="l-bat">Batterij</div>
            <div class="sum-value" id="v-bat" style="color:${colors.battery}">—</div>
          </div>
          <div class="sum-block" id="b-home" style="background:${colors.home}15">
            <div class="sum-label">Verbruik</div>
            <div class="sum-value" id="v-home" style="color:${colors.home}">— W</div>
          </div>
        </div>
      </div>
    `;

    this._canvas = this._shadow.getElementById('pfc-canvas');
    this._initCanvas();
  }

  _initCanvas() {
    const canvas = this._canvas;
    if (!canvas) return;

    const DPR = window.devicePixelRatio || 1;
    const W = 480, H = 260;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    this._ctx = canvas.getContext('2d');
    this._ctx.scale(DPR, DPR);
    this._W = W;
    this._H = H;

    const cfg = this._config;
    const colors = cfg.colors;
    const hasSolar = !!cfg.solar_entity;
    const hasGrid  = !!cfg.grid_entity;
    const hasBat   = !!cfg.battery_entity;
    const hasHome  = !!cfg.home_entity;

    this._nodes = {};
    if (hasSolar) this._nodes.solar = { x: W * .5,  y: 44,    col: colors.solar,   lbl: 'Zonnepanelen', ico: '☀' };
    if (hasGrid)  this._nodes.grid  = { x: 60,       y: H * .5, col: colors.grid,   lbl: 'Net',          ico: '⚡' };
    if (hasBat)   this._nodes.bat   = { x: W - 60,   y: H * .5, col: colors.battery,lbl: 'Batterij',     ico: '⬡' };
    if (hasHome)  this._nodes.home  = { x: W * .5,  y: H - 44, col: colors.home,   lbl: 'Huis',         ico: '⌂' };

    if (!hasSolar && hasGrid && hasHome) {
      this._nodes.grid.x = 60;
      this._nodes.home.x = W - 60;
      this._nodes.home.y = H * .5;
    }

    this._flows = [];
    if (hasSolar && hasHome) this._flows.push({ from:'solar', to:'home', col:colors.solar,   active:()=> (this._D||{solar:0}).solar > 0 });
    if (hasSolar && hasBat)  this._flows.push({ from:'solar', to:'bat',  col:colors.solar,   active:()=> { const D=this._D||{}; return (D.solar||0)>0 && (D.bat||0)<0; } });
    if (hasSolar && hasGrid) this._flows.push({ from:'solar', to:'grid', col:colors.solar,   active:()=> (this._D||{grid:0}).grid  < 0 });
    if (hasGrid  && hasHome) this._flows.push({ from:'grid',  to:'home', col:colors.grid,    active:()=> (this._D||{grid:0}).grid  > 0 });
    if (hasBat   && hasHome) this._flows.push({ from:'bat',   to:'home', col:colors.battery, active:()=> (this._D||{bat:0}).bat   > 0 });
    if (hasHome  && hasBat)  this._flows.push({ from:'home',  to:'bat',  col:'#D97706',      active:()=> { const D=this._D||{}; return (D.bat||0)<0 && (D.solar||0)<=0; } });

    if (this._D) this._startAnimation();
  }

  _startAnimation() {
    if (this._animating) return;
    this._animating = true;
    this._frame();
  }

  _frame() {
    if (!this._ctx || !this._D) { this._animating = false; return; }
    const c = this._ctx, W = this._W, H = this._H;
    const D = this._D;

    c.clearRect(0, 0, W, H);

    this._flows.forEach(fl => this._drawLine(fl));

    if (this._tick % 18 === 0) {
      this._flows.filter(f => f.active()).forEach(fl => {
        this._particles.push({ fl, t: Math.random() * 0.3, spd: 0.005 + Math.random() * 0.004 });
      });
    }

    for (let i = this._particles.length - 1; i >= 0; i--) {
      this._particles[i].t += this._particles[i].spd;
      if (this._particles[i].t >= 1 || !this._particles[i].fl.active()) {
        this._particles.splice(i, 1); continue;
      }
      this._drawDot(this._particles[i]);
    }

    this._flows.forEach(fl => this._drawFlowVal(fl));
    Object.entries(this._nodes).forEach(([k, n]) => { this._drawNode(n); this._drawNodeIcon(n, k); });

    this._tick++;
    requestAnimationFrame(() => this._frame());
  }

  _bez(from, to, t) {
    const f = this._nodes[from], tN = this._nodes[to];
    const mx = (f.x + tN.x) / 2, my = (f.y + tN.y) / 2;
    return {
      x: (1-t)*(1-t)*f.x + 2*(1-t)*t*mx + t*t*tN.x,
      y: (1-t)*(1-t)*f.y + 2*(1-t)*t*my + t*t*tN.y,
    };
  }

  _drawLine(fl) {
    const f = this._nodes[fl.from], t = this._nodes[fl.to];
    if (!f || !t) return;
    const mx = (f.x+t.x)/2, my = (f.y+t.y)/2;
    const on = fl.active();
    const c = this._ctx;
    c.save(); c.beginPath();
    c.moveTo(f.x, f.y);
    c.quadraticCurveTo(mx, my, t.x, t.y);
    c.strokeStyle = on ? fl.col + '99' : '#aaaaaa33';
    c.lineWidth   = on ? 2.5 : 1.2;
    if (!on) c.setLineDash([5, 5]);
    c.stroke(); c.setLineDash([]); c.restore();
  }

  _drawDot(p) {
    const f = this._nodes[p.fl.from], t = this._nodes[p.fl.to];
    if (!f || !t) return;
    const pos = this._bez(p.fl.from, p.fl.to, p.t);
    const c = this._ctx;
    c.save(); c.beginPath();
    c.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    c.fillStyle = p.fl.col;
    c.fill(); c.restore();
  }

  _drawNode(n) {
    const c = this._ctx;
    c.save();
    c.beginPath(); c.arc(n.x, n.y, 32, 0, Math.PI * 2);
    c.fillStyle   = n.col + '1a'; c.fill();
    c.lineWidth   = 2; c.strokeStyle = n.col; c.stroke();
    c.restore();
  }

  _drawNodeIcon(n, key) {
    const icons = { solar:'☀', grid:'⚡', bat:'⬡', home:'⌂' };
    const c = this._ctx;
    c.save();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '22px sans-serif'; c.fillStyle = n.col;
    c.fillText(icons[key] || '●', n.x, n.y - 7);
    c.font = 'bold 10px sans-serif'; c.fillStyle = n.col;
    c.fillText(n.lbl, n.x, n.y + 15);
    c.restore();
  }

  _drawFlowVal(fl) {
    if (!fl.active()) return;
    const f = this._nodes[fl.from], t = this._nodes[fl.to];
    if (!f || !t) return;
    const mx = (f.x+t.x)/2 + 12, my = (f.y+t.y)/2 - 12;
    const D = this._D || {};
    let v = 0;
    if (fl.from === 'solar') v = D.solar;
    else if (fl.from === 'grid')  v = Math.abs(D.grid);
    else if (fl.from === 'bat' || fl.to === 'bat') v = Math.abs(D.bat);
    if (!v) return;
    const txt = v >= 1000 ? (v/1000).toFixed(1)+' kW' : v+' W';
    const c = this._ctx;
    c.save();
    c.font = 'bold 10px sans-serif'; c.textAlign = 'center';
    c.fillStyle = fl.col;
    c.fillText(txt, mx, my);
    c.restore();
  }

  getCardSize() { return 4; }
}

customElements.define('power-flow-card-simple', PowerFlowCardSimple);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'power-flow-card-simple',
  name:        'Power Flow Card Simple',
  description: 'Visualiseert energiestromen tussen zonnepanelen, net, batterij en verbruik met bewegende animatie.',
  preview:     true,
});
