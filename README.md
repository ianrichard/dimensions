# Dimensions

An interactive stage for exact sections and dimensional projections. The demo uses the same standalone component exported here. No application framework is required by the stage.

## Vanilla

Copy `dist/dimension/` into your app. Serve modules over HTTP and load its scoped stylesheet once:

```html
<link rel="stylesheet" href="./dimension/dimension.css">
<div id="diagram"></div>
<script type="module">
  import {createDimension} from './dimension/dimension.mjs';
  const diagram = createDimension(document.querySelector('#diagram'), {
    shape: 'tetrahedron',
    operation: 'collapse',
    colors: {lineColor: '#168675', source: '#d2e1dc'},
    autoRotate: true
  });
  // Later: diagram.setOptions({shape: 'tesseract', operation: 'slice'});
  // Before removing the host: diagram.destroy();
</script>
```

The component contains the canvas, dimension labels, rotation targets, accessible status and vertical slice control. Shape pickers, operation buttons, pose buttons and palette controls are optional host UI. `dist/app.js` is a small example host that can be replaced entirely.

## React

React 18+ is an optional peer dependency. The adapter mounts and cleans up the same vanilla stage; React does not recompute geometry.

```jsx
import {Dimension, TetrahedronIcon} from './dimension/react.mjs';
import './dimension/dimension.css';

<Dimension
  shape="tetrahedron"
  operation="collapse"
  colors={{lineColor: '#168675', shadow: 'rgba(117,186,174,.82)'}}
  aria-label="Tetrahedron and its shadows"
/>
<TetrahedronIcon size={24} title="Tetrahedron" />
```

Shape IDs: `square`, `triangle`, `cube`, `tetrahedron`, `octahedron`, `icosahedron`, `dodecahedron`, `tesseract`, `5-cell`, `16-cell`. Legacy display names such as `Tetra` also resolve. `ShapeIcon` accepts a `shape` prop; named icon components are exported for all ten shapes. Independent SVG files are in `dist/dimension/icons/`. `shapeIconPaths` and `shapeIconSvg` are available without React.

## Small control contract

`createDimension(host, options)` returns:

- `getState()` — a fresh snapshot of shape, operation, cutter bounds, poses, progress, colors and layout settings
- `setOptions(patch)` — apply changed options while preserving the current rotation for color/layout changes
- `setShape(id)`, `setOperation('slice' | 'collapse')`, `setCut(number)`
- `selectPose(index)`, `nextPose()`, `rotate(horizontalPixels, verticalPixels)`, `stop()`
- `setView({stage, gap, tilt})`, `setPalette('teal' | 'blue' | 'clay')`
- `subscribe(listener)` — returns an unsubscribe function; includes progress updates for a host's optional pose indicator
- `readProjection()` — vertex multiplicities and resulting line positions
- `destroy()` — cancel animation, release capture, disconnect observation/listeners and remove only the component's own DOM; safe to repeat

Options and corresponding React props: `shape`, `operation`, `cut`, `pose`, `colors`, `gaps`, `tilt`, `autoRotate`, `onChange`. React also accepts ordinary container attributes, `className` and `style`. Changed props are patched without remounting. React `cut` and `pose` changes act as new values when those props change; unrelated renders do not reset user interaction.

`gaps` is keyed by the upper dimension: `{4: 0, 3: 12, 2: 32}` pixels. `tilt` is 5–90 degrees, default 17. Layer centers remain fixed during rotation and cuts. Safe bounds retain some visible slack for smaller sections. At a requested zero gap, an extremal orientation can touch; geometry is never rescaled per frame to hide that.

Supported color keys: `bg`, `panel`, `ink`, `muted`, `line`, `plane`, `planeEdge`, `m2` (accent), `lineColor`, `shadow`, `shadowBack`, `glass`, `solid`, `source`, `tick`. Colors are local to each stage. Omitted keys use the default teal palette. The exported `colorPresets` provides complete alternative material palettes.

A newly selected shape holds its first curated pose for five seconds, then cycles. Manual interaction inside that stage stops movement; it does not restart on its own. The host can also call `stop()` for its own controls. Explicitly changing `autoRotate` from false to true restarts cycling. Reduced-motion preferences prevent automatic cycling and make manual pose changes immediate.

## What the diagram means

Slice intersects the rotated source at a chosen coordinate: a line cuts 2D, a plane cuts 3D, and a 3D hyperplane cuts 4D. The cutter is infinite; its faint finite guide is only a display window. The slider stops at actual support extrema. Symmetric extreme cuts can be edges, faces or cells rather than points.

Collapse projects the entire source by dropping one coordinate. In 4D, the resulting 3D convex hull is shown, followed by its 2D and 1D projections. In Slice, those lower shadows instead come from the actual section. The same selected source and rotation drive every stage.

The upper 4D picture is an oblique diagram, with context mapping `(x, y, z, w) → (x, y + 0.65w, z)`, followed by the screen camera. It is not a literal or distance-preserving view of four dimensions. Its line opacity is a smooth depth cue in that diagram, not a claim of physical 4D occlusion. A circle is only keyboard focus around the rotation target; it does not encode the six independent 4D rotation planes, and there is no misleading single-angle orbit marker.

The 2D plane uses an independent orthographic tilt. Its back edge does not shrink. Projection coordinates are calculated before that display transform, and connector endpoints use the same transform. Dots above the 1D shadow have area proportional to coincident vertex count. `1` and `φ` are spacing ratios to the smallest gap, shown only in validated curated alignments; they are not vertex counts.

## Validation

Run `npm test` for dependency-free shape, icon, rotation, section-extrema and projection-hull checks. This extraction was additionally checked with actual React 19 server rendering and Strict Mode in a DOM harness, independent stage instances, input/cancellation/cleanup tests, and actual Canvas captures at phone and desktop widths. Geometry received an independent regression audit against the preserved preceding version.

Canvas captures use the actual renderer through a native Canvas backend. They do not verify full browser page layout, browser font fallback, or physical touch behavior. Those remain explicit QA limits.
