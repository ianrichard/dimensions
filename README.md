# Dimension Collapse

Interactive browser geometry explorer for dimensional slices and linked shadows.

## Run locally

No build step or package installation is required. With Python 3 installed, run:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 in a modern browser. The complete app is in `dist/`; those four files are also suitable for any static web host.

## Snapshot

This backup preserves version 15, including the refined layer layout and Shadow/Topdown display toggle. The app files are byte-identical to source commit `ce516721565975f55e5ea28726894b16c38e485a`.

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
