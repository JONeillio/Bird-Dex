#!/usr/bin/env python3
"""Turn a large draft PNG into a 64x64 runtime sprite (nearest-style, chunky, few colours).

Usage: python scripts/art/prepare_sprite.py DRAFT.png OUT.png [--fit 56] [--size 64] [--colours 24]

Steps: trim to visible pixels -> fit inside a (fit x fit) box -> for each output pixel take the most
common colour in its source cell (mode filter keeps outlines crisp) -> quantise to <= N colours ->
binary alpha -> centre on a size x size canvas (bottom-aligned so feet share a baseline).
"""
import argparse
from collections import Counter
from PIL import Image


def prepare(src: str, out: str, fit: int = 56, size: int = 64, colours: int = 24) -> None:
    im = Image.open(src).convert("RGBA")
    # Treat near-white background and soft alpha as transparent edges.
    alpha = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    im.putalpha(alpha)
    box = alpha.getbbox()
    if not box:
        raise SystemExit("no visible pixels")
    im = im.crop(box)
    w, h = im.size
    scale = min(fit / w, fit / h)
    ow, oh = max(1, round(w * scale)), max(1, round(h * scale))

    # Quantise colours on the opaque pixels first so the mode filter works on a small palette.
    rgb = im.convert("RGB").quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    px, ap = rgb.load(), im.getchannel("A").load()
    res = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    rp = res.load()
    for y in range(oh):
        y0, y1 = int(y * h / oh), max(int(y * h / oh) + 1, int((y + 1) * h / oh))
        for x in range(ow):
            x0, x1 = int(x * w / ow), max(int(x * w / ow) + 1, int((x + 1) * w / ow))
            opaque, cols = 0, Counter()
            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    if ap[xx, yy] >= 128:
                        opaque += 1
                        cols[px[xx, yy]] += 1
            total = (y1 - y0) * (x1 - x0)
            if opaque * 2 >= total and cols:
                rp[x, y] = (*cols.most_common(1)[0][0], 255)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(res, ((size - ow) // 2, size - 4 - oh))  # 4 px bottom margin
    canvas.save(out, optimize=True)
    used = len({p[:3] for p in canvas.getdata() if p[3]})
    print(f"{src} -> {out}: {ow}x{oh} inside {size}x{size}, {used} colours")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--fit", type=int, default=56); ap.add_argument("--size", type=int, default=64)
    ap.add_argument("--colours", type=int, default=24)
    a = ap.parse_args()
    prepare(a.src, a.out, a.fit, a.size, a.colours)
