"""Cut Kesar's sprite sheet into one transparent strip of equal-size frames.

    python scripts/slice-mascot.py

Reads assets/mascot/source.jpg (four rows of poses on an off-white background
with a faint guide grid) and writes assets/mascot/kesar.png, a trimmed idle
pose for the app icon, and src/ui/kesarFrames.json.

The poses don't stay inside the guide grid, so each one is found by the empty
columns around it. Frames are lined up on the lion's body (the centre of his
orange turban and jacket) horizontally, and on the bottom of their row
vertically, so a jump still reads as a jump and nothing wobbles.
"""

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/mascot/source.jpg'
OUT_PNG = ROOT / 'assets/mascot/kesar.png'
OUT_ICON = ROOT / 'assets/mascot/kesar-idle.png'
OUT_JSON = ROOT / 'src/ui/kesarFrames.json'

# Guide grid lines (pixel columns / rows), painted out before cutting.
GRID_COLS = [(202, 203), (358, 359), (512, 513), (665, 667), (821, 822)]
GRID_ROWS = [(194, 197), (370, 372), (547, 550)]
# Row bands. The jumping poses poke above their grid line, so the last band
# starts a little higher.
BANDS = [(0, 194), (198, 370), (373, 539), (540, 742)]

NAMES = [
    ['idle'],
    ['side-right', 'walk-1', 'walk-2', 'side-left', 'back-walk', 'back'],
    ['wave-1', 'wave-2', 'wave-3', 'wave-quiet'],
    ['eat', 'read-1', 'read-2', 'cheer-1', 'cheer-2'],
]

FLOOD_TOL = 46  # how far from the background colour the flood fill may spread
NOISE = 12  # JPEG noise around the background; anything below this is clear
SOFT = 50  # range over which a flooded pixel fades in to fully opaque
FOUND = 45  # diff that counts as "something is drawn here"
MIN_WIDTH = 20  # narrower runs are specks, not poses
PAD = 8


def paint_out_grid(img: np.ndarray, bg: np.ndarray) -> np.ndarray:
    # Blend across each line from the pixels either side. Where one side is
    # background, the line sat at a drawing's edge, so it becomes background
    # (otherwise the blend leaves a smudge above a turban).
    img = img.copy()

    def fill(before: np.ndarray, after: np.ndarray, n: int):
        edge = (np.abs(before - bg).sum(-1) < FOUND) | (np.abs(after - bg).sum(-1) < FOUND)
        out = []
        for i in range(n):
            t = (i + 1) / (n + 1)
            blend = before * (1 - t) + after * t
            blend[edge] = bg
            out.append(blend)
        return out

    for a, b in GRID_COLS:
        for x, v in zip(range(a - 1, b + 2), fill(img[:, a - 2], img[:, b + 2], b - a + 3)):
            img[:, x] = v
    for a, b in GRID_ROWS:
        for y, v in zip(range(a - 1, b + 2), fill(img[a - 2], img[b + 2], b - a + 3)):
            img[y] = v
    return img


def runs(mask: np.ndarray):
    out, start = [], None
    for x, v in enumerate(mask):
        if v and start is None:
            start = x
        if not v and start is not None:
            out.append((start, x - 1))
            start = None
    if start is not None:
        out.append((start, len(mask) - 1))
    return [(a, b) for a, b in out if b - a >= MIN_WIDTH]


def cut(img: np.ndarray, bg: np.ndarray):
    h, w, _ = img.shape
    diff = np.abs(img - bg).sum(axis=2)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        q.extend([(0, x), (h - 1, x)])
    for y in range(h):
        q.extend([(y, 0), (y, w - 1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or diff[y, x] > FLOOD_TOL:
            continue
        seen[y, x] = True
        q.extend([(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)])

    alpha = np.ones((h, w))
    alpha[seen] = np.clip((diff[seen] - NOISE) / SOFT, 0, 1)
    # Un-mix the background from soft edges so they don't keep a white fringe.
    a = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((img - bg * (1 - a)) / a, 0, 255)
    rgb[alpha == 0] = 0
    return rgb, alpha


def body_centre_x(rgb: np.ndarray, alpha: np.ndarray) -> float:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    orange = (r > 170) & (g < 150) & (b < 100) & (alpha > 0.9)
    return float(np.nonzero(orange)[1].mean())


def main():
    sheet = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    bg = np.median(sheet[5:40, 300:340].reshape(-1, 3), axis=0)
    sheet = paint_out_grid(sheet, bg)
    diff = np.abs(sheet - bg).sum(axis=2)

    pieces = []
    for (y0, y1), names in zip(BANDS, NAMES):
        found = runs((diff[y0:y1] > FOUND).any(axis=0))
        if len(found) != len(names):
            raise SystemExit(f'row {y0}-{y1}: expected {len(names)} poses, found {found}')
        for name, (a, b) in zip(names, found):
            x0, x1 = max(a - PAD, 0), min(b + PAD + 1, sheet.shape[1])
            rgb, alpha = cut(sheet[y0:y1, x0:x1], bg)
            ys, xs = np.nonzero(alpha > 0.1)
            pieces.append(
                dict(
                    name=name,
                    rgb=rgb,
                    alpha=alpha,
                    cx=body_centre_x(rgb, alpha),
                    left=xs.min(),
                    right=xs.max(),
                    top=ys.min(),
                    h=alpha.shape[0],
                )
            )

    # One canvas size for every frame.
    reach_left = max(p['cx'] - p['left'] for p in pieces)
    reach_right = max(p['right'] - p['cx'] for p in pieces)
    reach_up = max(p['h'] - p['top'] for p in pieces)
    pad = 4
    fw = int(np.ceil(reach_left + reach_right)) + 2 * pad
    fh = int(np.ceil(reach_up)) + pad
    anchor_x = reach_left + pad

    strip = Image.new('RGBA', (fw * len(pieces), fh), (0, 0, 0, 0))
    for i, p in enumerate(pieces):
        rgba = np.dstack([p['rgb'], p['alpha'] * 255]).astype(np.uint8)
        frame = Image.fromarray(rgba, 'RGBA')
        canvas = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
        canvas.paste(frame, (int(round(anchor_x - p['cx'])), fh - p['h']), frame)
        strip.paste(canvas, (i * fw, 0))
    strip.save(OUT_PNG, optimize=True)

    idle = Image.fromarray(np.dstack([pieces[0]['rgb'], pieces[0]['alpha'] * 255]).astype(np.uint8), 'RGBA')
    idle.crop(idle.getbbox()).save(OUT_ICON)

    OUT_JSON.write_text(
        json.dumps({'frameWidth': fw, 'frameHeight': fh, 'frames': [p['name'] for p in pieces]}, indent=2) + '\n'
    )
    print(f'{len(pieces)} frames, {fw}x{fh} each -> {OUT_PNG.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
