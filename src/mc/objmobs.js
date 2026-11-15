/* OBJ creature models for compat mode (the Lycanites Mobs port): Strata's own JavaScript port of the mod's model runtime.
   ModelCustom / ModelCreatureObj / ModelObjOld and the creature layers are ported here from the mod's client classes; every creature's model
   (part centres, animatePart, render hooks) is ported in lycmodels.js. pose() mirrors ModelCreatureObj.render / ModelObjOld.render: per part,
   Minecraft's model transform (180 degrees about X, down 1.5, scale), the part's pivot and the animation frames animatePart() added this frame,
   its colour and texture scroll, and the GL state its layers set (glow, blending). Nothing here runs Java. */
(function () {
  'use strict';
  // ---- Minecraft's maths: MathHelper.sin / cos read a 65536-entry table ----
  const SIN = new Float32Array(65536); for (let i = 0; i < 65536; i++) SIN[i] = Math.sin(i * Math.PI * 2 / 65536);
  const mcSin = x => SIN[Math.trunc(Math.fround(x * 10430.378)) & 65535], mcCos = x => SIN[Math.trunc(Math.fround(x * 10430.378 + 16384)) & 65535];
  const toDeg = r => r * 180 / Math.PI, toRad = d => d * Math.PI / 180, clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrapDeg = v => { let x = v % 360; if (x >= 180) x -= 360; if (x < -180) x += 360; return x; };
  const V2 = (x, y) => ({ x, y, getX() { return this.x; }, getY() { return this.y; } }), V4 = (x, y, z, w) => ({ x, y, z, w });
  const BLEND = { NORMAL: 0, ADD: 1, SUB: 2 };
  // ---- the GL state model code sets while a part draws (blending, lighting, lightmap) ----
  const GL = { s: null, reset() { this.s = { blend: 0, src: 'SRC_ALPHA', dst: 'ONE_MINUS_SRC_ALPHA', lit: 1, lm: null, color: null }; return this.s; },
    disableLighting() { this.s.lit = 0; }, enableLighting() { this.s.lit = 1; }, enableBlend() { this.s.blend = 1; }, disableBlend() { this.s.blend = 0; },
    blendFunc(a, b) { this.s.src = a; this.s.dst = b; }, color(r, g, b, a) { this.s.color = [r, g, b, a === undefined ? 1 : a]; }, lightmap(j, k) { this.s.lm = [j, k]; }, noop() {} };
  GL.reset();
  // ---- column-major 4x4 matrices, applied like OpenGL's (M = M * op) ----
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(A, B) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += A[k * 4 + r] * B[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function rot(M, deg, x, y, z) { const l = Math.hypot(x, y, z); if (!l || !deg) return M; x /= l; y /= l; z /= l; const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    M.set(mul(M, new Float32Array([t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1]))); return M; }
  function tr(M, x, y, z) { for (let r = 0; r < 4; r++) M[12 + r] += M[r] * x + M[4 + r] * y + M[8 + r] * z; return M; }
  function sc(M, x, y, z) { for (let r = 0; r < 4; r++) { M[r] *= x; M[4 + r] *= y; M[8 + r] *= z; } return M; }
  let CUR = ident();   // the matrix GL calls in model code move (ModelObjOld, the Animator)
  const animator = { doAngle(r, x, y, z) { rot(CUR, r, x, y, z); }, doRotate(x, y, z) { rot(CUR, x, 1, 0, 0); rot(CUR, y, 0, 1, 0); rot(CUR, z, 0, 0, 1); }, doTranslate(x, y, z) { tr(CUR, x, y, z); }, doScale(x, y, z) { sc(CUR, x, y, z); } };
  // a small java.util.Map stand-in (model code uses put / get / containsKey)
  class JMap { constructor() { this.m = new Map(); } put(k, v) { this.m.set(k, v); return v; } get(k) { return this.m.has(k) ? this.m.get(k) : null; } containsKey(k) { return this.m.has(k); } values() { return [...this.m.values()]; } keySet() { return [...this.m.keys()]; } size() { return this.m.size; } }
  const L = window.StrataLyc = { models: {}, loadParts: null, mcSin, mcCos, toDeg, toRad, clamp, wrapDeg, V2, V4, BLEND, GL, JMap, ident, mul, rot, tr, sc };
  // instanceof for the mod's classes: entities answer by name ($is), JS classes by the registry
  const isA = L.isA = (o, name) => { if (o == null) return false; if (o.$is) return o.$is(name); const C = L.models[name] || L[name]; return typeof C === 'function' ? o instanceof C : false; };

  // ---- layers (com.lycanitesmobs.client.renderer.layer) ----
  class LayerCreatureBase { constructor(renderer) { this.renderer = renderer; this.name = 'Layer'; }
    canRenderLayer(entity, scale) { return entity == null ? false : !entity.isInvisible() || !entity.isInvisibleToPlayer(null); }
    getLayerTexture(entity) { return null; }
    canRenderPart(partName, entity, trophy) { return true; }
    getPartColor(partName, entity, trophy) { return V4(1, 1, 1, 1); }
    getTextureOffset(partName, entity, trophy, loop) { return V2(0, 0); }
    onRenderStart(entity, trophy) {} onRenderFinish(entity, trophy) {} }
  class LayerCreatureEffect extends LayerCreatureBase {
    constructor(renderer, a, b, c, d, e) { super(renderer); this.subspecies = true; this.glow = false; this.blending = 0; this.scrollSpeed = null;
      if (arguments.length === 2) { this.name = a; this.textureSuffix = a; }   // (renderer, textureSuffix)
      else if (arguments.length === 5) { this.name = a; this.textureSuffix = a; this.glow = b; this.blending = c; this.subspecies = d; }   // (renderer, suffix, glow, blending, subspecies)
      else { this.name = a; this.textureSuffix = b; this.glow = c; this.blending = d; this.subspecies = e; } }   // (renderer, name, suffix, glow, blending, subspecies)
    getPartColor() { return V4(1, 1, 1, 1); }
    getLayerTexture(entity) { return this.subspecies ? entity.getTexture(this.textureSuffix) : entity.getSubTexture(this.textureSuffix); }
    onRenderStart(entity, trophy) { if (this.glow) { GL.disableLighting(); GL.lightmap(240, 240); } if (this.blending === BLEND.ADD) GL.blendFunc('SRC_ALPHA', 'ONE'); else if (this.blending === BLEND.SUB) GL.blendFunc('DST_COLOR', 'ONE_MINUS_SRC_ALPHA'); }
    onRenderFinish(entity, trophy) { if (this.glow) GL.enableLighting(); }
    getTextureOffset(partName, entity, trophy, loop) { if (this.scrollSpeed == null) this.scrollSpeed = V2(0, 0); return V2(loop * this.scrollSpeed.x, loop * this.scrollSpeed.y); } }
  class LayerCreatureScrolling extends LayerCreatureEffect { constructor(renderer, suffix, glow, blending, subspecies, scrollSpeed) { super(renderer, suffix, glow, blending, subspecies); this.scrollSpeed = scrollSpeed; } }
  class LayerCreatureGlow extends LayerCreatureBase {
    getLayerTexture(entity) { let n = entity.getTextureName(); if (entity.getVariant() != null) n += '_' + entity.getVariant().color; return entity.texKey(n + '_glow'); }
    onRenderStart() { GL.lightmap(240, 240); } }
  class LayerCreatureFire extends LayerCreatureBase { canRenderLayer(entity, scale) { return !super.canRenderLayer(entity, scale) ? false : entity.isAttackOnCooldown(); } getLayerTexture(entity) { return entity.getSubTexture('fire'); } }
  class LayerCreatureDjinn extends LayerCreatureBase { canRenderPart(partName) { return partName.includes('ribbon'); }
    getLayerTexture(entity) { let n = entity.getTextureName(); if (entity.getVariant() != null) n += '_' + entity.getVariant().color; return entity.texKey(n + '_ribbon'); }
    getTextureOffset(partName, entity, trophy, loop) { return V2(-loop * 25, 0); } getPartColor() { return V4(1, 1, 1, .75); } }
  class LayerCreatureRoa extends LayerCreatureBase { canRenderLayer(entity) { return isA(entity, 'EntityRoa') ? entity.canWhirlpool() : false; } canRenderPart(partName) { return partName === 'effect'; } getPartColor() { return V4(1, 1, 1, .5); } getLayerTexture(entity) { return entity.getSubTexture('effect'); } }
  class LayerCreatureThresher extends LayerCreatureBase { canRenderLayer(entity) { return isA(entity, 'EntityThresher') ? entity.canWhirlpool() : false; } canRenderPart(partName) { return partName === 'effect'; } getPartColor() { return V4(1, 1, 1, .5); } getLayerTexture(entity) { return entity.getSubTexture('effect'); } }
  class LayerCreatureShield extends LayerCreatureBase { canRenderLayer(entity, scale) { return !super.canRenderLayer(entity, scale) ? false : entity.isBlocking(); } canRenderPart(partName) { return partName === 'shield'; }
    getLayerTexture(entity) { return entity.getTexture(''); } onRenderStart() { GL.lightmap(240, 240); GL.blendFunc('SRC_ALPHA', 'ONE'); } }
  const COLOR_TABLE = [[1, 1, 1], [.85, .5, .2], [.7, .3, .85], [.4, .6, .85], [.9, .9, .2], [.5, .8, .1], [.95, .5, .65], [.3, .3, .3], [.6, .6, .6], [.3, .5, .6], [.5, .25, .7], [.2, .3, .7], [.4, .3, .2], [.4, .5, .2], [.6, .2, .2], [.1, .1, .1]];   // RenderCreature.colorTable
  class LayerCreatureDye extends LayerCreatureBase {
    constructor(renderer, a, b, c) { super(renderer); if (arguments.length === 3) { this.name = a; this.textureSuffix = a; this.subspecies = b; } else { this.name = a; this.textureSuffix = b; this.subspecies = c; } }
    canRenderLayer(entity, scale) { return !super.canRenderLayer(entity, scale) ? false : (!isA(entity, 'EntityYale') ? true : entity.hasFur()); }
    canRenderPart(partName) { return this.name === partName; }
    getPartColor(partName, entity) { const c = COLOR_TABLE[entity.getColor() & 15]; return V4(c[0], c[1], c[2], 1); }
    getLayerTexture(entity) { return this.subspecies ? entity.getTexture(this.textureSuffix) : entity.getSubTexture(this.textureSuffix); } }
  class LayerCreatureEquipment extends LayerCreatureBase { constructor(renderer, slot) { super(renderer); this.equipmentSlot = slot; }
    canRenderLayer(entity, scale) { return super.canRenderLayer(entity, scale) && this.equipmentSlot != null ? entity.getEquipmentName(this.equipmentSlot) != null : false; }
    getLayerTexture(entity) { return entity.getEquipmentTexture(entity.getEquipmentName(this.equipmentSlot)); } }
  class LayerCreatureSaddle extends LayerCreatureBase { canRenderLayer(entity, scale) { return super.canRenderLayer(entity, scale) && isA(entity, 'RideableCreatureEntity') ? entity.hasSaddle() : false; } getLayerTexture(entity) { return entity.getEquipmentTexture('saddle'); } }
  Object.assign(L, { LayerCreatureBase, LayerCreatureEffect, LayerCreatureScrolling, LayerCreatureGlow, LayerCreatureFire, LayerCreatureDjinn, LayerCreatureRoa, LayerCreatureThresher, LayerCreatureShield, LayerCreatureDye, LayerCreatureEquipment, LayerCreatureSaddle });

  // ---- model base classes (com.lycanitesmobs.client.model) ----
  class ModelCustom {
    constructor() { this.initRotations = new JMap(); this.textureWidth = 128; this.textureHeight = 128; this.isChild = false; }
    addCustomLayers(renderer) { renderer.addLayer(new LayerCreatureEquipment(renderer, 'chest')); renderer.addLayer(new LayerCreatureSaddle(renderer)); }
    canRenderPart(partName, entity, layer, trophy) { return layer == null ? this.canBaseRenderPart(partName, entity, trophy) : (isA(entity, 'BaseCreatureEntity') ? layer.canRenderPart(partName, entity, trophy) : false); }
    canBaseRenderPart(partName, entity, trophy) { return true; }
    getPartColor(partName, entity, layer, trophy, loop) { return layer != null && isA(entity, 'BaseCreatureEntity') ? layer.getPartColor(partName, entity, trophy) : this.getBasePartColor(partName, entity, trophy, loop); }
    getBasePartColor(partName, entity, trophy, loop) { return V4(1, 1, 1, 1); }
    getPartTextureOffset(partName, entity, layer, trophy, loop) { return layer != null && isA(entity, 'BaseCreatureEntity') ? layer.getTextureOffset(partName, entity, trophy, loop) : this.getBaseTextureOffset(partName, entity, trophy, loop); }
    getBaseTextureOffset(partName, entity, trophy, loop) { return V2(0, 0); }
    onRenderStart(layer, entity, trophy) { GL.enableBlend(); GL.blendFunc('SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA'); if (layer != null) layer.onRenderStart(entity, trophy); }
    onRenderFinish(layer, entity, trophy) { GL.disableBlend(); if (layer != null) layer.onRenderFinish(entity, trophy); }
    rotateToPoint(...a) { if (a.length === 2) return this.rotateToPoint(0, 0, a[0], a[1]);
      if (a.length === 6) { const [xc, yc, zc, xt, yt, zt] = a; return [this.rotateToPoint(yc, -zc, yt, -zt), this.rotateToPoint(-zc, xc, -zt, xt), this.rotateToPoint(yc, xc, yt, xt)]; }
      const [ac, bc, at, bt] = a; if (at - ac === 0) { if (at > ac) return 0; if (at < ac) return 180; } if (bt - bc === 0) { if (bt > bc) return 90; if (bt < bc) return -90; }
      return at - ac === 0 && bt - bc === 0 ? 0 : toDeg(Math.atan2(ac - at, bc - bt) - Math.PI / 2); } }
  class ModelCreatureObj extends ModelCustom {
    constructor() { super(); this.animationParts = new JMap(); this.lookHeadScaleX = 1; this.lookHeadScaleY = 1; this.lookNeckScaleX = 0; this.lookNeckScaleY = 0; this.lookBodyScaleX = 0; this.lookBodyScaleY = 0;
      this.bigChildHead = false; this.bodyIsTrophy = true; this.trophyScale = 1; this.trophyOffset = []; this.trophyMouthOffset = []; this.dontColor = false; this.animator = animator; this.currentAnimationPart = null; }
    initModel(name, mod, path) { this.$name = name; this.$path = path; this.animationParts = L.loadParts ? L.loadParts(path) : new JMap(); return this; }
    animatePart(partName, entity, time, distance, loop, lookY, lookX, scale) { let rotX = 0, rotY = 0;
      if (partName === 'head') { rotX += toDeg(lookX / 57.295776) * this.lookHeadScaleX; rotY += toDeg(lookY / 57.295776) * this.lookHeadScaleY; }
      if (partName.includes('neck')) { rotX += toDeg(lookX / 57.295776) * this.lookNeckScaleX; rotY += toDeg(lookY / 57.295776) * this.lookNeckScaleY; }
      this.rotate(rotX, rotY, 0); }
    canRenderPart(partName, entity, layer, trophy) { if (partName == null) return false; partName = partName.toLowerCase(); return !this.animationParts.containsKey(partName) ? false : (trophy && !this.isTrophyPart(partName) ? false : super.canRenderPart(partName, entity, layer, trophy)); }
    isTrophyPart(p) { if (p == null) return false; p = p.toLowerCase(); return !p.includes('head') && !p.includes('mouth') && !p.includes('eye') ? this.bodyIsTrophy && p.includes('body') : true; }
    childScale(partName) { if (!this.bigChildHead || !partName.includes('head') && !partName.includes('mouth')) this.animator.doScale(.5, .5, .5); }
    getAttackProgress() { return this.$ent ? this.$ent.$s.progress || 0 : 0; }
    angle(r, x, y, z) { this.currentAnimationPart.$f.push(['angle', r, x, y, z]); }
    rotate(x, y, z) { this.currentAnimationPart.$f.push(['rotate', 1, x, y, z]); }
    translate(x, y, z) { this.currentAnimationPart.$f.push(['translate', 1, x, y, z]); }
    scale(x, y, z) { this.currentAnimationPart.$f.push(['scale', 1, x, y, z]); }
    shiftOrigin(from, to) { const a = this.animationParts.get(from), b = this.animationParts.get(to); this.translate(b.centerX - a.centerX, b.centerY - a.centerY, b.centerZ - a.centerZ); }
    shiftOriginBack(from, to) { const a = this.animationParts.get(from), b = this.animationParts.get(to); this.translate(-(b.centerX - a.centerX), -(b.centerY - a.centerY), -(b.centerZ - a.centerZ)); } }
  class ModelObjOld extends ModelCustom {
    constructor() { super(); this.partCenters = new JMap(); this.partSubCenters = new JMap(); this.offsets = new JMap(); this.lockHeadX = false; this.lockHeadY = false; this.bodyIsTrophy = true; this.trophyScale = 1; this.trophyOffset = []; this.trophyMouthOffset = []; this.dontColor = false; }
    initModel(name, mod, path) { this.$name = name; this.$path = path; return this; }
    isTrophyPart(p) { if (p == null) return false; p = p.toLowerCase(); return p.includes('head') || p.includes('mouth') || p.includes('eye'); }
    animatePart(partName, entity, time, distance, loop, lookY, lookX, scale) { let rotX = 0, rotY = 0;
      if (partName.toLowerCase().includes('head')) { if (!this.lockHeadX) rotX += toDeg(lookX / 57.295776); if (!this.lockHeadY) rotY += toDeg(lookY / 57.295776); }
      this.rotate(0, 0, 0, 0); this.rotate(rotX, rotY, 0); this.translate(0, 0, 0); }
    childScale(partName) { this.scale(.5, .5, .5); }
    rotate(...a) { if (a.length >= 4) rot(CUR, a[0], a[1], a[2], a[3]); else { rot(CUR, a[0], 1, 0, 0); rot(CUR, a[1], 0, 1, 0); rot(CUR, a[2], 0, 0, 1); } }
    translate(x, y, z) { tr(CUR, x, y, z); } scale(x, y, z) { sc(CUR, x, y, z); }
    setPartCenter(p, x, y, z) { if (this.isTrophyPart(p)) this.bodyIsTrophy = false; this.partCenters.put(p, [x, y, z]); }
    setPartCenters(x, y, z, ...ps) { for (const p of ps.flat()) this.setPartCenter(p, x, y, z); }
    getPartCenter(p) { return this.partCenters.containsKey(p) ? this.partCenters.get(p) : [0, 0, 0]; }
    centerPart(p) { if (this.partCenters.containsKey(p)) { const c = this.partCenters.get(p); this.translate(c[0], c[1], c[2]); } }
    uncenterPart(p) { if (this.partCenters.containsKey(p)) { const c = this.partCenters.get(p); this.translate(-c[0], -c[1], -c[2]); } }
    centerPartToPart(p, t) { this.uncenterPart(p); const c = this.partCenters.get(t); if (c != null) this.translate(c[0], c[1], c[2]); }
    uncenterPartToPart(p, t) { const c = this.partCenters.get(t); if (c != null) this.translate(-c[0], -c[1], -c[2]); this.centerPart(p); }
    comparePartCenters(a, b) { const c = this.getPartCenter(a), t = this.getPartCenter(b); return t == null ? [0, 0, 0] : [t[0] - c[0], t[1] - c[1], t[2] - c[2]]; }
    setPartSubCenter(p, x, y, z) { this.partSubCenters.put(p, [x, y, z]); } setPartSubCenters(x, y, z, ...ps) { for (const p of ps.flat()) this.setPartSubCenter(p, x, y, z); }
    subCenterPart(p) { const o = this.getSubCenterOffset(p); if (o != null) this.translate(o[0], o[1], o[2]); } unsubCenterPart(p) { const o = this.getSubCenterOffset(p); if (o != null) this.translate(-o[0], -o[1], -o[2]); }
    getSubCenterOffset(p) { if (!this.partCenters.containsKey(p) || !this.partSubCenters.containsKey(p)) return null; const c = this.partCenters.get(p), s = this.partSubCenters.get(p); return [s[0] - c[0], s[1] - c[1], s[2] - c[2]]; }
    setOffset(n, o) { this.offsets.put(n, o); } getOffset(n) { return this.offsets.containsKey(n) ? this.offsets.get(n) : [0, 0, 0]; } }
  Object.assign(L, { ModelCustom, ModelCreatureObj, ModelObjOld });

  // ---- OBJ: groups ("o name") of triangles: x, y, z, u, v per vertex ----
  function parseObj(text) { const V = [], T = [], groups = []; let g = null;
    for (const line of text.split('\n')) { const c = line.charCodeAt(0);
      if (c === 118) { const p = line.trim().split(/\s+/); if (p[0] === 'v') V.push(+p[1], +p[2], +p[3]); else if (p[0] === 'vt') T.push(+p[1], +p[2]); }
      else if (c === 111 || c === 103) { const p = line.trim().split(/\s+/); if (p[0] === 'o' || p[0] === 'g') { g = { name: (p.slice(1).join(' ') || 'part').toLowerCase(), f: [] }; groups.push(g); } }
      else if (c === 102 && line[1] === ' ') { if (!g) { g = { name: 'part', f: [] }; groups.push(g); } const p = line.trim().split(/\s+/).slice(1).map(q => q.split('/').map(n => parseInt(n, 10)));
        for (let i = 1; i + 1 < p.length; i++) for (const q of [p[0], p[i], p[i + 1]]) { const vi = (q[0] < 0 ? V.length / 3 + q[0] : q[0] - 1) * 3, ti = q[1] ? (q[1] < 0 ? T.length / 2 + q[1] : q[1] - 1) * 2 : -1; g.f.push(V[vi], V[vi + 1], V[vi + 2], ti >= 0 ? T[ti] : 0, ti >= 0 ? T[ti + 1] : 0); } } }
    for (const q of groups) q.f = new Float32Array(q.f); return groups.filter(q => q.f.length); }
  // part pivots (models/<path>_parts.json) as ModelObjPart-like objects
  function parts(json) { const m = new JMap(); let A = []; try { A = JSON.parse(json || '[]'); } catch (e) { /* none */ }
    for (const p of A) { const name = String(p.name).toLowerCase(); let par = String(p.parent || '').toLowerCase(); if (!par || par === name) par = null; if (!m.containsKey(name)) m.put(name, { name, parentName: par, centerX: +p.centerX || 0, centerY: +p.centerY || 0, centerZ: +p.centerZ || 0, rotationX: +p.rotationX || 0, rotationY: +p.rotationY || 0, rotationZ: +p.rotationZ || 0, parent: null, $f: [] }); }
    for (const q of m.values()) if (q.parentName) q.parent = m.get(q.parentName); return m; }
  const apply = { angle: (M, f) => rot(M, f[1], f[2], f[3], f[4]), rotate: (M, f) => { rot(M, f[2] * f[1], 1, 0, 0); rot(M, f[3] * f[1], 0, 1, 0); rot(M, f[4] * f[1], 0, 0, 1); }, translate: (M, f) => tr(M, f[2] * f[1], f[3] * f[1], f[4] * f[1]), scale: (M, f) => sc(M, f[2] * f[1], f[3] * f[1], f[4] * f[1]) };

  function create(opt) {
    L.loadParts = path => parts(opt.load('parts:' + path));
    const models = new Map();
    function model(name, cls) { if (models.has(name)) return models.get(name); let M = null; const C = L.models[cls.split('/').pop()];
      try { if (C) { const inst = new C(), text = inst.$path && opt.load('obj:' + inst.$path);
          if (text) { const layers = [], renderer = { addLayer(l) { layers.push(l); }, getMainModel() { return inst; } }; try { inst.addCustomLayers(renderer); } catch (e) { console.warn('objmobs: layers', name, e); }
            M = { name, inst, groups: parseObj(text), old: inst instanceof ModelObjOld, layers }; } } } catch (e) { console.warn('objmobs: model', name, e); }
      models.set(name, M); return M; }
    // one pose of a model for one entity (and one layer, or null for the base pass): [{ g, M, color, off, gl }]
    function pose(Mdl, ent, layer, base) { const inst = Mdl.inst, out = [], s = ent.$s; inst.$ent = ent; inst.isChild = !!s.child;
      const scale = s.renderScale || 1, loop = s.loop, time = s.limbSwing, dist = s.perch ? 0 : s.limbAmount, lookY = s.headYaw || 0, lookX = s.headPitch || 0;
      const gl = () => { const g = GL.reset(); try { inst.onRenderStart(layer, ent, false); } catch (e) { /* default state */ } const r = Object.assign({}, g); try { inst.onRenderFinish(layer, ent, false); } catch (e) { /* none */ } return r; };
      const can = n => { try { return !!inst.canRenderPart(n, ent, layer, false); } catch (e) { return true; } };
      const col = n => { let c = null; try { c = inst.getPartColor(n, ent, layer, false, loop); } catch (e) { /* white */ } return c ? [c.x, c.y, c.z, c.w === undefined ? 1 : c.w] : [1, 1, 1, 1]; };
      const off = n => { let c = null; try { c = inst.getPartTextureOffset(n, ent, layer, false, loop); } catch (e) { /* none */ } return c ? [c.x || 0, c.y || 0] : [0, 0]; };
      if (!Mdl.old) { const P = inst.animationParts;
        if (!s.noAnim) for (const g of Mdl.groups) { const part = P.get(g.name); if (!part) continue; inst.currentAnimationPart = part; try { inst.animatePart(g.name, ent, time, dist, loop, -lookY, lookX, scale); } catch (e) { warn(Mdl.name, e); } }
        for (const g of Mdl.groups) { const part = P.get(g.name); if (!part || !can(g.name)) continue; inst.currentAnimationPart = part;
          const M = CUR = Float32Array.from(base); rot(M, 180, 1, 0, 0); tr(M, 0, -1.5, 0);
          if (s.child) { inst.childScale(g.name); if (inst.bigChildHead && (g.name.includes('head') || g.name.includes('mouth'))) tr(M, -part.centerX / 2, -part.centerY / 2, -part.centerZ / 2); }
          sc(M, scale, scale, scale);
          const chain = []; for (let q = part, k = 0; q && k < 32; q = q.parent, k++) chain.unshift(q);
          for (const q of chain) { tr(M, q.centerX, q.centerY, q.centerZ); for (const f of q.$f) apply[f[0]](M, f); tr(M, -q.centerX, -q.centerY, -q.centerZ); }
          out.push({ g, M, color: col(g.name), off: off(g.name), gl: gl() }); }
        for (const q of P.values()) q.$f.length = 0;
      } else {
        for (const g of Mdl.groups) { if (!can(g.name)) continue; const M = CUR = Float32Array.from(base); rot(M, 180, 1, 0, 0); tr(M, 0, -1.5, 0);
          if (s.child) inst.childScale(g.name); sc(M, scale, scale, scale);
          try { inst.centerPart(g.name); inst.animatePart(g.name, ent, time, dist, loop, -lookY, lookX, scale); CUR = M; inst.uncenterPart(g.name); } catch (e) { warn(Mdl.name, e); }
          out.push({ g, M, color: col(g.name), off: off(g.name), gl: gl() }); } }
      return out; }
    const warned = new Set(); function warn(n, e) { if (!warned.has(n)) { warned.add(n); console.warn('objmobs: animatePart', n, e); } }
    function layerTex(l, ent) { try { const r = l.getLayerTexture(ent); return r == null ? null : String(r); } catch (e) { return null; } }
    function layerOn(l, ent) { try { return !!l.canRenderLayer(ent, .0625); } catch (e) { return true; } }
    // the creature as its model code sees it: Lycanites' BaseCreatureEntity getters, read from s (a plain state object the engine fills from synced data)
    function entity(s, clsNames) { const is = new Set(clsNames || []); const key = (...a) => opt.texKey(a.filter(Boolean).join('_'));
      return { $s: s, $is: n => is.has(n) || /^(Entity|EntityLiving|EntityLivingBase|EntityCreature|BaseCreatureEntity)$/.test(n),
        get onGround() { return !!s.onGround; }, get ticksExisted() { return s.ticks | 0; }, get hurtTime() { return s.hurt | 0; }, get deathTime() { return s.death | 0; }, onlyRenderTicks: -1,
        isInWater: () => !!s.inWater, isChild: () => !!s.child, isInvisible: () => !!s.invisible, isInvisibleToPlayer: () => !!s.invisible, getHealth: () => s.health || 20, getMaxHealth: () => s.maxHealth || 20,
        getBrightnessForRender: () => 15728880, isBeingRidden: () => s.riders > 0, isRiding: () => false, getPassengers: () => Object.assign(new Array(s.riders | 0).fill({}), { isEmpty: () => !(s.riders > 0), size: () => s.riders | 0 }), getControllingPassenger: () => s.riders > 0 ? {} : null,
        getRNG: () => ({ nextFloat: Math.random, nextInt: n => Math.floor(Math.random() * (n || 1)), nextBoolean: () => Math.random() < .5, nextDouble: Math.random }),
        isAttackOnCooldown: () => s.attackCooldown > 0, getAttackCooldown: () => s.attackCooldown | 0, getStealth: () => s.stealth || 0, getAttackPhase: () => s.attackPhase | 0,
        hasPickupEntity: () => !!(s.target & 32), hasAttackTarget: () => !!(s.target & 1), hasPerchTarget: () => !!(s.target & 64), hasRiderTarget: () => !!(s.target & 16), hasMaster: () => !!(s.target & 2), hasParent: () => !!(s.target & 4), hasAvoidTarget: () => !!(s.target & 8), isBlocking: () => !!(s.anim & 8), extraAnimation01: () => !!(s.anim & 32),
        isFlying: () => !!s.flying, isSitting: () => !!((s.tamed & 1) && (s.tamed & 2)), isTamed: () => !!(s.tamed & 1), isMinion: () => !!(s.anim & 16), getRenderScale: () => s.renderScale || 1,
        canPull: () => !!(s.anim & 32), canWhirlpool: () => !!(s.anim & 32), hasFur: () => s.fur !== false, hasLatchTarget: () => !!s.latch, getConsumptionAnimation: () => s.consume || 0, getColor: () => s.color | 0, hasSaddle: () => !!s.saddle,
        getEquipmentName: t => s.equip && s.equip[t] ? t + s.equip[t] : null, getEquipmentTexture: n => n ? key(s.texName, n) : null, getVariant: () => s.varColor ? { color: s.varColor } : null, getTextureName: () => s.texName,
        getTexture: suf => key(s.texName, s.subName, s.varColor, suf), getSubTexture: suf => key(s.texName, s.subName, suf), texKey: n => opt.texKey(n) }; }
    return { model, pose, layerTex, layerOn, entity, mul, rot, tr, sc, ident, parseObj };
  }
  // an inventory icon for a model-only item (Lycanites' equipment parts): the OBJ drawn at Minecraft's item angle into a small canvas, textured triangle by triangle
  // PNG in and out without the browser's image pipeline (quick and synchronous): decode 8-bit (and paletted) PNGs with Strata's inflater, write stored-deflate PNGs
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function pngDecode(b) { if (!(b instanceof Uint8Array)) b = b instanceof ArrayBuffer ? new Uint8Array(b) : ArrayBuffer.isView(b) ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength) : Uint8Array.from(b); const d = new DataView(b.buffer, b.byteOffset, b.byteLength); let p = 8, w = 0, h = 0, bd = 8, ct = 6, pal = null, trn = null; const idat = [];
    while (p < b.length) { const len = d.getUint32(p), type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]), c = b.subarray(p + 8, p + 8 + len);
      if (type === 'IHDR') { w = d.getUint32(p + 8); h = d.getUint32(p + 12); bd = b[p + 16]; ct = b[p + 17]; } else if (type === 'PLTE') pal = c; else if (type === 'tRNS') trn = c; else if (type === 'IDAT') idat.push(c); else if (type === 'IEND') break; p += 12 + len; }
    const z = new Uint8Array(idat.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of idat) { z.set(c, o); o += c.length; }
    const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], bpp = Math.max(1, ch * bd / 8), stride = Math.ceil(w * ch * bd / 8), raw = INFL(z.subarray(2), (stride + 1) * h), px = new Uint8Array(stride * h);
    for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = px.subarray(y * stride, (y + 1) * stride), up = y ? px.subarray((y - 1) * stride, y * stride) : null;
      for (let x = 0; x < stride; x++) { const a = x >= bpp ? row[x - bpp] : 0, u = up ? up[x] : 0, c = up && x >= bpp ? up[x - bpp] : 0; let v = src[x];
        if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1; else if (f === 4) { const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; } row[x] = v & 255; } }
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, r = px.subarray(y * stride);
      if (ct === 3) { const ix = bd === 8 ? r[x] : (r[(x * bd) >> 3] >> (8 - bd - ((x * bd) & 7))) & ((1 << bd) - 1); out[i] = pal[ix * 3]; out[i + 1] = pal[ix * 3 + 1]; out[i + 2] = pal[ix * 3 + 2]; out[i + 3] = trn && ix < trn.length ? trn[ix] : 255; }
      else { const q = r.subarray(x * ch); if (ch >= 3) { out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2]; out[i + 3] = ch === 4 ? q[3] : 255; } else { out[i] = out[i + 1] = out[i + 2] = q[0]; out[i + 3] = ch === 2 ? q[1] : 255; } } }
    return { w, h, data: out }; }
  function pngEncode(w, h, rgba) { const raw = new Uint8Array((w * 4 + 1) * h); for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
    const z = [0x78, 0x01]; for (let i = 0; i < raw.length; i += 65535) { const n = Math.min(65535, raw.length - i); z.push(i + n >= raw.length ? 1 : 0, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255); for (let k = 0; k < n; k++) z.push(raw[i + k]); }
    let a1 = 1, a2 = 0; for (const v of raw) { a1 = (a1 + v) % 65521; a2 = (a2 + a1) % 65521; } z.push(a2 >> 8, a2 & 255, a1 >> 8, a1 & 255);
    const out = [137, 80, 78, 71, 13, 10, 26, 10], chunk = (t, d) => { const L = d.length; out.push(L >>> 24, (L >> 16) & 255, (L >> 8) & 255, L & 255); const td = [...t].map(c => c.charCodeAt(0)).concat(d); let c = 0xffffffff; for (const v of td) c = CRC[(c ^ v) & 255] ^ (c >>> 8); c = (c ^ 0xffffffff) >>> 0; out.push(...td, c >>> 24, (c >> 16) & 255, (c >> 8) & 255, c & 255); };
    chunk('IHDR', [w >>> 24, (w >> 16) & 255, (w >> 8) & 255, w & 255, h >>> 24, (h >> 16) & 255, (h >> 8) & 255, h & 255, 8, 6, 0, 0, 0]); chunk('IDAT', z); chunk('IEND', []); return Uint8Array.from(out); }
  // draw textured meshes ([{ V: x,y,z,u,v per vertex (triangles), tex: { w, h, data } }]) at Minecraft's item angle into a size x size PNG: a small z-buffered rasteriser, nearest texels
  function rasterIcon(list, size) { size = size || 64; const ya = -45 * Math.PI / 180, pa = 30 * Math.PI / 180, cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa), Q = [];
    for (const m of list) { const V = m.V, o = new Float32Array(V.length); for (let i = 0; i < V.length; i += 5) { const x = V[i], y = V[i + 1], z = V[i + 2], x1 = x * cy - z * sy, z1 = x * sy + z * cy; o[i] = x1; o[i + 1] = y * cp - z1 * sp; o[i + 2] = y * sp + z1 * cp; o[i + 3] = V[i + 3]; o[i + 4] = V[i + 4]; } Q.push({ V: o, tex: m.tex }); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const m of Q) for (let i = 0; i < m.V.length; i += 5) { x0 = Math.min(x0, m.V[i]); x1 = Math.max(x1, m.V[i]); y0 = Math.min(y0, m.V[i + 1]); y1 = Math.max(y1, m.V[i + 1]); }
    if (x0 > x1) return null; const k = size * .86 / Math.max(x1 - x0, y1 - y0, 1e-6), ox = size / 2 - (x0 + x1) / 2 * k, oy = size / 2 + (y0 + y1) / 2 * k;
    const out = new Uint8ClampedArray(size * size * 4), zb = new Float32Array(size * size).fill(-1e9);
    for (const { V, tex } of Q) { const W = tex.w, H = tex.h, T = tex.data;
      for (let i = 0; i < V.length; i += 15) { const P = [0, 5, 10].map(o => [ox + V[i + o] * k, oy - V[i + o + 1] * k, V[i + o + 2], V[i + o + 3], 1 - V[i + o + 4]]);
        const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], area = ax * by - ay * bx; if (Math.abs(area) < 1e-9) continue;
        const shade = .72 + .28 * Math.min(1, Math.abs(area) / (Math.hypot(ax, ay) * Math.hypot(bx, by) + 1e-9));
        const minx = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), maxx = Math.min(size - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0]))), miny = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), maxy = Math.min(size - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
        for (let py = miny; py <= maxy; py++) for (let px = minx; px <= maxx; px++) { const qx = px + .5 - P[0][0], qy = py + .5 - P[0][1], b1 = (qx * by - qy * bx) / area, b2 = (ax * qy - ay * qx) / area, b0 = 1 - b1 - b2; if (b0 < -.001 || b1 < -.001 || b2 < -.001) continue;
          const z = b0 * P[0][2] + b1 * P[1][2] + b2 * P[2][2], o = py * size + px; if (z <= zb[o]) continue;
          const u = b0 * P[0][3] + b1 * P[1][3] + b2 * P[2][3], v = b0 * P[0][4] + b1 * P[1][4] + b2 * P[2][4], tx = Math.min(W - 1, Math.max(0, Math.floor((u - Math.floor(u)) * W))), ty = Math.min(H - 1, Math.max(0, Math.floor((v - Math.floor(v)) * H))), t = (ty * W + tx) * 4;
          if (T[t + 3] < 16) continue; zb[o] = z; out[o * 4] = T[t] * shade; out[o * 4 + 1] = T[t + 1] * shade; out[o * 4 + 2] = T[t + 2] * shade; out[o * 4 + 3] = 255; } } }
    return pngEncode(size, size, out); }
  function objIcon(text, png, size) { const G = parseObj(text); let n = 0; for (const g of G) n += g.f.length; const V = new Float32Array(n); let o = 0; for (const g of G) { V.set(g.f, o); o += g.f.length; }
    return rasterIcon([{ V, tex: pngDecode(png instanceof Uint8Array ? png : new Uint8Array(png)) }], size); }
  // ---- Lycanites equipment (ModelItemBase / ModelEquipmentPart / ModelEquipment): parts from models/equipment, their JSON part animations (ModelPartAnimation),
  // joined the mod's way: the base, the head on the base's "head", tips A-C on the head's "tipa/tipb/tipc", the pommel on the base's "pommel" ----
  function partAnims(json) { let J = null; try { J = JSON.parse(json || 'null'); } catch (e) { /* none */ } const A = []; if (!J) return { anims: A, layers: [] };
    for (const a of J.partAnimations || []) A.push({ targets: (a.targetParts || []).map(t => String(t).toLowerCase()), source: a.timeSource || 'static', loop: a.loopType || 'reset', dur: +a.duration || 0, off: +a.offset || 0,
      t: [+a.translateX || 0, +a.translateY || 0, +a.translateZ || 0], ang: [+a.angleX || 0, +a.angleY || 0, +a.angleZ || 0, +a.angleAmount || 0], r: [+a.rotateX || 0, +a.rotateY || 0, +a.rotateZ || 0], s: [+a.scaleX || 0, +a.scaleY || 0, +a.scaleZ || 0] });
    return { anims: A, layers: J.textureLayers || [] }; }
  function animateItemPart(model, partName, loop) { const part = model.parts.get(partName); if (!part) return;
    for (const a of model.anims) { if (!a.targets.includes(partName)) continue; let p = loop + a.off * 20; const d = a.dur * 20;   // ModelPartAnimation.animatePart (time and distance sources are the loop for items)
      if (d !== 0) { if (a.loop === 'reset') p %= d; else if (a.loop === 'reverse') { let c = p % d; const n = Math.round((p - c) / d); if (n % 2 !== 0) c = d - c; p = c; } }
      part.$f.push(['translate', 1, a.t[0] * p, a.t[1] * p, a.t[2] * p], ['angle', a.ang[3] * p, a.ang[0], a.ang[1], a.ang[2]], ['rotate', 1, a.r[0] * p, a.r[1] * p, a.r[2] * p], ['scale', 1, 1 + a.s[0] * p, 1 + a.s[1] * p, 1 + a.s[2] * p]); } }
  function applyItemFrames(M, q) { if (q.parent) applyItemFrames(M, q.parent);   // ModelObjPart.applyAnimationFrames, with the part it hangs from
    if (q.offset) { applyItemFrames(M, q.offset); tr(M, q.centerX + q.offset.centerX, q.centerY + q.offset.centerY, q.centerZ + q.offset.centerZ); rot(M, -q.offset.rotationX, 1, 0, 0); rot(M, -q.offset.rotationY, 0, 1, 0); rot(M, -q.offset.rotationZ, 0, 0, 1); }
    tr(M, q.centerX, q.centerY, q.centerZ); for (const f of q.$f) apply[f[0]](M, f); tr(M, -q.centerX, -q.centerY, -q.centerZ); }
  const itemModels = new Map();
  function itemModel(load, name) { if (itemModels.has(name)) return itemModels.get(name); const text = load('obj:equipment/' + name); let M = null;
    if (text) { const A = partAnims(load('anim:equipment/' + name)); M = { name, groups: parseObj(text), parts: parts(load('parts:equipment/' + name)), anims: A.anims, layers: A.layers }; } itemModels.set(name, M); return M; }
  // the parts of a piece of equipment posed for one loop: [{ model, g, M }]
  function equipPose(load, names, loop) { const out = [], used = []; let base = null, head = null;
    const put = (name, offset) => { const m = itemModel(load, name); if (!m) return null; for (const q of m.parts.values()) { q.$f.length = 0; q.offset = null; } const b = m.parts.get('base'); if (b) b.offset = offset || null;
      for (const g of m.groups) animateItemPart(m, g.name, loop); for (const g of m.groups) { const q = m.parts.get(g.name); if (!q) continue; const T = ident(); rot(T, 180, 1, 0, 0); tr(T, 0, -1.5, 0); applyItemFrames(T, q); out.push({ model: m, g, M: T }); } used.push(m); return m; };
    names.forEach((n, slot) => { if (!n) return; if (slot === 0) base = put(n, null); else if (slot === 1) { if (base && base.parts.containsKey('head')) head = put(n, base.parts.get('head')); }
      else if (slot >= 2 && slot <= 4) { const t = ['tipa', 'tipb', 'tipc'][slot - 2]; if (head && head.parts.containsKey(t)) put(n, head.parts.get(t)); } else if (slot === 5 && base && base.parts.containsKey('pommel')) put(n, base.parts.get('pommel')); });
    return out; }
  // an inventory icon for a piece of equipment from its parts (textures: equipment/<part>.png)
  function equipIcon(load, loadPng, names, size) { const P = equipPose(load, names, 0), list = [], texs = new Map();
    for (const q of P) { let t = texs.get(q.model.name); if (t === undefined) { const png = loadPng(q.model.name); t = png ? pngDecode(png instanceof Uint8Array ? png : new Uint8Array(png)) : null; texs.set(q.model.name, t); } if (!t) continue;
      const f = q.g.f, V = new Float32Array(f.length), M = q.M; for (let i = 0; i < f.length; i += 5) { const x = f[i], y = f[i + 1], z = f[i + 2]; V[i] = M[0] * x + M[4] * y + M[8] * z + M[12]; V[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; V[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14]; V[i + 3] = f[i + 3]; V[i + 4] = f[i + 4]; }
      list.push({ V, tex: t }); }
    return list.length ? rasterIcon(list, size) : null; }
  L.equipPose = equipPose; L.equipIcon = equipIcon; L.rasterIcon = rasterIcon; L.pngDecode = pngDecode; L.pngEncode = pngEncode;
  L.objIcon = objIcon; L.parseObj = parseObj;
  L.create = create; window.StrataObjMobs = { create };
})();
