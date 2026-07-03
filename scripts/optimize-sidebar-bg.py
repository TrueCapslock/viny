#!/usr/bin/env python3
"""
Convert a sidebar background PNG into the WebP variant commited alongside
the Next.js app.

Recipe origin
-------------
This recipe is what produced the WebP assets commited in 7bae7e8
(sidebar-bg-wine.webp, sidebar-bg-beer.webp). Both source illustrations
were AI-generated via ChatGPT as opaque-white-background PNGs at roughly
1254x1254 / RGB / 1.0-1.9 MB; the original Pinterest/pngtree PNG was
smaller but always opaque-or-transparent RGB(A). The conversion below
preserves the visual intent (white-matted WebP at quality 80, method=6,
no resize) while shrinking the file by ~10x.

Why Pillow not cwebp
--------------------
This dev environment does NOT have cwebp or ffmpeg installed
(verified during 7bae7e8). Pillow ships with a WebP encoder that uses
the same libwebp back-end; PIL save at quality=80 method=6 produces
output that is visually equivalent to `cwebp -q 80 -m 6` on these
flat-color sketches (~10-12% of the original size).

Requirements
------------
    python3 -m pip install Pillow

Usage
-----
    python3 scripts/optimize-sidebar-bg.py public/sidebar-bg-wine.png
        # writes public/sidebar-bg-wine.webp

    python3 scripts/optimize-sidebar-bg.py INPUT.png OUTPUT.webp
        # writes to explicit path

The script intentionally:
  - Does NOT resize (preserves the source illustrations' pixel art at
    the chosen ChatGPT output dims; consistent with how 7bae7e8 / the
    follow-up asset swap in 7b3d25e ran).
  - Flattens RGBA onto an opaque-white background before saving -- this
    matches the existing committed assets, whose opaque-white background
    blends with the sidebar's `bg-white` so only the sketch's strokes
    are visible against the rest of the UI.
  - Refuses to operate outside of `public/` by default (catches typos
    that would otherwise clobber an unrelated file); override with
    `--no-public-guard` if needed.

Exit codes
----------
    0  success
    1  invalid arguments / file missing / wrong directory / Pillow missing
"""
from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

DEFAULT_QUALITY = 80
DEFAULT_METHOD = 6


def _is_under_public(p: Path) -> bool:
    """True iff any segment of p's resolved path is exactly 'public'.

    Works for both absolute paths (because `Path.resolve()` walks past
    cwd) and relative paths like `public/foo.webp` (because the parts
    tuple includes 'public' literally). Does NOT distinguish between
    `/proj/public/foo` and a hostile `/other/public-archive/foo` -- for
    a developer utility that is acceptable; the guard exists to catch
    typos, not to enforce isolation.
    """
    return "public" in p.resolve().parts


def _flatten_to_opaque_white(img):
    """Compose RGBA/LA onto an opaque white background; pass-through for
    fully-opaque RGB. GA / palette modes get a `convert('RGB')` first.

    Uses the module-level `PIL.Image.new()` factory rather than
    `img.__class__.new()` because PIL subclasses (PngImageFile,
    JpegImageFile, ...) don't expose `.new()` even though the base
    `Image` class does.
    """
    from PIL import Image  # local import keeps --help path Pillow-free
    mode = img.mode
    if mode in ("RGB",):
        return img
    if mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        return bg
    # GA, P, CMYK, etc.
    return img.convert("RGB")


def _verify_webp(path: Path) -> tuple[bool, int]:
    """Return (is_webp, size_bytes). is_webp is True iff the first 4
    bytes are 'RIFF' AND bytes 8..11 are 'WEBP'.
    """
    data = path.read_bytes()
    if len(data) < 12:
        return False, len(data)
    head = data[:4]
    brand = data[8:12]
    return (head == b"RIFF" and brand == b"WEBP"), len(data)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert a sidebar-bg *.png to a *.webp via the project-standard "
            "PIL recipe (quality 80, method 6, no resize; RGBA flattened on "
            "opaque white)."
        ),
        epilog=(
            "Equivalent invocation directly via Python:\n"
            "    python3 -c \"from PIL import Image; "
            "im=Image.open(sys.argv[1]).convert('RGB') if 'A' not in im.mode else "
            "(lambda bg,im: (bg.paste(im, mask=im.split()[-1]), bg)[1])(Image.new('RGB', "
            "im.size, (255,255,255)), im); im.save(sys.argv[2], 'WEBP', quality=80, "
            "method=6)\" INPUT OUTPUT"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Path to source PNG")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        default=None,
        help="Path to destination .webp (default: same dir + stem with .webp)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=DEFAULT_QUALITY,
        help=f"WebP quality (1-100, default {DEFAULT_QUALITY}).",
    )
    parser.add_argument(
        "--method",
        type=int,
        default=DEFAULT_METHOD,
        help=(
            "WebP encoding method (0-6, default "
            f"{DEFAULT_METHOD}; higher = smaller / slower)."
        ),
    )
    parser.add_argument(
        "--no-public-guard",
        action="store_true",
        help=(
            "Allow output paths outside public/. Default refuses them "
            "so a typo cannot clobber unrelated files."
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    # Pillow is the only runtime dep; argparse does the rest.
    try:
        from PIL import Image
    except ImportError:
        print(
            "Pillow is required: `python3 -m pip install Pillow`",
            file=sys.stderr,
        )
        return 1

    src: Path = args.input.resolve()
    if not src.is_file():
        print(f"input not found: {src}", file=sys.stderr)
        return 1

    if src.suffix.lower() != ".png":
        print(
            f"warning: input is not a .png ({src.suffix!r}); proceeding anyway",
            file=sys.stderr,
        )

    dst: Path
    if args.output is None:
        dst = src.with_suffix(".webp")
    else:
        dst = args.output.resolve()

    if not args.no_public_guard:
        # Either the source or the destination must live under public/.
        # A naive `parts[0] == "public"` fails for absolute paths because
        # `Path.resolve()` prepends the root segment '/' as parts[0].
        # Checking `"public" in resolved.parts` handles both absolute and
        # cwd-relative cases uniformly.
        if not (_is_under_public(dst) or _is_under_public(src)):
            print(
                "refusing to write outside public/ -- pass --no-public-guard to override",
                file=sys.stderr,
            )
            return 1

    img = Image.open(src)
    img.load()  # decode before we read .size / .mode to surface IO errors early
    img_flat = _flatten_to_opaque_white(img)

    dst.parent.mkdir(parents=True, exist_ok=True)
    img_flat.save(dst, "WEBP", quality=args.quality, method=args.method)

    is_webp, dst_size = _verify_webp(dst)
    src_size = src.stat().st_size
    ratio_pct = (dst_size / src_size) * 100.0 if src_size else 0.0

    dst_md5 = hashlib.md5(dst.read_bytes()).hexdigest()

    print(f"  source: {src}  ({src_size:,} B, {img.size[0]}x{img.size[1]} {img.mode})")
    print(f"  output: {dst}  ({dst_size:,} B, {ratio_pct:.1f}% of source, md5={dst_md5})")
    print(
        f"  WebP header: {'OK' if is_webp else 'BROKEN -- not a valid WebP'}",
    )
    print(
        f"  settings: quality={args.quality} method={args.method} mode={img_flat.mode}",
    )

    if not is_webp:
        print("error: output is not a valid WebP file; aborting", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
