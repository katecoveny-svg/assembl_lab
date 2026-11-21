# Fixtures for the ground feed tests

Recorded on 22 November 2026 with `node tests/ground/capture-fixtures.mjs`. No network is used when the tests run.

- `castlepoint.ground.cassette.json`: every request the feed made to LINZ's open elevation bucket for one public point on the shore at Castlepoint (Wairarapa), with the bytes LINZ sent back and the feed's answer.
- `castlepoint.ground.expected.json`: the same cells read by GDAL through rasterio (`tests/ground/expected-from-gdal.py`), an independent reader, to check the feed's decoder against.
- `open-water.ground.cassette.json`: the same for a point of open water in the Hauraki Gulf, where LINZ has a map sheet but no height.

The elevation data is from Toitū Te Whenua LINZ's New Zealand Elevation open data. The Castlepoint tile is from the
Wellington LiDAR 1m DEM (2013-2014), sourced from LINZ and licensed by Greater Wellington Regional Council, for re-use
under the Creative Commons Attribution 4.0 International licence. The open-water sheet is part of the New Zealand LiDAR 1m DEM (CC BY 4.0).
