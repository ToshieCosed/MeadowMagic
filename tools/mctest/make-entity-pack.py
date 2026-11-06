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
f.writestr('assets/minecraft/textures/entity/skeleton/skeleton.png', png(sk)); f.close(); sys.stdout.buffer.write(z.getvalue())
