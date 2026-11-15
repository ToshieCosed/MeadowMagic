#!/usr/bin/env python3
"""Ports Lycanites Mobs' creature model classes (decompiled Java) to Strata JavaScript, statement for statement.

Dev tool: run it on the decompiled sources of the model packages
  com/lycanitesmobs/client/model/template/*.java and .../model/creature/*.java
and it writes src/mc/lycmodels.js. The output is ordinary Strata code: each model's constructor (its part centres, scales,
trophy settings), animatePart (every rotate / angle / translate / scale, with the same maths) and its render hooks
(canRenderPart, getPartColor, layers). Minecraft's MathHelper.sin/cos map to Strata's copies of its lookup tables.

  python3 tools/port_lycanites.py <decompiled model dir> src/mc/lycmodels.js [<decompiled entity/creature dir>]
"""
import re, sys, pathlib, json

TYPES = r'(?:float|double|int|long|boolean|byte|short|char|String|Vector[24]f|[A-Z][A-Za-z0-9_]*(?:<[^>=;()]*>)?)(?:\[\])*'
ENT = {  # Minecraft 1.12 names the model code uses
    'field_70122_E': 'onGround', 'field_78091_s': 'isChild', 'field_70173_aa': 'ticksExisted', 'field_70737_aN': 'hurtTime', 'field_70725_aQ': 'deathTime',
    'func_70090_H': 'isInWater', 'func_70681_au': 'getRNG', 'func_184207_aI': 'isBeingRidden', 'func_110143_aJ': 'getHealth', 'func_110138_aP': 'getMaxHealth',
    'func_70070_b': 'getBrightnessForRender', 'func_184218_aH': 'isRiding', 'func_184188_bt': 'getPassengers', 'func_184179_bs': 'getControllingPassenger',
    'func_177094_a': 'addLayer', 'func_177087_b': 'getMainModel', 'func_82150_aj': 'isInvisible', 'func_98034_c': 'isInvisibleToPlayer',
}
MATH = {'MathHelper.func_76134_b': 'mcCos', 'MathHelper.func_76126_a': 'mcSin', 'MathHelper.func_76129_c': 'Math.sqrt', 'MathHelper.func_76133_a': 'Math.sqrt',
        'MathHelper.func_76135_e': 'Math.abs', 'MathHelper.func_76131_a': 'clamp', 'MathHelper.func_76141_d': 'Math.floor', 'MathHelper.func_76128_c': 'Math.floor',
        'MathHelper.func_76142_g': 'wrapDeg', 'Math.toDegrees': 'toDeg', 'Math.toRadians': 'toRad'}
GLS = {'func_179140_f': 'disableLighting', 'func_179145_e': 'enableLighting', 'func_179147_l': 'enableBlend', 'func_179084_k': 'disableBlend', 'func_187401_a': 'blendFunc',
       'func_179131_c': 'color', 'func_179124_c': 'color'}


def match_paren(s, i):
    """index of the ')' matching the '(' at s[i]"""
    d = 0
    q = None
    for j in range(i, len(s)):
        c = s[j]
        if q:
            if c == '\\': continue
            if c == q: q = None
            continue
        if c in '"\'': q = c
        elif c == '(': d += 1
        elif c == ')':
            d -= 1
            if d == 0: return j
    raise ValueError('unbalanced')


def receiver_start(s, i):
    """start of the expression that ends just before s[i] (a literal, a name chain, a call, or a parenthesised group)"""
    j = i
    while True:
        if j > 0 and s[j - 1] == '"':
            k = s.rfind('"', 0, j - 1)
            return k
        if j > 0 and s[j - 1] == ')':
            d = 0
            k = j - 1
            while k >= 0:
                if s[k] == ')': d += 1
                elif s[k] == '(':
                    d -= 1
                    if d == 0: break
                k -= 1
            j = k
            while j > 0 and (s[j - 1].isalnum() or s[j - 1] in '_$'): j -= 1
        else:
            while j > 0 and (s[j - 1].isalnum() or s[j - 1] in '_$'): j -= 1
        if j > 0 and s[j - 1] == '.':
            j -= 1
            continue
        return j


