#!/usr/bin/env python3
"""A RECONSTRUCTION, not a photograph: the surviving western 2.8 m of the south wall of
Tutankhamun's burial chamber, drawn from its documented composition because no freely
licensed photograph of it exists (research/sites/valley-of-the-kings.md, 2.3).

    python3 tools/art/kv62_south_wall.py   -> assets/textures/kv62_south.jpg (+ godot/textures)

As the viewer faces the wall, right to left: Hathor, mistress of the West, holding an ankh
to the king's nose; Tutankhamun in the khat headdress and a white kilt, facing her; Anubis
behind him, a hand on his shoulder. Yellow-ochre ground with the dark spotting the walls
carry, the blue sky band above and the black baseline below, as on the other three walls.
The figures are schematic (flat colour, canonical proportions on an 18-square grid); the
hieroglyphic captions are not attempted.
"""
import os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PPM = 500                                   # pixels per metre
W, H = int(2.82 * PPM), int(2.60 * PPM)
random.seed(1922)
OCHRE, RED, WHITE, BLACK, BLUE, GREEN, GOLD = (196, 142, 44), (150, 62, 36), (236, 228, 208), (24, 20, 18), (38, 62, 110), (60, 110, 80), (214, 170, 60)
im = Image.new('RGB', (W, H), OCHRE); d = ImageDraw.Draw(im)
BASE = H - int(0.04 * PPM)                  # the baseline the figures stand on
U = 1.84 * PPM / 18.0                       # one grid square: 18 squares from the baseline to the hairline


