# Power Flow Card

[![Version](https://img.shields.io/badge/version-3.0.6-blue.svg)](https://github.com/Toolifybe/ha-power-flow-card)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)

Animated power flow card for Home Assistant. Visualises real-time energy flows between solar panels, grid, battery, home and individual consumers.

## Features

- Animated flow dots showing direction and source of energy
- Smart flow logic: solar surplus automatically charges battery
- Consumers with 0 W are automatically hidden and re-appear when active
- Active consumers dynamically re-centre alongside the home node
- Debounce protection: prevents consumers from flickering during brief sensor glitches
- Fully configurable colours, labels and node names via YAML

---

## Installation

### Via HACS (recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the **⋮** menu → **Custom repositories**
4. Add `https://github.com/Toolifybe/ha-power-flow-card` with category **Lovelace**
5. Search for **Power Flow Card** and click **Download**
6. Hard-refresh your browser (Ctrl+Shift+R)

HACS handles copying the file, registering the resource and future updates automatically.

### Manual installation

1. Download `power-flow-card.js` from the [latest release](https://github.com/Toolifybe/ha-power-flow-card/releases/latest)
2. Copy it to `/config/www/community/ha-power-flow-card/`
3. Delete any existing `.gz` file in that same folder
4. Go to **Settings → Dashboards → Resources** and add `/local/community/ha-power-flow-card/power-flow-card.js` (type: JavaScript module)
5. Hard-refresh your browser (Ctrl+Shift+R)

---

## Minimal configuration

```yaml
type: custom:power-flow-card
solar_entity: sensor.solar_power
grid_entity: sensor.grid_power
home_entity: sensor.home_power
```

---

## Full configuration

```yaml
type: custom:power-flow-card
title: Energy Flow

# ── Sources ────────────────────────────────────────────────────────────────────
solar_entity: sensor.envoy_current_power_production
grid_entity: sensor.elektriciteit_meter_power
home_entity: sensor.werkelijk_verbruik

# Single battery
battery_entity: sensor.battery_power

# OR multiple batteries (values are summed)
battery_entities:
  - sensor.marstek_venus_modbus_ac_power
  - sensor.marstek_venus_modbus_ac_power_2
  - sensor.marstek_venus_modbus_ac_power_3

# State of charge via direct sensor
battery_soc_entity: sensor.battery_soc

# OR state of charge calculated from stored energy / capacity
battery_stored_energy_entities:
  - sensor.marstek_venus_modbus_stored_energy
  - sensor.marstek_venus_modbus_stored_energy_2
  - sensor.marstek_venus_modbus_stored_energy_3
battery_capacity_kwh: 15.36

# ── Polarity ───────────────────────────────────────────────────────────────────
# grid_inverted:
#   false (default) = positive value means grid import, negative means export
#   true            = negative value means grid import, positive means export
grid_inverted: false

# battery_inverted:
#   true (default)  = positive means discharging, negative means charging (Marstek/Victron)
#   false           = negative means discharging, positive means charging
battery_inverted: true

# ── Debounce ───────────────────────────────────────────────────────────────────
# Number of seconds a consumer must read 0 W before it disappears.
# Prevents consumers from flickering due to brief sensor glitches.
# Default: 8. Set to 0 to hide immediately.
debounce_seconds: 8

# ── Colours ────────────────────────────────────────────────────────────────────
# Border colour of each node circle. Accepts any hex colour.
colors:
  solar:   '#f59e0b'    # yellow  (default)
  grid:    '#6366f1'    # blue    (default)
  battery: '#ec4899'    # pink    (default)
  home:    '#f97316'    # orange  (default)

# ── Labels ─────────────────────────────────────────────────────────────────────
# Display name shown above each node circle.
labels:
  solar:   Solar         # default: Zonne-energie
  grid:    Grid          # default: Net
  battery: Battery       # default: Batterij
  home:    Home          # default: Huis

# ── Individual consumers ───────────────────────────────────────────────────────
# Consumers at 0 W are hidden automatically and reappear when active.
# Active consumers are dynamically centred alongside the home node.
entities:
  - entity: sensor.sonoff_100255c4fd_power
    name: PC
    icon: mdi:desktop-classic
    color: '#22c55e'

  - entity: sensor.sonoff_100255d61c_power
    name: TV
    icon: mdi:television
    color: '#a855f7'

  - entity: sensor.sonoff_100255c06d_power
    name: Dishwasher
    icon: mdi:dishwasher
    color: '#06b6d4'

  - entity: sensor.sonoff_10023c6126_power
    name: Washing machine
    icon: mdi:washing-machine
    color: '#f59e0b'

  - entity: sensor.sonoff_10023c5a80_power
    name: Dryer
    color: '#84cc16'

  - entity: sensor.sonoff_100187402c_power
    name: Boiler
    icon: mdi:water-heater
    color: '#22c55e'
```

---

## Configuration reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | — | Card title |
| `solar_entity` | entity | — | Solar power sensor (W) |
| `grid_entity` | entity | — | Grid power sensor (W) |
| `home_entity` | entity | — | Home consumption sensor (W) |
| `battery_entity` | entity | — | Battery power sensor (W) |
| `battery_entities` | list | — | List of battery sensors (summed) |
| `battery_soc_entity` | entity | — | Battery state of charge sensor (%) |
| `battery_stored_energy_entities` | list | — | Stored energy sensors (Wh or kWh) |
| `battery_capacity_kwh` | number | — | Total battery capacity in kWh |
| `grid_inverted` | bool | `false` | Invert grid sensor polarity |
| `battery_inverted` | bool | `true` | Invert battery sensor polarity |
| `debounce_seconds` | number | `8` | Seconds at 0 W before a consumer is hidden |
| `colors.solar` | hex | `#f59e0b` | Solar node border colour |
| `colors.grid` | hex | `#6366f1` | Grid node border colour |
| `colors.battery` | hex | `#ec4899` | Battery node border colour |
| `colors.home` | hex | `#f97316` | Home node border colour |
| `labels.solar` | string | `Zonne-energie` | Solar node display name |
| `labels.grid` | string | `Net` | Grid node display name |
| `labels.battery` | string | `Batterij` | Battery node display name |
| `labels.home` | string | `Huis` | Home node display name |
| `entities` | list | — | Individual consumer nodes |
| `entities[].entity` | entity | — | Power sensor (W) |
| `entities[].name` | string | entity id | Display name |
| `entities[].icon` | string | — | MDI icon (e.g. `mdi:desktop-classic`) |
| `entities[].color` | hex | auto | Node border colour |

---

## Flow logic

| Situation | Animation |
|-----------|-----------|
| Solar output > home consumption | Yellow dots: solar → home **and** solar → battery |
| Solar output ≤ home consumption | Yellow dots: solar → home only |
| Grid import | Blue dots: grid → home |
| Grid export | Blue dots: home → grid |
| Battery charging from solar | Yellow dots: solar → battery |
| Battery discharging | Pink dots: battery → home |
| Consumer active | Green dots: home → consumer |
| Consumer at 0 W | Consumer is hidden (with debounce) |

---

## Available MDI icons

| Icon | YAML value |
|------|------------|
| Desktop monitor | `mdi:desktop-classic` |
| Television | `mdi:television` |
| Electric car | `mdi:car-electric` |
| Heat pump | `mdi:heat-pump` |
| Light bulb | `mdi:lightbulb` |
| Lightning bolt | `mdi:lightning-bolt` |
| Power socket | `mdi:power-socket-eu` |
| Washing machine | `mdi:washing-machine` |
| Dishwasher | `mdi:dishwasher` |
| Water heater / boiler | `mdi:water-heater` |

Browse more icons at [materialdesignicons.com](https://materialdesignicons.com)

---

## Layout

```
  [Grid]         │
  [Solar]        │    [Home]  ────── [Consumer 1]
  [Battery]      │            ────── [Consumer 2]
                 │            ────── [Consumer 3]
```

- Sources are stacked in the left column: grid top, solar middle, battery bottom
- Home sits in the centre
- Consumers are on the right, dynamically centred on the home node's vertical position
- When a consumer drops to 0 W it disappears; the remaining ones reposition automatically

---

## Troubleshooting

**Card does not load / `customElements` error**
→ Delete the `.gz` file next to the `.js` in `/config/www/community/ha-power-flow-card/` and hard-refresh. For HACS installs, try re-downloading via HACS.

**Values are incorrect**
→ Check the raw sensor values in Developer Tools → States. Verify that `grid_inverted` and `battery_inverted` match your hardware's sign convention.

**Consumer keeps flickering in and out**
→ Increase `debounce_seconds` (e.g. to `15` or `30`) to filter out noisy sensor readings.

**Dashboard layout breaks**
→ Make sure you are running v3.0.0 or later. Earlier versions contained a bug where the card rebuilt its DOM on every data update, which corrupted the HA grid layout.

---

## Changelog

### v3.0.6
- Fixed: animation dots no longer appear in wrong positions on initial load
- Fixed: animation dots are immediately cleared when active consumers change, preventing stray dots during layout transitions

### v3.0.5
- Fixed: card height now correctly scales to fit all active consumers — with 6+ consumers the bottom nodes were clipped outside the card

### v3.0.4
- Fixed: dashed line between solar and battery node is now always visible when both are configured
- Improved: consumer flow paths now use rounded corners instead of sharp right angles
- Improved: animation dots follow the rounded corner paths

### v3.0.3
- Fixed: source nodes (grid, solar, battery) and home node no longer shift position when consumers appear or disappear
- Card height now grows downward only — sources and home stay at their fixed vertical positions at all times

### v3.0.2
- Card height now dynamically adjusts to the number of active consumers — no more excess whitespace when few consumers are active
- Home node vertically re-centres as consumers appear and disappear
- Consumer nodes without an `icon:` now show only the watt value, centred inside the circle (no default fallback icon)

### v3.0.1
- Consumers without an `icon:` in YAML no longer show a default fallback circle icon
- Value text is vertically centred inside the circle when no icon is present

### v3.0.0
- Complete rewrite — stable DOM, no more layout corruption
- Consumers at 0 W are hidden; active consumers auto-centre on home node
- Configurable debounce via `debounce_seconds`
- Configurable node colours via `colors:`
- Configurable node labels via `labels:`
- Solar surplus detection: charges battery only when solar > home consumption
- Correct flow direction for all grid/battery combinations
