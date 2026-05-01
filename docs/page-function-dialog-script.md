# Pokopia Page Dialog Script

This script walks through each page in the app and calls out the key functions while demoing.

## Roles

- `Host`: person presenting the app
- `User`: example user action
- `App`: expected on-screen response

---

## 1. Home (`/`)

### Goal
Introduce the project and route to each major section.

### Dialog

`Host:` "This is the official home screen. The logo is on the left, and the section previews are on the right."

`App:` "Animated particle background appears. Three large cards are visible: Block Builder, Items Explorer, Pokemon Explorer."

`Host:` "Each card is clickable and takes us straight to that section."

`User:` Clicks a card.

`App:` "Navigates to the selected page."

### Functions Covered

- Desktop card-swap preview stack
- Mobile swipe/tap card carousel with prev/next controls
- Direct navigation links to:
  - `/builder`
  - `/items`
  - `/pokemon-explorer`

---

## 2. Block Builder (`/builder`)

### Goal
Create a build, manage placement tools, and save/load projects.

### Dialog

`Host:` "The Builder is the interactive 3D workspace. The logo in the navbar always returns home."

`User:` Clicks logo.

`App:` "Returns to home page."

`Host:` "Open `Account + Save` to register, log in, save builds, and manage saved projects."

`User:` Expands `Account + Save`, then logs in.

`App:` "Shows account state, `SAVE BUILD`, and `My Saved Builds` list with load/delete actions."

`Host:` "Next, we can set grid dimensions and build layers before placing."

`User:` Adjusts `Grid Size` and `Height (Layers)`.

`App:` "Canvas updates while preserving existing build data when possible."

`Host:` "Pick a tool section and place on the grid."

`User:` Selects `Blocks`, `Doors`, `Windows`, or `Roof`, then taps grid.

`App:` "Places the selected item footprint. Door/window presets place multi-cell shapes automatically."

`Host:` "For walls, set `Wall Size` first to place larger wall footprints quickly."

`User:` Changes wall length/height and places again.

`App:` "Uses current wall dimensions for block placement."

`Host:` "Use Erase Mode to remove placements, and use Layer controls to move up/down building levels."

`User:` Toggles `ERASE MODE`, changes `Layer`.

`App:` "Updates interaction mode and active layer."

`Host:` "The totals and item counts track usage. Item names are editable in `Item Count`."

`User:` Renames an item label in `Item Count`.

`App:` "Uses custom name in summary/export."

`Host:` "Use `EXPORT SUMMARY` for a count breakdown and build screenshot."

`User:` Clicks `EXPORT SUMMARY`.

`App:` "Shows modal with grid info, screenshot preview, and grouped item totals."

`Host:` "Use `CLEAR ALL` to reset the build."

### Functions Covered

- 3D placement, rotation, pan, zoom
- Grid controls:
  - `Grid Size`
  - `Height (Layers)`
- Placement categories:
  - `Blocks` (+ `Wall Size`)
  - `Doors` (1x2, 2x2, 2x3 presets)
  - `Windows` (includes 1x2 sash)
  - `Roof` (+ rotate)
- `ERASE MODE`
- `Layer` up/down
- `TOTAL PLACED` and editable `Item Count`
- `EXPORT SUMMARY` modal with screenshot
- `CLEAR ALL`
- Account/save flow:
  - register/login/logout
  - save current build
  - list/load/delete saved builds

### Desktop Shortcuts

- `Q` = Blocks
- `W` = Doors
- `E` = Windows
- `R` = Roof
- `A` = Toggle erase
- `S` = Layer down
- `D` = Layer up
- `F` = Rotate roof (when roof is selected)

### Mobile Notes

- Bottom `Open Menu` button opens full-screen tool panel
- Selecting a placement tool auto-closes the menu
- Grid/wall settings remain open while adjusting
- Roof rotate control floats over the canvas

---

## 3. Items Explorer (`/items`)

### Goal
Search and filter all items by text, Pokemon favorites, and favorite type.

### Dialog

`Host:` "Items Explorer is card-based and sectioned. Use the search and filters at the top."

`User:` Types in `Search Items`.

`App:` "Filters by item text, favorite labels, and Pokemon-name-to-favorites matching."

`Host:` "Now use the Pokemon filter."

`User:` Opens `Pokemon` picker and selects a Pokemon (with sprite shown in list).

`App:` "Shows only items matching that Pokemon's favorite categories."

`Host:` "Favorite Type can narrow down even further, and `RESET FILTERS` clears all filters."

`User:` Clicks section nav pill (example: `Materials`).

`App:` "Auto-expands that section and scrolls to it."

`Host:` "Cards show item image, description, favorite tags, tag sprite, and locations."

`User:` Clicks a favorite tag chip on an item card.

`App:` "Applies favorite filter to that selected tag."

### Functions Covered

- Search input (`name, section, location, favorite type, pokemon`)
- Pokemon dropdown filter with alphabetized names and sprites
- Favorite type dropdown
- `RESET FILTERS`
- Section controls:
  - nav pills
  - per-section collapse/expand
  - `EXPAND ALL` / `COLLAPSE ALL`
- Item card details:
  - image + description
  - clickable favorite chips
  - tag badge with sprite
  - locations list

---

## 4. Pokemon Explorer (`/pokemon-explorer`)

### Goal
Browse Pokemon details and jump to related item favorites.

### Dialog

`Host:` "Pokemon Explorer supports multi-filter discovery."

`User:` Uses Search, Habitat, Primary Location, Favorite Category, and Rarity filters.

`App:` "Updates the Pokemon directory and result count."

`Host:` "Each card includes number, sprite, name, habitat, rarity, favorites, specialties, and areas."

`User:` Clicks a favorite chip on a Pokemon card.

`App:` "Navigates to `/items` with that favorite pre-filtered."

`Host:` "On mobile, cards are compact by default."

`User:` Taps a mobile Pokemon card row.

`App:` "Expands/collapses details for that Pokemon."

### Functions Covered

- Text + dropdown filtering:
  - Search
  - Ideal Habitat
  - Primary Location
  - Favorite Category
  - Rarity
- Clickable favorite chips linking into Items filters
- Specialty chips (with icons where available)
- Area chips (with icons where available)
- Mobile card collapse/expand behavior

---

## 5. Shared Navigation + Global UI

### Dialog

`Host:` "All non-home pages use the same themed header style and right-side pill nav links."

`Host:` "Clicking the logo in nav returns to Home from Builder, Items, and Pokemon Explorer."

`Host:` "The Buy Me a Coffee button is fixed at bottom-left across pages."

### Functions Covered

- Shared themed page headers (Builder/Items/Pokemon)
- Logo click-to-home behavior
- Cross-links between major pages
- Global fixed `Buy me a coffee` CTA
