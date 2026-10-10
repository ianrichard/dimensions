# Dimensions

An interactive stage for exact sections and dimensional projections. The demo uses the same standalone component exported here. No application framework is required by the stage.

## Vanilla

Copy `dist/dimension/` into your app. Serve modules over HTTP and load its scoped stylesheet once:

```html
<link rel="stylesheet" href="./dimension/dimension.css">
<div id="diagram" style="height:320px"></div>
<script type="module">
  import {createDimension} from './dimension/dimension.mjs';
  const diagram = createDimension(document.querySelector('#diagram'), {
    demo: 'tetrahedron',
    operation: 'collapse',
    colors: {base: '#11191c', accent: '#38b9a3'},
    autoRotate: true
  });
  // Later: diagram.setOptions({demo: 'tesseract', operation: 'slice'});
  // Before removing the host: diagram.destroy();
</script>
```

The host owns width, height, padding, background and centering. The component is flush and transparent, inherits the host’s typeface, and fits one stable common geometric scale inside the supplied box. Set a definite host height; otherwise it uses a bounded fallback.

The component contains the canvas, dimension labels, rotation targets, accessible status and vertical slice control. Shape pickers, operation buttons, pose buttons and palette controls are optional host UI. `dist/app.js` is a small example host that can be replaced entirely.

## React

React 18+ is an optional peer dependency. The adapter mounts and cleans up the same vanilla stage; React does not recompute geometry.

```jsx
import {Dimension, TetrahedronIcon} from './dimension/react.mjs';
import './dimension/dimension.css';

<Dimension
  demo="tetrahedron"
  operation="collapse"
  colors={{base: '#11191c', accent: '#38b9a3'}}
  style={{height: 320}}
  aria-label="Tetrahedron and its shadows"
/>
<TetrahedronIcon size={24} title="Tetrahedron" />
```

Shape IDs: `square`, `triangle`, `cube`, `tetrahedron`, `octahedron`, `icosahedron`, `dodecahedron`, `tesseract`, `5-cell`, `16-cell`. Legacy display names such as `Tetra` also resolve. `ShapeIcon` accepts a `shape` prop; named icon components are exported for all ten shapes. Independent SVG files are in `dist/dimension/icons/`. `shapeIconPaths` and `shapeIconSvg` are available without React.

## Small control contract

`createDimension(host, options)` returns:

- `getState()` — a fresh snapshot of the mounted shape, operation, cutter bounds, poses, progress, colors and layout settings, plus `requestedDemo` and `swapping`
- `setOptions(patch)` — apply changed options while preserving the current rotation for color/layout changes
- `setShape(id)`, `setOperation('slice' | 'collapse')`, `setCut(number)`
- `selectPose(index)`, `nextPose()`, `rotate(horizontalPixels, verticalPixels)`, `play()`, `pause()`, `stop()`
- `setView({stage, gap, tilt})`, `setPalette('teal' | 'blue' | 'clay')`
- `subscribe(listener)` — returns an unsubscribe function; includes progress updates for a host's optional pose indicator
- `readProjection()` — compatible line statistics (`statisticsDimension: 1`), plus `displayedDimensions` and `resultPositions3D` for the 4D pair
- `destroy()` — cancel animation, release capture, disconnect observation/listeners and remove only the component's own DOM; safe to repeat

Options and corresponding React props: `demo`, `shape` (compatibility alias), `operation`, `cut`, `pose`, `colors`, `theme`, `swapDuration`, `gaps`, `tilt`, `autoRotate`, `onChange`. `demo` takes precedence over `shape`; the default is `cube`. React also accepts ordinary container attributes, `className` and `style`. Same-dimension changes patch the mounted stage. A fundamental 2D/3D/4D change fades out, destroys the old private renderer at zero opacity, mounts the requested one and fades in. `swapDuration` defaults to 500ms per phase; 0 makes swaps immediate. The host and React wrapper remain mounted. Rapid requests use the latest target; pause and destroy cancel pending activity. Reduced motion swaps immediately. During an animated swap, `getState().shape` and `readProjection()` describe the currently mounted geometry; `requestedDemo` identifies the requested target. The demo’s `set_shape` tool includes the pending state explicitly. React `cut` and `pose` changes act as new values when those props change; unrelated renders do not reset user interaction.

The 4D view is a side-by-side source/result pair with no lower shadow stages. The 2D and 3D views retain their vertical shadow chains. Legacy gap and plane-tilt options apply to those lower-dimensional chains. The legacy 4D gap value remains accepted for API compatibility.

Layer centers and scale remain fixed during rotation and cuts. A host resize recalculates the fit. Smaller sections naturally leave more space; they are never enlarged to fill the box. The 4D source and result use the same scale and camera. Very short hosts compress decorative reserves and hide annotations before clipping geometry. The visible slice control is a small dot on a line with a 44px interaction target at the right edge.

