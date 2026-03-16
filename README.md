# Power Flow Card

A lightweight, animated power flow card for Home Assistant. No dependencies, no build step — just one JS file.

Visualises energy flows between solar panels, grid, battery and home consumption with animated dots on the flow lines. Individual consumers (PC, TV, ...) can be added easily via YAML.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)

## Layout

The home node sits at the centre. Fixed nodes (solar, grid, battery) are positioned around it. Individual consumers appear below in rows of up to 3. Inactive connections are shown as dashed lines.

## Installation

### Via HACS (recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the three dots → **Custom repositories**
4. Add your GitHub repository URL, category: **Lovelace**
5. Search for **Power Flow Card** and install

### Manual

1. Copy `power-flow-card.js` to `/config/www/`
2. Go to **Settings → Dashboards → Resources**
3. Add `/local/power-flow-card.js` as a **JavaScript module**

## Basic configuration

```yaml
type: custom:power-flow-card
solar_entity:        sensor.envoy_current_power_production
grid_entity:         sensor.elektriciteit_meter_power
battery_entity:      sensor.marstek_venus_ac_power
battery_soc_entity:  sensor.marstek_venus_battery_soc
home_entity:         sensor.werkelijk_verbruik
title: Energy Flow
```

## Individual consumers

Add individual consumers via the `entities` list. Each entry gets its own node connected to the home node by a flow line.

```yaml
type: custom:power-flow-card
solar_entity:  sensor.solar_power
grid_entity:   sensor.grid_power
home_entity:   sensor.home_power
entities:
  - entity: sensor.pc_power
    name: PC
    icon: mdi:desktop-classic
    color: '#22c55e'
  - entity: sensor.tv_power
    name: TV Living
    icon: mdi:television
    color: '#a855f7'
  - entity: sensor.wall_socket_power
    name: Office wall
    icon: mdi:power-socket-eu
    color: '#f97316'
  - entity: sensor.airco_power
    name: Air conditioning
    icon: mdi:heat-pump
```

`color` is optional — if omitted, a color is automatically assigned from the built-in palette.

## Options

### Main options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `solar_entity` | string | — | Sensor for solar production (W) |
| `grid_entity` | string | — | Sensor for grid power (W). Positive = consuming, negative = exporting |
| `battery_entity` | string | — | Sensor for battery AC power (W). Positive = discharging, negative = charging |
| `battery_soc_entity` | string | — | Sensor for battery state of charge (%) |
| `home_entity` | string | — | Sensor for total home consumption (W) |
| `title` | string | — | Optional title shown above the card |
| `entities` | list | — | Individual consumers (see below) |
| `colors.solar` | string | `#f59e0b` | Color for the solar node and flows |
| `colors.grid` | string | `#64748b` | Color for the grid node and flows |
| `colors.battery` | string | `#3b82f6` | Color for the battery node and flows |
| `colors.home` | string | `#3b82f6` | Color for the home node |

### Per-entity options (`entities`)

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `entity` | string | ✓ | Entity ID of the power sensor (W) |
| `name` | string | — | Display name (defaults to entity ID) |
| `icon` | string | — | MDI icon (see list below) |
| `color` | string | — | Hex color (defaults to auto-assigned) |

### Available icons

| Icon | Code |
|------|------|
| Solar panel | `mdi:solar-panel` |
| Transmission tower | `mdi:transmission-tower` |
| Battery | `mdi:battery-high` |
| Home | `mdi:home` |
| Desktop PC | `mdi:desktop-classic` |
| Television | `mdi:television` |
| Wall socket | `mdi:power-socket-eu` |
| Electric car | `mdi:car-electric` |
| Washing machine | `mdi:washing-machine` |
| Heat pump | `mdi:heat-pump` |
| Light bulb | `mdi:lightbulb` |
| Lightning bolt | `mdi:lightning-bolt` |

## Flow logic

| Flow | Active when |
|------|-------------|
| Solar → Home | Solar production > 0 |
| Solar → Battery | Solar > 0 and battery is charging |
| Solar → Grid | Solar > 0 and grid is exporting (negative) |
| Grid → Home | Grid is positive (consuming) |
| Battery → Home | Battery is discharging (positive) |
| Home → Battery | Battery is charging and no solar production |
| Home → Consumer | Consumer power > 0 |

## Custom colors

```yaml
type: custom:power-flow-card
solar_entity: sensor.solar_power
grid_entity:  sensor.grid_power
home_entity:  sensor.home_power
colors:
  solar:   '#f59e0b'
  grid:    '#6366f1'
  battery: '#3b82f6'
  home:    '#3b82f6'
```

## All entities are optional

The card adapts its layout to whichever nodes are configured:

```yaml
type: custom:power-flow-card
solar_entity: sensor.solar_power
home_entity:  sensor.home_power
entities:
  - entity: sensor.pc_power
    name: PC
```

## License

MIT
