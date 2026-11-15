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
        getBrightnessForRender: () => 15728880, isBeingRidden: () => false, isRiding: () => false, getPassengers: () => Object.assign([], { isEmpty: () => true, size: () => 0 }), getControllingPassenger: () => null,
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
  async function objIcon(text, png, size) { size = size || 64; const img = await createImageBitmap(new Blob([png], { type: 'image/png' })), G = parseObj(text), T = [];
    const ya = -45 * Math.PI / 180, pa = 30 * Math.PI / 180, cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
    const P = (x, y, z) => { const x1 = x * cy - z * sy, z1 = x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
    for (const g of G) for (let i = 0; i < g.f.length; i += 15) T.push([0, 5, 10].map(k => [...P(g.f[i + k], g.f[i + k + 1], g.f[i + k + 2]), g.f[i + k + 3], g.f[i + k + 4]]));
    if (!T.length) return null; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const t of T) for (const v of t) { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
    const k = size * .86 / Math.max(x1 - x0, y1 - y0, 1e-6), ox = size / 2 - (x0 + x1) / 2 * k, oy = size / 2 + (y0 + y1) / 2 * k, W = img.width, H = img.height;
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size }), c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    T.sort((a, b) => (a[0][2] + a[1][2] + a[2][2]) - (b[0][2] + b[1][2] + b[2][2]));   // far first
    for (const t of T) { const s = t.map(v => [ox + v[0] * k, oy - v[1] * k]), u = t.map(v => [v[3] * W, (1 - v[4]) * H]);
      const [[x_0, y_0], [x_1, y_1], [x_2, y_2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = u, d = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1); if (Math.abs(d) < 1e-9) continue;
      const a = (x_0 * (v1 - v2) + x_1 * (v2 - v0) + x_2 * (v0 - v1)) / d, b = (y_0 * (v1 - v2) + y_1 * (v2 - v0) + y_2 * (v0 - v1)) / d, cc = (x_0 * (u2 - u1) + x_1 * (u0 - u2) + x_2 * (u1 - u0)) / d, dd = (y_0 * (u2 - u1) + y_1 * (u0 - u2) + y_2 * (u1 - u0)) / d;
      const e = (x_0 * (u1 * v2 - u2 * v1) + x_1 * (u2 * v0 - u0 * v2) + x_2 * (u0 * v1 - u1 * v0)) / d, f = (y_0 * (u1 * v2 - u2 * v1) + y_1 * (u2 * v0 - u0 * v2) + y_2 * (u0 * v1 - u1 * v0)) / d;
      const n = ((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0])), mx = (x_0 + x_1 + x_2) / 3, my = (y_0 + y_1 + y_2) / 3, grow = q => [q[0] + (q[0] - mx) * .06, q[1] + (q[1] - my) * .06];
      c.save(); c.beginPath(); const g0 = grow(s[0]), g1 = grow(s[1]), g2 = grow(s[2]); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1]); c.closePath(); c.clip(); c.setTransform(a, b, cc, dd, e, f); c.drawImage(img, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0);
      const shade = Math.max(0, Math.min(.45, .25 - Math.sign(n) * .1)); if (shade > .01) { c.fillStyle = 'rgba(0,0,0,' + shade + ')'; c.fill(); } c.restore(); }
    const blob = cv.convertToBlob ? await cv.convertToBlob({ type: 'image/png' }) : await new Promise(r => cv.toBlob(r, 'image/png')); return new Uint8Array(await blob.arrayBuffer()); }
  L.objIcon = objIcon; L.parseObj = parseObj;
  L.create = create; window.StrataObjMobs = { create };
})();
