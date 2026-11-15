/* A small Java bytecode interpreter for the client-side code of Minecraft mods (compat mode only).
   Some mods animate their creatures in Java (Lycanites Mobs: each creature's model class moves its parts every frame). Rather than rewrite that code,
   Strata runs it from the player's own imported jar: the classes are read from the jar, and the few engine calls they make (OpenGL state, Minecraft's
   MathHelper tables, collections, strings) are provided here as natives. Floats are rounded to 32 bits like Java's, and MathHelper.sin/cos use
   Minecraft's 65536-entry tables, so the motion matches the mod exactly.
   Not a general JVM: no threads, exceptions, long arithmetic beyond doubles, or reflection. */
(function () {
  'use strict';
  const TOP = { top: 1 };   // second slot of a long or double
  const f32 = Math.fround;
  const SIN = new Float32Array(65536); for (let i = 0; i < 65536; i++) SIN[i] = Math.sin(i * Math.PI * 2 / 65536);
  const mcSin = x => SIN[(Math.trunc(f32(x * 10430.378)) & 65535)], mcCos = x => SIN[(Math.trunc(f32(x * 10430.378 + 16384)) & 65535)];

  function parseClass(u8) {
    const d = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 8;
    const u1 = () => d.getUint8(p++), u2 = () => { const v = d.getUint16(p); p += 2; return v; }, u4 = () => { const v = d.getUint32(p); p += 4; return v; };
    const n = u2(), cp = new Array(n), dec = new TextDecoder();
    for (let i = 1; i < n; i++) { const t = u1();
      switch (t) {
        case 1: { const l = u2(); cp[i] = { t, s: dec.decode(u8.subarray(p, p + l)) }; p += l; break; }
        case 3: cp[i] = { t, v: d.getInt32(p) }; p += 4; break;
        case 4: cp[i] = { t, v: d.getFloat32(p) }; p += 4; break;
        case 5: cp[i] = { t, v: Number(d.getBigInt64(p)) }; p += 8; i++; break;
        case 6: cp[i] = { t, v: d.getFloat64(p) }; p += 8; i++; break;
        case 7: case 8: case 16: case 19: case 20: cp[i] = { t, n: u2() }; break;
        case 9: case 10: case 11: cp[i] = { t, c: u2(), nt: u2() }; break;
        case 12: cp[i] = { t, n: u2(), d: u2() }; break;
        case 15: cp[i] = { t, k: u1(), r: u2() }; break;
        case 17: case 18: cp[i] = { t, b: u2(), nt: u2() }; break;
        default: throw new Error('class constant ' + t); } }
    const S = i => cp[i].s, cn = i => i ? S(cp[i].n) : null;
    u2(); const name = cn(u2()), sup = cn(u2()); const ni = u2(), ifs = []; for (let i = 0; i < ni; i++) ifs.push(cn(u2()));
    const skipAttrs = () => { const na = u2(); for (let a = 0; a < na; a++) { u2(); const l = u4(); p += l; } };
    const nf = u2(); for (let i = 0; i < nf; i++) { u2(); u2(); u2(); skipAttrs(); }
    const methods = {}, nm = u2();
    for (let i = 0; i < nm; i++) { const fl = u2(), mn = S(u2()), ds = S(u2()), na = u2(); let code = null;
      for (let a = 0; a < na; a++) { const an = S(u2()), len = u4(); if (an === 'Code') code = { ml: d.getUint16(p + 2), c: u8.subarray(p + 8, p + 8 + d.getUint32(p + 4)) }; p += len; }
      methods[mn + ds] = { fl, name: mn, desc: ds, code, cls: name, isStatic: !!(fl & 8) }; }
    const ref = i => { const r = cp[i], nt = cp[r.nt]; return { cls: cn(r.c), name: S(nt.n), desc: S(nt.d) }; };
    return { name, sup, ifs, cp, methods, S, cn, ref, statics: {}, init: false };
  }
  // descriptor "(FFLjava/lang/String;[F)V" -> [arg slot sizes], return size
  const DESC = new Map();
  function desc(ds) { let r = DESC.get(ds); if (r) return r; const a = []; let i = 1;
    while (ds[i] !== ')') { const c = ds[i]; if (c === 'J' || c === 'D') { a.push(2); i++; } else if (c === 'L') { a.push(1); i = ds.indexOf(';', i) + 1; } else if (c === '[') { while (ds[i] === '[') i++; if (ds[i] === 'L') i = ds.indexOf(';', i) + 1; else i++; a.push(1); } else { a.push(1); i++; } }
    const rt = ds[i + 1]; r = { a, ret: rt === 'V' ? 0 : rt === 'J' || rt === 'D' ? 2 : 1, rf: rt === 'F' }; DESC.set(ds, r); return r; }

  class VM {
    constructor(load) { this.load = load; this.classes = new Map(); this.natives = Object.create(null); this.warned = new Set(); this.steps = 0; this.stub = Object.create(null); }
    cls(name) { if (this.classes.has(name)) return this.classes.get(name); let c = null; const b = this.load(name); if (b) try { c = parseClass(b); } catch (e) { console.warn('jvm: bad class', name, e); }
      this.classes.set(name, c); if (c && !c.init) { c.init = true; const ci = c.methods['<clinit>()V']; if (ci) try { this.run(ci, c, []); } catch (e) { this.warn('clinit ' + name + ': ' + e.message); } } return c; }
    warn(m) { if (!this.warned.has(m)) { this.warned.add(m); if (this.warned.size < 60) console.warn('jvm:', m); } }
    chain(name) { const L = []; let c = name; for (let g = 0; c && g < 30; g++) { L.push(c); const k = this.cls(c); c = k ? k.sup : null; } return L; }
    isA(o, name) { if (o == null) return false; if (typeof o === 'string') return name === 'java/lang/String' || name === 'java/lang/Object' || name === 'java/lang/CharSequence';
      if (o.$is) return o.$is(name); if (o.$c) { for (const c of this.chain(o.$c)) { if (c === name) return true; const k = this.cls(c); if (k && k.ifs.includes(name)) return true; } return false; } return name === 'java/lang/Object'; }
    native(cls, name, desc) { const N = this.natives; return N[cls + '.' + name + desc] || N[cls + '.' + name] || null; }
    // find the code for a virtual call on obj (class chain, natives first at each level)
    virt(obj, name, ds) { const start = obj && obj.$c; if (!start) return null; for (const c of this.chain(start)) { const n = this.native(c, name, ds); if (n) return { n }; const k = this.cls(c); const m = k && k.methods[name + ds]; if (m && m.code) return { m, k }; } return null; }
    call(obj, name, ds, args) { const f = this.virt(obj, name, ds); if (!f) { this.warn('no method ' + (obj && obj.$c) + '.' + name + ds); return undefined; } return f.n ? f.n(this, obj, args) : this.run(f.m, f.k, [obj, ...this.slots(ds, args)]); }
    slots(ds, args) { const a = desc(ds).a, out = []; a.forEach((s, i) => { out.push(args[i]); if (s === 2) out.push(TOP); }); return out; }
    newObj(cname) { return { $c: cname }; }
    run(m, k, locals) {
      const code = m.code.c, cp = k.cp, L = locals.slice(); const st = []; let pc = 0;
      const i16 = o => ((code[o] << 8 | code[o + 1]) << 16 >> 16), i32 = o => (code[o] << 24 | code[o + 1] << 16 | code[o + 2] << 8 | code[o + 3]), u16 = o => code[o] << 8 | code[o + 1];
      const pop2 = () => { st.pop(); return st.pop(); }, push2 = v => { st.push(v, TOP); };
      const self = this;
      for (;;) { if (++this.steps > 5e7) throw new Error('jvm: step limit');
        const op = code[pc];
        switch (op) {
          case 0: pc++; break;
          case 1: st.push(null); pc++; break;
          case 2: case 3: case 4: case 5: case 6: case 7: case 8: st.push(op - 3); pc++; break;
          case 9: case 10: push2(op - 9); pc++; break;
          case 11: case 12: case 13: st.push(op - 11); pc++; break;
          case 14: case 15: push2(op - 14); pc++; break;
          case 16: st.push((code[pc + 1] << 24) >> 24); pc += 2; break;
          case 17: st.push(i16(pc + 1)); pc += 3; break;
          case 18: case 19: { const i = op === 18 ? code[pc + 1] : u16(pc + 1), c = cp[i]; st.push(c.t === 8 ? cp[c.n].s : c.t === 7 ? { $class: cp[c.n].s } : c.v); pc += op === 18 ? 2 : 3; break; }
          case 20: push2(cp[u16(pc + 1)].v); pc += 3; break;
          case 21: case 23: case 25: st.push(L[code[pc + 1]]); pc += 2; break;
          case 22: case 24: push2(L[code[pc + 1]]); pc += 2; break;
          case 26: case 27: case 28: case 29: st.push(L[op - 26]); pc++; break;
          case 30: case 31: case 32: case 33: push2(L[op - 30]); pc++; break;
          case 34: case 35: case 36: case 37: st.push(L[op - 34]); pc++; break;
          case 38: case 39: case 40: case 41: push2(L[op - 38]); pc++; break;
          case 42: case 43: case 44: case 45: st.push(L[op - 42]); pc++; break;
          case 46: case 48: case 50: case 51: case 52: case 53: { const i = st.pop(), a = st.pop(); st.push(a[i]); pc++; break; }
          case 47: case 49: { const i = st.pop(), a = st.pop(); push2(a[i]); pc++; break; }
          case 54: case 56: case 58: L[code[pc + 1]] = st.pop(); pc += 2; break;
          case 55: case 57: L[code[pc + 1]] = pop2(); L[code[pc + 1] + 1] = TOP; pc += 2; break;
          case 59: case 60: case 61: case 62: L[op - 59] = st.pop(); pc++; break;
          case 63: case 64: case 65: case 66: L[op - 63] = pop2(); pc++; break;
          case 67: case 68: case 69: case 70: L[op - 67] = st.pop(); pc++; break;
          case 71: case 72: case 73: case 74: L[op - 71] = pop2(); pc++; break;
          case 75: case 76: case 77: case 78: L[op - 75] = st.pop(); pc++; break;
          case 79: case 81: case 83: case 84: case 85: case 86: { const v = st.pop(), i = st.pop(), a = st.pop(); a[i] = op === 81 ? f32(v) : op === 84 ? (v << 24) >> 24 : v; pc++; break; }
          case 80: case 82: { const v = pop2(), i = st.pop(), a = st.pop(); a[i] = v; pc++; break; }
          case 87: st.pop(); pc++; break;
          case 88: st.pop(); st.pop(); pc++; break;
          case 89: st.push(st[st.length - 1]); pc++; break;
          case 90: { const a = st.pop(), b = st.pop(); st.push(a, b, a); pc++; break; }
          case 91: { const a = st.pop(), b = st.pop(), c = st.pop(); st.push(a, c, b, a); pc++; break; }
          case 92: { const a = st[st.length - 2], b = st[st.length - 1]; st.push(a, b); pc++; break; }
          case 93: { const a = st.pop(), b = st.pop(), c = st.pop(); st.push(b, a, c, b, a); pc++; break; }
          case 94: { const a = st.pop(), b = st.pop(), c = st.pop(), e = st.pop(); st.push(b, a, e, c, b, a); pc++; break; }
          case 95: { const a = st.pop(), b = st.pop(); st.push(a, b); pc++; break; }
          case 96: { const b = st.pop(), a = st.pop(); st.push((a + b) | 0); pc++; break; }
          case 97: case 99: { const b = pop2(), a = pop2(); push2(a + b); pc++; break; }
          case 98: { const b = st.pop(), a = st.pop(); st.push(f32(a + b)); pc++; break; }
          case 100: { const b = st.pop(), a = st.pop(); st.push((a - b) | 0); pc++; break; }
          case 101: case 103: { const b = pop2(), a = pop2(); push2(a - b); pc++; break; }
          case 102: { const b = st.pop(), a = st.pop(); st.push(f32(a - b)); pc++; break; }
          case 104: { const b = st.pop(), a = st.pop(); st.push(Math.imul(a, b)); pc++; break; }
          case 105: case 107: { const b = pop2(), a = pop2(); push2(a * b); pc++; break; }
          case 106: { const b = st.pop(), a = st.pop(); st.push(f32(a * b)); pc++; break; }
          case 108: { const b = st.pop(), a = st.pop(); st.push(b ? (a / b) | 0 : 0); pc++; break; }
          case 109: { const b = pop2(), a = pop2(); push2(b ? Math.trunc(a / b) : 0); pc++; break; }
          case 110: { const b = st.pop(), a = st.pop(); st.push(f32(a / b)); pc++; break; }
          case 111: { const b = pop2(), a = pop2(); push2(a / b); pc++; break; }
          case 112: { const b = st.pop(), a = st.pop(); st.push(b ? (a % b) | 0 : 0); pc++; break; }
          case 113: case 115: { const b = pop2(), a = pop2(); push2(a % b); pc++; break; }
          case 114: { const b = st.pop(), a = st.pop(); st.push(f32(a % b)); pc++; break; }
          case 116: st.push((-st.pop()) | 0); pc++; break;
          case 117: case 119: push2(-pop2()); pc++; break;
          case 118: st.push(-st.pop()); pc++; break;
          case 120: { const b = st.pop(), a = st.pop(); st.push(a << b); pc++; break; }
          case 122: { const b = st.pop(), a = st.pop(); st.push(a >> b); pc++; break; }
          case 124: { const b = st.pop(), a = st.pop(); st.push(a >>> b | 0); pc++; break; }
          case 121: case 123: case 125: { const b = st.pop(), a = pop2(); push2(op === 121 ? a * Math.pow(2, b) : Math.floor(a / Math.pow(2, b))); pc++; break; }
          case 126: { const b = st.pop(), a = st.pop(); st.push(a & b); pc++; break; }
          case 128: { const b = st.pop(), a = st.pop(); st.push(a | b); pc++; break; }
          case 130: { const b = st.pop(), a = st.pop(); st.push(a ^ b); pc++; break; }
          case 127: case 129: case 131: { const b = pop2(), a = pop2(); push2(Number(op === 127 ? BigInt(a) & BigInt(b) : op === 129 ? BigInt(a) | BigInt(b) : BigInt(a) ^ BigInt(b))); pc++; break; }
          case 132: L[code[pc + 1]] = (L[code[pc + 1]] + ((code[pc + 2] << 24) >> 24)) | 0; pc += 3; break;
          case 133: case 135: push2(st.pop()); pc++; break;   // i2l, i2d
          case 134: st.push(f32(st.pop())); pc++; break;   // i2f
          case 136: st.push(pop2() | 0); pc++; break;   // l2i
          case 137: st.push(f32(pop2())); pc++; break;   // l2f
          case 138: push2(pop2()); pc++; break;   // l2d
          case 139: { const v = st.pop(); st.push(isNaN(v) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(v)))); pc++; break; }   // f2i
          case 140: case 141: { const v = st.pop(); push2(op === 140 ? (isNaN(v) ? 0 : Math.trunc(v)) : v); pc++; break; }   // f2l, f2d
          case 142: { const v = pop2(); st.push(isNaN(v) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(v)))); pc++; break; }   // d2i
          case 143: { const v = pop2(); push2(isNaN(v) ? 0 : Math.trunc(v)); pc++; break; }   // d2l
          case 144: st.push(f32(pop2())); pc++; break;   // d2f
          case 145: st.push((st.pop() << 24) >> 24); pc++; break;
          case 146: st.push(st.pop() & 0xffff); pc++; break;
          case 147: st.push((st.pop() << 16) >> 16); pc++; break;
          case 148: { const b = pop2(), a = pop2(); st.push(a > b ? 1 : a < b ? -1 : 0); pc++; break; }
          case 149: case 150: { const b = st.pop(), a = st.pop(); st.push(isNaN(a) || isNaN(b) ? (op === 149 ? -1 : 1) : a > b ? 1 : a < b ? -1 : 0); pc++; break; }
          case 151: case 152: { const b = pop2(), a = pop2(); st.push(isNaN(a) || isNaN(b) ? (op === 151 ? -1 : 1) : a > b ? 1 : a < b ? -1 : 0); pc++; break; }
          case 153: case 154: case 155: case 156: case 157: case 158: { const v = st.pop(), t = op === 153 ? v === 0 : op === 154 ? v !== 0 : op === 155 ? v < 0 : op === 156 ? v >= 0 : op === 157 ? v > 0 : v <= 0; pc = t ? pc + i16(pc + 1) : pc + 3; break; }
          case 159: case 160: case 161: case 162: case 163: case 164: { const b = st.pop(), a = st.pop(), t = op === 159 ? a === b : op === 160 ? a !== b : op === 161 ? a < b : op === 162 ? a >= b : op === 163 ? a > b : a <= b; pc = t ? pc + i16(pc + 1) : pc + 3; break; }
          case 165: case 166: { const b = st.pop(), a = st.pop(); pc = (op === 165 ? a === b : a !== b) ? pc + i16(pc + 1) : pc + 3; break; }
          case 167: pc += i16(pc + 1); break;
          case 170: { const b = pc, v = st.pop(); let o = (pc + 4) & ~3; const df = i32(o), lo = i32(o + 4), hi = i32(o + 8); pc = v >= lo && v <= hi ? b + i32(o + 12 + (v - lo) * 4) : b + df; break; }
          case 171: { const b = pc, v = st.pop(); let o = (pc + 4) & ~3; const df = i32(o), n = i32(o + 4); let t = b + df; for (let i = 0; i < n; i++) if (i32(o + 8 + i * 8) === v) { t = b + i32(o + 12 + i * 8); break; } pc = t; break; }
          case 172: case 174: case 176: return st.pop();
          case 173: case 175: return pop2();
          case 177: return undefined;
          case 178: case 179: { const r = k.ref(u16(pc + 1)), ds = desc('()' + r.desc); let c = this.cls(r.cls), owner = c;   // get/putstatic (searches superclasses)
            for (let g = 0; owner && !(r.name in owner.statics) && owner.sup && g < 20; g++) { const s = this.cls(owner.sup); if (!s) break; if (r.name in s.statics) { owner = s; break; } owner = s; }
            if (!owner || !(r.name in owner.statics)) owner = c;
            if (op === 178) { let v; if (owner) v = owner.statics[r.name]; if (v === undefined) { const n = this.natives['static:' + r.cls + '.' + r.name]; v = n !== undefined ? n : owner ? (ds.ret === 1 && /^[IFBSCZ]$/.test(r.desc) ? 0 : ds.ret === 2 ? 0 : null) : this.stubStatic(r.cls, r.name); }
              if (ds.ret === 2) push2(v); else st.push(v); }
            else { const v = ds.ret === 2 ? pop2() : st.pop(); if (c) c.statics[r.name] = v; else this.natives['static:' + r.cls + '.' + r.name] = v; }
            pc += 3; break; }
          case 180: { const r = k.ref(u16(pc + 1)), o = st.pop(); let v = o == null ? undefined : o[r.name]; if (typeof v === 'function') v = v.call(o); if (v === undefined) v = /^[IFBSCZJD]$/.test(r.desc) ? 0 : null; if (r.desc === 'J' || r.desc === 'D') push2(v); else st.push(v); pc += 3; break; }
          case 181: { const r = k.ref(u16(pc + 1)), v = (r.desc === 'J' || r.desc === 'D') ? pop2() : st.pop(), o = st.pop(); if (o) o[r.name] = r.desc === 'F' ? f32(v) : v; pc += 3; break; }
          case 182: case 183: case 184: case 185: {
            const r = k.ref(u16(pc + 1)), D = desc(r.desc), n = D.a.length, args = new Array(n);
            for (let i = n - 1; i >= 0; i--) args[i] = D.a[i] === 2 ? pop2() : st.pop();
            const obj = op === 184 ? null : st.pop(); let ret;
            if (op === 184) { const nf = this.native(r.cls, r.name, r.desc); if (nf) ret = nf(this, null, args); else { const c = this.cls(r.cls), mm = c && this.findStatic(c, r.name + r.desc); if (mm) ret = this.run(mm.m, mm.k, this.slots(r.desc, args)); else { this.warn('no static ' + r.cls + '.' + r.name + r.desc); ret = D.ret ? (D.rf ? 0 : 0) : undefined; } } }
            else if (op === 183) { if (r.name === '<init>') { const nf = this.native(r.cls, r.name, r.desc); if (nf) ret = nf(this, obj, args); else { const c = this.cls(r.cls), mm = c && c.methods[r.name + r.desc]; if (mm && mm.code) ret = this.run(mm, c, [obj, ...this.slots(r.desc, args)]); } }
              else { const f = this.virtFrom(r.cls, r.name, r.desc); if (f && f.n) ret = f.n(this, obj, args); else if (f) ret = this.run(f.m, f.k, [obj, ...this.slots(r.desc, args)]); else this.warn('no special ' + r.cls + '.' + r.name + r.desc); } }
            else ret = this.invokeVirtual(obj, r, args);
            pc += op === 185 ? 5 : 3;
            if (D.ret === 2) push2(ret == null ? 0 : ret); else if (D.ret === 1) st.push(ret === undefined ? (r.desc.endsWith(')Z') || /\)[IFBSC]$/.test(r.desc) ? 0 : null) : ret === true ? 1 : ret === false ? 0 : ret);
            break; }
          case 186: { this.warn('invokedynamic'); const r = cp[u16(pc + 1)], nt = cp[r.nt], D = desc(k.S(nt.d)); for (let i = D.a.length - 1; i >= 0; i--) { if (D.a[i] === 2) pop2(); else st.pop(); } st.push(null); pc += 5; break; }
          case 187: { const cn = k.cn(u16(pc + 1)), nf = this.natives['new:' + cn]; st.push(nf ? nf(this) : this.cls(cn) ? this.newObj(cn) : this.stubObj(cn)); pc += 3; break; }
          case 188: { const n = st.pop(), t = code[pc + 1]; st.push(t === 6 ? new Float32Array(n) : t === 7 ? new Float64Array(n) : t === 10 ? new Int32Array(n) : t === 8 ? new Int8Array(n) : t === 9 ? new Int16Array(n) : t === 5 ? new Uint16Array(n) : t === 4 ? new Uint8Array(n) : new Array(n).fill(0)); pc += 2; break; }
          case 189: { const n = st.pop(); st.push(new Array(n).fill(null)); pc += 3; break; }
          case 190: st.push(st.pop().length); pc++; break;
          case 191: throw new Error('jvm: athrow in ' + k.name + '.' + m.name);
          case 192: pc += 3; break;   // checkcast: trusted
          case 193: { const cn = k.cn(u16(pc + 1)), o = st.pop(); st.push(this.isA(o, cn) ? 1 : 0); pc += 3; break; }
          case 194: case 195: st.pop(); pc++; break;
          case 196: { const w = code[pc + 1], ix = u16(pc + 2); if (w === 132) { L[ix] = (L[ix] + i16(pc + 4)) | 0; pc += 6; } else { if (w >= 21 && w <= 25) { if (w === 22 || w === 24) push2(L[ix]); else st.push(L[ix]); } else if (w === 55 || w === 57) { L[ix] = pop2(); } else L[ix] = st.pop(); pc += 4; } break; }
          case 197: { const dims = code[pc + 3], ns = []; for (let i = 0; i < dims; i++) ns.unshift(st.pop()); const mk = d0 => d0 === ns.length - 1 ? new Array(ns[d0]).fill(0) : Array.from({ length: ns[d0] }, () => mk(d0 + 1)); st.push(mk(0)); pc += 4; break; }
          case 198: case 199: { const v = st.pop(); pc = (op === 198 ? v == null : v != null) ? pc + i16(pc + 1) : pc + 3; break; }
          case 200: pc += i32(pc + 1); break;
          default: throw new Error('jvm: opcode ' + op + ' in ' + k.name + '.' + m.name);
        } }
    }
    findStatic(c, nd) { for (let k = c, g = 0; k && g < 20; g++) { const m = k.methods[nd]; if (m && m.code) return { m, k }; k = k.sup ? this.cls(k.sup) : null; } return null; }
    virtFrom(start, name, ds) { if (!start) return null; for (const c of this.chain(start)) { const n = this.native(c, name, ds); if (n) return { n }; const k = this.cls(c); const m = k && k.methods[name + ds]; if (m && m.code) return { m, k }; } return null; }
    invokeVirtual(obj, r, args) {
      if (obj == null) { this.warn('null receiver ' + r.cls + '.' + r.name); return undefined; }
      if (typeof obj === 'string') { const f = this.natives['String.' + r.name]; return f ? f(this, obj, args) : (this.warn('String.' + r.name), undefined); }
      if (obj.$c && this.cls(obj.$c)) { const f = this.virt(obj, r.name, r.desc); if (f) return f.n ? f.n(this, obj, args) : this.run(f.m, f.k, [obj, ...this.slots(r.desc, args)]); }
      const fn = obj[r.name + r.desc] || obj[r.name];   // native objects (entity, renderer, collections, vectors) carry their methods by name
      if (typeof fn === 'function') return fn.apply(obj, args);
      const nf = this.native(r.cls, r.name, r.desc); if (nf) return nf(this, obj, args);
      this.warn('no method ' + r.cls + '.' + r.name + r.desc); return undefined;
    }
    stubStatic(cls, name) { const k = cls + '.' + name; return this.stub[k] || (this.stub[k] = { $enum: name, $owner: cls, name, id: 0, toString() { return name; } }); }
    stubObj(cn) { return { $stub: cn }; }
    // construct an instance of a jar class: new + <init>desc
    make(cn, ds, args) { const o = this.newObj(cn); const c = this.cls(cn); const m = c && c.methods['<init>' + (ds || '()V')]; if (m && m.code) this.run(m, c, [o, ...this.slots(ds || '()V', args || [])]); return o; }
  }

  // ---- natives: the Java and Minecraft library calls mod client code makes ----
  function jlist(a) { const L = a || []; return { $list: L, add(v) { L.push(v); return 1; }, get(i) { return L[i]; }, size() { return L.length; }, isEmpty() { return L.length ? 0 : 1; }, clear() { L.length = 0; }, contains(v) { return L.includes(v) ? 1 : 0; }, iterator() { return jiter(L); }, toArray() { return L.slice(); }, remove(x) { const i = typeof x === 'number' ? x : L.indexOf(x); if (i >= 0) L.splice(i, 1); return 1; }, $is: n => /List|Collection|Iterable|Object/.test(n) }; }
  function jiter(L) { let i = 0; return { hasNext() { return i < L.length ? 1 : 0; }, next() { return L[i++]; }, $is: n => /Iterator|Object/.test(n) }; }
  function jmap() { const M = new Map(); const keyOf = k => typeof k === 'object' && k ? k : k; return { $map: M, put(k, v) { const o = M.get(keyOf(k)); M.set(keyOf(k), v); return o === undefined ? null : o; }, get(k) { const v = M.get(keyOf(k)); return v === undefined ? null : v; },
    containsKey(k) { return M.has(keyOf(k)) ? 1 : 0; }, remove(k) { const v = M.get(k); M.delete(k); return v === undefined ? null : v; }, size() { return M.size; }, isEmpty() { return M.size ? 0 : 1; }, clear() { M.clear(); },
    values() { return jlist([...M.values()]); }, keySet() { return jlist([...M.keys()]); }, entrySet() { return jlist([...M.entries()].map(([k, v]) => ({ getKey: () => k, getValue: () => v, $is: n => /Entry|Object/.test(n) }))); },
    computeIfAbsent(k, f) { if (!M.has(k)) M.set(k, f && f.apply ? f.apply(k) : null); return M.get(k); }, $is: n => /Map|Object/.test(n) }; }
  const vec = (n, o) => Object.assign(o, { $is: c => c.endsWith('Vector' + n + 'f') || c === 'java/lang/Object', getX() { return this.x; }, getY() { return this.y; }, getZ() { return this.z; }, getW() { return this.w; } });
  function installNatives(vm) {
    const N = vm.natives, F = f32, deg = v => v * 180 / Math.PI, rad = v => v * Math.PI / 180;
    N['java/lang/Object.<init>'] = () => {}; N['java/lang/Enum.<init>'] = (v, o, a) => { o.name = a[0]; o.ordinal = a[1]; }; N['java/lang/Enum.ordinal'] = (v, o) => o.ordinal; N['java/lang/Enum.name'] = (v, o) => o.name;
    N['java/lang/Object.getClass'] = (v, o) => ({ getSimpleName: () => String(o.$c || '').split(/[/$]/).pop(), getName: () => String(o.$c || '').replace(/\//g, '.') });
    N['java/lang/Object.equals'] = (v, o, a) => o === a[0] ? 1 : 0; N['java/lang/Object.hashCode'] = () => 0;
    const M = { toDegrees: a => deg(a[0]), toRadians: a => rad(a[0]), sin: a => Math.sin(a[0]), cos: a => Math.cos(a[0]), tan: a => Math.tan(a[0]), sqrt: a => Math.sqrt(a[0]), atan: a => Math.atan(a[0]), atan2: a => Math.atan2(a[0], a[1]), pow: a => Math.pow(a[0], a[1]),
      floor: a => Math.floor(a[0]), ceil: a => Math.ceil(a[0]), random: () => Math.random(), exp: a => Math.exp(a[0]), log: a => Math.log(a[0]), signum: a => Math.sign(a[0]) };
    for (const k in M) N['java/lang/Math.' + k] = (v, o, a) => M[k](a);
    N['java/lang/Math.abs(F)F'] = (v, o, a) => Math.abs(a[0]); N['java/lang/Math.abs(D)D'] = (v, o, a) => Math.abs(a[0]); N['java/lang/Math.abs(I)I'] = (v, o, a) => Math.abs(a[0]) | 0;
    N['java/lang/Math.min(FF)F'] = (v, o, a) => Math.min(a[0], a[1]); N['java/lang/Math.max(FF)F'] = (v, o, a) => Math.max(a[0], a[1]); N['java/lang/Math.min(II)I'] = N['java/lang/Math.min(FF)F']; N['java/lang/Math.max(II)I'] = N['java/lang/Math.max(FF)F'];
    N['java/lang/Math.min(DD)D'] = N['java/lang/Math.min(FF)F']; N['java/lang/Math.max(DD)D'] = N['java/lang/Math.max(FF)F']; N['java/lang/Math.round(F)I'] = (v, o, a) => Math.floor(a[0] + .5); N['java/lang/Math.round(D)J'] = N['java/lang/Math.round(F)I'];
    const MH = 'net/minecraft/util/math/MathHelper.';
    N[MH + 'func_76126_a'] = (v, o, a) => mcSin(a[0]); N[MH + 'func_76134_b'] = (v, o, a) => mcCos(a[0]); N[MH + 'func_76129_c'] = (v, o, a) => F(Math.sqrt(a[0])); N[MH + 'func_76133_a'] = (v, o, a) => F(Math.sqrt(a[0]));
    N[MH + 'func_76135_e'] = (v, o, a) => Math.abs(a[0]); N[MH + 'func_76131_a'] = (v, o, a) => a[0] < a[1] ? a[1] : a[0] > a[2] ? a[2] : a[0]; N[MH + 'func_76125_a'] = N[MH + 'func_76131_a']; N[MH + 'func_151237_a'] = N[MH + 'func_76131_a'];
    N[MH + 'func_76141_d'] = (v, o, a) => Math.floor(a[0]); N[MH + 'func_76128_c'] = (v, o, a) => Math.floor(a[0]); N[MH + 'func_76142_g'] = (v, o, a) => { let x = a[0] % 360; if (x >= 180) x -= 360; if (x < -180) x += 360; return F(x); };
    N[MH + 'func_76138_g'] = N[MH + 'func_76142_g']; N[MH + 'func_181159_b'] = (v, o, a) => Math.atan2(a[0], a[1]);
    N['java/lang/Float.valueOf'] = (v, o, a) => a[0]; N['java/lang/Float.floatValue'] = (v, o) => o; N['java/lang/Boolean.valueOf'] = (v, o, a) => a[0]; N['java/lang/Boolean.booleanValue'] = (v, o) => o; N['java/lang/Integer.valueOf'] = (v, o, a) => a[0]; N['java/lang/Integer.intValue'] = (v, o) => o;
    N['java/lang/Double.valueOf'] = (v, o, a) => a[0]; N['java/lang/Double.doubleValue'] = (v, o) => o; N['java/lang/Float.parseFloat'] = (v, o, a) => F(parseFloat(a[0])); N['java/lang/Integer.parseInt'] = (v, o, a) => parseInt(a[0], 10) | 0;
    N['java/lang/String.valueOf'] = (v, o, a) => String(a[0]); N['java/lang/Float.isNaN'] = (v, o, a) => isNaN(a[0]) ? 1 : 0;
    const S = { equals: (s, a) => s === a[0] ? 1 : 0, equalsIgnoreCase: (s, a) => typeof a[0] === 'string' && s.toLowerCase() === a[0].toLowerCase() ? 1 : 0, contains: (s, a) => s.includes(String(a[0])) ? 1 : 0, startsWith: (s, a) => s.startsWith(a[0]) ? 1 : 0, endsWith: (s, a) => s.endsWith(a[0]) ? 1 : 0,
      toLowerCase: s => s.toLowerCase(), toUpperCase: s => s.toUpperCase(), length: s => s.length, isEmpty: s => s.length ? 0 : 1, charAt: (s, a) => s.charCodeAt(a[0]), substring: (s, a) => s.substring(a[0], a[1] === undefined ? s.length : a[1]), indexOf: (s, a) => s.indexOf(typeof a[0] === 'number' ? String.fromCharCode(a[0]) : a[0]),
      replace: (s, a) => s.split(typeof a[0] === 'number' ? String.fromCharCode(a[0]) : a[0]).join(typeof a[1] === 'number' ? String.fromCharCode(a[1]) : a[1]), trim: s => s.trim(), hashCode: s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }, toString: s => s, split: (s, a) => s.split(new RegExp(a[0])), matches: (s, a) => new RegExp('^(?:' + a[0] + ')$').test(s) ? 1 : 0 };
    for (const k in S) N['String.' + k] = (v, o, a) => S[k](o, a);
    N['new:java/lang/StringBuilder'] = () => ({ s: '', append(x) { this.s += typeof x === 'number' && !Number.isInteger(x) ? String(x) : x == null ? 'null' : String(x); return this; }, toString() { return this.s; }, length() { return this.s.length; }, $is: n => /StringBuilder|Object/.test(n) });
    N['java/lang/StringBuilder.<init>'] = (v, o, a) => { if (typeof a[0] === 'string') o.s = a[0]; };
    for (const c of ['java/util/HashMap', 'java/util/WeakHashMap', 'java/util/LinkedHashMap', 'java/util/TreeMap']) { N['new:' + c] = () => jmap(); N[c + '.<init>'] = () => {}; }
    for (const c of ['java/util/ArrayList', 'java/util/LinkedList']) { N['new:' + c] = () => jlist(); N[c + '.<init>'] = () => {}; }
    for (const n of [2, 3, 4]) for (const p of ['javax/vecmath/Vector', 'org/lwjgl/util/vector/Vector', 'org/lwjgl/util/vector/Vector']) { const c = p + n + 'f'; N['new:' + c] = () => vec(n, {}); N[c + '.<init>'] = (v, o, a) => { o.x = a[0] || 0; o.y = a[1] || 0; if (n > 2) o.z = a[2] || 0; if (n > 3) o.w = a[3] === undefined ? 1 : a[3]; }; }
    N['java/util/Arrays.asList'] = (v, o, a) => jlist([...(a[0] || [])]);
    N['net/minecraft/util/ResourceLocation.<init>'] = (v, o, a) => { o.ns = a.length > 1 ? a[0] : String(a[0]).split(':')[0]; o.path = a.length > 1 ? a[1] : String(a[0]).split(':').slice(1).join(':'); o.toString = () => o.ns + ':' + o.path; };
    N['new:net/minecraft/util/ResourceLocation'] = () => ({ $c: null, $is: n => /ResourceLocation|Object/.test(n) });
    // OpenGL state that model code sets (blending, lighting, lightmap): recorded for the current draw
    const GL = vm.gl = { blend: 0, src: 'SRC_ALPHA', dst: 'ONE_MINUS_SRC_ALPHA', lit: 1, lm: null, color: null, alpha: 1 };
    const GS = 'net/minecraft/client/renderer/GlStateManager.';
    N[GS + 'func_179147_l'] = () => { GL.blend = 1; }; N[GS + 'func_179084_k'] = () => { GL.blend = 0; };
    N[GS + 'func_187401_a'] = (v, o, a) => { GL.src = a[0] && a[0].$enum; GL.dst = a[1] && a[1].$enum; }; N[GS + 'func_179112_b'] = (v, o, a) => { GL.src = a[0] === 770 ? 'SRC_ALPHA' : a[0] === 774 ? 'DST_COLOR' : 'ONE'; GL.dst = a[1] === 1 ? 'ONE' : 'ONE_MINUS_SRC_ALPHA'; };
    N[GS + 'func_179140_f'] = () => { GL.lit = 0; }; N[GS + 'func_179145_e'] = () => { GL.lit = 1; };
    N[GS + 'func_179131_c'] = (v, o, a) => { GL.color = [a[0], a[1], a[2], a[3]]; }; N[GS + 'func_179124_c'] = (v, o, a) => { GL.color = [a[0], a[1], a[2], 1]; };
    for (const n of ['func_179094_E', 'func_179121_F', 'func_179141_d', 'func_179118_c', 'func_179092_a', 'func_179129_p', 'func_179089_o', 'func_179132_a', 'func_179097_i', 'func_179126_j', 'func_179143_c', 'func_179103_j', 'func_179091_B', 'func_179101_C', 'func_179106_n', 'func_179127_m', 'func_179090_x', 'func_179098_w']) N[GS + n] = () => {};
    N['net/minecraft/client/renderer/OpenGlHelper.func_77475_a'] = (v, o, a) => { GL.lm = [a[1], a[2]]; };
    for (const n of ['glRotatef', 'glTranslatef', 'glScalef', 'glPushMatrix', 'glPopMatrix', 'glEnable', 'glDisable', 'glBlendFunc', 'glColor4f', 'glDepthMask', 'glAlphaFunc', 'glShadeModel', 'glNormal3f', 'glCullFace']) N['org/lwjgl/opengl/GL11.' + n] = () => {};
    N['org/lwjgl/opengl/GL11.glBlendFunc'] = (v, o, a) => { GL.src = a[0] === 770 ? 'SRC_ALPHA' : a[0] === 774 ? 'DST_COLOR' : 'ONE'; GL.dst = a[1] === 1 ? 'ONE' : 'ONE_MINUS_SRC_ALPHA'; };
    N['org/lwjgl/opengl/GL11.glColor4f'] = (v, o, a) => { GL.color = [a[0], a[1], a[2], a[3]]; };
    N['org/lwjgl/opengl/GL11.glDisable'] = (v, o, a) => { if (a[0] === 2896) GL.lit = 0; if (a[0] === 3042) GL.blend = 0; }; N['org/lwjgl/opengl/GL11.glEnable'] = (v, o, a) => { if (a[0] === 2896) GL.lit = 1; if (a[0] === 3042) GL.blend = 1; };
    N['static:net/minecraft/client/renderer/OpenGlHelper.field_77476_b'] = 33985;
  }

  window.StrataJVM = { VM, parseClass, installNatives, jlist, jmap, vec, mcSin, mcCos, TOP };
})();
