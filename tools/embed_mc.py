#!/usr/bin/env python3
"""Embeds src/mc/ids.json + src/mc/mcclient.js into src/strata.html between the MC-CLIENT markers."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
p = root / 'src/strata.html'; s = p.read_text()
code = (root / 'src/mc/mcclient.js').read_text(); ids = (root / 'src/mc/ids.json').read_text().strip()
eng = (root / 'src/mc/engine.js').read_text(); snd = (root / 'src/mc/sounds.json').read_text().strip(); b18 = (root / 'src/mc/blocks18.json').read_text().strip(); i18 = (root / 'src/mc/items18.json').read_text().strip()
block = '/*MC-CLIENT-BEGIN*/\n' + code + '\nStrataMC.setIds(' + ids + ');\nStrataMC.sounds=' + snd + ';\nStrataMC.blocks18=' + b18 + ';\nStrataMC.items18=' + i18 + ';\n' + eng + '\n/*MC-CLIENT-END*/\n'
if '/*MC-CLIENT-BEGIN*/' in s:
    s = re.sub(r'/\*MC-CLIENT-BEGIN\*/.*?/\*MC-CLIENT-END\*/\n', lambda m: block, s, flags=re.S)
else:
    k = '/* ===== mineCompatibility branch: multiplayer entry point ===== */'
    assert k in s; s = s.replace(k, block + k, 1)
p.write_text(s); print('embedded', len(block), 'bytes')
