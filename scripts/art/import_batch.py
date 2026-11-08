#!/usr/bin/env python3
"""Import a batch of bird portraits (a ZIP or a folder) into the app.

Usage: python3 -I scripts/art/import_batch.py <zip-or-folder> <batch-name> [--root REPO_ROOT] [--dry-run]

What it does:
  1. Copies the originals, keeping their file names, to research/art-drafts/bold-pixel/<batch-name>/.
  2. For each bird_<dex-id>_bold_pixel_v1.png whose id is in the Starter Dex, makes the 64x64 runtime sprite with
     prepare_sprite.py at public/assets/birds/<id>/adult-portrait-draft.png and adds the id to
     src/art/draft-portraits.json (the list of species that use a real portrait).
  3. Lists ids it did not recognise (skipped, never guessed) and prints a summary.

The input is untrusted: ZIP entries are read by name only (no folders, no path tricks), must be small PNG/JSON/MD
files, and nothing in it is ever run. Run with `python3 -I` so Python does not import code from the current folder.
"""
import argparse
import importlib.util
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

MAX_MEMBERS = 400
MAX_FILE_BYTES = 40 * 1024 * 1024
KEEP_SUFFIXES = {".png", ".json", ".md", ".txt", ".jpg", ".jpeg"}
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
BIRD_FILE = re.compile(r"^bird_([a-z0-9]+(?:-[a-z0-9]+)*)_bold_pixel_v1\.png$")
BATCH_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_prepare(script_dir: Path):
    spec = importlib.util.spec_from_file_location("prepare_sprite", script_dir / "prepare_sprite.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.prepare


def read_inputs(src: Path) -> dict[str, bytes]:
    """File name -> bytes for everything usable in a ZIP or a folder. Skips anything odd and says so."""
    found: dict[str, bytes] = {}
    skipped: list[str] = []

    def accept(name: str, data: bytes) -> None:
        base = Path(name).name
        if base != name or base.startswith(".") or Path(base).suffix.lower() not in KEEP_SUFFIXES or len(data) > MAX_FILE_BYTES:
            skipped.append(name)
            return
        found[base] = data

    if src.is_dir():
        for p in sorted(src.iterdir()):
            if p.is_file():
                accept(p.name, p.read_bytes())
    else:
        with zipfile.ZipFile(src) as z:
            infos = [i for i in z.infolist() if not i.is_dir()]
            if len(infos) > MAX_MEMBERS:
                raise SystemExit(f"Too many files in the ZIP ({len(infos)}).")
            for i in infos:
                if i.file_size > MAX_FILE_BYTES:
                    skipped.append(i.filename)
                    continue
                # Flat ZIPs are expected; a macOS __MACOSX folder or a single top folder is tolerated by file name only.
                name = i.filename
                if "/" in name:
                    if name.startswith("__MACOSX/") or any(part in ("..", "") for part in name.split("/")):
                        skipped.append(name)
                        continue
                    name = name.rsplit("/", 1)[1]
                accept(name, z.read(i))
    if skipped:
        print(f"Skipped {len(skipped)} unusable entries: {', '.join(sorted(set(skipped))[:8])}{' ...' if len(skipped) > 8 else ''}")
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="a ZIP file or a folder of PNGs")
    ap.add_argument("batch", help="batch name, e.g. batch-01 (lowercase letters, digits, hyphens)")
    ap.add_argument("--root", default=None, help="repository root (default: the folder above scripts/)")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen and change nothing")
    args = ap.parse_args()

    script_dir = Path(__file__).resolve().parent
    root = Path(args.root).resolve() if args.root else script_dir.parent.parent
    if not BATCH_NAME.match(args.batch):
        raise SystemExit("Batch name must be lowercase letters, digits and hyphens, e.g. batch-01.")
    src = Path(args.source)
    if not src.exists():
        raise SystemExit(f"Not found: {src}")

    dex_file = root / "src/data/catalogue/starter-dex.v1.json"
    dex_ids = {s["id"] for s in json.loads(dex_file.read_text())["species"]}
    list_file = root / "src/art/draft-portraits.json"
    current: list[str] = json.loads(list_file.read_text())

    files = read_inputs(src)
    if not files:
        raise SystemExit("No usable files found.")
    drafts_dir = root / "research/art-drafts/bold-pixel" / args.batch
    prepare = None if args.dry_run else load_prepare(script_dir)

    made, unknown, bad = [], [], []
    for name, data in sorted(files.items()):
        m = BIRD_FILE.match(name)
        if not m:
            continue
        bird_id = m.group(1)
        if bird_id not in dex_ids:
            unknown.append(bird_id)
            continue
        if not data.startswith(PNG_MAGIC):
            bad.append(name)
            continue
        made.append((bird_id, name, data))

    if args.dry_run:
        print(f"[dry run] would copy {len(files)} files to {drafts_dir}")
    else:
        drafts_dir.mkdir(parents=True, exist_ok=True)
        for name, data in files.items():
            (drafts_dir / name).write_bytes(data)

    for bird_id, name, _ in made:
        out = root / "public/assets/birds" / bird_id / "adult-portrait-draft.png"
        if args.dry_run:
            print(f"[dry run] {name} -> {out.relative_to(root)}")
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        prepare(str(drafts_dir / name), str(out))

    added = [b for b, _, _ in made if b not in current]
    if added and not args.dry_run:
        list_file.write_text(json.dumps(current + added, indent=1) + "\n")

    print()
    print(f"Batch {args.batch}: {len(files)} files kept in {drafts_dir.relative_to(root)}")
    print(f"  Sprites made: {len(made)} ({len(added)} new to the portrait list, {len(made) - len(added)} replaced an existing portrait)")
    if unknown:
        print(f"  Not in the Starter Dex, skipped: {', '.join(sorted(unknown))}")
    if bad:
        print(f"  Not real PNG files, skipped: {', '.join(bad)}")
    expected = [f for f in files if f.startswith("bird_")]
    if not expected:
        print("  No bird_<id>_bold_pixel_v1.png files found. Check the file names.")
    return 1 if (unknown or bad) and not made else 0


if __name__ == "__main__":
    sys.exit(main())
