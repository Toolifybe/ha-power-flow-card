# Power Flow Card

A lightweight, animated power flow card for Home Assistant. No dependencies, no build step — just one JS file.

Visualises energy flows between solar panels, grid, battery and home consumption with animated dots on the flow lines. Individual consumers (PC, TV, ...) can be added via YAML.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)

## Layout

The home node sits at the centre. Fixed nodes (solar, grid, battery) are positioned around it. Individual consumers appear below in rows of up to 3. Inactive connections are shown as dashed lines. Animated dots travel along active flow lines from circle edge to circle edge.

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
solar_entity: sensor.envoy_121635002337_current_power_production
grid_entity: sensor.elektriciteit_meter_power
battery_entities:
  - sensor.marstek_venus_modbus_ac_power
  - sensor.marstek_venus_modbus_ac_power_2
  - sensor.marstek_venus_modbus_ac_power_3
battery_stored_energy_entities:
  - sensor.marstek_venus_modbus_stored_energy
  - sensor.marstek_venus_modbus_stored_energy_2
  - sensor.marstek_venus_modbus_stored_energy_3
battery_capacity_kwh: 15.36
battery_inverted: true
home_entity: sensor.werkelijk_verbruik
title: Energiestroom
entities:
  - entity: sensor.pc_power
    name: PC
    icon: mdi:desktop-classic
    color: '#22c55e'
  - entity: sensor.tv_power
    name: TV Living
    icon: mdi:television
    color: '#a855f7'
```

## All options

### Main options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `solar_entity` | string | — | Sensor for solar production (W) |
| `grid_entity` | string | — | Sensor for grid power (W) |
| `grid_inverted` | bool | `false` | `false` = positive is import, negative is export. `true` = negative is import, positive is export |
| `battery_entity` | string | — | Single battery power sensor (W) |
| `battery_entities` | list | — | Multiple battery power sensors (W) — values are summed |
| `battery_soc_entity` | string | — | Single battery state of charge sensor (%) |
| `battery_stored_energy_entities` | list | — | Multiple stored energy sensors (kWh) — used to calculate total SOC |
| `battery_capacity_kwh` | number | — | Total battery capacity in kWh — required when using `battery_stored_energy_entities` |
| `battery_inverted` | bool | `true` | `true` = positive is discharging, negative is charging (Marstek/Victron). `false` = opposite |
| `home_entity` | string | — | Sensor for total home consumption (W) |
| `title` | string | — | Optional title shown above the card |
| `entities` | list | — | Individual consumers (see below) |
| `colors.solar` | string | `#f59e0b` | Color for solar node and flows |
| `colors.grid` | string | `#64748b` | Color for grid node and flows |
| `colors.battery` | string | `#22c55e` | Color for battery node and flows |
| `colors.home` | string | `#3b82f6` | Color for home node |

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
| Solar → Home | Solar > 0 and no grid export |
| Solar → Battery | Solar > 0 and battery is charging |
| Solar → Grid | Solar > 0 and grid is exporting |
| Grid → Home | Grid is importing |
| Home → Grid | Grid is exporting and no solar |
| Battery → Home | Battery is discharging |
| Home → Battery | Battery is charging and no solar |
| Home → Consumer | Consumer power > 0 |

## Battery SOC calculation

Two options for displaying the battery state of charge:

**Option 1 — single SOC sensor:**
```yaml
battery_soc_entity: sensor.marstek_venus_modbus_battery_soc
```

**Option 2 — calculate from stored energy (recommended for multiple batteries):**
```yaml
battery_stored_energy_entities:
  - sensor.marstek_venus_modbus_stored_energy
  - sensor.marstek_venus_modbus_stored_energy_2
  - sensor.marstek_venus_modbus_stored_energy_3
battery_capacity_kwh: 15.36
```
SOC is calculated as `(sum of stored energy in kWh / battery_capacity_kwh) * 100`.

## Custom colors

```yaml
type: custom:power-flow-card
solar_entity: sensor.solar_power
grid_entity: sensor.grid_power
home_entity: sensor.home_power
colors:
  solar:   '#f59e0b'
  grid:    '#64748b'
  battery: '#22c55e'
  home:    '#3b82f6'
```

## All entities are optional

The card adapts its layout to whichever nodes are configured:

```yaml
type: custom:power-flow-card
solar_entity: sensor.solar_power
home_entity: sensor.home_power
entities:
  - entity: sensor.pc_power
    name: PC
```

## License

MIT
