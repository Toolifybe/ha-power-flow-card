# Power Flow Card
A lightweight, animated power flow card for Home Assistant. No dependencies, no build step — just one JS file.

Visualises energy flows between solar panels, grid, battery and home consumption with animated dots on the flow lines.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## Installation

### Via HACS (recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the three dots → **Custom repositories**
4. Add your GitHub repository URL, category: **Lovelace**
5. Search for **Power Flow Card Simple** and install

### Manual

1. Copy `power-flow-card-simple.js` to `/config/www/`
2. Go to **Settings → Dashboards → Resources**
3. Add `/local/power-flow-card-simple.js` as **JavaScript module**

## Configuration

```yaml
type: custom:power-flow-card-simple
solar_entity:        sensor.envoy_121635002337_current_power_production
grid_entity:         sensor.elektriciteit_meter_power
battery_entity:      sensor.marstek_venus_modbus_ac_power
battery_soc_entity:  sensor.marstek_venus_modbus_battery_soc
home_entity:         sensor.werkelijk_verbruik
title: Energiestroom         # optional
max_power: 5000              # optional, for line thickness scaling
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `solar_entity` | string | — | Sensor for solar production (W) |
| `grid_entity` | string | — | Sensor for grid power (W). Positive = consuming, negative = exporting |
| `battery_entity` | string | — | Sensor for battery AC power (W). Positive = discharging, negative = charging |
| `battery_soc_entity` | string | — | Sensor for battery state of charge (%) |
| `home_entity` | string | — | Sensor for home consumption (W) |
| `title` | string | — | Optional title above the card |
| `max_power` | number | 5000 | Maximum power in W, used to scale line thickness |
| `colors.solar` | string | `#639922` | Color for solar node and flows |
| `colors.grid` | string | `#888780` | Color for grid node and flows |
| `colors.battery` | string | `#378ADD` | Color for battery node and flows |
| `colors.home` | string | `#D85A30` | Color for home node and flows |

## Flow logic

| Flow | Active when |
|------|-------------|
| Solar → Home | Solar production > 0 |
| Solar → Battery | Solar > 0 and battery is charging |
| Solar → Grid | Grid is exporting (negative) |
| Grid → Home | Grid is consuming (positive) |
| Battery → Home | Battery is discharging (positive) |
| Home → Battery | Battery charging and no solar |

## Colors

Custom colors can be set per node:

```yaml
type: custom:power-flow-card-simple
solar_entity: sensor.solar_power
grid_entity:  sensor.grid_power
home_entity:  sensor.home_power
colors:
  solar:   '#f59e0b'
  grid:    '#6366f1'
  home:    '#ef4444'
```

## All entities optional

All entities are optional. The card adapts its layout to the configured nodes:

```yaml
type: custom:power-flow-card-simple
solar_entity: sensor.solar_power
home_entity:  sensor.home_power
```

## License

MIT
