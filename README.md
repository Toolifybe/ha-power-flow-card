# Power Flow Card

[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)](https://github.com/Toolifybe/ha-power-flow-card)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)

Animated power flow card for Home Assistant. Visualises real-time energy flows between solar panels, grid, battery, home and individual consumers.

## Features

- Animated flow dots showing direction and source of energy
- Flows are calculated from the energy balance (solar, grid, battery), home consumption is calculated when no `home_entity` is set
- Any MDI icon via Home Assistant's own icon set
- Sensors in W, kW or MW (power) and Wh, kWh or MWh (energy) are converted automatically
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
```

Home consumption is calculated as solar + grid import + battery discharge − export − battery charge.
Only set `home_entity` if you have a sensor that measures exactly that.

---

## Full configuration

```yaml
type: custom:power-flow-card
title: Energy Flow

# ── Sources ────────────────────────────────────────────────────────────────────
solar_entity: sensor.envoy_current_power_production
grid_entity: sensor.elektriciteit_meter_power
# Optional: without it, home consumption is calculated from the other sensors
# home_entity: sensor.home_consumption

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

# ── Minimum power ──────────────────────────────────────────────────────────────
# Flows smaller than this (W) are not animated. Prevents the grid flow from
# flipping direction around 0 W. Default: 10.
min_power: 10

# ── Colours ────────────────────────────────────────────────────────────────────
# Colour of each node. Use #rgb or #rrggbb for the 3D highlight; other CSS colours work without it.
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
  - entity: sensor.sonoff_xxx_power
    name: PC
    icon: mdi:desktop-classic
    color: '#22c55e'

  - entity: sensor.sonoff_xxx_power
    name: TV
    icon: mdi:television
    color: '#a855f7'

  - entity: sensor.sonoff_xxx_power
    name: Dishwasher
    icon: mdi:dishwasher
    color: '#06b6d4'

  - entity: sensor.sonoff_xxx_power
    name: Washing machine
    icon: mdi:washing-machine
    color: '#f59e0b'

  - entity: sensor.sonoff_xxx_power
    name: Dryer
    color: '#84cc16'

  - entity: sensor.sonoff_xxx_power
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
| `home_entity` | entity | calculated | Home consumption sensor (W). Leave out to calculate it |
| `battery_entity` | entity | — | Battery power sensor (W) |
| `battery_entities` | list | — | List of battery sensors (summed) |
| `battery_soc_entity` | entity | — | Battery state of charge sensor (%) |
| `battery_stored_energy_entities` | list | — | Stored energy sensors (Wh or kWh) |
| `battery_capacity_kwh` | number | — | Total battery capacity in kWh |
| `grid_inverted` | bool | `false` | Invert grid sensor polarity |
| `battery_inverted` | bool | `true` | Invert battery sensor polarity |
| `debounce_seconds` | number | `8` | Seconds at 0 W before a consumer is hidden |
| `min_power` | number | `10` | Flows below this value (W) are not animated |
| `colors.solar` | colour | `#f59e0b` | Solar node colour |
| `colors.grid` | colour | `#6366f1` | Grid node colour |
| `colors.battery` | colour | `#ec4899` | Battery node colour |
| `colors.home` | colour | `#f97316` | Home node colour |
| `labels.solar` | string | `Zonne-energie` | Solar node display name |
| `labels.grid` | string | `Net` | Grid node display name |
| `labels.battery` | string | `Batterij` | Battery node display name |
| `labels.home` | string | `Huis` | Home node display name |
| `entities` | list | — | Individual consumer nodes |
| `entities[].entity` | entity | — | Power sensor (W) |
| `entities[].name` | string | entity id | Display name |
| `entities[].icon` | string | — | MDI icon (e.g. `mdi:desktop-classic`) |
| `entities[].color` | hex | auto | Node colour |

---

## Flow logic

| Situation | Animation |
|-----------|-----------|
| Solar production | Yellow dots: solar → home (solar is used by the home first) |
| Battery charging, solar left over | Yellow dots: solar → battery |
| Battery charging from the grid | Pink dots: home → battery |
| Grid import | Blue dots: grid → home |
| Grid export | Blue dots: home → grid |
| Battery discharging | Pink dots: battery → home |
| Consumer active | Green dots: home → consumer |
| Consumer at 0 W | Consumer is hidden (with debounce) |

---

## Icons

Every MDI icon that Home Assistant knows can be used, e.g. `mdi:desktop-classic`, `mdi:television`, `mdi:car-electric`, `mdi:heat-pump`, `mdi:washing-machine`, `mdi:water-heater`.
Browse icons at [pictogrammers.com](https://pictogrammers.com/library/mdi/). Consumers without `icon:` show only their value.

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

### v3.2.0
- Fixed: every return to the browser tab added an extra event listener, doubling each time and slowing the browser down over time
- Fixed: `debounce_seconds` counted function calls instead of seconds, so consumers disappeared almost immediately; consumers also disappear now without a new sensor update
- Fixed: consumer layout could be calculated for a different number of consumers than were drawn
- Fixed: home consumption is calculated from the energy balance when no `home_entity` is set
- Fixed: flows are calculated from the energy balance — battery charging is now always shown (from solar and/or grid), solar → home no longer animates when all solar goes elsewhere
- Fixed: sensors in kW/MW and Wh/MWh are converted (stored energy in Wh gave a SOC stuck at 100%)
- Fixed: icons now use Home Assistant's own icon set; several built-in icons were wrong and unknown icons showed an empty circle
- Fixed: animation speed no longer depends on the screen refresh rate (120/144 Hz ran twice as fast)
- Fixed: colours other than `#rrggbb` broke the 3D sphere
- Fixed: unavailable sensors show `–` instead of `0 W`
- Fixed: the card editor showed an empty editor; the YAML editor is used now
- New: `min_power` (default 10 W) — no more flickering flow direction around 0 W
- New: numbers follow the Home Assistant language (e.g. `1,35 kW`)
- Improved: the card only recalculates when one of its own sensors changes

### v3.1.0
- New: 3D sphere look for all nodes — radial gradient fill, drop shadow and glare highlight
- Icons and values now render in white for better contrast on the filled spheres
- Node colours remain fully configurable via `colors:` in YAML

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
