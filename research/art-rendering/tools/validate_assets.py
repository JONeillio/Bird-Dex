#!/usr/bin/env python3
"""Read-only BirdQuest inventory/PNG checks; not a visual or rights certification."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError:
    Image = None

STATUSES = {"planned", "draft", "reviewed", "approved", "retired"}
KINDS = {"bird-portrait", "terrain-pattern", "map-decoration", "site-marker"}
REVIEW_KEYS = ("identity", "pixelGrid", "transparency", "inApp")


def validate(root: Path, manifest_path: Path, require_approved: bool = False) -> dict:
    root = root.resolve()
    errors: list[str] = []
    warnings: list[str] = []
    report = {"assets": 0, "planned": 0, "approved": 0,
              "productionImagesChecked": 0, "otherImagesChecked": 0,
              "errors": errors, "warnings": warnings}
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        errors.append(f"Cannot read manifest: {exc}")
        return report
    if not isinstance(manifest, dict) or not isinstance(manifest.get("assets"), list):
        errors.append("Manifest must contain an assets array")
        return report
    seen_ids: set[str] = set()
    seen_paths: set[str] = set()
    for index, asset in enumerate(manifest["assets"]):
        report["assets"] += 1
        prefix = f"asset[{index}]"
        if not isinstance(asset, dict):
            errors.append(f"{prefix}: entry must be an object")
            continue
        asset_id = asset.get("assetId")
        if not isinstance(asset_id, str) or not asset_id:
            errors.append(f"{prefix}: missing assetId")
        else:
            prefix = asset_id
            if asset_id in seen_ids:
                errors.append(f"{prefix}: duplicate assetId")
            seen_ids.add(asset_id)
        status = asset.get("status")
        if status not in STATUSES:
            errors.append(f"{prefix}: invalid status")
        if status == "planned":
            report["planned"] += 1
        if status == "approved":
            report["approved"] += 1
        if status == "retired":
            continue
        if asset.get("kind") not in KINDS:
            errors.append(f"{prefix}: invalid kind")
        if asset.get("contractVersion") != manifest.get("contractVersion"):
            errors.append(f"{prefix}: contractVersion differs from manifest")
        width, height = asset.get("nativeWidth"), asset.get("nativeHeight")
        if any(type(v) is not int or v <= 0 or v > 1024 for v in (width, height)):
            errors.append(f"{prefix}: native dimensions must be positive integers <=1024")
            continue
        if asset.get("kind") == "terrain-pattern":
            if any(v & (v - 1) or v > 512 for v in (width, height)):
                errors.append(f"{prefix}: pattern dimensions must be powers of two <=512")
        anchor = asset.get("anchor")
        if anchor is not None:
            if (not isinstance(anchor, dict)
                    or any(type(anchor.get(k)) not in (int, float) for k in ("x", "y"))
                    or not 0 <= anchor["x"] <= width
                    or not 0 <= anchor["y"] <= height):
                errors.append(f"{prefix}: invalid anchor")
        padding = asset.get("minimumPaddingPx", 0)
        if type(padding) is not int or padding < 0 or padding * 2 >= min(width, height):
            errors.append(f"{prefix}: invalid minimumPaddingPx")
            continue
        relative = asset.get("path")
        if not isinstance(relative, str) or not relative:
            errors.append(f"{prefix}: missing relative runtime path")
            continue
        rel_path = Path(relative)
        resolved = (root / rel_path).resolve()
        if rel_path.is_absolute() or not resolved.is_relative_to(root):
            errors.append(f"{prefix}: asset path escapes the supplied root")
            continue
        if relative in seen_paths:
            errors.append(f"{prefix}: duplicate asset path")
        seen_paths.add(relative)
        if status == "approved":
            reviews = asset.get("reviews", {})
            if not isinstance(reviews, dict) or any(reviews.get(k) != "passed" for k in REVIEW_KEYS):
                errors.append(f"{prefix}: approval requires all declared reviews to pass")
            provenance = asset.get("provenance", {})
            if (not isinstance(provenance, dict)
                    or not provenance.get("creator")
                    or provenance.get("origin") in (None, "planned", "unknown")
                    or provenance.get("rightsStatus") != "reviewed"
                    or not provenance.get("rightsNote")):
                errors.append(f"{prefix}: approval requires complete provenance/rights declarations")
        if not resolved.is_file():
            if status in {"draft", "reviewed", "approved"}:
                errors.append(f"{prefix}: declared {status} image is missing: {relative}")
            continue
        if status == "planned":
            warnings.append(f"{prefix}: file exists but status is still planned")
        if resolved.suffix.lower() != ".png":
            errors.append(f"{prefix}: runtime image must be a PNG")
            continue
        if resolved.stat().st_size > 8 * 1024 * 1024:
            errors.append(f"{prefix}: runtime image exceeds the 8 MiB inspection limit")
            continue
        if Image is None:
            errors.append(f"{prefix}: install Pillow to inspect existing PNGs")
            continue
        before = len(errors)
        try:
            with Image.open(resolved) as image:
                if image.format != "PNG":
                    errors.append(f"{prefix}: file content is not PNG")
                    continue
                if image.size != (width, height):
                    errors.append(f"{prefix}: expected {width}x{height}, found {image.width}x{image.height}")
                    continue
                rgba = image.convert("RGBA")
                alpha = rgba.getchannel("A")
                low, high = alpha.getextrema()
                if high == 0:
                    errors.append(f"{prefix}: fully transparent/empty image")
                alpha_mode = asset.get("alphaMode")
                if alpha_mode not in {"transparent", "opaque"}:
                    errors.append(f"{prefix}: invalid alphaMode")
                elif alpha_mode == "opaque" and low != 255:
                    errors.append(f"{prefix}: terrain export must be opaque")
                elif alpha_mode == "transparent" and low != 0:
                    errors.append(f"{prefix}: expected a genuinely transparent background")
                if asset.get("binaryAlpha", True) and any(a not in (0, 255) for a in alpha.getdata()):
                    errors.append(f"{prefix}: soft alpha pixels require cleanup or contract change")
                bbox = alpha.getbbox()
                if bbox and padding:
                    left, top, right, bottom = bbox
                    if min(left, top, width - right, height - bottom) < padding:
                        errors.append(f"{prefix}: visible pixels violate {padding}px safe margin")
                colour_count = len({pixel[:3] for pixel in rgba.getdata() if pixel[3]})
                ceiling = asset.get("colourReviewTarget", 24)
                if type(ceiling) is int and colour_count > ceiling:
                    warnings.append(f"{prefix}: {colour_count} opaque colours; review target is {ceiling}")
        except (OSError, ValueError, Image.DecompressionBombError) as exc:
            errors.append(f"{prefix}: cannot inspect image: {exc}")
            continue
        if status == "approved":
            report["productionImagesChecked"] += 1
        else:
            report["otherImagesChecked"] += 1
        if len(errors) > before:
            continue
    if require_approved and report["approved"] == 0:
        errors.append("No approved assets exist; this is not a production-ready image pack")
    report["passed"] = not errors
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--manifest", type=Path, default=Path("art/asset-manifest.json"))
    parser.add_argument("--require-approved", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    manifest_path = args.manifest if args.manifest.is_absolute() else args.root / args.manifest
    result = validate(args.root, manifest_path, args.require_approved)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Inventory: {result['assets']} assets; {result['planned']} planned; {result['approved']} approved.")
        print(f"{result['productionImagesChecked']} production images checked; {result['otherImagesChecked']} other images checked.")
        if result["productionImagesChecked"] == 0:
            print("No production-art QA claim is made by this inventory check.")
        for label in ("warnings", "errors"):
            for message in result[label]:
                print(f"{label[:-1].upper()}: {message}")
        print("Inventory/format check passed." if result.get("passed") else "Validation failed.")
    return 0 if result.get("passed") else 1


if __name__ == "__main__":
    sys.exit(main())
