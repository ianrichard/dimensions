# Dimension Collapse

Interactive browser geometry explorer for dimensional slices and linked shadows.

## Run locally

No build step or package installation is required. With Python 3 installed, run:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 in a modern browser. The complete app is in `dist/`; those four files are also suitable for any static web host.

## Snapshot

This backup preserves version 19, immediately before the color preset update. The app files are byte-identical to source commit `42aeb618820957929d9c50761ccb2377a5b227a5`.

- `dist/index.html`: interface
- `dist/style.css`: styles
- `dist/app.js`: geometry, interaction, and rendering
- `dist/presets.js`: geometry preset data

Private hosting configuration and previous Git history are intentionally excluded. No credentials or account configuration are needed to run this standalone app.

## Checks

```sh
node --check dist/app.js
node --check dist/presets.js
sha256sum -c SHA256SUMS
```

The JavaScript syntax checks passed when this backup was created. This export does not include an automated browser-test suite.
