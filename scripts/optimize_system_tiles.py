"""Generate optimized WebP copies of the board system tiles (Milestone 6A).

The board (`frontend/src/components/Board/Board.tsx`) paints each hex with a
system tile image from `static/images/systems/`. The source art is PNG
(~35 MB across 177 RGBA tiles, up to ~290 KB each); a built board fetches up to
37 of them at mount. WebP at high quality is ~85% smaller while staying visually
indistinguishable, so the frontend loads `ST_<id>.webp` and the PNGs are kept as
the canonical/validated asset (see `core/data/validators.py`).

Idempotent: re-run after adding new `ST_*.png` tiles to regenerate the WebP set.
Run from the repo root:  python scripts/optimize_system_tiles.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

# Near-lossless for this photographic tile art; preserves the tiles' alpha.
WEBP_QUALITY = 90
WEBP_METHOD = 6  # slowest/best encoder effort (one-time cost, smaller output)

SYSTEMS_DIR = Path(__file__).resolve().parent.parent / "static" / "images" / "systems"


def main() -> None:
    pngs = sorted(SYSTEMS_DIR.glob("ST_*.png"))
    if not pngs:
        raise SystemExit(f"No ST_*.png tiles found in {SYSTEMS_DIR}")

    png_bytes = webp_bytes = 0
    for png in pngs:
        webp = png.with_suffix(".webp")
        with Image.open(png) as im:
            im.save(webp, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        png_bytes += png.stat().st_size
        webp_bytes += webp.stat().st_size

    print(f"Converted {len(pngs)} tiles in {SYSTEMS_DIR}")
    print(f"  PNG total:  {png_bytes:>12,} bytes")
    print(f"  WebP total: {webp_bytes:>12,} bytes")
    print(f"  Reduction:  {1 - webp_bytes / png_bytes:.1%}")


if __name__ == "__main__":
    main()
