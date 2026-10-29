# Geodata pipeline

`build_geodata.py` turns open satellite / aerial / map data into the compact
data the game loads (`js/geodata.js`, `assets/geo/*.jpg`).

| Source | Used for | Licence |
| --- | --- | --- |
| Copernicus GLO-30 DEM (AWS open data `copernicus-dem-30m`) | real plateau topography | © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA |
| Sentinel-2 L2A, July 2025 median composite (AWS `sentinel-cogs`) | ground colour, vegetation, minimap | Contains modified Copernicus Sentinel data 2025 |
| OpenStreetMap via Overture Maps 2026-10-21 (AWS `overturemaps-us-west-2`) | monument positions, tomb footprints, temples, roads, the modern town | © OpenStreetMap contributors (ODbL); Overture Maps Foundation |

```sh
pip install numpy pillow pyarrow rasterio pyproj shapely
python3 tools/geo/build_geodata.py            # fetches into tools/geo/cache/ on first run
```

Coordinates: local metres, +X east, +Z south, origin at the centroid of the
Great Pyramid's footprint, Y = 0 at its base (the DEM is re-referenced so).
