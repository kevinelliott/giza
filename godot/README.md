# Giza Plateau — native build (Godot 4.5)

A compiled desktop game using the same Blender-built models and research
data as the web version. **First slice:** the four Blender interiors, walkable
in first person with fast travel — the Great Pyramid's Grand Gallery, King's
Chamber and Campbell's Chamber; Menkaure's substructure; the tomb of
Meresankh III; the Serapeum of Saqqara. The open plateau (terrain, pyramids'
exteriors, the Sphinx, temples, town) is still only in the web build.

## Play

Unzip `GizaPlateau-macOS.zip` and open **Giza Plateau.app**. The app is not
notarised, so the first time macOS will refuse: right-click the app, choose
**Open**, then **Open** again (or run `xattr -dr com.apple.quarantine "Giza Plateau.app"`).

WASD move · mouse look · **C** crouch (the real passages need it) · Shift run ·
Space jump · **F** fly · **L** lamp · **Tab** or **M** fast travel · Esc frees the mouse.

## Build

```sh
# once: Godot 4.5.1 + export templates (see .github/workflows/native.yml)
node tools/export_godot_data.mjs          # points of interest and model positions -> godot/data/sites.json
node tools/export_inscriptions.cjs        # hieroglyph panels -> godot/textures/insc/ (needs the web build served on :8080)
cp assets/models/*.glb godot/models/      # after rebuilding any model with tools/blender/
cd godot && godot --headless --import && godot --headless --export-release "macOS" ../build/GizaPlateau-macOS.zip
```

Presets for **Linux** and **Windows Desktop** are in `export_presets.cfg`
too; the "Native builds" GitHub Action builds all three.

## How it fits together

- `scripts/main.gd` — loads each model listed in `data/sites.json`, swaps in
  the stone shader by Blender material name, builds collision, places
  inscription and photograph panels from the models' `insc_*` / `tex_*`
  empties, registers fast-travel points (`tp_*`) and points of interest (`poi_*`).
- `scripts/stone.gdshader` — procedural stone; the Blender-baked lighting
  (vertex colours) is added as emission.
- `scripts/player.gd` — first-person controller with crouch, stair stepping, lamp, fly.
