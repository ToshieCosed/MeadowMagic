#!/usr/bin/env python3
"""Build a Minecraft Java resource pack from your own copy of the game's files.

Strata cannot ship Minecraft's textures or sounds. This script fetches them
from Mojang's official download servers, the same ones the Minecraft
launcher uses, and packs them into a resource pack .zip on your computer.
Then import that pack in Strata from the pause menu.

  python3 make_resource_pack.py                  # latest release
  python3 make_resource_pack.py --version 1.12.2 # a specific version
  python3 make_resource_pack.py --list           # list available versions

Options:
  --version V     Minecraft version to fetch (default: latest release)
  --out FILE      output zip (default: Minecraft-<version>-pack.zip)
  --music         also include music and music discs (very large)
  --no-sounds     textures only
  --cache DIR     where downloads are kept between runs (default: .mcpack-cache)

Needs Python 3.8 or newer and nothing else. Run it yourself, for your own
use: you should own Minecraft: Java Edition, and the pack it makes is for you
alone. Don't share or upload the zip, because its contents belong to Mojang.

Part of Strata by ToshieCosed. This script is under the same licence as
Strata (PolyForm Noncommercial 1.0.0).
"""
import argparse, concurrent.futures, hashlib, io, json, os, sys, time, urllib.request, zipfile

META = os.environ.get('MCPACK_META', 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
RES = os.environ.get('MCPACK_RES', 'https://resources.download.minecraft.net')
UA = 'StrataPackBuilder/1.0'

# Strata reads about 40 MB of a pack's sounds, in the order they sit in the zip,
# so the sounds it uses most go in first.
SOUND_ORDER = ['dig/', 'step/', 'block/', 'random/', 'damage/', 'mob/', 'entity/', 'liquid/', 'fire/',
               'item/', 'note/', 'ambient/', 'portal/', 'minecart/', 'tile/', 'enchant/', 'fireworks/', 'game/']


def fetch(url, sha1=None, cache=None, tries=4):
    """Download url, checked against sha1 when given, using the cache folder when possible."""
    path = None
    if cache and sha1:
        path = os.path.join(cache, sha1[:2], sha1)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                data = f.read()
            if hashlib.sha1(data).hexdigest() == sha1:
                return data
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            if sha1 and hashlib.sha1(data).hexdigest() != sha1:
                raise IOError('checksum mismatch for ' + url)
            if path:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'wb') as f:
                    f.write(data)
            return data
        except Exception as e:  # network hiccups: wait and retry
            if n == tries - 1:
                raise
            time.sleep(1.5 * (n + 1))


def sound_rank(name):
    for i, p in enumerate(SOUND_ORDER):
        if name.startswith(p):
            return i
    return len(SOUND_ORDER)


def main():
    ap = argparse.ArgumentParser(description='Build a Minecraft resource pack from Mojang\'s download servers.')
    ap.add_argument('--version')
    ap.add_argument('--out')
    ap.add_argument('--music', action='store_true')
    ap.add_argument('--no-sounds', action='store_true')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--cache', default='.mcpack-cache')
    a = ap.parse_args()

    print('Reading the version list...')
    manifest = json.loads(fetch(META))
    if a.list:
        for v in manifest['versions']:
            if v['type'] == 'release':
                print(v['id'])
        return
    vid = a.version or manifest['latest']['release']
    entry = next((v for v in manifest['versions'] if v['id'] == vid), None)
    if not entry:
        sys.exit('No version called %s. Use --list to see them.' % vid)
    ver = json.loads(fetch(entry['url'], entry.get('sha1'), a.cache))
    out = a.out or 'Minecraft-%s-pack.zip' % vid

    cj = ver['downloads']['client']
    print('Downloading the %s game files (%.1f MB)...' % (vid, cj['size'] / 1e6))
    client = zipfile.ZipFile(io.BytesIO(fetch(cj['url'], cj['sha1'], a.cache)))

    # pack.mcmeta: the version's own pack format when it says one, else a sensible guess
    fmt = 3 if vid.startswith('1.12') or vid.startswith('1.11') else 34
    try:
        vj = json.loads(client.read('version.json'))
        pv = vj.get('pack_version')
        fmt = pv.get('resource', fmt) if isinstance(pv, dict) else (pv or fmt)
    except KeyError:
        pass
    if vid.startswith(('1.8', '1.9', '1.10')):
        fmt = 1 if vid.startswith('1.8') else 2

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('pack.mcmeta', json.dumps({'pack': {'pack_format': fmt, 'description': 'Minecraft %s (made on this computer for personal use)' % vid}}, indent=2))
        n = 0
        for info in client.infolist():
            name = info.filename
            if name.startswith(('assets/minecraft/textures/', 'assets/minecraft/blockstates/', 'assets/minecraft/models/')) or name == 'pack.png':
                z.writestr(name, client.read(name))
                n += 1
        print('  %d textures and models' % n)

        if not a.no_sounds:
            ai = ver['assetIndex']
            index = json.loads(fetch(ai['url'], ai['sha1'], a.cache))['objects']
            if 'minecraft/sounds.json' in index:
                h = index['minecraft/sounds.json']['hash']
                z.writestr('assets/minecraft/sounds.json', fetch('%s/%s/%s' % (RES, h[:2], h), h, a.cache))
            want = []
            for key, o in index.items():
                if not (key.startswith('minecraft/sounds/') and key.endswith('.ogg')):
                    continue
                rel = key[len('minecraft/sounds/'):]
                if not a.music and rel.startswith(('music/', 'records/')):
                    continue
                want.append((sound_rank(rel), rel, o['hash'], o['size']))
            want.sort()
            total = sum(w[3] for w in want)
            print('Downloading %d sounds (%.1f MB)...' % (len(want), total / 1e6))
            got, done = {}, 0
            with concurrent.futures.ThreadPoolExecutor(8) as ex:
                futs = {ex.submit(fetch, '%s/%s/%s' % (RES, h[:2], h), h, a.cache): rel for _, rel, h, _ in want}
                for f in concurrent.futures.as_completed(futs):
                    got[futs[f]] = f.result()
                    done += 1
                    if done % 100 == 0 or done == len(want):
                        print('  %d / %d' % (done, len(want)), end='\r', flush=True)
            print()
            for _, rel, _, _ in want:  # written in priority order
                z.writestr('assets/minecraft/sounds/' + rel, got[rel])

    print('Done: %s (%.1f MB)' % (out, os.path.getsize(out) / 1e6))
    print('Import it in Strata from the pause menu (Resource pack, Import .zip). Keep it to yourself: the files belong to Mojang.')


if __name__ == '__main__':
    main()
