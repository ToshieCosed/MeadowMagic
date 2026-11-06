"""Dev only: a tiny resource pack whose zombie/skeleton textures paint each biped box face a distinct colour.
zombie.png is 64x64 with an empty lower half, like vanilla 1.8, so limbs sampling the player-skin slots show up as holes."""
import io, zipfile, sys
from PIL import Image, ImageDraw
def box(d, u, v, w, h, dd, hue):
    C = {'top': 1.25, 'bottom': .55, 'right': .8, 'front': 1.0, 'left': .7, 'back': .45}
    for k, r in {'top': (u+dd, v, w, dd), 'bottom': (u+dd+w, v, w, dd), 'right': (u, v+dd, dd, h), 'front': (u+dd, v+dd, w, h), 'left': (u+dd+w, v+dd, dd, h), 'back': (u+dd+w+dd, v+dd, w, h)}.items():
        c = tuple(min(255, int(x*C[k])) for x in hue) + (255,); d.rectangle((r[0], r[1], r[0]+r[2]-1, r[1]+r[3]-1), fill=c)
def biped(w, h, arm=4):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    box(d, 0, 0, 8, 8, 8, (90, 170, 80)); box(d, 16, 16, 8, 12, 4, (60, 150, 170)); box(d, 40, 16, arm, 12, 4 if arm == 4 else 2, (200, 120, 60)); box(d, 0, 16, 4 if arm == 4 else 2, 12, 4 if arm == 4 else 2, (90, 80, 200))
    d.rectangle((9, 11, 10, 12), fill=(0, 0, 0, 255)); d.rectangle((13, 11, 14, 12), fill=(0, 0, 0, 255)); return im
def png(im): b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
z = io.BytesIO(); f = zipfile.ZipFile(z, 'w'); f.writestr('pack.mcmeta', '{"pack":{"pack_format":1,"description":"faces"}}')
f.writestr('assets/minecraft/textures/blocks/stone.png', png(Image.new('RGBA', (16, 16), (128, 128, 128, 255))))
f.writestr('assets/minecraft/textures/entity/zombie/zombie.png', png(biped(64, 64)))
sk = Image.new('RGBA', (64, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(sk); box(d, 0, 0, 8, 8, 8, (220, 220, 210)); box(d, 16, 16, 8, 12, 4, (200, 200, 190)); box(d, 40, 16, 2, 12, 2, (230, 150, 150)); box(d, 0, 16, 2, 12, 2, (150, 150, 230))
f.writestr('assets/minecraft/textures/entity/skeleton/skeleton.png', png(sk));
for nm, col in [('rotten_flesh', (120, 160, 60)), ('beef_raw', (230, 60, 90))]:   # two item textures: hotbar icons must come from the pack
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.ellipse((2, 2, 13, 13), fill=col + (255,)); d.rectangle((6, 6, 9, 9), fill=(255, 255, 255, 255)); f.writestr('assets/minecraft/textures/items/' + nm + '.png', png(im))
def blk(nm, col, pat=0):   # block textures for Minecraft-mode blocks: a checker or cross so it's obvious they come from the pack
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0) if pat == 2 else col + (255,)); d = ImageDraw.Draw(im)
    if pat == 0: [d.rectangle((x, y, x + 3, y + 3), fill=tuple(int(c * .6) for c in col) + (255,)) for x in range(0, 16, 8) for y in range(0, 16, 8)]
    if pat == 2: d.rectangle((6, 0, 9, 15), fill=(200, 200, 200, 255)); d.rectangle((0, 6, 15, 9), fill=(200, 200, 200, 255))
    f.writestr('assets/minecraft/textures/blocks/' + nm + '.png', png(im))
for nm, col, pat in [('tnt_side', (200, 40, 30), 0), ('tnt_top', (220, 220, 200), 0), ('tnt_bottom', (120, 120, 120), 0), ('redstone_dust_cross', (0, 0, 0), 2), ('repeater_off', (170, 160, 160), 0), ('enchanting_table_top', (150, 20, 30), 0), ('enchanting_table_side', (40, 20, 60), 0), ('enchanting_table_bottom', (20, 20, 20), 0), ('anvil_base', (60, 60, 70), 0), ('anvil_top_damaged_0', (90, 90, 100), 0), ('noteblock', (110, 70, 40), 0), ('redstone_lamp_off', (120, 80, 40), 0)]: blk(nm, col, pat)
f.close(); sys.stdout.buffer.write(z.getvalue())
