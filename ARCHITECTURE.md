# Casino Layout Studio — Architecture & Delivery Plan

## 1. Vision

Casino Layout Studio is a professional, offline-first PWA for designing, reorganizing,
and optimizing casino floor layouts. It replaces the AutoCAD-based workflow currently
used to reorganize existing casinos. The primary workflow is **reorganization of an
existing floor**, not greenfield design: import a plan, define the usable perimeter,
mark walls/pillars/restricted zones, bring in islands of machines, then rapidly move,
rotate, duplicate, replace, and re-flow those islands while the system continuously
validates circulation, clearances, and collisions.

Non-negotiables: functionality over decoration, 60 FPS with 5,000+ machines / 1,000+
islands / 10,000+ objects, fully offline, unlimited undo/redo, autosave, and an
architecture that survives years of feature growth (multi-floor, BIM-lite, MEP,
CCTV coverage, evacuation analysis, AR, real-time collaboration, cloud sync).

## 2. Technology Stack

React 19 · TypeScript (strict) · Vite · Three.js · React Three Fiber · Drei ·
Zustand · TailwindCSS · Framer Motion · Dexie (IndexedDB) · vite-plugin-pwa · Vitest.

The 2D editor is **not** a Three.js scene — it is a dedicated Canvas2D renderer
(`renderer/canvas2d`) for CAD-grade precision, crisp lines at any zoom, and
predictable hit-testing. The 3D view is a separate R3F scene (`renderer/scene3d`)
that reads from the same entity store, so both views are always in sync but each
uses the renderer suited to it. This mirrors how professional CAD/BIM tools split
2D drafting from 3D visualization instead of forcing one engine to do both badly.

## 3. Module Boundaries (`src/`)

```
engine/        Pure domain logic, framework-agnostic, fully unit-testable.
  geometry/    Vector/point math, polygons, bbox, intersection, distance, transforms.
  entities/    Entity type defs + factories (Wall, Pillar, Zone, Machine, Island, ...).
  spatial/     Spatial index (grid/quadtree) for hit-testing & collision queries at scale.

renderer/
  canvas2d/    Canvas2D draw routines: grid, rulers, guides, entities, selection, snap ghosts.
  scene3d/     R3F components mirroring entities as flat-shaded meshes (SketchUp-like).

editor/        Interaction layer: active tool state machine, pointer/keyboard handling,
                viewport (pan/zoom) controller, hit-testing glue between input and store.

commands/      Command Pattern: every mutation is a Command with do()/undo(). Commands
                are the ONLY way entities are mutated — UI never mutates store directly.

history/       Undo/redo stack (unlimited), version snapshots, diffing for "compare versions".

selection/     Selection set management, box-select, group/ungroup semantics for islands.

snap/          Snap engine: grid snap, entity snap (endpoints, midpoints, centers),
                angle snap, clearance-aware snap (keeps min aisle width while dragging).

constraints/   Rule engine: min aisle width, min distance to wall/pillar/access, no-overlap.
                Produces Conflict[] consumed by UI (visual warnings) and optimizer (cost fn).

optimizer/     Layout optimization engine (Strategy pattern: greedy packer, simulated
                annealing, etc.) that maximizes machine count / efficiency subject to
                constraints/, and produces multiple ranked proposals.

import/        Adapters per format (SVG now; DXF/DWG/PDF/PNG placeholders) → normalized
                ImageReference or vector entities, plus scale calibration.

export/        Adapters per format (JSON, PNG, SVG now; PDF/DXF/GLTF placeholders).

ai/            Intent layer: parses natural-language commands into Command[] sequences
                by calling into commands/ + optimizer/. No UI or rendering knowledge.

store/         Zustand slices (project, entities, layers, viewport, selection, tool, ui).
                Store holds state only; all state transitions go through commands/.

components/    Presentational + layout React components (shell, toolbars, menus).
panels/        Right-hand properties panel and other docked panels, per-entity-type forms.
hooks/         React glue (useCommand, useSelection, useViewport, useAutosave, ...).
utils/         Generic helpers with no domain knowledge (formatting, id gen, math misc).
persistence/   Dexie schema, project repository, autosave scheduler.
```

**Rule:** `engine/`, `commands/`, `history/`, `selection/`, `snap/`, `constraints/`,
`optimizer/` contain zero React and zero rendering code — they are plain TS, unit
tested in isolation. `renderer/` and `components/`/`panels/` never mutate state
directly; they dispatch Commands. This is the Clean Architecture boundary: domain
core has no outward dependencies, UI and renderers are the outer, replaceable shell.

## 4. Design Patterns in Use

- **Command Pattern** — every user action (create wall, move island, delete, rotate...)
  is a `Command` object with `do()`/`undo()`, pushed onto `history/`. Enables unlimited
  undo/redo and is the seam AI (`ai/`) and optimizer (`optimizer/`) plug into: they
  emit the same Commands a human toolclick would.
- **Factory** — `engine/entities/factory.ts` creates typed entities with defaults/ids.
- **Strategy** — snap strategies, optimizer strategies (greedy / simulated annealing),
  import/export format adapters all implement a common interface, swappable at runtime.
- **Observer** — Zustand subscriptions are the observer channel between store and
  renderers/panels; `history/` also emits change events for autosave.
- **Dependency Injection (lightweight)** — services like the spatial index or
  persistence repository are constructed once and passed via React context / store
  init rather than imported as singletons, so they're mockable in tests.

