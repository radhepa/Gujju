"""App icon, splash and favicon from Kesar's idle pose.

    python scripts/make-icons.py

Run scripts/slice-mascot.py first. The source sheet is small, so the big
icon is upscaled; swap in a high-resolution export of the idle pose at
assets/mascot/kesar-idle.png for a crisper icon.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
CREAM = (251, 246, 238, 255)
SAFFRON = (252, 235, 211, 255)


def lion(height: int) -> Image.Image:
    im = Image.open(A / 'mascot/kesar-idle.png')
    # Drop the ground shadow: it looks like a stray bar on an icon.
    a = im.getchannel('A')
    rows = [sum(1 for x in range(im.width) if a.getpixel((x, y)) > 200) for y in range(im.height)]
    # The shadow is wider than the feet just above it.
    bottom = next(
        (y for y in range(int(im.height * 0.85), im.height) if rows[y - 1] and rows[y] > rows[y - 1] * 1.4),
        im.height,
    )
    im = im.crop((0, 0, im.width, bottom))
    w = round(im.width * height / im.height)
    return im.resize((w, height), Image.LANCZOS)


def centred(canvas: Image.Image, sprite: Image.Image, dy: int = 0) -> Image.Image:
    x = (canvas.width - sprite.width) // 2
    y = (canvas.height - sprite.height) // 2 + dy
    canvas.alpha_composite(sprite, (x, y))
    return canvas


# iOS icon: no transparency allowed.
icon = Image.new('RGBA', (1024, 1024), SAFFRON)
centred(icon, lion(800), 40).convert('RGB').save(A / 'icon.png')

# Splash: transparent, the background colour comes from app.json.
centred(Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)), lion(900)).save(A / 'splash-icon.png')

# Android adaptive icon: keep him inside the middle safe zone.
centred(Image.new('RGBA', (512, 512), (0, 0, 0, 0)), lion(300), 10).save(A / 'android-icon-foreground.png')
Image.new('RGBA', (512, 512), SAFFRON).save(A / 'android-icon-background.png')

# Favicon: just the face, which reads at 48px.
face = Image.open(A / 'mascot/kesar-idle.png')
face = face.crop((0, 0, face.width, int(face.height * 0.62)))
side = max(face.size)
square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
square.alpha_composite(face, ((side - face.width) // 2, (side - face.height) // 2))
square.resize((48, 48), Image.LANCZOS).save(A / 'favicon.png')

print('icons written')
