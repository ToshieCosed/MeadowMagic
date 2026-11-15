/* OBJ creature models driven by a mod's own model classes (compat mode only; used by the Lycanites Mobs port).
   Mirrors Lycanites' ModelCreatureObj.render / ModelObjOld.render: per part, Minecraft's model transform (180 degrees about X, down 1.5, scale), the part's
   pivot and the animation frames the mod's animatePart() adds that frame, its colour and texture scroll, and the GL state its layers set (glow, blending).
   The model classes themselves run in StrataJVM from the player's jar. */
(function () {
  'use strict';
  const J = window.StrataJVM;
  // ---- column-major 4x4 matrices, applied like OpenGL's (M = M * op) ----
  const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(A, B) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += A[k * 4 + r] * B[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function rot(M, deg, x, y, z) { const l = Math.hypot(x, y, z); if (!l || !deg) return M; x /= l; y /= l; z /= l; const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    const R = new Float32Array([t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1]); M.set(mul(M, R)); return M; }
  function tr(M, x, y, z) { for (let r = 0; r < 4; r++) M[12 + r] += M[r] * x + M[4 + r] * y + M[8 + r] * z; return M; }
  function sc(M, x, y, z) { for (let r = 0; r < 4; r++) { M[r] *= x; M[4 + r] *= y; M[8 + r] *= z; } return M; }
  // ---- OBJ: groups ("o name") of triangles with positions and texture coordinates ----
  function parseObj(text) { const V = [], T = [], N = [], groups = []; let g = null;
    for (const line of text.split('\n')) { const c = line.charCodeAt(0);
      if (c === 118) { const p = line.trim().split(/\s+/); if (p[0] === 'v') V.push(+p[1], +p[2], +p[3]); else if (p[0] === 'vt') T.push(+p[1], +p[2]); else if (p[0] === 'vn') N.push(+p[1], +p[2], +p[3]); }
      else if (c === 111 || c === 103) { const p = line.trim().split(/\s+/); if (p[0] === 'o' || p[0] === 'g') { g = { name: (p.slice(1).join(' ') || 'part').toLowerCase(), f: [] }; groups.push(g); } }
      else if (c === 102 && line[1] === ' ') { if (!g) { g = { name: 'part', f: [] }; groups.push(g); } const p = line.trim().split(/\s+/).slice(1).map(q => q.split('/').map(n => parseInt(n, 10)));
        for (let i = 1; i + 1 < p.length; i++) for (const q of [p[0], p[i], p[i + 1]]) { const vi = (q[0] < 0 ? V.length / 3 + q[0] : q[0] - 1) * 3, ti = q[1] ? (q[1] < 0 ? T.length / 2 + q[1] : q[1] - 1) * 2 : -1; g.f.push(V[vi], V[vi + 1], V[vi + 2], ti >= 0 ? T[ti] : 0, ti >= 0 ? T[ti + 1] : 0); } } }
    for (const q of groups) q.f = new Float32Array(q.f); return groups.filter(q => q.f.length); }
  const VEC = n => J.vec(n, n === 4 ? { x: 1, y: 1, z: 1, w: 1 } : { x: 0, y: 0 });

  function create(opt) {
    const vm = new J.VM(n => opt.load('class:' + n)); J.installNatives(vm); const N = vm.natives, GL = vm.gl;
    const pkg = opt.pkg;   // e.g. 'com/lycanitesmobs/'
    const MCO = pkg + 'client/model/ModelCreatureObj', MOO = pkg + 'client/model/ModelObjOld';
    // the GL matrix the old-style models and the Animator move
    const apply = { angle: (M, f) => rot(M, f[1], f[2], f[3], f[4]), rotate: (M, f) => { rot(M, f[2] * f[1], 1, 0, 0); rot(M, f[3] * f[1], 0, 1, 0); rot(M, f[4] * f[1], 0, 0, 1); }, translate: (M, f) => tr(M, f[2] * f[1], f[3] * f[1], f[4] * f[1]), scale: (M, f) => sc(M, f[2] * f[1], f[3] * f[1], f[4] * f[1]) };
    const animator = { $is: n => /Animator|Object/.test(n), doAngle(r, x, y, z) { rot(vm.cur, r, x, y, z); }, doRotate(x, y, z) { rot(vm.cur, x, 1, 0, 0); rot(vm.cur, y, 0, 1, 0); rot(vm.cur, z, 0, 0, 1); }, doTranslate(x, y, z) { tr(vm.cur, x, y, z); }, doScale(x, y, z) { sc(vm.cur, x, y, z); } };
    const parts = path => { let L = []; try { L = JSON.parse(opt.load('parts:' + path) || '[]'); } catch (e) { /* none */ } const m = J.jmap();
      for (const p of L) { const name = String(p.name).toLowerCase(); let par = String(p.parent || '').toLowerCase(); if (!par || par === name) par = null; if (!m.containsKey(name)) m.put(name, { $is: n => /ModelObjPart|Object/.test(n), name, parentName: par, centerX: +p.centerX || 0, centerY: +p.centerY || 0, centerZ: +p.centerZ || 0, rotationX: +p.rotationX || 0, rotationY: +p.rotationY || 0, rotationZ: +p.rotationZ || 0, parent: null, $f: [] }); }
      for (const q of m.$map.values()) if (q.parentName) q.parent = m.get(q.parentName); return m; };
    N[MCO + '.initModel'] = (v, o, a) => { o.$path = a[2]; o.animationParts = parts(a[2]); o.animator = animator; return o; };
    N[MOO + '.initModel'] = (v, o, a) => { o.$path = a[2]; return o; };
    const frame = (t) => (v, o, a) => { const p = o.currentAnimationPart; if (p) p.$f.push(t === 'angle' ? [t, a[0], a[1], a[2], a[3]] : [t, 1, a[0], a[1], a[2]]); };
    N[MCO + '.angle'] = frame('angle'); N[MCO + '.rotate(FFF)V'] = frame('rotate'); N[MCO + '.translate'] = frame('translate'); N[MCO + '.scale'] = frame('scale');
    N[MCO + '.getModelState'] = (v, o, a) => a[0] && a[0].$state; N[MCO + '.getAttackProgress'] = (v, o) => (o.$ent && o.$ent.$state.progress) || 0;
    N[MCO + '.updateAttackProgress'] = () => {};
    N[MOO + '.rotate(FFF)V'] = (v, o, a) => { rot(vm.cur, a[0], 1, 0, 0); rot(vm.cur, a[1], 0, 1, 0); rot(vm.cur, a[2], 0, 0, 1); };
    N[MOO + '.rotate(FFFF)V'] = (v, o, a) => { rot(vm.cur, a[0], a[1], a[2], a[3]); };
    N[MOO + '.translate'] = (v, o, a) => { tr(vm.cur, a[0], a[1], a[2]); }; N[MOO + '.scale'] = (v, o, a) => { sc(vm.cur, a[0], a[1], a[2]); };
    N[pkg + 'core/info/CreatureManager.getInstance'] = () => ({ config: { disableModelAlpha: 0 }, getCreature: n => ({ enabled: 1, name: n, getName: () => n }), $is: () => true });
    N[pkg + 'client/AssetManager.getTexture'] = (v, o, a) => opt.texKey(String(a[0]).toLowerCase()); N[pkg + 'client/AssetManager.addTexture'] = () => {};
    N['net/minecraft/client/Minecraft.func_71410_x'] = () => ({ field_71439_g: null, $is: () => false }); N['net/minecraft/client/Minecraft.func_71382_s'] = () => 1;
    const models = new Map();
    function model(name, cls) { if (models.has(name)) return models.get(name); let M = null;
      try { const inst = vm.make(cls, '()V', []); const path = inst.$path; const text = path && opt.load('obj:' + path);
        if (inst && text) { const groups = parseObj(text), old = vm.isA(inst, MOO), layers = [];
          const renderer = { $is: n => /RenderCreature|RenderLiving|Render|Object/.test(n), func_177094_a(l) { layers.push(l); return 1; }, func_177087_b() { return inst; }, field_77045_g: inst };
          try { vm.call(inst, 'addCustomLayers', '(L' + pkg + 'client/renderer/RenderCreature;)V', [renderer]); } catch (e) { vm.warn('layers ' + name + ': ' + e.message); }
          M = { name, inst, groups, old, layers, path }; } } catch (e) { console.warn('objmobs: model', name, e); }
      models.set(name, M); return M; }
    const D = { anim: '(Ljava/lang/String;Lnet/minecraft/entity/EntityLiving;FFFFFF)V', can: '(Ljava/lang/String;Lnet/minecraft/entity/Entity;L' + pkg + 'client/renderer/layer/LayerCreatureBase;Z)Z',
      start: '(L' + pkg + 'client/renderer/layer/LayerCreatureBase;Lnet/minecraft/entity/Entity;Z)V', child: '(Ljava/lang/String;)V', center: '(Ljava/lang/String;)V' };
    const callN = (o, name, n, args) => { for (const c of vm.chain(o.$c)) { const nf = vm.native(c, name, ''); const k = vm.cls(c); if (k) for (const key in k.methods) { const m = k.methods[key]; if (m.name === name && m.code && J.parseClass && descN(m.desc) === n) return vm.run(m, k, [o, ...vm.slots(m.desc, args)]); } if (nf) return nf(vm, o, args); } return undefined; };
    const descN = ds => { let n = 0, i = 1; while (ds[i] !== ')') { const c = ds[i]; if (c === 'L') i = ds.indexOf(';', i) + 1; else if (c === '[') { while (ds[i] === '[') i++; if (ds[i] === 'L') i = ds.indexOf(';', i) + 1; else i++; } else i++; n++; } return n; };
    // one pose of a model for one entity (and one layer, or null for the base pass): [{ g, M, color, off, gl }]
    function pose(Mdl, ent, layer, base) { const inst = Mdl.inst, out = []; inst.$ent = ent; inst.field_78091_s = ent.$s.child ? 1 : 0;
      const s = ent.$s, scale = s.renderScale || 1, loop = s.loop, time = s.limbSwing; let dist = s.limbAmount; if (s.perch) dist = 0;
      const lookY = s.headYaw || 0, lookX = s.headPitch || 0; vm.steps = 0;
      const gl = () => { GL.blend = 0; GL.src = 'SRC_ALPHA'; GL.dst = 'ONE_MINUS_SRC_ALPHA'; GL.lit = 1; GL.lm = null; GL.color = null; try { callN(inst, 'onRenderStart', 3, [layer, ent, 0]); } catch (e) { /* state stays default */ } const g = { blend: GL.blend, src: GL.src, dst: GL.dst, lit: GL.lit, lm: GL.lm, color: GL.color }; try { callN(inst, 'onRenderFinish', 3, [layer, ent, 0]); } catch (e) { /* none */ } return g; };
      const can = name => { try { return !!callN(inst, 'canRenderPart', 4, [name, ent, layer, 0]); } catch (e) { return true; } };
      const colOf = name => { let c = null; try { c = callN(inst, 'getPartColor', 5, [name, ent, layer, 0, loop]); } catch (e) { /* white */ } return c ? [c.x, c.y, c.z, c.w === undefined ? 1 : c.w] : [1, 1, 1, 1]; };
      const offOf = name => { let c = null; try { c = callN(inst, 'getPartTextureOffset', 5, [name, ent, layer, 0, loop]); } catch (e) { /* none */ } return c ? [c.x || 0, c.y || 0] : [0, 0]; };
      if (!Mdl.old) {
        const P = inst.animationParts; if (!P) return out;
        for (const g of Mdl.groups) { const part = P.get(g.name); if (!part) continue; inst.currentAnimationPart = part; try { callN(inst, 'animatePart', 8, [g.name, ent, time, dist, loop, -lookY, lookX, scale]); } catch (e) { vm.warn('animatePart ' + Mdl.name + ': ' + e.message); } }
        for (const g of Mdl.groups) { const part = P.get(g.name); if (!part || !can(g.name)) continue; inst.currentAnimationPart = part;
          const M = vm.cur = Float32Array.from(base); rot(M, 180, 1, 0, 0); tr(M, 0, -1.5, 0);
          if (s.child) { try { callN(inst, 'childScale', 1, [g.name]); } catch (e) { sc(M, .5, .5, .5); } if (inst.bigChildHead && (g.name.includes('head') || g.name.includes('mouth'))) tr(M, -part.centerX / 2, -part.centerY / 2, -part.centerZ / 2); }
          sc(M, scale, scale, scale);
          const chain = []; for (let q = part, k = 0; q && k < 32; q = q.parent, k++) chain.unshift(q);
          for (const q of chain) { tr(M, q.centerX, q.centerY, q.centerZ); for (const f of q.$f) apply[f[0]](M, f); tr(M, -q.centerX, -q.centerY, -q.centerZ); }
          out.push({ g, M, color: colOf(g.name), off: offOf(g.name), gl: gl() }); }
        for (const q of P.$map.values()) q.$f.length = 0;
      } else {
        for (const g of Mdl.groups) { if (!can(g.name)) continue; const M = vm.cur = Float32Array.from(base); rot(M, 180, 1, 0, 0); tr(M, 0, -1.5, 0);
          if (s.child) { try { callN(inst, 'childScale', 1, [g.name]); } catch (e) { sc(M, .5, .5, .5); } }
          sc(M, scale, scale, scale);
          try { callN(inst, 'centerPart', 1, [g.name]); callN(inst, 'animatePart', 8, [g.name, ent, time, dist, loop, -lookY, lookX, scale]); vm.cur = M; callN(inst, 'uncenterPart', 1, [g.name]); } catch (e) { vm.warn('animatePart ' + Mdl.name + ': ' + e.message); }
          out.push({ g, M, color: colOf(g.name), off: offOf(g.name), gl: gl() }); }
      }
      return out; }
    // the texture a layer draws with (null: the layer has none for this creature)
    function layerTex(l, ent) { try { const r = callN(l, 'getLayerTexture', 1, [ent]); return r == null ? null : String(r); } catch (e) { return null; } }
    function layerOn(l, ent) { try { return !!callN(l, 'canRenderLayer', 2, [ent, .0625]); } catch (e) { return true; } }
    // the creature as its model code sees it: Lycanites' BaseCreatureEntity getters and the vanilla ones (by their obfuscated names), read from s,
    // a plain state object the engine fills from the entity's synced data each frame
    function entity(s, clsNames) { const is = new Set(clsNames || []);
      const E = { $s: s, $state: s, $is: n => is.has(n) || /^net\/minecraft\/entity\/(Entity|EntityLiving|EntityLivingBase|EntityCreature)$/.test(n) || n === 'java/lang/Object',
        get field_70122_E() { return s.onGround ? 1 : 0; }, get field_70171_ac() { return s.inWater ? 1 : 0; }, get field_70173_aa() { return s.ticks | 0; }, get onlyRenderTicks() { return -1; },
        get field_70177_z() { return s.yaw || 0; }, get field_70761_aq() { return s.yaw || 0; }, get field_70125_A() { return s.headPitch || 0; }, get field_70737_aN() { return s.hurt | 0; }, get field_70725_aQ() { return s.death | 0; },
        get field_70159_w() { return s.vx || 0; }, get field_70181_x() { return s.vy || 0; }, get field_70179_y() { return s.vz || 0; },
        func_70090_H: () => s.inWater ? 1 : 0, func_180799_ab: () => 0, func_70631_g_: () => s.child ? 1 : 0, func_70089_S: () => 1, func_82150_aj: () => s.invisible ? 1 : 0, func_98034_c: () => s.invisible ? 1 : 0,
        func_110143_aJ: () => s.health || 20, func_110138_aP: () => s.maxHealth || 20, func_70070_b: () => s.bright | 0, func_184207_aI: () => 0, func_184218_aH: () => 0, func_184188_bt: () => J.jlist(), func_184179_bs: () => null,
        func_70681_au: () => ({ nextFloat: () => Math.fround(Math.random()), nextInt: n => Math.floor(Math.random() * (n || 1)), nextBoolean: () => Math.random() < .5 ? 1 : 0, nextDouble: () => Math.random(), $is: () => true }),
        func_70617_f_: () => s.climbing ? 1 : 0, func_70093_af: () => 0, func_70051_ag: () => 0, func_184614_ca: () => null, func_70005_c_: () => s.name || '', func_145782_y: () => s.id | 0,
        isAttackOnCooldown: () => s.attackCooldown > 0 ? 1 : 0, getAttackCooldown: () => s.attackCooldown | 0, getAttackCooldownMax: () => s.attackCooldownMax | 0, getStealth: () => s.stealth || 0, getAttackPhase: () => s.attackPhase | 0,
        hasPickupEntity: () => (s.target & 32) ? 1 : 0, hasAttackTarget: () => (s.target & 1) ? 1 : 0, hasPerchTarget: () => (s.target & 64) ? 1 : 0, hasMaster: () => (s.target & 2) ? 1 : 0, hasParent: () => (s.target & 4) ? 1 : 0, hasAvoidTarget: () => (s.target & 8) ? 1 : 0, hasRiderTarget: () => (s.target & 16) ? 1 : 0,
        isBlocking: () => (s.anim & 8) ? 1 : 0, isFlying: () => s.flying ? 1 : 0, isSitting: () => (s.tamed & 1) && (s.tamed & 2) ? 1 : 0, isTamed: () => (s.tamed & 1) ? 1 : 0, isMinion: () => (s.anim & 16) ? 1 : 0, isBoss: () => (s.anim & 64) ? 1 : 0,
        getRenderScale: () => s.renderScale || 1, isStrongSwimmer: () => 0, canClimb: () => 0, hasSaddle: () => 0, canEquip: () => 0, isChild: () => s.child ? 1 : 0, getSubspeciesIndex: () => s.sub | 0, getVariantIndex: () => s.variant | 0,
        getSubspecies: () => ({ name: s.subName || null, index: s.sub | 0, $is: () => true }), getVariant: () => s.varColor ? { color: s.varColor, name: s.varColor, index: s.variant | 0, $is: () => true } : null, isRareVariant: () => 0,
        getTextureName: () => s.texName, getTexture: suf => opt.texKey([s.texName, s.subName, s.varColor, suf].filter(Boolean).join('_')), getSubTexture: suf => opt.texKey([s.texName, s.subName, suf].filter(Boolean).join('_')),
        getEquipmentTexture: () => null, getEquipmentName: () => null, getEquipmentPart: () => null, getConsumptionAnimation: () => 0, canPull: () => 0, hasLatchTarget: () => 0, isLanded: () => 0, getHealthPercentage: () => (s.health || 20) / (s.maxHealth || 20) };
      E.getTexture0 = E.getTexture; E['getTexture()Lnet/minecraft/util/ResourceLocation;'] = () => opt.texKey([s.texName, s.subName, s.varColor].filter(Boolean).join('_'));
      E['getTexture(Ljava/lang/String;)Lnet/minecraft/util/ResourceLocation;'] = E.getTexture;
      return new Proxy(E, { get(t, k) { if (k in t) return t[k]; if (typeof k === 'string' && /^(is|has|can|get|func_)[^(]*$/.test(k)) return () => 0; return undefined; } }); }
    return { vm, model, pose, layerTex, layerOn, entity, mul, rot, tr, sc, ident, parseObj, VEC };
  }
  window.StrataObjMobs = { create };
})();
