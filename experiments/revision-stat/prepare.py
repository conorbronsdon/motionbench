"""Prepare this opt-in revision workspace; no model calls or standard runner."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def prepare(target):
    target.mkdir(parents=True, exist_ok=False)
    shutil.copytree(ROOT / "kit/assets", target / "assets")
    for name in ["gsap.min.js", "CustomEase.min.js", "MotionPathPlugin.min.js"]:
        shutil.copyfile(ROOT / "kit/node_modules/gsap/dist" / name, target / "assets" / name)
    shutil.copyfile(ROOT / "kit/BRAND.md", target / "BRAND.md")
    # This prototype supplies no agent probe/snap tools; do not promise them.
    contract = (ROOT / "kit/CONTRACT.md").read_text(encoding="utf-8").split("## Tools")[0]
    (target / "CONTRACT.md").write_text(contract, encoding="utf-8")
    shutil.copyfile(HERE / "brief.md", target / "BRIEF.md")
    approved = (ROOT / "selftest/oracle/_spoken-stat/index.html").read_bytes()
    (target / "approved.html").write_bytes(approved)
    (target / "index.html").write_bytes(approved)
    receipt = {"approved_sha256": hashlib.sha256(approved).hexdigest(),
               "task": "revision-stat", "status": "unrevised baseline"}
    (target / "baseline.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.workspace)))
