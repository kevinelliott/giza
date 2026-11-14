# Giza Plateau — native build (Godot 4.5)

A compiled desktop game using the same data and models as the web version:
the whole plateau to scale (terrain from the DEM, the three pyramids and their
passages, the Sphinx, temples, mastaba fields, the modern town) and the four
Blender interiors — the whole Great Pyramid at true size (al-Ma'mun's tunnel,
Descending and Ascending Passages, Queen's and Subterranean Chambers, Grand
Gallery, King's Chamber, Campbell's Chamber); Khafre's two passage systems,
burial chamber and lower chamber; Menkaure's substructure; the tomb of Meresankh III; the
Serapeum of Saqqara — walkable in first person, with sky, sun and shadows,
time of day, fast travel to 30-odd places and site captions.

Beyond Giza (fast travel): the Nile at Luxor with its boats, and the Valley
of the Kings with the tomb of Tutankhamun (KV62). Road traffic runs on the
mapped streets; only the electric visitor buses run inside the site.

Camels, horse carriages, visitors (Blender-built, rigged and animated:
`tools/blender/creatures.py`), camel riding, the artifact hunt, minimap and
full map, sandstorm and the Sound and Light show are all in.

## Play

Unzip `GizaPlateau-macOS.zip` and open **Giza Plateau.app**. The app is not
notarised, so the first time macOS will refuse: right-click the app, choose
**Open**, then **Open** again (or run `xattr -dr com.apple.quarantine "Giza Plateau.app"`).

WASD move · mouse look · **C** crouch (the real passages need it) · Shift run ·
Space jump · **F** fly · **L** lamp · **E** ride a camel / board a boat · **T** time of day · **K** sandstorm ·
**M** map (click a blue dot to travel) · **O** / **-** / **=** minimap · **Tab** or **M** fast travel · Esc frees the mouse.

## Build

```sh
# once: Godot 4.5.1 + export templates (see .github/workflows/native.yml)
node tools/export_plateau.mjs             # the open plateau -> godot/models/plateau.glb, godot/data/{world.json,terrain.bin}
node tools/export_godot_data.mjs          # points of interest and model positions -> godot/data/sites.json
node tools/export_inscriptions.cjs        # hieroglyph panels -> godot/textures/insc/ (needs the web build served on :8080)
cp assets/models/*.glb godot/models/      # after rebuilding any model with tools/blender/
cd godot && godot --headless --import && godot --headless --export-release "macOS" ../build/GizaPlateau-macOS.zip
```

Presets for **Linux** and **Windows Desktop** are in `export_presets.cfg`
too; the "Native builds" GitHub Action builds all three.

## Checking a build

Test the **exported** app with the renderer it ships with, not the project
folder with the Compatibility renderer: both shortcuts have hidden real bugs
(a data file missing from the export; sand that washed out under Forward+).

```sh
# self-check, no window: every figure on the ground, heights match the mesh, indoors/outdoors told apart
build/GizaPlateau-linux.x86_64 --headless -- "--shot=/tmp/none.png" "--do=audit,rooms,lattice"

# a frame of every fast-travel stop and ~20 other scenes (times of day, storm, map, Luxor, the Valley)
godot --rendering-driver vulkan --rendering-method forward_plus --resolution 960x600 \
      -- "--tour=/tmp/tour" ["--tour-only=night,sunset"]
```

Without a GPU, Mesa's software Vulkan works for the tour
(`VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json`, under `xvfb-run`).
The workflow runs the self-check on the exported Linux and Mac apps and
uploads one frame rendered on a Mac.

## How it fits together

- `tools/export_plateau.mjs` — runs the web version's world builder headless
  and writes everything static as one GLB, merged per material; mesh names
  end in `__col` (solid) or `__vis` (no collision).
- `scripts/main.gd` — loads the plateau and gives each material its shader
  (`ground`, `course`, `stone`, `vcol`, `town`); sky, sun and time of day;
  shuts the sun out when the player is inside a pyramid, tomb or model.
  Then loads each model listed in `data/sites.json`, swaps in
  the stone shader by Blender material name, builds collision, places
  inscription and photograph panels from the models' `insc_*` / `tex_*`
  empties, registers fast-travel points (`tp_*`) and points of interest (`poi_*`).
- `scripts/stone.gdshader` — procedural stone; the Blender-baked lighting
  (vertex colours) is added as emission.
- `scripts/player.gd` — first-person controller with crouch, stair stepping, lamp, fly.
