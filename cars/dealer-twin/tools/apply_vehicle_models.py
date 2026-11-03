#!/usr/bin/env python3
"""Give every Simulated listing its optional generic 3D model (PR B): model3d = {body, paint}.

    python3 cars/dealer-twin/tools/apply_vehicle_models.py

Idempotent. Edits only cars/dealer-twin/data/stock.json. The listing's picture stays PR A's body-style drawing (img is not
touched); model3d is read by js/stock.js only when the visitor presses "View in 3D" in the spotlight, which then loads
/assets/models/vehicles/<body>.glb in the listing's colour, labelled "Generic <body> model · not the actual vehicle".
The listing's body is the body of its real model (an Aqua is a hatch, a Hilux a ute); the model is never the actual car.
"""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent.parent
CONTRACT = json.loads((HERE.parent.parent / "assets" / "models" / "vehicles" / "vehicles-rig-contract.json").read_text())


def paint_of(colour):
    for k, p in CONTRACT["paints"].items():
        if p["label"].lower() == (colour or "").lower(): return k
    raise SystemExit(f"no paint for colour {colour!r}")


def main():
    path = HERE / "data" / "stock.json"
    data = json.loads(path.read_text())
    for c in data["cars"]:
        if c["body"] not in CONTRACT["vehicles"]: raise SystemExit(f"no generic model for body {c['body']!r}")
        c["model3d"] = {"body": c["body"], "paint": paint_of(c["colour"])}
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    print("cars:", len(data["cars"]))


if __name__ == "__main__":
    main()