def figure(cx, facing, kind):
    """A standing figure in the Egyptian convention: head and legs in profile, shoulders frontal.
    facing = +1 looks right, -1 looks left. kind: 'king', 'hathor', 'anubis'."""
    f = facing
    P = lambda sx, sy: (cx + f * sx * U, BASE - sy * U)          # grid squares: x forward, y up from the baseline
    poly = lambda pts, col: d.polygon([P(*p) for p in pts], fill=col)
    skin = RED if kind != 'hathor' else (206, 150, 70)
    # legs (striding for the men, together for the goddess) and feet
    if kind == 'hathor':
        poly([(-0.9, 0.3), (0.9, 0.3), (1.1, 6.0), (1.5, 10.5), (-1.3, 10.5), (-1.0, 6.0)], WHITE)                   # sheath dress to the ankles
        poly([(-1.3, 10.5), (1.5, 10.5), (1.6, 12.6), (-1.5, 12.6)], RED)
        for sx in (-0.2, 0.6): poly([(sx - 0.5, 0.0), (sx + 1.3, 0.0), (sx + 1.2, 0.3), (sx - 0.5, 0.35)], skin)
    else:
        poly([(-2.6, 0.3), (-1.4, 0.3), (-0.2, 6.0), (0.2, 9.0), (-1.2, 9.0), (-1.7, 6.0)], skin)                    # rear leg
        poly([(0.8, 0.3), (2.0, 0.3), (1.5, 6.0), (1.3, 9.0), (-0.1, 9.0), (0.6, 6.0)], skin)                        # forward leg
        for sx in (-2.7, 0.7): poly([(sx, 0.0), (sx + 2.1, 0.0), (sx + 2.0, 0.3), (sx, 0.35)], skin)
        poly([(-1.7, 6.3), (1.9, 6.6), (1.6, 10.8), (-1.5, 10.8)], WHITE)                                            # kilt
        poly([(0.3, 6.0), (2.3, 6.4), (1.2, 10.6), (0.2, 10.6)], (244, 238, 222))                                    # its projecting front panel
        poly([(-1.5, 10.4), (1.6, 10.4), (1.6, 10.9), (-1.5, 10.9)], GOLD if kind == 'king' else BLUE)               # belt
    # torso, frontal shoulders
    poly([(-1.4, 10.8), (1.5, 10.8), (2.6, 15.6), (-2.6, 15.6)], skin)
    if kind == 'hathor': poly([(-1.4, 10.8), (1.5, 10.8), (1.9, 13.6), (-1.8, 13.6)], WHITE); poly([(-0.9, 13.4), (-0.5, 13.4), (-1.9, 15.5), (-2.3, 15.5)], RED); poly([(0.6, 13.4), (1.0, 13.4), (2.3, 15.5), (1.9, 15.5)], RED)
    # broad collar
    d.pieslice([P(-1.9 * f, 16.4)[0] if f > 0 else P(1.9, 16.4)[0], BASE - 16.6 * U, (P(1.9 * f, 16.4)[0] if f > 0 else P(-1.9, 16.4)[0]), BASE - 13.6 * U], 0, 180, fill=BLUE)
    d.pieslice([cx - 1.45 * U, BASE - 16.3 * U, cx + 1.45 * U, BASE - 14.2 * U], 0, 180, fill=GOLD)
    d.pieslice([cx - 1.0 * U, BASE - 16.0 * U, cx + 1.0 * U, BASE - 14.8 * U], 0, 180, fill=GREEN)
    # arms
    if kind == 'hathor':                                                                                             # forward arm raised, ankh to the king's nose
        poly([(2.2, 15.4), (2.7, 14.6), (5.2, 16.6), (5.0, 17.2)], skin); ankh(P(5.6, 17.1), 0.55)
        poly([(-2.6, 15.5), (-2.0, 15.5), (-1.5, 10.2), (-2.1, 10.0)], skin); ankh(P(-1.8, 8.9), 0.5)
    elif kind == 'anubis':                                                                                           # forward arm on the king's shoulder
        poly([(2.2, 15.5), (2.6, 14.7), (6.0, 15.2), (6.0, 15.9)], skin)
        poly([(-2.6, 15.5), (-2.0, 15.5), (-1.6, 10.2), (-2.2, 10.0)], skin); ankh(P(-1.9, 8.9), 0.5)
    else:
        poly([(2.2, 15.5), (2.7, 15.0), (3.6, 10.4), (3.0, 10.2)], skin); ankh(P(3.3, 9.1), 0.5)
        poly([(-2.6, 15.5), (-2.0, 15.5), (-1.7, 10.2), (-2.3, 10.0)], skin)
    # neck and head
    poly([(-0.5, 15.4), (0.6, 15.4), (0.6, 16.8), (-0.5, 16.8)], skin)
    if kind == 'anubis':
        poly([(-0.9, 16.4), (0.8, 16.4), (1.2, 17.4), (3.6, 17.5), (3.7, 18.0), (1.3, 18.5), (0.4, 19.0), (-0.9, 18.6)], BLACK)       # jackal head, long muzzle
        poly([(-0.6, 18.6), (-0.2, 18.8), (-0.5, 20.9), (-0.9, 20.9)], BLACK); poly([(0.0, 18.7), (0.5, 18.9), (0.3, 20.9), (-0.1, 20.9)], BLACK)   # ears
        poly([(-1.3, 14.4), (-0.4, 14.4), (-0.4, 18.2), (-1.2, 18.4)], BLUE); poly([(0.5, 14.6), (1.2, 14.6), (1.0, 16.8), (0.5, 16.8)], BLUE)     # wig lappets
        d.ellipse([P(1.0, 18.25)[0] - 5, P(1.0, 18.25)[1] - 4, P(1.0, 18.25)[0] + 5, P(1.0, 18.25)[1] + 4], fill=WHITE)
    else:
        poly([(-0.9, 16.6), (0.9, 16.6), (1.25, 17.2), (1.1, 17.6), (1.45, 17.9), (1.1, 18.2), (0.9, 19.0), (-0.9, 19.0)], skin)      # face in profile
        ex, ey = P(0.55, 18.25); d.ellipse([ex - 9, ey - 4, ex + 9, ey + 4], fill=WHITE); d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=BLACK)
        d.line([P(-0.2, 18.25), P(1.0, 18.3)], fill=BLACK, width=3); d.line([P(0.0, 18.6), P(1.0, 18.62)], fill=BLACK, width=3)
        if kind == 'king':
            poly([(-1.5, 16.2), (-0.7, 15.9), (-0.9, 19.0), (0.9, 19.0), (1.0, 19.3), (0.2, 19.9), (-1.2, 19.7), (-2.0, 18.2)], (236, 220, 170))   # the khat, bagged behind
            poly([(1.0, 19.1), (1.5, 19.2), (1.5, 19.7), (1.1, 19.6)], GOLD)                                                                # uraeus
        else:
            poly([(-1.3, 14.6), (-0.4, 14.6), (-0.6, 19.0), (0.9, 19.0), (1.0, 19.4), (0.0, 19.9), (-1.2, 19.6), (-1.6, 18.0)], (30, 34, 60))   # long tripartite wig
            poly([(0.5, 14.8), (1.2, 14.8), (1.0, 16.8), (0.5, 16.8)], (30, 34, 60))
            poly([(-1.3, 19.2), (1.0, 19.2), (1.0, 19.45), (-1.3, 19.45)], RED)                                                               # fillet
            d.line([P(-0.2, 19.9), P(-0.2, 21.6)], fill=BLACK, width=5)                                                                       # the emblem of the West on her head
            poly([(-1.1, 21.6), (0.9, 21.6), (0.9, 21.9), (-1.1, 21.9)], BLACK); poly([(-0.7, 21.9), (0.5, 21.9), (0.7, 22.9), (0.1, 23.2), (-0.6, 22.6)], BLUE)