## 5. Data Model (summary)

All placeable objects extend a common `BaseEntity`: `id, type, name, layerId, locked,
visible, transform {x, y, rotation, scaleX, scaleY}, metadata`. `Island` is a
composite entity holding an ordered list of `Machine` child ids + island-level
transform, so moving/rotating/duplicating an island moves all its machines as one
unit while machines remain individually editable. Zones and the Perimeter are
polygons. Walls are segments with thickness. Everything is JSON-serializable for
Dexie storage and JSON export.

### 5.1 Blueprint Subsystem — reference documents are not layout entities

Reference plans (imported PNG/JPG/WEBP today; PDF/DXF/DWG reserved) are handled by
`src/blueprint/`, a module physically independent from `engine/entities`:

- **Own type, own store.** `BlueprintDocument` is not a `GenericEntity`. It never
  enters `entities`/`entityOrder` in `store/projectStore.ts` — it lives in its own
  Zustand store (`blueprint/blueprintStore.ts`). This isn't a naming convention, it's
  structural: `hitTestEntities`, `entitiesInBox`, the optimizer, and every model
  exporter iterate `entities`/`entityOrder` and are therefore physically incapable of
  seeing a blueprint, selecting it, colliding with it, or exporting it as part of the
  layout — there's no `if (type === 'blueprint')` to forget anywhere in that code.
- **Own render pass, own persistence.** `blueprint/renderBlueprint.ts` draws behind
  the grid (`drawBackground` → `drawBlueprints` → `drawGrid` → `drawEntities`);
  `blueprint/blueprintPersistence.ts` writes to a dedicated Dexie table (`blueprints`,
  schema v2) separate from the `projects` table's layout JSON. A blueprint's image
  bytes are decoded once into an `ImageBitmap` cache (`blueprintImageCache.ts`) kept
  entirely outside React/Zustand state, since large binary data doesn't need to
  trigger renders on its own — only transform/opacity/filter changes do.
- **Shared infrastructure where it's genuinely infrastructure, not layout.**
  Blueprint commands push onto the same global `HistoryStack` as layout commands
  (`blueprint/blueprintCommands.ts` → `history.execute`), so there's one Ctrl+Z
  timeline for the whole app. `Point`/`Transform` from `engine/geometry` are reused
  because they're pure math with no layout semantics — reusing them costs nothing and
  duplicating them would be the actual technical debt.
- **Import adapters are Strategy-pattern, one file per format**
  (`blueprint/importers/{rasterImporter,pdfImporter}.ts` behind a shared
  `BlueprintImporter` interface). PNG/JPG/WEBP decode via `createImageBitmap` today;
  `pdfImporter` is registered and type-complete but intentionally rejects with a
  clear message — PDF rasterization needs a renderer (e.g. pdf.js) outside the
  current approved stack, so adding it is a one-file change against an interface that
  already exists, not a future refactor. DXF/DWG land the same way.
- **Scales to multiple documents/floors without a model change.** The store already
  shapes state as `documents: Record<id, ...>` + `order` + `activeId` (same pattern
  as `layers`), so "several plans per project" or a `floorId` field for multi-floor
  is additive. Because every format normalizes to `{ bitmap, naturalWidth,
  naturalHeight, blob }` before it ever touches the store, the model never depends on
  what format the plan arrived in.

## 6. Phased Delivery Plan

Each phase ends with a fully working, stable app — never a broken intermediate state.

**Phase 1 — Foundation (this iteration).** Project scaffold, module skeleton, entity
model, Command/History engine, Zustand store, Canvas2D renderer with infinite pan/zoom
grid, app shell (top bar, left tool palette, right properties panel), core drawing
tools (perimeter, wall, pillar, zone, machine, island placeholder), selection +
box-select, Dexie autosave, PWA offline shell, initial Vitest coverage for engine/commands.

**Phase 2 — Islands & Machines.** Full machine/island data model and editing (add/remove
machine in island, rotate/duplicate/copy-paste, change spacing/orientation, group/
ungroup, lock), layers panel, dimensioning/measure tool, live distance readout while
dragging, keyboard shortcuts, drag-duplicate with Alt.

**Phase 3 — Constraints & Collisions.** snap/ and constraints/ engines: min aisle,
min distances to wall/pillar/access, overlap detection, visual conflict markers,
zone restrictions.

**Phase 4 — 3D View.** scene3d/ R3F renderer mirroring the 2D scene in real time,
flat-shaded SketchUp-style materials, orbit/pan navigation, instancing for
performance at 5k+ machines.

**Phase 5 — Optimizer.** optimizer/ with pluggable strategies, proposal generation,
occupancy/efficiency/circulation metrics, side-by-side comparison of proposals.

**Phase 6 — Import/Export.** SVG/PNG image-reference import with scale calibration,
DXF/DWG/PDF import adapters, JSON/PNG/SVG/PDF/DXF/GLTF export.

**Phase 7 — AI Layer.** ai/ natural-language → Command[] pipeline for the example
intents in the spec (add N machines, rotate islands, face-the-stage arrangement,
generate alternatives, maximize capacity, optimize circulation).

**Phase 8 — Scale & Collaboration groundwork.** Spatial-index-backed virtualization
for 10k+ objects, versioning/compare, multi-floor data model, hooks for future
real-time collaboration and cloud sync.

Phases 1–3 are prioritized because they unblock the core reorganization workflow
(import → mark structure → place islands → move/validate) described in the brief.