def fix_equals(s):
    while True:
        i = s.find('.equalsIgnoreCase(')
        if i < 0: break
        a = receiver_start(s, i)
        k = match_paren(s, i + 17)
        s = s[:a] + '(String(' + s[a:i] + ').toLowerCase() === String(' + s[i + 18:k] + ').toLowerCase())' + s[k + 1:]
    while True:
        i = s.find('.equals(')
        if i < 0: return s
        a = receiver_start(s, i)
        k = match_paren(s, i + 7)
        s = s[:a] + '(' + s[a:i] + ' === ' + s[i + 8:k] + ')' + s[k + 1:]


def fix_casts(s):
    s = re.sub(r'\((?:float|double|long|short)\)', '', s)
    s = re.sub(r'\((?:int|byte)\)', '~~', s)
    s = re.sub(r'\((?:float|double|int)\[\]\)', '', s)
    s = re.sub(r'\(\(([A-Z][A-Za-z0-9_.]*)\)([A-Za-z_][\w.]*)\)', r'\2', s)     # ((EntityX)entity) -> entity
    s = re.sub(r'\(([A-Z][A-Za-z0-9_]*)\)(?=[A-Za-z_(])', '', s)                 # (EntityX)entity -> entity
    return s


def body(s):
    s = re.sub(r'@\w+(\([^)]*\))?', '', s)
    s = fix_casts(s)
    s = re.sub(r'(?<![\w.])(\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?[FfDdL]\b', lambda m: m.group(0)[:-1], s)
    for k, v in MATH.items(): s = s.replace(k + '(', v + '(')
    for k, v in ENT.items(): s = re.sub(r'\b' + k + r'\b', v, s)
    s = re.sub(r'GlStateManager\.(func_\w+)\(', lambda m: 'GL.' + GLS.get(m.group(1), 'noop') + '(', s)
    s = re.sub(r'OpenGlHelper\.func_77475_a\(OpenGlHelper\.field_77476_b,\s*', 'GL.lightmap(', s)
    s = re.sub(r'(?:GlStateManager\.)?(?:SourceFactor|DestFactor)\.(\w+)', r"'\1'", s)
    s = re.sub(r'(?:LayerCreatureEffect\.)?BLEND\.(\w+)\.id', r'BLEND.\1', s)
    s = s.replace('new Vector4f(', 'V4(').replace('new Vector2f(', 'V2(')
    while True:   # new float[]{a, b} -> [a, b]
        m = re.search(r'new (?:float|double|int|String)\[\]\s*\{', s)
        if not m: break
        k = s.index('}', m.end())
        s = s[:m.start()] + '[' + s[m.end():k] + ']' + s[k + 1:]
    s = re.sub(r'new (?:float|double|int)\[(\w+)\]', r'new Array(\1).fill(0)', s)
    s = re.sub(r'LycanitesMobs\.modInfo', 'null', s)
    s = re.sub(r'([A-Za-z_][\w.]*) instanceof ([\w.]+)', lambda m: "isA(%s, '%s')" % (m.group(1), m.group(2).split('.')[-1]), s)
    s = fix_equals(s)
    s = re.sub(r'\.contains\(', '.includes(', s)
    s = re.sub(r'for\s*\(\s*(?:final\s+)?' + TYPES + r'\s+(\w+)\s*:\s*', r'for (const \1 of ', s)
    s = re.sub(r'for\s*\(\s*(?:final\s+)?' + TYPES + r'\s+(\w+)\s*=', r'for (let \1 =', s)
    s = re.sub(r'(^|[;{}]\s*|\n\s*)(?:final\s+)?' + TYPES + r'\s+(\w+)\s*(=|;|,)', lambda m: m.group(1) + 'let ' + m.group(2) + ' ' + m.group(3), s)
    s = re.sub(r'\bsuper\.(\w+)\(', r'super.\1(', s)
    return s


def params(p):
    out = []
    for a in [x.strip() for x in p.split(',') if x.strip()]:
        a = re.sub(r'@\w+\s*', '', a)
        name = a.split()[-1]
        out.append('...' + name if '...' in a else name)
    return ', '.join(out)