def ankh(p, s):
    x, y = p; r = s * U * 0.42
    d.ellipse([x - r, y - 2.2 * r, x + r, y], outline=BLACK, width=5)
    d.line([x, y, x, y + 2.6 * r], fill=BLACK, width=6); d.line([x - 1.2 * r, y + 0.25 * r, x + 1.2 * r, y + 0.25 * r], fill=BLACK, width=6)


# the three figures: Anubis (left), the king, Hathor (right)
figure(W * 0.20, +1, 'anubis'); figure(W * 0.50, +1, 'king'); figure(W * 0.82, -1, 'hathor')
# column dividers for the captions above the figures (the texts themselves are not attempted)
for x in (W * 0.33, W * 0.36, W * 0.63, W * 0.66, W * 0.69):
    d.line([x, int(0.12 * PPM), x, int(0.52 * PPM)], fill=BLACK, width=3)
d.rectangle([0, int(0.03 * PPM), W, int(0.11 * PPM)], fill=BLUE)                 # the sky
d.rectangle([0, BASE, W, H], fill=BLACK)                                          # the earth
im = im.filter(ImageFilter.GaussianBlur(1.2))
# the plaster's unevenness, and the dark spots the walls have carried since 1922
px = im.load()
tone = Image.effect_noise((W // 8, H // 8), 26).resize((W, H), Image.BICUBIC).load()
for y in range(H):
    for x in range(W):
        k = 0.9 + (tone[x, y] - 128) / 128.0 * 0.12
        r, g, b = px[x, y]; px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
d = ImageDraw.Draw(im)
for _ in range(2600):
    x, y = random.randrange(W), random.randrange(int(0.11 * PPM), BASE); r = random.choice((1, 1, 2, 2, 3, 5))
    d.ellipse([x - r, y - r, x + r, y + r], fill=(70 + random.randrange(30), 44, 22))
im = im.filter(ImageFilter.GaussianBlur(0.6))
for dst in ('assets/textures/kv62_south.jpg', 'godot/textures/kv62_south.jpg'):
    im.save(os.path.join(ROOT, dst), quality=88)
print('wrote kv62_south.jpg', im.size)