The host demo uses a phone stage near 40% of the stable viewport, fixed dimension/shape controls, and a scrolling story/settings area. Desktop places the stage beside that story. These choices belong to `app.js`/`style.css`, not the component.

`colors={{base: '#f5f6f4', accent: '#38b9a3'}}` derives the material hierarchy and readable text. Seed colors accept 3- or 6-digit hex. `theme` accepts `auto` (default), `light` or `dark`; without an explicit base, it chooses a suitable surface. With an explicit base, match the host background to it. The core paints no background rectangle. Set the host’s background yourself or use `getState().colors.bg` as this demo does.

Legacy material color overrides remain supported: `bg`, `panel`, `ink`, `muted`, `line`, `plane`, `planeEdge`, `m2`, `lineColor`, `shadow`, `shadowBack`, `glass`, `solid`, `source`, `tick`. They accept CSS colors and intentionally bypass the derived contrast choices. Colors stay local to each instance. The exported `colorPresets` and `setPalette` remain available.

Legacy `gaps` and `tilt` options remain accepted for embedding compatibility; the demo’s debug sliders are removed. Defaults are `{4: 0, 3: 8, 2: 32}` and 17°. Signed gaps can deliberately overlap layers. The renderer fits their union envelope, and compacts offsets only if no scale can fit the requested offsets into a short host. They do not alter mathematical projection or intersection data.

With autoplay enabled, each newly selected shape starts in a random valid orientation and turns into its first curated pose. It holds that pose for five seconds, then cycles. Random starts are products of proper rotations, not a claim of uniform sampling of all orientations. An explicit initial pose overrides the random opening. Manual interaction inside that stage stops movement; it does not restart on its own. The host can call `pause()` or `stop()` for its own controls, and `play()` to resume from the current orientation. New shape selections restart the automatic opening; other manual interactions stop it. Explicitly changing `autoRotate` from false to true restarts cycling. Reduced-motion preferences prevent automatic cycling and make manual pose changes immediate.

## What the diagram means

Slice intersects the rotated source at a chosen coordinate: a line cuts 2D, a plane cuts 3D, and a 3D hyperplane cuts 4D. The cutter is infinite; its faint finite guide is only a display window. The slider stops at actual support extrema. Symmetric extreme cuts can be edges, faces or cells rather than points.

Collapse projects the entire source by dropping one coordinate. In 4D, the right-hand solid is the convex hull of every rotated source vertex after dropping w. By linearity, this is the projection of the entire convex body, including its interior. A faint scaffold inside it shows the original source edges under the same map. In Slice, the right-hand shape is the actual 3D section instead. The source diagram and result share the same rotation, scale and screen camera; the 2D/1D stages are omitted in this view.

The left-hand 4D picture is an oblique diagram, with context mapping `(x, y, z, w) → (x, y + 0.65w, z)`, followed by the screen camera. It is not a literal or distance-preserving view of four dimensions. Its line opacity is a smooth depth cue in that diagram, not a claim of physical 4D occlusion. Actual convex 3D bodies use outward face normals to distinguish front faces, silhouettes and rear edges, with a continuous fade through grazing views. This visibility classification is separate from the 4D context’s depth cue.

The 2D plane uses an independent orthographic tilt. Its back edge does not shrink. Projection coordinates are calculated before that display transform, and connector endpoints use the same transform. Dots above the 1D shadow have area proportional to coincident vertex count. `1`, `2`, `3`, `4` and `φ` are adjacent projected-position gap ratios to the smallest gap, shown only when the entire sequence validates in a curated alignment. They are not vertex counts or absolute lengths. For example, octahedron face-first Collapse gives `1,1,2,1,1`; tetrahedron vertex/face Collapse gives `1,1,3`; the cube’s central corner-first Slice gives `1,3,2,3,1`. Unsupported, arbitrary or near-miss patterns stay unlabeled.

Intrinsic diagonals are a separate relationship: cube edge/face/body diagonal lengths are `1:√2:√3`; a tesseract adds the full diagonal `2`. Those facts are not painted onto the line-gap display. The 4D pair omits the old line-spacing preset because its supporting line view is no longer shown. All generic “Off angle” stops are removed; the random entrance turns directly into a meaningful curated stop.

## Validation

Run `npm test` for dependency-free shape, icon, rotation, section-extrema and projection-hull checks. This extraction was additionally checked with actual React 19 server rendering and Strict Mode in a DOM harness, independent stage instances, input/cancellation/cleanup tests, and actual Canvas captures at phone and desktop widths. Geometry received an independent regression audit against the preserved preceding version.

Canvas captures use the actual renderer through a native Canvas backend. They do not verify full browser page layout, browser font fallback, or physical touch behavior. Those remain explicit QA limits.
