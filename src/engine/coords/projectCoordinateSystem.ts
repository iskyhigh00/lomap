/**
 * # Project Coordinate System
 *
 * The single formal contract for what a coordinate *means* in Casino Layout
 * Studio, and the map of which module owns each leg of the transform chain.
 * Every module that places, measures, or converts something in space —
 * Blueprint, Layout (walls/pillars/zones/machines/islands), measurement,
 * future constraints/collisions, the future 3D view, the future optimizer,
 * the future AI layer — reads coordinates from here, not from its own
 * invented convention.
 *
 * This module intentionally does not re-implement the transforms it
 * documents (see "Implementations" below for why): duplicating
 * `screenToWorld`/`worldToScreen` here would mean two copies of the same
 * math to keep in sync, exactly the problem this contract exists to
 * prevent. It exists to be *the page every module's author reads first*,
 * and to hold the few concrete, shared symbols (units, axis convention,
 * space names) that don't already have a single natural home elsewhere.
 *
 * ## World space
 *
 * Everything in the project — every wall endpoint, pillar center, machine
 * transform, zone vertex, and blueprint transform — lives in one shared,
 * infinite, unitless-until-you-say-otherwise 2D plane: **world space**.
 * `Point { x, y }` and `Transform { x, y, rotation, scaleX, scaleY }`
 * (`engine/geometry/types.ts`) are values in world space unless a function
 * signature says otherwise.
 *
 * - **Origin**: (0, 0) is wherever the project happened to start — there is
 *   no fixed "building corner" or geographic anchor. A perimeter, once
 *   drawn, effectively defines the project's own origin convention by where
 *   its author chose to start drawing.
 * - **Units**: 1 world unit = 1 **centimeter**. This was already the
 *   implicit convention (a default machine is 60×70×150, a pillar 40×40, a
 *   wall 20 thick — all plausible real-world centimeter dimensions) but was
 *   never named anywhere; `WORLD_UNIT` below makes it explicit and
 *   machine-checkable. There is no separate notion of "project scale" beyond
 *   this fixed unit — `viewport.zoom` (below) is a *view* convenience, not
 *   project data, and blueprint calibration (below) exists precisely to map
 *   an imported image's pixels onto this one fixed real-world unit, not to
 *   introduce a second, competing scale.
 * - **Axes**: X increases rightward, Y increases **downward** — the same
 *   convention as screen/DOM/canvas space, chosen so world space and screen
 *   space differ only by pan and zoom, never by a flip. `rotation` is in
 *   radians and follows the standard rotation matrix
 *   (`x' = x·cosθ − y·sinθ`, `y' = x·sinθ + y·cosθ`,
 *   see `engine/geometry/vector.ts`'s `rotate`); because Y is down, positive
 *   θ reads as a **clockwise** turn when looking at the 2D canvas normally,
 *   not counterclockwise as it would in a math-textbook Y-up plane. This
 *   matters most for whoever implements the 3D mapping (see below).
 *
 * ## Transform legs — who owns what
 *
 * 1. **World ↔ Screen** (CSS pixels). Owned by `editor/viewport.ts`
 *    (`screenToWorld`, `worldToScreen`, `zoomAt`). `Viewport { x, y, zoom }`
 *    is the pan/zoom state; screen space here is CSS pixels, the same units
 *    pointer events (`clientX`/`clientY` minus the canvas's bounding rect)
 *    already arrive in — no dpr involved at this leg.
 * 2. **Screen ↔ Device pixel** (dpr). A canvas's backing store is scaled by
 *    `devicePixelRatio` relative to its CSS size so drawing stays crisp on
 *    HiDPI displays. This is *not* a coordinate space anything places
 *    objects in — it only matters when composing the canvas's draw matrix.
 *    `renderer/canvas2d/canvasTransform.ts` (`applyWorldTransform`) is the
 *    single place that composes legs 1 and 2 together for drawing; nothing
 *    else should call `ctx.setTransform` with a viewport/dpr product by
 *    hand.
 * 3. **World ↔ Blueprint-local**. Owned by `blueprint/blueprintGeometry.ts`
 *    (`worldToImageLocal`, `imageLocalToWorld`). Converts between world
 *    space and a blueprint document's own natural, unrotated, unscaled pixel
 *    space (0..naturalWidth, 0..naturalHeight) — the inverse of the same
 *    translate→rotate→scale pipeline `blueprint/renderBlueprint.ts` uses to
 *    draw it. This is why calibration points survive a later move/rotate/
 *    rescale of the image: they're recorded in blueprint-local space, not
 *    world space.
 * 4. **World ↔ 3D scene** — *not implemented yet* (lands with the 3D view).
 *    Documented now, as a contract, so that work doesn't invent its own
 *    convention later. Casino Layout Studio's world is a flat single-plane
 *    2D space; the intended mapping to a Y-up, right-handed 3D scene
 *    (Three.js's convention) is:
 *      - `world.x → scene.x` (unchanged)
 *      - `world.y → scene.z` (world's "down" axis becomes 3D depth)
 *      - `scene.y` is height, always 0 for a flat single-floor layout today
 *      - `world.rotation → scene.rotation.y = -world.rotation` (negated:
 *        world rotation is clockwise-positive in a Y-down plane; Three.js's
 *        positive rotation around Y is counterclockwise when viewed from
 *        above, i.e. looking down -Y — negating keeps "turns the same way
 *        on screen" true in both views)
 *      - 1 world unit → 1 Three.js unit at scene scale 1 (no unit conversion,
 *        same centimeter convention — Three.js scenes are commonly built in
 *        meters, so the 3D renderer may choose to scale the whole scene
 *        uniformly by 0.01, but that is a *view* decision local to the 3D
 *        renderer, exactly like `viewport.zoom` is for the 2D canvas — it
 *        must not leak into how world-space values are stored or computed
 *        anywhere else).
 *    This mapping is a design decision, not yet exercised by running code —
 *    flagged here to be verified against the first real 3D prototype rather
 *    than trusted blindly once one exists.
 *
 * ## Implementations deliberately stay where they are
 *
 * `engine/` is meant to have zero outward dependencies (see
 * `ARCHITECTURE.md` §3–4); `editor/viewport.ts` is the interaction layer and
 * legitimately depends on `store/projectStore` for `Viewport`, so its
 * functions are not re-homed into `engine/coords` — that would invert the
 * dependency direction for no benefit. Likewise `blueprint/blueprintGeometry.ts`
 * stays inside the Blueprint subsystem, which owns its own transform math by
 * design (see `ARCHITECTURE.md` §5.1). This module is the map, not the
 * territory.
 */

/** 1 world unit = 1 centimeter. See "World space → Units" above. */
export const WORLD_UNIT = 'cm' as const

/** Every named coordinate space in the project, for signatures/docs in
 * modules that need to say which space a value is in (constraints,
 * optimizer, AI, the future 3D view). */
export type CoordinateSpace = 'world' | 'screen' | 'blueprint-local' | 'scene3d'