def convert(src):
    src = re.sub(r'^(package|import)[^\n]*\n', '', src, flags=re.M)
    src = re.sub(r'@SideOnly\([^)]*\)\s*', '', src)
    m = re.search(r'public class (\w+) extends (\w+) \{', src)
    name, sup = m.group(1), m.group(2)
    rest = src[m.end():src.rfind('}')]
    members, fields = [], []
    i = 0
    while i < len(rest):
        mm = re.compile(r'\n   (?:(?:public|protected|private|static|final)\s+)*((?:void|' + TYPES + r')\s+)?(\w+)\(([^)]*)\)\s*\{').search(rest, i)
        fm = re.compile(r'\n   (?:(?:public|protected|private|static|final)\s+)*(' + TYPES + r')\s+(\w+)(\s*=\s*[^;]+)?;').search(rest, i)
        if fm and (not mm or fm.start() < mm.start()):
            t, f, v = fm.group(1), fm.group(2), fm.group(3)
            dflt = 'false' if t == 'boolean' else '0' if re.match(r'(float|double|int|long|byte|short|char)$', t) else 'null'
            fields.append((f, body(v.split('=', 1)[1].strip()) if v else dflt, 'static' in fm.group(0)))
            i = fm.end()
            continue
        if not mm: break
        depth, j = 0, mm.end() - 1
        while True:
            if rest[j] == '{': depth += 1
            elif rest[j] == '}':
                depth -= 1
                if depth == 0: break
            j += 1
        b = rest[mm.end():j]
        meth = mm.group(2)
        if meth == name:   # constructors: ModelX() { this(1.0F); } and ModelX(float) { ... }
            if re.match(r'\s*this\([^)]*\);\s*$', b): i = j + 1; continue
            members.append('  constructor() { super();' + body(b).rstrip() + '\n  }')
        else:
            members.append('  %s(%s) {%s\n  }' % (meth, params(mm.group(3)), body(b).rstrip()))
        i = j + 1
    fl = ''.join('  %s%s = %s;\n' % ('static ' if st else '', f, v) for f, v, st in fields)
    return name, sup, 'class %s extends %s {\n%s%s\n}' % (name, sup, fl, '\n'.join(members))


def main():
    d, outp = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    classes = {}
    for f in sorted(list((d / 'template').glob('*.java')) + list((d / 'creature').glob('*.java')) + list((d / 'projectile').glob('*.java'))):
        n, sup, js = convert(f.read_text())
        classes[n] = (sup, js)
    order, seen = [], set()
    def add(n):
        if n in seen or n not in classes: return
        add(classes[n][0]); seen.add(n); order.append(n)
    for n in classes: add(n)
    head = ('/* Lycanites Mobs creature models, ported to Strata from the mod\'s model classes (1.12.2-2.0.8): part centres, animatePart and render hooks,\n'
            '   statement for statement. Generated by tools/port_lycanites.py and checked part by part against the original (tools/mctest/lyc-check.cjs).\n'
            '   The base classes (ModelCreatureObj, ModelObjOld), layers and renderer are in objmobs.js. */\n'
            '(function () {\n  \'use strict\';\n  const L = window.StrataLyc, { ModelCreatureObj, ModelObjOld, ModelCustom, isA, mcSin, mcCos, toDeg, toRad, clamp, wrapDeg, V2, V4, GL, BLEND } = L;\n'
            '  const { LayerCreatureBase, LayerCreatureEffect, LayerCreatureScrolling, LayerCreatureGlow, LayerCreatureFire, LayerCreatureDjinn, LayerCreatureRoa, LayerCreatureShield, LayerCreatureThresher, LayerCreatureDye } = L;\n')
    fly = []   # creatures whose entity class says isFlying() on the client (true, or !isLanded, which the client never sets)
    if len(sys.argv) > 3:
        ed = pathlib.Path(sys.argv[3])
        for f in sorted(ed.glob('Entity*.java')):
            m = re.search(r'public boolean isFlying\(\)\s*\{\s*return ([^;]+);', f.read_text())
            if m and (m.group(1).strip() == 'true' or m.group(1).strip().startswith('!this.isLanded')): fly.append(f.stem[6:].lower())
    js = head + '\n'.join(classes[n][1] for n in order) + '\n  Object.assign(L.models, { ' + ', '.join(order) + ' });\n  L.flying = ' + json.dumps({n: 1 for n in fly}) + ';\n})();\n'
    outp.write_text(js)
    print('ported', len(order), 'classes ->', outp, len(js), 'bytes')


if __name__ == '__main__':
    main()
