/* 战斗领域：敌人生成、瞄准、射击、伤害、经验和词条。 */
(function (Game) {
  "use strict";
  var C = Game.config, S = Game.state, U = Game.utils;
  Game.getWaveHpScale = function () {
    var session = S.session;
    if (!session || session.testArena || !session.waves) return 1;
    var plan = session.waves[session.wave - 1];
    return (plan && plan.hpScale) || 1;
  };
  Game.isFlyingEnemy = function (enemy) {
    var info = enemy && C.enemies[enemy.type];
    return !!(info && info.flying);
  };
  Game.canHitEnemy = function (source, enemy) {
    return !(source && source.groundOnly && Game.isFlyingEnemy(enemy));
  };
  Game.spawnEnemy = function (type, options) {
    var info = C.enemies[type], opts = options || {}, radius = info.radius;
    var edge = Math.max(22, radius + 4);
    var x = opts.x === undefined ? U.rand(edge, C.width - edge) : U.clamp(opts.x, radius, C.width - radius);
    var y = opts.y === undefined ? -radius - 8 : U.clamp(opts.y, -radius, S.wall ? S.wall.y - S.wall.height / 2 - radius - 3 : C.height);
    var maxHp = Math.round(info.hp * ((S.session && S.session.hpScale) || 1) * Game.getWaveHpScale());
    var enemy = { type: type, x: x, y: y, hp: maxHp, maxHp: maxHp, slow: 0, slowFactor: .58, damageTakenTimer: 0, damageTakenMultiplier: 1, burn: 0, burnDps: 0, wound: 0, woundFactor: 0, woundExtra: 0, woundExtraFactor: 0, hitFlash: 0, attackTimer: 0, regenPerSecond: info.regenPerSecond || 0, armorCharges: info.armorCharges || 0, armorStamp: -1e9, armorFlash: 0 };
    if (type === "boss") enemy.x = C.width / 2;
    S.enemies.push(enemy);
    if (info.codexCategory === "elite" && !opts.silent) {
      S.session.message = "精英来袭：" + info.name + "！";
      S.session.messageTimer = 2.5;
      Game.burst(enemy.x, enemy.y, 18, info.accent);
    }
  };
  Game.testSpawnEnemy = function (count) {
    var arena = S.testArena, ids = Game.getTestEnemyIds(), type, info, amount = Math.max(1, count || 1);
    if (!S.session || !S.session.testArena || !arena || !ids.length) return;
    type = ids[arena.enemyIndex] || ids[0];
    info = C.enemies[type];
    for (var i = 0; i < amount; i++) {
      Game.spawnEnemy(type, { x: type === "boss" ? C.width / 2 : U.rand(info.radius + 12, C.width - info.radius - 12), y: U.rand(150, 285), silent: true });
    }
    S.session.message = "生成 " + amount + " 只 · " + info.name;
    S.session.messageTimer = 1.2;
  };
  Game.testUnlockSkill = function () {
    var arena = S.testArena, definition = arena && C.coreSkills[arena.skillIndex], skill, unlockTrait;
    if (!S.session || !S.session.testArena || !definition) return;
    skill = S.player.skills[definition.id];
    if (skill.unlocked) { S.session.message = definition.name + " 已解锁"; }
    else {
      Game.unlockSkill(definition.id, true);
      unlockTrait = (C.skillTraits || []).filter(function (trait) { return trait.skillId === definition.id && trait.unlocksSkill; })[0];
      if (unlockTrait) S.player.traits[unlockTrait.id] = 1;
      S.session.message = "已解锁：" + definition.name;
    }
    S.session.messageTimer = 1.5;
  };
  Game.testApplyTrait = function () {
    var arena = S.testArena, definition = arena && C.coreSkills[arena.skillIndex], skill, traits, trait, count;
    if (!S.session || !S.session.testArena || !definition) return;
    skill = S.player.skills[definition.id];
    if (!skill.unlocked) { S.session.message = "请先解锁" + definition.name; S.session.messageTimer = 1.4; return; }
    traits = (C.skillTraits || []).filter(function (item) { return item.skillId === definition.id && !item.unlocksSkill; });
    trait = traits[arena.traitIndex];
    if (!trait) return;
    count = S.player.traits[trait.id] || 0;
    if (count >= trait.max) { S.session.message = trait.name + "已满级"; S.session.messageTimer = 1.4; return; }
    S.player.traits[trait.id] = count + 1;
    skill.level++;
    trait.apply(S.player);
    S.session.message = "已应用：" + trait.name + " Lv." + S.player.traits[trait.id];
    S.session.messageTimer = 1.5;
  };
  Game.testClearBuild = function () {
    var p = S.player, skills = {};
    if (!S.session || !S.session.testArena) return;
    Object.keys(C.skillDefaults).forEach(function (id) {
      skills[id] = {};
      Object.keys(C.skillDefaults[id]).forEach(function (key) { skills[id][key] = C.skillDefaults[id][key]; });
      skills[id].fireTimer = skills[id].fireInterval * .5;
      skills[id].burstShotsRemaining = 0;
      skills[id].burstTimer = 0;
      skills[id].burstAngle = -Math.PI / 2;
    });
    p.damage = 28; p.fireInterval = .52; p.burst = 0; p.spread = 0; p.pierce = 0; p.bulletRadius = 4; p.crit = .08; p.critDamage = 1.5; p.burn = 0; p.freeze = 0; p.bulletType = "normal"; p.skills = skills; p.traits = {}; p.skillOrder = [];
    p.ammo = p.magazineSize; p.reloadTimer = 0; p.rifleEnabled = true; p.fireTimer = 0; p.burstShotsRemaining = 0; p.burstTimer = 0;
    S.bullets = []; S.skillProjectiles = []; S.armoredCars = []; S.bombDrops = []; S.bombZones = []; S.electromagneticZones = []; S.tornadoes = []; S.drones = []; S.hailStorms = []; S.fuelShells = []; S.fuelPools = []; S.explosions = [];
    S.session.message = "技能和词条已清空";
    S.session.messageTimer = 1.5;
  };
  Game.testClearEnemies = function () {
    if (!S.session || !S.session.testArena) return;
    S.enemies = [];
    S.pendingSpawns = [];
    S.bullets = [];
    S.skillProjectiles = [];
    S.armoredCars = [];
    S.bombDrops = [];
    S.bombZones = [];
    S.electromagneticZones = [];
    S.tornadoes = [];
    S.drones = [];
    S.hailStorms = [];
    S.fuelShells = [];
    S.fuelPools = [];
    S.explosions = [];
    S.session.message = "测试场已清空";
    S.session.messageTimer = 1.2;
  };
  Game.testRestore = function () {
    if (!S.session || !S.session.testArena) return;
    S.wall.hp = S.wall.maxHp;
    S.player.hp = S.player.maxHp;
    S.player.ammo = S.player.magazineSize;
    S.player.reloadTimer = 0;
    S.player.fireTimer = 0;
    Object.keys(S.player.skills).forEach(function (type) {
      S.player.skills[type].fireTimer = 0;
      S.player.skills[type].burstShotsRemaining = 0;
      S.player.skills[type].burstTimer = 0;
      S.player.skills[type].active = false;
      S.player.skills[type].activeElapsed = 0;
    });
    S.session.message = "状态已恢复";
    S.session.messageTimer = 1.2;
  };
  Game.queueSplitSpawns = function (enemy, info) {
    if (!info.splitInto || !info.splitCount) return;
    var parentRadius = C.enemies[enemy.type].radius, childRadius = C.enemies[info.splitInto].radius, gap = parentRadius + childRadius + 6;
    for (var i = 0; i < info.splitCount; i++) {
      var offset = info.splitCount === 1 ? 0 : (i - (info.splitCount - 1) / 2) * gap;
      S.pendingSpawns.push({ type: info.splitInto, x: enemy.x + offset, y: enemy.y });
    }
  };
  Game.flushPendingSpawns = function () {
    if (!S.pendingSpawns || !S.pendingSpawns.length) return;
    var queue = S.pendingSpawns;
    S.pendingSpawns = [];
    queue.forEach(function (item) { Game.spawnEnemy(item.type, { x: item.x, y: item.y, silent: true }); });
  };
  Game.getEnemyHoldY = function (info) {
    if (!S.wall || !info) return C.height;
    var wallLine = S.wall.y - S.wall.height / 2;
    if (info.ranged) return wallLine - info.ranged.standoff;
    return wallLine - info.radius - 3 - (info.flying ? (C.flyingHover || 0) : 0);
  };
  Game.getRangeLine = function (rangeName) {
    var wallTop = S.wall ? S.wall.y - S.wall.height / 2 : C.height;
    var ranges = C.ranges || {};
    return wallTop - (ranges[rangeName] || 0);
  };
  Game.getSkillRangeName = function (id) {
    var list = C.coreSkills || [];
    if (id === "rifle") return C.rifleRange || "far";
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].range || "far";
    return "far";
  };
  Game.getSkillRangeLine = function (id) { return Game.getRangeLine(Game.getSkillRangeName(id)); };
  Game.isSkillRangeEngaged = function (id) {
    var line = Game.getSkillRangeLine(id);
    for (var i = 0; i < S.enemies.length; i++) if (S.enemies[i].y >= line) return true;
    return false;
  };
  Game.getWeaponMount = function (p) {
    var rifle = C.sprites && C.sprites.playerRifle;
    return {
      x: p.x + (rifle && rifle.mountX !== undefined ? rifle.mountX : 0),
      y: p.y + (rifle && rifle.mountY !== undefined ? rifle.mountY : 0)
    };
  };
  Game.getAimAngleForShot = function (targetAngle, p) {
    var lanes = 1 + p.spread, lockLane = Math.floor((lanes - 1) / 2);
    var lockOffset = (lockLane - (lanes - 1) / 2) * (C.spreadAngle || 0);
    return targetAngle - lockOffset;
  };
  Game.updateAim = function (dt) {
    var p = S.player;
    if (p.manualAimTimer > 0) {
      p.manualAimTimer = Math.max(0, p.manualAimTimer - dt);
      if (p.manualAimTimer > 0) return;
    }

    var mount = Game.getWeaponMount(p), target = null, targetX = 0, targetY = 0, bestTime = Infinity;
    var rifleLine = Game.getSkillRangeLine("rifle");
    S.enemies.forEach(function (enemy) {
      if (enemy.y < rifleLine) return;
      var info = C.enemies[enemy.type];
      var speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
      if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
      var attackY = Game.getEnemyHoldY(info);
      var predictedX = enemy.x, predictedY = enemy.y, flightTime = 0;

      // Re-estimate the intercept point so moving enemies, including those near either edge, stay on the firing line.
      for (var i = 0; i < 3; i++) {
        var dx = predictedX - mount.x, dy = predictedY - mount.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        flightTime = Math.max(0, (distance - C.muzzleDistance) / 300);
        predictedX = enemy.x;
        predictedY = Math.min(attackY, enemy.y + speed * flightTime);
      }

      if (flightTime < bestTime) {
        bestTime = flightTime;
        target = enemy;
        targetX = predictedX;
        targetY = predictedY;
      }
    });

    p.aimAngle = target ? Game.getAimAngleForShot(Math.atan2(targetY - mount.y, targetX - mount.x), p) : -Math.PI / 2;
  };
  Game.setManualAim = function (x, y) { var p = S.player, mount = Game.getWeaponMount(p), dx = x - mount.x, dy = y - mount.y; if (dx * dx + dy * dy < 16) return; p.aimAngle = Game.getAimAngleForShot(Math.atan2(dy, dx), p); p.manualAimTimer = 2.5; S.session.message = "手动瞄准"; S.session.messageTimer = .7; };
  Game.getWeaponMuzzle = function (p, distance, angle) {
    var mount = Game.getWeaponMount(p), muzzleDistance = distance || C.muzzleDistance, shotAngle = angle === undefined ? p.aimAngle : angle;
    return { x: mount.x + Math.cos(shotAngle) * muzzleDistance, y: mount.y + Math.sin(shotAngle) * muzzleDistance };
  };
  Game.startReload = function (p) {
    if (p.reloadTimer > 0 || p.ammo > 0) return;
    p.reloadTimer = p.reloadDuration;
    p.burstShotsRemaining = 0;
    p.burstTimer = 0;
  };
  Game.toggleRifle = function () {
    var p = S.player;
    if (!p) return;
    p.rifleEnabled = p.rifleEnabled === false;
    if (!p.rifleEnabled) {
      p.burstShotsRemaining = 0;
      p.burstTimer = 0;
      p.fireTimer = 0;
      p.reloadTimer = p.reloadDuration;
      S.bullets = [];
      S.session.message = "步枪已关闭，正在换弹";
    } else S.session.message = "步枪已开启";
    S.session.messageTimer = 1.2;
  };
  Game.fireShot = function (p, shotAngle) {
    var lanes = 1 + p.spread;
    var muzzle = Game.getWeaponMuzzle(p, C.muzzleDistance, shotAngle);
    var bulletColor = p.bulletType === "ice" ? C.colors.ice : p.bulletType === "fire" ? C.colors.fire : "#ffffff";
    // 齐射以等角度展开弹道；整轮弹药由 Game.fire 统一扣除。
    for (var lane = 0; lane < lanes; lane++) {
      var spreadOffset = lane - (lanes - 1) / 2, bulletAngle = shotAngle + spreadOffset * C.spreadAngle;
      var laneMuzzle = Game.getWeaponMuzzle(p, C.muzzleDistance, bulletAngle), critical = Math.random() < p.crit;
      S.bullets.push({ x: laneMuzzle.x, y: laneMuzzle.y, vx: Math.cos(bulletAngle) * 300, vy: Math.sin(bulletAngle) * 300, damage: p.damage * (critical ? p.critDamage : 1), critical: critical, radius: p.bulletRadius, pierce: p.pierce, color: bulletColor, hitEnemies: [] });
    }
    for (var i = 0; i < 3; i++) S.particles.push({ x: muzzle.x + U.rand(-3, 3), y: muzzle.y + U.rand(-3, 3), vx: U.rand(-20, 20), vy: U.rand(-65, -25), life: .18, maxLife: .18, color: bulletColor, size: U.rand(2, 4) });
    return lanes;
  };
  Game.fire = function () {
    var p = S.player;
    if (p.reloadTimer > 0) return;
    if (!Game.isSkillRangeEngaged("rifle")) return;
    if (p.ammo <= 0) { Game.startReload(p); return; }
    p.burstAngle = p.aimAngle;
    p.ammo--;
    Game.fireShot(p, p.burstAngle);
    p.fireTimer = p.fireInterval;
    p.burstShotsRemaining = p.burst;
    p.burstTimer = p.burstShotsRemaining > 0 ? Math.max(.06, p.fireInterval * .2) : 0;
    if (p.ammo <= 0 && p.burstShotsRemaining <= 0) Game.startReload(p);
  };
  Game.fireBurstShot = function () {
    var p = S.player;
    if (p.burstShotsRemaining <= 0 || p.reloadTimer > 0) return;
    Game.fireShot(p, p.burstAngle);
    p.burstShotsRemaining--;
    if (p.burstShotsRemaining > 0) p.burstTimer = Math.max(.06, p.fireInterval * .2);
    else if (p.ammo <= 0) Game.startReload(p);
  };
  Game.getSkillMuzzle = function () {
    var ring = C.skillRing || {};
    return { x: C.width / 2 + (ring.offsetX || 64), y: C.height + (ring.offsetY || -100) };
  };
  Game.getSkillTargetAngle = function (type, origin, preferredAwayFrom) {
    var skill = S.player.skills[type], targetAngle = null, bestTime = Infinity, bestDiversity = -1;
    var rangeLine = Game.getSkillRangeLine(type);
    S.enemies.forEach(function (enemy) {
      if (enemy.y < rangeLine) return;
      var info = C.enemies[enemy.type], speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
      if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
      var attackY = Game.getEnemyHoldY(info);
      var predictedX = enemy.x, predictedY = enemy.y, flightTime = 0, targetX, targetY;
      for (var i = 0; i < 3; i++) {
        var dx = predictedX - origin.x, dy = predictedY - origin.y;
        flightTime = Math.max(0, (Math.sqrt(dx * dx + dy * dy) - skill.projectileRadius) / skill.projectileSpeed);
        predictedY = Math.min(attackY, enemy.y + speed * flightTime);
        targetX = predictedX;
        targetY = predictedY;
      }
      var angle = Math.atan2(targetY - origin.y, targetX - origin.x);
      if ((type === "dryIce" || type === "airBlade") && skill.spread > 0) {
        var lanes = 1 + skill.spread, lockLane = Math.floor((lanes - 1) / 2);
        angle -= (lockLane - (lanes - 1) / 2) * C.spreadAngle;
      }
      var diversity = Infinity;
      if (preferredAwayFrom && preferredAwayFrom.length) {
        preferredAwayFrom.forEach(function (previousAngle) {
          var angleDifference = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
          diversity = Math.min(diversity, Math.abs(angleDifference));
        });
      } else diversity = 0;
      if (targetAngle === null || diversity > bestDiversity + .000001 || (Math.abs(diversity - bestDiversity) <= .000001 && flightTime < bestTime)) {
        bestTime = flightTime;
        bestDiversity = diversity;
        targetAngle = angle;
      }
    });
    return targetAngle;
  };
  Game.getElectromagneticTargets = function (skill) {
    var rangeLine = Game.getSkillRangeLine("electromagnetic");
    return S.enemies.filter(function (enemy) { return enemy.y >= rangeLine; }).sort(function (a, b) {
      var aInfo = C.enemies[a.type], bInfo = C.enemies[b.type];
      var aScore = a.y + aInfo.radius * .35, bScore = b.y + bInfo.radius * .35;
      if (a.type === "boss") aScore += 10;
      if (b.type === "boss") bScore += 10;
      return bScore - aScore;
    }).slice(0, 1 + skill.extraTargets);
  };
  Game.launchElectromagnetic = function () {
    var skill = S.player.skills.electromagnetic, targets;
    if (!skill.unlocked || skill.fireTimer > 0) return false;
    targets = Game.getElectromagneticTargets(skill);
    if (!targets.length) return false;
    targets.forEach(function (target, index) {
      S.skillProjectiles.push({ type: "electromagnetic", target: target, x: target.x, y: target.y, delay: index * .14, damage: skill.damage, stunDuration: skill.stunDuration, explosion: skill.explosion, explosionDamage: skill.explosionDamage, explosionRadius: skill.explosionRadius, matrix: skill.matrix, matrixDuration: skill.matrixDuration, matrixDps: skill.matrixDps, matrixRadius: skill.matrixRadius, matrixSlowFactor: skill.matrixSlowFactor });
    });
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.getHighEnergyBeamEnd = function (origin, angle) {
    var dx = Math.cos(angle), dy = Math.sin(angle), distances = [];
    if (dx > .0001) distances.push((C.width - origin.x) / dx);
    if (dx < -.0001) distances.push(-origin.x / dx);
    if (dy > .0001) distances.push((C.height - origin.y) / dy);
    if (dy < -.0001) distances.push(-origin.y / dy);
    distances = distances.filter(function (distance) { return distance > 0; });
    var length = distances.length ? Math.min.apply(Math, distances) : 0;
    return { x: origin.x + dx * length, y: origin.y + dy * length };
  };
  Game.getHighEnergyBeamAngle = function (origin, skill) {
    var bestAngle = null, bestScore = -1, rangeLine = Game.getSkillRangeLine("highEnergyBeam");
    S.enemies.forEach(function (candidate) {
      if (candidate.y < rangeLine) return;
      var angle = Math.atan2(candidate.y - origin.y, candidate.x - origin.x);
      if (Math.sin(angle) >= 0) return;
      var end = Game.getHighEnergyBeamEnd(origin, angle), dx = end.x - origin.x, dy = end.y - origin.y, length = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / length, uy = dy / length, score = 0;
      S.enemies.forEach(function (enemy) {
        var ex = enemy.x - origin.x, ey = enemy.y - origin.y, along = ex * ux + ey * uy, across = Math.abs(ex * uy - ey * ux), radius = skill.beamWidth / 2 + C.enemies[enemy.type].radius;
        if (along >= 0 && along <= length && across <= radius) score += enemy.type === "boss" ? 2 : C.enemies[enemy.type].codexCategory === "elite" ? 1.5 : 1;
      });
      if (score > bestScore) { bestScore = score; bestAngle = angle; }
    });
    return bestAngle;
  };
  Game.launchHighEnergyBeam = function (skill) {
    var origin = Game.getSkillMuzzle(), angle = Game.getHighEnergyBeamAngle(origin, skill), end;
    if (!skill.unlocked || skill.active || skill.fireTimer > 0 || angle === null) return false;
    end = Game.getHighEnergyBeamEnd(origin, angle);
    skill.active = true; skill.activeAngle = angle; skill.activeX = origin.x; skill.activeY = origin.y; skill.activeX2 = end.x; skill.activeY2 = end.y; skill.activeElapsed = 0; skill.damageTicksDone = 0;
    return true;
  };
  Game.hitHighEnergyBeam = function (skill) {
    var dx = skill.activeX2 - skill.activeX, dy = skill.activeY2 - skill.activeY, length = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / length, uy = dy / length;
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var enemy = S.enemies[i], ex = enemy.x - skill.activeX, ey = enemy.y - skill.activeY, along = ex * ux + ey * uy, across = Math.abs(ex * uy - ey * ux), reach = skill.beamWidth / 2 + C.enemies[enemy.type].radius;
      if (along < 0 || along > length || across > reach) continue;
      if (skill.crippleEnabled && skill.damageTakenDuration > 0) { enemy.damageTakenTimer = Math.max(enemy.damageTakenTimer || 0, skill.damageTakenDuration); enemy.damageTakenMultiplier = skill.damageTakenMultiplier; }
      if (skill.slowEnabled && skill.slowDuration > 0) Game.applySlow(enemy, skill.slowDuration, skill.slowFactor);
      Game.damageEnemy(enemy, skill.damage, { critical: false, noWeaponEffects: true, silentText: true });
      if (enemy.hp <= 0) Game.killEnemy(i);
    }
  };
  Game.launchSkillVolley = function (type, angle) {
    var skill = S.player.skills[type], origin = Game.getSkillMuzzle();
    if (type === "thermobaric") {
      S.skillProjectiles.push({ type: type, x: origin.x, y: origin.y, vx: Math.cos(angle) * skill.projectileSpeed, vy: Math.sin(angle) * skill.projectileSpeed, radius: skill.projectileRadius, impactDamage: skill.impactDamage, impactKnockback: skill.impactKnockback, explosionDamage: skill.explosionDamage, explosionRadius: skill.explosionRadius, explosionKnockback: skill.explosionKnockback, burnDps: skill.burnDps, burnDuration: skill.burnDuration, pierce: skill.pierce, hasImpacted: false, fuseTimer: 0, critical: false, hitEnemies: [] });
      return;
    }
    if (type === "airBlade") {
      var bladeLanes = 1 + skill.spread;
      for (var blade = 0; blade < bladeLanes; blade++) {
        var bladeAngle = angle + (blade - (bladeLanes - 1) / 2) * C.spreadAngle;
        S.skillProjectiles.push({ type: type, x: origin.x, y: origin.y, vx: Math.cos(bladeAngle) * skill.projectileSpeed, vy: Math.sin(bladeAngle) * skill.projectileSpeed, radius: skill.projectileRadius, damage: skill.damage, knockback: skill.knockback, pierce: skill.pierce, woundDuration: skill.woundDuration, woundFactor: skill.woundFactor, woundExtraDuration: skill.woundExtraDuration, woundExtraFactor: skill.woundExtraFactor, critical: false, hitEnemies: [] });
      }
      return;
    }
    var lanes = 1 + skill.spread;
    for (var lane = 0; lane < lanes; lane++) {
      var bulletAngle = angle + (lane - (lanes - 1) / 2) * C.spreadAngle;
      S.skillProjectiles.push({ type: type, x: origin.x, y: origin.y, vx: Math.cos(bulletAngle) * skill.projectileSpeed, vy: Math.sin(bulletAngle) * skill.projectileSpeed, radius: skill.projectileRadius, damage: skill.damage, knockback: skill.knockback, pierce: skill.pierce, splitCount: skill.splitCount, freezeDuration: skill.freezeDuration, slowFactor: skill.slowFactor, critical: false, hitEnemies: [] });
    }
  };
  Game.launchArmoredCars = function (skill) {
    var wall = S.wall, count = 1 + skill.extraCars, scale = 1 + skill.sizeLevel * .15;
    var minX = wall.x - wall.width / 2 + skill.carWidth * scale / 2, maxX = wall.x + wall.width / 2 - skill.carWidth * scale / 2;
    var laneWidth = (maxX - minX) / count, startY = wall.y - wall.height / 2 - skill.carLength * scale / 2;
    for (var i = 0; i < count; i++) {
      var x = count === 1 ? U.rand(minX, maxX) : minX + laneWidth * (i + .5) + U.rand(-laneWidth * .18, laneWidth * .18);
      S.armoredCars.push({ x: U.clamp(x, minX, maxX), y: startY, speed: skill.speed, width: skill.carWidth * scale, length: skill.carLength * scale, damage: skill.damage, hitInterval: skill.hitInterval, slowFactor: skill.slowFactor, slowDuration: skill.slowDuration, stunChance: skill.stunChance, stunDuration: skill.stunDuration, groundOnly: !!skill.groundOnly, contacts: [], impactFlash: 0 });
    }
  };
  Game.updateSkills = function (dt) {
    var p = S.player;
    Object.keys(p.skills).forEach(function (type) {
      var skill = p.skills[type];
      if (!skill.unlocked) return;
      if (type === "armoredCar") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) { Game.launchArmoredCars(skill); skill.fireTimer = skill.fireInterval; }
        return;
      }
      if (type === "bombardment") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) Game.launchBombardment();
        return;
      }
      if (type === "electromagnetic") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) Game.launchElectromagnetic();
        return;
      }
      if (type === "chainLightning") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) Game.launchChainLightning();
        return;
      }
      if (type === "highEnergyBeam") {
        if (skill.active) {
          skill.activeElapsed = Math.min(skill.duration, skill.activeElapsed + dt);
          while (skill.damageTicksDone < skill.damageHits && skill.activeElapsed + .000001 >= skill.duration * (skill.damageTicksDone + 1) / skill.damageHits) {
            Game.hitHighEnergyBeam(skill);
            skill.damageTicksDone++;
          }
          if (skill.activeElapsed >= skill.duration) { skill.active = false; skill.fireTimer = skill.fireInterval; }
        } else {
          skill.fireTimer = Math.max(0, skill.fireTimer - dt);
          if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) Game.launchHighEnergyBeam(skill);
        }
        return;
      }
      if (type === "whirlwindCannon") {
        if (skill.active) {
          skill.activeElapsed = Math.min(skill.duration, skill.activeElapsed + dt);
          if (skill.activeElapsed >= skill.duration) { skill.active = false; skill.fireTimer = skill.fireInterval; }
          return;
        }
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && Game.isSkillRangeEngaged(type)) Game.launchWhirlwindCannon();
        return;
      }
      if (type === "hailGenerator") {
        if (skill.active) {
          skill.activeElapsed = Math.min(skill.duration, skill.activeElapsed + dt);
          if (skill.activeElapsed >= skill.duration) skill.active = false;
        }
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && !skill.active && Game.isSkillRangeEngaged(type)) Game.launchHailGenerator();
        return;
      }
      if (type === "drone") {
        if (skill.active) {
          skill.activeElapsed = Math.min(skill.duration, skill.activeElapsed + dt);
          if (skill.activeElapsed >= skill.duration) skill.active = false;
        }
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && !skill.active && Game.isSkillRangeEngaged(type)) Game.launchDrone();
        return;
      }
      if (type === "fuelBomb") {
        var fuelWindow = skill.flightTime + skill.duration;
        if (skill.active) {
          skill.activeElapsed = Math.min(fuelWindow, skill.activeElapsed + dt);
          if (skill.activeElapsed >= fuelWindow) skill.active = false;
        }
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && !skill.active && Game.isSkillRangeEngaged(type)) Game.launchFuelBomb();
        return;
      }
      if (skill.burstShotsRemaining > 0) {
        skill.burstTimer -= dt;
        if (skill.burstTimer <= 0) {
          var burstOrigin = Game.getSkillMuzzle(), burstAngles = skill.burstAngles || [], burstAngle = Game.getSkillTargetAngle(type, burstOrigin, burstAngles);
          if (burstAngle !== null) {
            Game.launchSkillVolley(type, burstAngle);
            burstAngles.push(burstAngle);
          }
          skill.burstShotsRemaining--;
          if (skill.burstShotsRemaining > 0) skill.burstTimer = .18;
          else skill.burstAngles = [];
        }
        return;
      }
      skill.fireTimer = Math.max(0, skill.fireTimer - dt);
      if (skill.fireTimer > 0 || !Game.isSkillRangeEngaged(type)) return;
      var origin = Game.getSkillMuzzle(), angle = Game.getSkillTargetAngle(type, origin);
      if (angle === null) return;
      Game.launchSkillVolley(type, angle);
      skill.fireTimer = skill.fireInterval;
      skill.burstShotsRemaining = skill.burst;
      skill.burstTimer = skill.burst > 0 ? .18 : 0;
      skill.burstAngles = skill.burst > 0 ? [angle] : [];
    });
  };
  Game.applyKnockback = function (enemy, sourceX, sourceY, distance) {
    var dx = enemy.x - sourceX, dy = enemy.y - sourceY, length = Math.sqrt(dx * dx + dy * dy) || 1;
    var radius = C.enemies[enemy.type].radius;
    enemy.x = U.clamp(enemy.x + dx / length * distance, radius, C.width - radius);
    enemy.y = Math.max(-radius, enemy.y + dy / length * distance);
  };
  Game.blockWithArmor = function (enemy) {
    if (!enemy.armorCharges || enemy.armorCharges <= 0) return false;
    var elapsed = (S.session && S.session.elapsed) || 0;
    if (elapsed - (enemy.armorStamp === undefined ? -1e9 : enemy.armorStamp) < C.armorBlockWindow) return true;
    enemy.armorStamp = elapsed;
    enemy.armorCharges--;
    enemy.armorFlash = .34;
    if (enemy.armorCharges === 0) Game.addText(enemy.x, enemy.y - C.enemies[enemy.type].radius - 12, "护甲破碎", C.colors.cyan);
    return true;
  };
  Game.applySlow = function (enemy, duration, factor) {
    if (Game.blockWithArmor(enemy)) return false;
    enemy.slow = Math.max(enemy.slow || 0, duration);
    enemy.slowFactor = Math.min(enemy.slowFactor || .58, factor);
    return true;
  };
  Game.applyStun = function (enemy, duration) {
    if (!duration || duration <= 0) return false;
    if (Game.blockWithArmor(enemy)) return false;
    enemy.stun = Math.max(enemy.stun || 0, duration);
    return true;
  };
  Game.applyBurn = function (enemy, dps, duration) {
    if (Game.blockWithArmor(enemy)) return false;
    enemy.burn = Math.max(enemy.burn || 0, duration);
    enemy.burnDps = Math.max(enemy.burnDps || 0, dps);
    return true;
  };
  Game.applyWound = function (enemy, duration, factor, extraDuration, extraFactor) {
    var base = duration > 0, extra = extraDuration > 0;
    if (!base && !extra) return false;
    if (Game.blockWithArmor(enemy)) return false;
    if (base) {
      enemy.wound = Math.max(enemy.wound || 0, duration);
      enemy.woundFactor = Math.max(enemy.woundFactor || 0, factor || 0);
    }
    if (extra) {
      enemy.woundExtra = Math.max(enemy.woundExtra || 0, extraDuration);
      enemy.woundExtraFactor = Math.max(enemy.woundExtraFactor || 0, extraFactor || 0);
    }
    return true;
  };
  Game.getHealScale = function (enemy) {
    var cut = 0;
    if (enemy.wound > 0) cut += enemy.woundFactor || 0;
    if (enemy.woundExtra > 0) cut += enemy.woundExtraFactor || 0;
    return U.clamp(1 - cut, 0, 1);
  };
  Game.explodeThermobaric = function (projectile) {
    S.explosions.push({ x: projectile.x, y: projectile.y, radius: projectile.explosionRadius, life: .42, duration: .42 });
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var enemy = S.enemies[i], dx = enemy.x - projectile.x, dy = enemy.y - projectile.y;
      if (dx * dx + dy * dy > Math.pow(projectile.explosionRadius + C.enemies[enemy.type].radius, 2)) continue;
      Game.damageEnemy(enemy, projectile.explosionDamage, projectile);
      Game.applyBurn(enemy, projectile.burnDps, projectile.burnDuration);
      Game.applyKnockback(enemy, projectile.x, projectile.y, projectile.explosionKnockback);
      if (enemy.hp <= 0) Game.killEnemy(i);
    }
  };
  Game.splitDryIceProjectile = function (projectile, enemy) {
    if (projectile.splitCount <= 0 || projectile.isShard || projectile.splitTriggered) return;
    projectile.splitTriggered = true;
    var angle = Math.atan2(projectile.vy, projectile.vx), count = projectile.splitCount;
    for (var i = 0; i < count; i++) {
      var shardAngle = angle + (i - (count - 1) / 2) * .2;
      S.skillProjectiles.push({ type: "iceShard", x: enemy.x, y: enemy.y, vx: Math.cos(shardAngle) * 245, vy: Math.sin(shardAngle) * 245, radius: Math.max(3, projectile.radius * .58), damage: projectile.damage * .45, knockback: projectile.knockback * .5, pierce: 0, splitCount: 0, freezeDuration: projectile.freezeDuration, slowFactor: projectile.slowFactor, critical: false, hitEnemies: [enemy], isShard: true });
    }
  };
  Game.updateSkillProjectiles = function (dt) {
    for (var i = S.skillProjectiles.length - 1; i >= 0; i--) {
      var projectile = S.skillProjectiles[i];
      if (projectile.type === "chainLightning") {
        if (Game.updateChainLightnings(projectile, dt)) S.skillProjectiles.splice(i, 1);
        continue;
      }
      if (projectile.type === "electromagnetic") {
        if (S.enemies.indexOf(projectile.target) >= 0) { projectile.x = projectile.target.x; projectile.y = projectile.target.y; }
        projectile.delay -= dt;
        if (projectile.delay <= 0) { Game.resolveElectromagneticStrike(projectile); S.skillProjectiles.splice(i, 1); }
        continue;
      }
      projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt;
      var removed = projectile.x < -30 || projectile.x > C.width + 30 || projectile.y < -30 || projectile.y > C.height + 30;
      if (!removed && projectile.type === "thermobaric" && projectile.hasImpacted) {
        projectile.fuseTimer = Math.max(0, projectile.fuseTimer - dt);
        if (projectile.fuseTimer === 0) { Game.explodeThermobaric(projectile); removed = true; }
      }
      for (var j = S.enemies.length - 1; j >= 0 && !removed; j--) {
        var enemy = S.enemies[j], radius = C.enemies[enemy.type].radius + projectile.radius;
        if (projectile.hitEnemies.indexOf(enemy) >= 0 || Math.pow(projectile.x - enemy.x, 2) + Math.pow(projectile.y - enemy.y, 2) >= radius * radius) continue;
        projectile.hitEnemies.push(enemy);
        if (projectile.type === "thermobaric") {
          Game.damageEnemy(enemy, projectile.impactDamage, projectile);
          Game.applyKnockback(enemy, projectile.x - projectile.vx, projectile.y - projectile.vy, projectile.impactKnockback);
          if (enemy.hp <= 0) Game.killEnemy(j);
          if (projectile.pierce > 0) { projectile.pierce--; projectile.hasImpacted = true; projectile.fuseTimer = .18; }
          else { Game.explodeThermobaric(projectile); removed = true; }
        } else {
          Game.damageEnemy(enemy, projectile.damage, projectile);
          if (projectile.knockback > 0) Game.applyKnockback(enemy, projectile.x - projectile.vx, projectile.y - projectile.vy, projectile.knockback);
          if (projectile.freezeDuration > 0) Game.applySlow(enemy, projectile.freezeDuration, projectile.slowFactor);
          if (projectile.woundDuration > 0 || projectile.woundExtraDuration > 0) Game.applyWound(enemy, projectile.woundDuration, projectile.woundFactor, projectile.woundExtraDuration, projectile.woundExtraFactor);
          Game.splitDryIceProjectile(projectile, enemy);
          if (enemy.hp <= 0) Game.killEnemy(j);
          projectile.pierce--;
          if (projectile.pierce < 0) removed = true;
        }
      }
      if (removed) S.skillProjectiles.splice(i, 1);
    }
  };
  Game.resolveElectromagneticStrike = function (strike) {
    var targetIndex = S.enemies.indexOf(strike.target), centerX = strike.x, centerY = strike.y, enemy;
    if (targetIndex < 0) return;
    enemy = S.enemies[targetIndex];
    centerX = enemy.x; centerY = enemy.y;
    S.explosions.push({ type: "electromagneticStrike", x: centerX, y: centerY, radius: 18, life: .3, duration: .3 });
    Game.damageEnemy(enemy, strike.damage, { critical: false, noWeaponEffects: true });
    Game.applyStun(enemy, strike.stunDuration);
    if (enemy.hp <= 0) Game.killEnemy(targetIndex);
    if (strike.explosion) {
      S.explosions.push({ type: "electromagnetic", x: centerX, y: centerY, radius: strike.explosionRadius, life: .48, duration: .48 });
      for (var i = S.enemies.length - 1; i >= 0; i--) {
        enemy = S.enemies[i];
        if ((enemy.x - centerX) * (enemy.x - centerX) + (enemy.y - centerY) * (enemy.y - centerY) > Math.pow(strike.explosionRadius + C.enemies[enemy.type].radius, 2)) continue;
        Game.damageEnemy(enemy, strike.explosionDamage, { critical: false, noWeaponEffects: true });
        if (enemy.hp <= 0) Game.killEnemy(i);
      }
    }
    if (strike.matrix) S.electromagneticZones.push({ x: centerX, y: centerY, radius: strike.matrixRadius, life: strike.matrixDuration, duration: strike.matrixDuration, damage: strike.matrixDps, slowFactor: strike.matrixSlowFactor });
  };
  Game.updateElectromagneticZones = function (dt) {
    for (var i = S.electromagneticZones.length - 1; i >= 0; i--) {
      var zone = S.electromagneticZones[i];
      zone.life -= dt;
      if (zone.life <= 0) { S.electromagneticZones.splice(i, 1); continue; }
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var enemy = S.enemies[j], info = C.enemies[enemy.type], dx = enemy.x - zone.x, dy = enemy.y - zone.y, reach = zone.radius + info.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        Game.damageEnemy(enemy, zone.damage * dt, { critical: false, noWeaponEffects: true, silentText: true });
        Game.applySlow(enemy, .24, zone.slowFactor);
        if (enemy.hp <= 0) Game.killEnemy(j);
      }
    }
  };
  function bombardmentImpact(skill, point, wait) { return (wait || 0) + (point.y + 24) / skill.bombSpeed; }
  function bombardmentCoverage(skill, point, impactTime) {
    var score = 0;
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type], speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
      if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
      var attackY = Game.getEnemyHoldY(info), predictedY = Math.min(attackY, enemy.y + speed * impactTime);
      var dx = enemy.x - point.x, dy = predictedY - point.y, distance = Math.sqrt(dx * dx + dy * dy), reach = skill.blastRadius + info.radius;
      if (distance > reach) return;
      var weight = enemy.type === "boss" ? 1.6 : info.codexCategory === "elite" ? 1.3 : 1;
      score += weight * (1.1 - distance / reach);
    });
    return score;
  }
  function pushBombTargetAway(point, taken, offset, minY, maxY) {
    var result = { x: point.x, y: point.y }, margin = C.enemies.boss.radius;
    var angles = [0, Math.PI / 3, -Math.PI / 3, Math.PI * 2 / 3, -Math.PI * 2 / 3, Math.PI];
    taken.forEach(function (other) {
      var dx = result.x - other.x, dy = result.y - other.y, gap = Math.sqrt(dx * dx + dy * dy), base = Math.atan2(dy, dx);
      if (gap >= offset) return;
      if (gap < .001) base = 0;
      for (var i = 0; i < angles.length; i++) {
        var angle = base + angles[i];
        var nx = U.clamp(other.x + Math.cos(angle) * offset, margin, C.width - margin);
        var ny = U.clamp(other.y + Math.sin(angle) * offset, minY, maxY);
        var ndx = nx - other.x, ndy = ny - other.y;
        if (Math.sqrt(ndx * ndx + ndy * ndy) >= offset - .5) { result.x = nx; result.y = ny; return; }
      }
      result.x = U.clamp(other.x + Math.cos(base) * offset, margin, C.width - margin);
      result.y = U.clamp(other.y + Math.sin(base) * offset, minY, maxY);
    });
    return result;
  }
  Game.isBombTargetTooClose = function (point, taken, separation) {
    for (var i = 0; i < taken.length; i++) {
      var dx = point.x - taken[i].x, dy = point.y - taken[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < separation) return true;
    }
    return false;
  };
  Game.getBombardmentTarget = function (skill, delay, avoid) {
    if (!S.enemies.length) return null;
    var wait = delay || 0, taken = avoid || [], candidates = [];
    var separation = Math.max(56, skill.blastRadius * (skill.bombMinSeparationRatio || .9));
    var minY = 82, maxY = S.wall.y - S.wall.height / 2 - C.enemies.boss.radius;
    var rangeLine = Game.getSkillRangeLine("bombardment");
    S.enemies.forEach(function (candidate) {
      if (candidate.y < rangeLine) return;
      var candidateInfo = C.enemies[candidate.type], candidateSpeed = candidate.stun > 0 ? 0 : candidateInfo.speed * (candidate.slow > 0 ? candidate.slowFactor || .58 : 1);
      if (candidate.type === "boss" && candidate.hp < candidate.maxHp * .5) candidateSpeed *= 1.5;
      var candidateAttackY = Game.getEnemyHoldY(candidateInfo), targetY = candidate.y;
      for (var step = 0; step < 3; step++) {
        var estimateY = U.clamp(targetY, minY, maxY), dropTime = (estimateY + 24) / skill.bombSpeed;
        targetY = Math.min(candidateAttackY, candidate.y + candidateSpeed * dropTime);
      }
      var point = { x: U.clamp(candidate.x, C.enemies.boss.radius, C.width - C.enemies.boss.radius), y: U.clamp(targetY, minY, maxY) };
      point.score = bombardmentCoverage(skill, point, bombardmentImpact(skill, point, wait));
      candidates.push(point);
    });
    if (!candidates.length) return null;
    var main = candidates[0], alternative = null, index;
    for (index = 1; index < candidates.length; index++) if (candidates[index].score > main.score) main = candidates[index];
    if (!taken.length) return { x: main.x, y: main.y };
    for (index = 0; index < candidates.length; index++) {
      if (Game.isBombTargetTooClose(candidates[index], taken, separation)) continue;
      if (!alternative || candidates[index].score > alternative.score) alternative = candidates[index];
    }
    if (alternative && alternative.score >= main.score * (skill.bombAltScoreRatio || .45)) return { x: alternative.x, y: alternative.y };
    return Game.spreadBombTarget(skill, main, taken, separation, minY, maxY, wait);
  };
  Game.spreadBombTarget = function (skill, point, taken, separation, minY, maxY, wait) {
    var offset = separation, fallback = null;
    for (var attempt = 0; attempt < 4; attempt++) {
      var result = pushBombTargetAway(point, taken, offset, minY, maxY);
      if (bombardmentCoverage(skill, result, bombardmentImpact(skill, result, wait)) > 0) return result;
      if (!fallback) fallback = result;
      offset *= .5;
    }
    return fallback;
  };
  Game.launchBombardment = function () {
    var skill = S.player.skills.bombardment;
    if (!skill.unlocked || skill.fireTimer > 0) return false;
    var dropDelay = skill.bombDropDelay || .42, targets = [], index, target;
    for (index = 0; index <= skill.extraBombs; index++) {
      target = Game.getBombardmentTarget(skill, index * dropDelay, targets);
      if (!target) break;
      targets.push(target);
    }
    if (!targets.length) return false;
    targets.forEach(function (point, order) {
      S.bombDrops.push({ x: point.x, y: -24, targetX: point.x, targetY: point.y, delay: order * dropDelay, speed: skill.bombSpeed, damage: skill.damage, radius: skill.blastRadius, centerRadius: skill.centerRadius, knockback: skill.knockback, centerDamageMultiplier: skill.centerDamageMultiplier, stunDuration: skill.stunDuration, thermonuclear: skill.thermonuclear, heatDuration: skill.heatDuration, heatDps: skill.heatDps, heatSlowFactor: skill.heatSlowFactor });
    });
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.explodeBombardment = function (bomb) {
    S.explosions.push({ type: "bombardment", x: bomb.targetX, y: bomb.targetY, radius: bomb.radius, life: .62, duration: .62 });
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var enemy = S.enemies[i], dx = enemy.x - bomb.targetX, dy = enemy.y - bomb.targetY, distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > bomb.radius + C.enemies[enemy.type].radius) continue;
      var damage = bomb.damage * (distance <= bomb.centerRadius ? bomb.centerDamageMultiplier : 1);
      Game.damageEnemy(enemy, damage, { critical: false, noWeaponEffects: true });
      if (bomb.stunDuration > 0) Game.applyStun(enemy, bomb.stunDuration);
      if (distance > .001) Game.applyKnockback(enemy, bomb.targetX, bomb.targetY, bomb.knockback * (1 - Math.min(distance / (bomb.radius * 1.5), .45)));
      else enemy.y = Math.max(-C.enemies[enemy.type].radius, enemy.y - bomb.knockback);
      if (enemy.hp <= 0) Game.killEnemy(i);
    }
    if (bomb.thermonuclear) S.bombZones.push({ x: bomb.targetX, y: bomb.targetY, radius: bomb.radius, life: bomb.heatDuration, duration: bomb.heatDuration, damage: bomb.heatDps, slowFactor: bomb.heatSlowFactor });
    Game.burst(bomb.targetX, bomb.targetY, 24, C.colors.yellow);
  };
  Game.updateBombardment = function (dt) {
    for (var i = S.bombDrops.length - 1; i >= 0; i--) {
      var bomb = S.bombDrops[i];
      if (bomb.delay > 0) { bomb.delay = Math.max(0, bomb.delay - dt); continue; }
      bomb.y += bomb.speed * dt;
      if (bomb.y >= bomb.targetY) { Game.explodeBombardment(bomb); S.bombDrops.splice(i, 1); }
    }
    for (var j = S.bombZones.length - 1; j >= 0; j--) {
      var zone = S.bombZones[j];
      zone.life -= dt;
      if (zone.life <= 0) { S.bombZones.splice(j, 1); continue; }
      for (var k = S.enemies.length - 1; k >= 0; k--) {
        var enemy = S.enemies[k], dx = enemy.x - zone.x, dy = enemy.y - zone.y, reach = zone.radius + C.enemies[enemy.type].radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        Game.damageEnemy(enemy, zone.damage * dt, { critical: false, noWeaponEffects: true, silentText: true });
        Game.applySlow(enemy, .24, zone.slowFactor);
        if (enemy.hp <= 0) Game.killEnemy(k);
      }
    }
  };
  Game.getWhirlwindField = function (radius) {
    var wallTop = S.wall ? S.wall.y - S.wall.height / 2 : C.height, minY = 96 + radius;
    return { minX: radius + 4, maxX: Math.max(radius + 4, C.width - radius - 4), minY: minY, maxY: Math.max(minY, wallTop - radius - 6) };
  };
  Game.getWhirlwindEnemyWeight = function (enemy) {
    var info = C.enemies[enemy.type];
    return enemy.type === "boss" ? 1.6 : info.codexCategory === "elite" ? 1.3 : 1;
  };
  Game.getWhirlwindChaseTarget = function (tornado, field) {
    var skill = S.player.skills.whirlwindCannon, clusterRadius = skill.clusterRadius, threatRange = Math.max(1, field.maxY - field.minY);
    var best = null, bestScore = -Infinity;
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type];
      if (!Game.canHitEnemy(skill, enemy)) return;
      if (enemy.y < field.minY - tornado.radius || enemy.y > field.maxY + info.radius + tornado.radius) return;
      var dx = enemy.x - tornado.x, dy = enemy.y - tornado.y, distance = Math.sqrt(dx * dx + dy * dy), cluster = 0;
      S.enemies.forEach(function (other) {
        if (!Game.canHitEnemy(skill, other)) return;
        var ox = other.x - enemy.x, oy = other.y - enemy.y;
        if (ox * ox + oy * oy > clusterRadius * clusterRadius) return;
        cluster += Game.getWhirlwindEnemyWeight(other);
      });
      var score = cluster * skill.clusterWeight - distance * .35 + ((enemy.y - field.minY) / threatRange) * skill.threatWeight;
      S.tornadoes.forEach(function (other) {
        if (other === tornado) return;
        var ox = enemy.x - other.x, oy = enemy.y - other.y, reach = tornado.radius + other.radius + 24;
        if (ox * ox + oy * oy <= reach * reach) score -= skill.clusterWeight;
      });
      if (score > bestScore) { bestScore = score; best = enemy; }
    });
    if (!best) return null;
    return { x: U.clamp(best.x + U.rand(-1, 1) * skill.clusterJitter * tornado.radius, field.minX, field.maxX), y: U.clamp(best.y + U.rand(-1, 1) * skill.clusterJitter * tornado.radius, field.minY, field.maxY) };
  };
  Game.pickWhirlwindTarget = function (tornado, field) {
    var skill = S.player.skills.whirlwindCannon, target = Game.getWhirlwindChaseTarget(tornado, field);
    if (target) {
      tornado.targetX = target.x;
      tornado.targetY = target.y;
      tornado.retargetTimer = U.rand(.5, 1.2);
    } else {
      tornado.targetX = U.rand(field.minX, field.maxX);
      tornado.targetY = U.rand(field.minY, field.maxY);
      tornado.retargetTimer = U.rand(1.1, 2.1);
    }
  };
  Game.spawnWhirlwind = function (skill, options) {
    var opts = options || {}, count = opts.count || 1, field = Game.getWhirlwindField(skill.radius);
    var band = (field.maxX - field.minX) / count, bandX = field.minX + band * (opts.index || 0);
    var tornado = {
      x: U.rand(bandX, bandX + band), y: U.rand(field.minY, field.minY + (field.maxY - field.minY) * .5),
      radius: skill.radius, life: skill.duration, duration: skill.duration, speed: skill.speed, stationary: false,
      damage: skill.damage, hitInterval: skill.hitInterval, pullSpeed: skill.pullSpeed, groundOnly: !!skill.groundOnly, contacts: [], targetX: 0, targetY: 0, retargetTimer: 0
    };
    tornado.targetX = tornado.x;
    tornado.targetY = tornado.y;
    S.tornadoes.push(tornado);
  };
  Game.launchWhirlwindCannon = function () {
    var skill = S.player.skills.whirlwindCannon, count = 1 + skill.extraTornadoes;
    if (!skill.unlocked || skill.active || skill.fireTimer > 0) return false;
    for (var i = 0; i < count; i++) Game.spawnWhirlwind(skill, { index: i, count: count });
    skill.active = true;
    skill.activeElapsed = 0;
    return true;
  };
  Game.spawnStormWhirlwind = function (skill, tornado) {
    S.tornadoes.push({ x: tornado.x, y: tornado.y, radius: tornado.radius * skill.stormRadiusScale, life: skill.stormDuration, duration: skill.stormDuration, speed: 0, stationary: true, damage: tornado.damage * skill.stormDamageScale, hitInterval: tornado.hitInterval, pullSpeed: tornado.pullSpeed * skill.stormPullScale, groundOnly: !!skill.groundOnly, contacts: [], targetX: tornado.x, targetY: tornado.y, retargetTimer: 0 });
    Game.burst(tornado.x, tornado.y, 18, C.colors.cyan);
  };
  Game.moveWhirlwind = function (tornado, dt) {
    var field = Game.getWhirlwindField(tornado.radius);
    tornado.retargetTimer -= dt;
    if (tornado.retargetTimer <= 0) Game.pickWhirlwindTarget(tornado, field);
    var dx = tornado.targetX - tornado.x, dy = tornado.targetY - tornado.y, distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 10) return;
    var step = Math.min(tornado.speed * dt, distance);
    tornado.x = U.clamp(tornado.x + dx / distance * step, field.minX, field.maxX);
    tornado.y = U.clamp(tornado.y + dy / distance * step, field.minY, field.maxY);
  };
  Game.updateWhirlwinds = function (dt) {
    if (!S.tornadoes || !S.tornadoes.length) return;
    var skill = S.player.skills.whirlwindCannon;
    for (var i = S.tornadoes.length - 1; i >= 0; i--) {
      var tornado = S.tornadoes[i];
      tornado.life -= dt;
      if (tornado.life <= 0) {
        if (!tornado.stationary && skill.stormGather) Game.spawnStormWhirlwind(skill, tornado);
        S.tornadoes.splice(i, 1);
        continue;
      }
      if (!tornado.stationary) Game.moveWhirlwind(tornado, dt);
      tornado.contacts.forEach(function (contact) { contact.hitTimer = Math.max(0, contact.hitTimer - dt); });
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var enemy = S.enemies[j], info = C.enemies[enemy.type];
        if (!Game.canHitEnemy(tornado, enemy)) continue;
        var dx = enemy.x - tornado.x, dy = enemy.y - tornado.y, reach = tornado.radius + info.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        var distance = Math.sqrt(dx * dx + dy * dy) || 1;
        var pull = tornado.pullSpeed * dt * (.35 + .65 * (1 - distance / reach));
        enemy.x = U.clamp(enemy.x - dx / distance * pull, info.radius, C.width - info.radius);
        enemy.y = Math.max(-info.radius, enemy.y - dy / distance * pull);
        var contactIndex = -1;
        for (var k = 0; k < tornado.contacts.length; k++) if (tornado.contacts[k].enemy === enemy) { contactIndex = k; break; }
        if (contactIndex < 0) { tornado.contacts.push({ enemy: enemy, hitTimer: 0 }); contactIndex = tornado.contacts.length - 1; }
        if (tornado.contacts[contactIndex].hitTimer > 0) continue;
        tornado.contacts[contactIndex].hitTimer = tornado.hitInterval;
        Game.damageEnemy(enemy, tornado.damage, { critical: false, noWeaponEffects: true, silentText: true });
        Game.burst(enemy.x, enemy.y, 1, C.colors.cyan);
        if (enemy.hp <= 0) { Game.killEnemy(j); tornado.contacts.splice(contactIndex, 1); }
      }
    }
  };
  Game.getDroneChaseTarget = function (drone, field) {
    var skill = S.player.skills.drone, clusterRadius = skill.clusterRadius, threatRange = Math.max(1, field.maxY - field.minY);
    var best = null, bestScore = -Infinity;
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type];
      if (!Game.canHitEnemy(drone, enemy)) return;
      if (enemy.y < field.minY - drone.radius || enemy.y > field.maxY + info.radius + drone.radius) return;
      var dx = enemy.x - drone.x, dy = enemy.y - drone.y, distance = Math.sqrt(dx * dx + dy * dy), cluster = 0;
      S.enemies.forEach(function (other) {
        if (!Game.canHitEnemy(drone, other)) return;
        var ox = other.x - enemy.x, oy = other.y - enemy.y;
        if (ox * ox + oy * oy > clusterRadius * clusterRadius) return;
        cluster += Game.getWhirlwindEnemyWeight(other);
      });
      var score = cluster * skill.clusterWeight - distance * .35 + ((enemy.y - field.minY) / threatRange) * skill.threatWeight;
      S.drones.forEach(function (other) {
        if (other === drone) return;
        var ox = enemy.x - other.x, oy = enemy.y - other.y, reach = drone.radius + other.radius + 24;
        if (ox * ox + oy * oy <= reach * reach) score -= skill.clusterWeight;
      });
      if (score > bestScore) { bestScore = score; best = enemy; }
    });
    if (!best) return null;
    return { x: U.clamp(best.x + U.rand(-1, 1) * skill.clusterJitter * drone.radius, field.minX, field.maxX), y: U.clamp(best.y + U.rand(-1, 1) * skill.clusterJitter * drone.radius, field.minY, field.maxY) };
  };
  Game.pickDroneTarget = function (drone, field) {
    var target = Game.getDroneChaseTarget(drone, field);
    if (target) {
      drone.targetX = target.x;
      drone.targetY = target.y;
      drone.retargetTimer = U.rand(.45, 1.1);
    } else {
      drone.targetX = U.rand(field.minX, field.maxX);
      drone.targetY = U.rand(field.minY, field.maxY);
      drone.retargetTimer = U.rand(1.1, 2.1);
    }
  };
  Game.getDroneRadius = function (skill) { return skill.radius * (1 + (skill.sizeLevel || 0) * .3); };
  Game.spawnDrone = function (skill, options) {
    var opts = options || {}, count = opts.count || 1, radius = Game.getDroneRadius(skill), field = Game.getWhirlwindField(radius);
    var band = (field.maxX - field.minX) / count, bandX = field.minX + band * (opts.index || 0);
    var drone = {
      x: U.rand(bandX, bandX + band), y: U.rand(field.minY, field.minY + (field.maxY - field.minY) * .5),
      radius: radius, baseRadius: skill.radius, sizeLevel: skill.sizeLevel || 0,
      life: skill.duration, duration: skill.duration, speed: skill.speed,
      damage: skill.damage, hitInterval: skill.hitInterval, stunDuration: skill.stunDuration, bladeEnabled: !!skill.bladeEnabled,
      groundOnly: !!skill.groundOnly, contacts: [], targetX: 0, targetY: 0, retargetTimer: 0, spin: U.rand(0, Math.PI * 2)
    };
    drone.targetX = drone.x;
    drone.targetY = drone.y;
    S.drones.push(drone);
    return drone;
  };
  Game.launchDrone = function () {
    var skill = S.player.skills.drone;
    if (!skill.unlocked || skill.active || skill.fireTimer > 0) return false;
    Game.spawnDrone(skill, { index: 0, count: 1 });
    skill.active = true;
    skill.activeElapsed = 0;
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.spawnDroneBlade = function (drone, enemy) {
    var skill = S.player.skills.airBlade, source = skill && skill.unlocked ? skill : C.skillDefaults.airBlade;
    var angle = Math.atan2(enemy.y - drone.y, enemy.x - drone.x);
    S.skillProjectiles.push({
      type: "airBlade", x: drone.x, y: drone.y, vx: Math.cos(angle) * source.projectileSpeed, vy: Math.sin(angle) * source.projectileSpeed,
      radius: source.projectileRadius, damage: source.damage, knockback: 0, pierce: 0,
      woundDuration: 0, woundFactor: 0, woundExtraDuration: 0, woundExtraFactor: 0,
      critical: false, noWeaponEffects: true, fromDrone: true, hitEnemies: [enemy]
    });
    return S.skillProjectiles[S.skillProjectiles.length - 1];
  };
  Game.moveDrone = function (drone, dt) {
    var field = Game.getWhirlwindField(drone.radius);
    drone.spin += dt * 9;
    drone.retargetTimer -= dt;
    if (drone.retargetTimer <= 0) Game.pickDroneTarget(drone, field);
    var dx = drone.targetX - drone.x, dy = drone.targetY - drone.y, distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 8) return;
    var step = Math.min(drone.speed * dt, distance);
    drone.x = U.clamp(drone.x + dx / distance * step, field.minX, field.maxX);
    drone.y = U.clamp(drone.y + dy / distance * step, field.minY, field.maxY);
  };
  Game.updateDrones = function (dt) {
    if (!S.drones || !S.drones.length) return;
    for (var i = S.drones.length - 1; i >= 0; i--) {
      var drone = S.drones[i];
      drone.life -= dt;
      if (drone.life <= 0) { S.drones.splice(i, 1); continue; }
      Game.moveDrone(drone, dt);
      drone.contacts.forEach(function (contact) { contact.hitTimer = Math.max(0, contact.hitTimer - dt); });
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var enemy = S.enemies[j], info = C.enemies[enemy.type];
        if (!Game.canHitEnemy(drone, enemy)) continue;
        var dx = enemy.x - drone.x, dy = enemy.y - drone.y, reach = drone.radius + info.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        var contactIndex = -1;
        for (var k = 0; k < drone.contacts.length; k++) if (drone.contacts[k].enemy === enemy) { contactIndex = k; break; }
        if (contactIndex < 0) { drone.contacts.push({ enemy: enemy, hitTimer: 0 }); contactIndex = drone.contacts.length - 1; }
        if (drone.contacts[contactIndex].hitTimer > 0) continue;
        drone.contacts[contactIndex].hitTimer = drone.hitInterval;
        Game.damageEnemy(enemy, drone.damage, { critical: false, noWeaponEffects: true, silentText: true });
        if (drone.bladeEnabled) Game.spawnDroneBlade(drone, enemy);
        if (drone.stunDuration > 0) Game.applyStun(enemy, drone.stunDuration);
        Game.burst(enemy.x, enemy.y, 1, "#a6c8ff");
        if (enemy.hp <= 0) { Game.killEnemy(j); drone.contacts.splice(contactIndex, 1); }
      }
    }
  };
  Game.getChainLightningStart = function (taken) {
    var rangeLine = Game.getSkillRangeLine("chainLightning"), best = null, bestScore = -Infinity, fallback = null, fallbackScore = -Infinity;
    S.enemies.forEach(function (enemy) {
      if (enemy.y < rangeLine) return;
      var score = enemy.y + C.enemies[enemy.type].radius * .35 + (enemy.type === "boss" ? 10 : 0);
      if (taken && taken.indexOf(enemy) >= 0) {
        if (score > fallbackScore) { fallbackScore = score; fallback = enemy; }
        return;
      }
      if (score > bestScore) { bestScore = score; best = enemy; }
    });
    return best || fallback;
  };
  Game.getChainLightningJumpTarget = function (from, chain, taken) {
    var best = null, bestDistance = Infinity, fallback = null, fallbackDistance = Infinity;
    S.enemies.forEach(function (enemy) {
      if (chain.hitEnemies.indexOf(enemy) >= 0) return;
      var dx = enemy.x - from.x, dy = enemy.y - from.y, distance = dx * dx + dy * dy;
      if (taken && taken.indexOf(enemy) >= 0) {
        if (distance < fallbackDistance) { fallbackDistance = distance; fallback = enemy; }
        return;
      }
      if (distance < bestDistance) { bestDistance = distance; best = enemy; }
    });
    return best || fallback;
  };
  Game.buildChainLightning = function (skill, origin, start, taken) {
    var chain = {
      type: "chainLightning", originX: origin.x, originY: origin.y,
      nodes: [{ target: start, x: start.x, y: start.y, struck: false }],
      hitEnemies: [start], next: 0, timer: 0, life: .32, jumpDelay: Math.max(.03, skill.jumpDelay || .08),
      damage: skill.damage, stunDuration: skill.stunDuration,
      burnEnabled: !!skill.burnEnabled, burnDps: skill.burnDps || 0, burnDuration: skill.burnDuration || 0
    };
    var cursor = start;
    for (var i = 0; i < skill.bounces; i++) {
      var next = Game.getChainLightningJumpTarget(cursor, chain, taken);
      if (!next) break;
      chain.nodes.push({ target: next, x: next.x, y: next.y, struck: false });
      chain.hitEnemies.push(next);
      cursor = next;
    }
    return chain;
  };
  Game.launchChainLightning = function () {
    var skill = S.player.skills.chainLightning, count, taken = [], made = 0, origin, start, chain;
    if (!skill.unlocked || skill.fireTimer > 0) return false;
    count = 1 + (skill.extraChains || 0);
    origin = Game.getSkillMuzzle();
    for (var i = 0; i < count; i++) {
      start = Game.getChainLightningStart(taken);
      if (!start) break;
      chain = Game.buildChainLightning(skill, origin, start, taken);
      chain.nodes.forEach(function (node) { if (taken.indexOf(node.target) < 0) taken.push(node.target); });
      S.skillProjectiles.push(chain);
      made++;
    }
    if (!made) return false;
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.resolveChainLightningNode = function (chain) {
    var node = chain.nodes[chain.next], enemy = node.target, index = S.enemies.indexOf(enemy);
    chain.next++;
    if (index < 0) return false;
    node.x = enemy.x; node.y = enemy.y; node.struck = true;
    S.explosions.push({ type: "chainSpark", x: enemy.x, y: enemy.y, radius: 13, life: .26, duration: .26 });
    Game.damageEnemy(enemy, chain.damage, { critical: false, noWeaponEffects: true });
    if (chain.burnEnabled && chain.burnDps > 0) Game.applyBurn(enemy, chain.burnDps, chain.burnDuration);
    Game.applyStun(enemy, chain.stunDuration);
    Game.burst(enemy.x, enemy.y, 3, "#c9a1ff");
    if (enemy.hp <= 0) Game.killEnemy(index);
    return true;
  };
  Game.updateChainLightnings = function (chain, dt) {
    if (chain.next < chain.nodes.length) {
      chain.timer -= dt;
      while (chain.next < chain.nodes.length && chain.timer <= 0) {
        Game.resolveChainLightningNode(chain);
        chain.timer += chain.jumpDelay;
      }
      if (chain.next >= chain.nodes.length) chain.timer = chain.life;
      return false;
    }
    chain.timer -= dt;
    return chain.timer <= 0;
  };
  Game.getHailCoverage = function (skill, point) {
    var score = 0;
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type], dx = enemy.x - point.x, dy = enemy.y - point.y, reach = skill.radius + info.radius;
      if (dx * dx + dy * dy > reach * reach) return;
      score += enemy.type === "boss" ? 1.6 : info.codexCategory === "elite" ? 1.3 : 1;
    });
    return score;
  };
  Game.getHailTargetPoint = function (skill, taken) {
    var rangeLine = Game.getSkillRangeLine("hailGenerator"), others = taken || [], margin = skill.radius * .5;
    var best = null, bestScore = -1, bestWeighted = -1, bestGap = Infinity;
    S.enemies.forEach(function (enemy) {
      if (enemy.y < rangeLine) return;
      var point = { x: U.clamp(enemy.x, margin, C.width - margin), y: U.clamp(enemy.y, 60, C.height - 120) };
      var score = Game.getHailCoverage(skill, point), penalty = 1, nearest = Infinity;
      others.forEach(function (other) {
        var dx = point.x - other.x, dy = point.y - other.y, gap = Math.sqrt(dx * dx + dy * dy);
        nearest = Math.min(nearest, gap);
        if (gap < skill.radius) penalty = Math.min(penalty, gap / skill.radius);
      });
      var weighted = score * penalty;
      if (weighted > bestWeighted || (Math.abs(weighted - bestWeighted) < .000001 && score > bestScore)) {
        bestWeighted = weighted;
        bestScore = score;
        best = point;
        bestGap = nearest;
      }
    });
    if (best && bestGap < 1) {
      var push = skill.radius * .55, direction = best.x + push <= C.width - margin ? 1 : -1;
      best = { x: U.clamp(best.x + direction * push, margin, C.width - margin), y: best.y };
    }
    return best;
  };
  Game.spawnHailStorm = function (skill, point) {
    S.hailStorms.push({
      x: point.x, y: point.y, radius: skill.radius, life: skill.duration, duration: skill.duration,
      damage: skill.damage, hitInterval: skill.hitInterval, tickTimer: 0, slowFactor: skill.slowFactor, freezeDuration: skill.freezeDuration,
      explodeOnEnd: !!skill.explodeOnEnd, explosionRadius: skill.explosionRadius, explosionSlowFactor: skill.explosionSlowFactor, explosionSlowDuration: skill.explosionSlowDuration
    });
  };
  Game.launchHailGenerator = function () {
    var skill = S.player.skills.hailGenerator, count = 1 + skill.extraHails, taken = [], launched = 0;
    if (!skill.unlocked || skill.active || skill.fireTimer > 0) return false;
    for (var i = 0; i < count; i++) {
      var point = Game.getHailTargetPoint(skill, taken);
      if (!point) break;
      taken.push(point);
      Game.spawnHailStorm(skill, point);
      launched++;
    }
    if (!launched) return false;
    skill.active = true;
    skill.activeElapsed = 0;
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.explodeHailStorm = function (storm) {
    S.explosions.push({ type: "hailFrost", x: storm.x, y: storm.y, radius: storm.explosionRadius, life: .5, duration: .5 });
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type], dx = enemy.x - storm.x, dy = enemy.y - storm.y, reach = storm.explosionRadius + info.radius;
      if (dx * dx + dy * dy > reach * reach) return;
      Game.applySlow(enemy, storm.explosionSlowDuration, storm.explosionSlowFactor);
    });
    Game.burst(storm.x, storm.y, 18, C.colors.ice);
  };
  Game.updateHailStorms = function (dt) {
    if (!S.hailStorms || !S.hailStorms.length) return;
    for (var i = S.hailStorms.length - 1; i >= 0; i--) {
      var storm = S.hailStorms[i];
      storm.life -= dt;
      if (storm.life <= 0) {
        if (storm.explodeOnEnd) Game.explodeHailStorm(storm);
        S.hailStorms.splice(i, 1);
        continue;
      }
      storm.tickTimer -= dt;
      if (storm.tickTimer > 0) continue;
      storm.tickTimer = storm.hitInterval;
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var enemy = S.enemies[j], info = C.enemies[enemy.type];
        var dx = enemy.x - storm.x, dy = enemy.y - storm.y, reach = storm.radius + info.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        Game.damageEnemy(enemy, storm.damage, { critical: false, noWeaponEffects: true, silentText: true });
        Game.applySlow(enemy, storm.freezeDuration, storm.slowFactor);
        Game.burst(enemy.x, enemy.y, 1, C.colors.ice);
        if (enemy.hp <= 0) Game.killEnemy(j);
      }
    }
  };
  Game.getFuelBombCoverage = function (skill, point) {
    var score = 0;
    S.enemies.forEach(function (enemy) {
      if (Game.isFlyingEnemy(enemy)) return;
      var info = C.enemies[enemy.type], dx = enemy.x - point.x, dy = enemy.y - point.y, reach = skill.radius + info.radius;
      if (dx * dx + dy * dy > reach * reach) return;
      score += enemy.type === "boss" ? 1.6 : info.codexCategory === "elite" ? 1.3 : 1;
    });
    return score;
  };
  Game.getFuelBombTarget = function (skill, taken, ignoreRange) {
    var rangeLine = ignoreRange ? -Infinity : Game.getSkillRangeLine("fuelBomb"), others = taken || [], margin = skill.radius * .5;
    var best = null, bestScore = -1, bestWeighted = -1, bestGap = Infinity;
    S.enemies.forEach(function (enemy) {
      if (enemy.y < rangeLine || Game.isFlyingEnemy(enemy)) return;
      var point = { x: U.clamp(enemy.x, margin, C.width - margin), y: U.clamp(enemy.y, 60, C.height - 120) };
      var score = Game.getFuelBombCoverage(skill, point), penalty = 1, nearest = Infinity;
      others.forEach(function (other) {
        var dx = point.x - other.x, dy = point.y - other.y, gap = Math.sqrt(dx * dx + dy * dy);
        nearest = Math.min(nearest, gap);
        if (gap < skill.radius) penalty = Math.min(penalty, gap / skill.radius);
      });
      var weighted = score * penalty;
      if (weighted > bestWeighted || (Math.abs(weighted - bestWeighted) < .000001 && score > bestScore)) {
        bestWeighted = weighted;
        bestScore = score;
        best = point;
        bestGap = nearest;
      }
    });
    if (best && bestGap < 1) {
      var push = skill.radius * .55, direction = best.x + push <= C.width - margin ? 1 : -1;
      best = { x: U.clamp(best.x + direction * push, margin, C.width - margin), y: best.y };
    }
    return best;
  };
  Game.spawnFuelShell = function (skill, point, damageScale) {
    var scale = damageScale === undefined ? 1 : damageScale, origin = Game.getSkillMuzzle();
    S.fuelShells.push({
      originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, targetX: point.x, targetY: point.y,
      elapsed: 0, flightTime: skill.flightTime, arcHeight: skill.arcHeight || 0, damageScale: scale,
      radius: skill.radius, duration: skill.duration, hitInterval: skill.hitInterval,
      damage: skill.damage * scale, burnDps: skill.burnDps * scale, burnDuration: skill.burnDuration,
      slowFactor: skill.slowFactor, slowDuration: skill.slowDuration, groundOnly: !!skill.groundOnly,
      explodeOnEnd: !!skill.explodeOnEnd,
      explosionRadius: skill.radius * (skill.explosionRadiusScale || 1),
      explosionDamage: skill.damage * (skill.explosionDamageScale || 0) * scale
    });
    return S.fuelShells[S.fuelShells.length - 1];
  };
  Game.spawnFuelPool = function (shell) {
    S.fuelPools.push({
      x: shell.targetX, y: shell.targetY, radius: shell.radius, life: shell.duration, duration: shell.duration,
      damage: shell.damage, hitInterval: shell.hitInterval, tickTimer: 0, burnDps: shell.burnDps, burnDuration: shell.burnDuration,
      slowFactor: shell.slowFactor, slowDuration: shell.slowDuration, groundOnly: shell.groundOnly,
      explodeOnEnd: shell.explodeOnEnd, explosionRadius: shell.explosionRadius, explosionDamage: shell.explosionDamage
    });
    Game.burst(shell.targetX, shell.targetY, 6, C.colors.fire);
    return S.fuelPools[S.fuelPools.length - 1];
  };
  Game.launchFuelBomb = function () {
    var skill = S.player.skills.fuelBomb, shellCount = 1 + skill.extraShells, taken = [], launched = 0;
    if (!skill.unlocked || skill.active || skill.fireTimer > 0) return false;
    var mainPoint = Game.getFuelBombTarget(skill, taken, false);
    if (!mainPoint) return false;
    taken.push(mainPoint);
    Game.spawnFuelShell(skill, mainPoint, 1);
    launched++;
    for (var i = 1; i < shellCount; i++) {
      var point = Game.getFuelBombTarget(skill, taken, true);
      if (!point) break;
      taken.push(point);
      Game.spawnFuelShell(skill, point, skill.extraDamageScale);
      launched++;
    }
    if (!launched) return false;
    skill.active = true;
    skill.activeElapsed = 0;
    skill.activeDuration = skill.flightTime + skill.duration;
    skill.fireTimer = skill.fireInterval;
    return true;
  };
  Game.explodeFuelPool = function (pool) {
    S.explosions.push({ type: "fuelBlast", x: pool.x, y: pool.y, radius: pool.explosionRadius, life: .5, duration: .5 });
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var enemy = S.enemies[i], info = C.enemies[enemy.type], dx = enemy.x - pool.x, dy = enemy.y - pool.y, reach = pool.explosionRadius + info.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (!Game.canHitEnemy(pool, enemy)) continue;
      Game.damageEnemy(enemy, pool.explosionDamage, { critical: false, noWeaponEffects: true, silentText: true });
      Game.applyBurn(enemy, pool.burnDps, pool.burnDuration);
      if (enemy.hp <= 0) Game.killEnemy(i);
    }
    Game.burst(pool.x, pool.y, 18, C.colors.fire);
  };
  Game.updateFuelBombs = function (dt) {
    var i, shell, pool, progress;
    for (i = S.fuelShells.length - 1; i >= 0; i--) {
      shell = S.fuelShells[i];
      shell.elapsed += dt;
      progress = U.clamp(shell.elapsed / shell.flightTime, 0, 1);
      shell.x = shell.originX + (shell.targetX - shell.originX) * progress;
      shell.y = shell.originY + (shell.targetY - shell.originY) * progress;
      if (progress >= 1) { Game.spawnFuelPool(shell); S.fuelShells.splice(i, 1); }
    }
    for (i = S.fuelPools.length - 1; i >= 0; i--) {
      pool = S.fuelPools[i];
      pool.life -= dt;
      if (pool.life <= 0) {
        if (pool.explodeOnEnd) Game.explodeFuelPool(pool);
        S.fuelPools.splice(i, 1);
        continue;
      }
      pool.tickTimer -= dt;
      if (pool.tickTimer > 0) continue;
      pool.tickTimer = pool.hitInterval;
      for (var j = S.enemies.length - 1; j >= 0; j--) {
        var enemy = S.enemies[j], info = C.enemies[enemy.type];
        if (!Game.canHitEnemy(pool, enemy)) continue;
        var dx = enemy.x - pool.x, dy = enemy.y - pool.y, reach = pool.radius + info.radius;
        if (dx * dx + dy * dy > reach * reach) continue;
        Game.damageEnemy(enemy, pool.damage, { critical: false, noWeaponEffects: true, silentText: true });
        Game.applyBurn(enemy, pool.burnDps, pool.burnDuration);
        if (pool.slowFactor < 1) Game.applySlow(enemy, pool.slowDuration, pool.slowFactor);
        Game.burst(enemy.x, enemy.y, 1, C.colors.fire);
        if (enemy.hp <= 0) Game.killEnemy(j);
      }
    }
  };
  Game.nextXpAfter = function (current) {
    return Math.floor(current * C.xpMultiplier + C.xpBonus);
  };
  Game.gainXp = function (amount) {
    var p = S.player;
    if (S.session && S.session.testArena) return;
    if (p.level >= C.maxLevel) return;
    p.xp += amount * (S.session.xpScale || 1);
    while (p.xp >= p.nextXp && p.level < C.maxLevel) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = Game.nextXpAfter(p.nextXp);
      if (p.level >= C.maxLevel) {
        p.xp = p.nextXp;
        S.session.message = "LV.MAX · 清空剩余尸潮";
        S.session.messageTimer = 2.6;
        break;
      }
      var cards = Game.rollTraits();
      if (!cards.length) continue;
      S.screen = "upgrade";
      S.upgradeCards = cards;
      break;
    }
  };
  Game.grantMaxLevel = function () {
    var p = S.player;
    while (p.level < C.maxLevel) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = Game.nextXpAfter(p.nextXp);
    }
    p.xp = p.nextXp;
  };
  Game.unlockSkill = function (id, force) {
    var skill = S.player.skills[id], order = S.player.skillOrder;
    if (!skill || skill.unlocked) return false;
    if (!order) order = S.player.skillOrder = [];
    if (!force && order.length >= C.maxSkillSlots) return false;
    skill.unlocked = true;
    skill.level = 1;
    skill.fireTimer = 0;
    if (order.indexOf(id) < 0) order.push(id);
    return true;
  };
  Game.getSkillSlotCount = function () { return (S.player.skillOrder || []).length; };
  Game.canUnlockSkill = function () { return Game.getSkillSlotCount() < C.maxSkillSlots; };
  Game.rollTraits = function () {
    var p = S.player, allTraits = C.traits.concat(C.skillTraits || []), slotsFull = !Game.canUnlockSkill();
    var pool = allTraits.filter(function (trait) {
      if ((p.traits[trait.id] || 0) >= trait.max) return false;
      if (trait.unlocksSkill) return !slotsFull && !p.skills[trait.skillId].unlocked;
      if (trait.skillId) return p.skills[trait.skillId].unlocked;
      return true;
    }).slice(), cards = [];
    while (pool.length && cards.length < 3) cards.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return cards;
  };
  Game.chooseTrait = function (index) {
    if (S.screen !== "upgrade" || !S.upgradeCards[index]) return;
    var trait = S.upgradeCards[index], p = S.player;
    p.traits[trait.id] = (p.traits[trait.id] || 0) + 1;
    if (trait.skillId) {
      if (trait.unlocksSkill) Game.unlockSkill(trait.skillId);
      else p.skills[trait.skillId].level++;
    }
    trait.apply(p);
    Game.addText(p.x, p.y - 38, trait.name + (trait.skillId ? " Lv." + p.skills[trait.skillId].level : " Lv." + p.traits[trait.id]), C.colors.green);
    if (trait.unlocksSkill && !Game.canUnlockSkill()) {
      S.session.message = "技能槽已满 · " + C.maxSkillSlots + " / " + C.maxSkillSlots;
      S.session.messageTimer = 2.4;
    }
    S.screen = "playing";
  };
  Game.getCodexEnemyIds = function (category) {
    return Object.keys(C.enemies).filter(function (id) {
      var info = C.enemies[id];
      return !info.codexHidden && (info.codexCategory || "minion") === category;
    });
  };
  Game.getSkillGroups = function () {
    var groups = [{ id: "rifle", name: "步枪强化", icon: "✦", status: "已实装", detail: "主角步枪的基础强化词条，覆盖伤害、射速、齐射、连发、穿透、暴击与特殊弹种，是每局构筑的起点。", traits: C.traits }];
    (C.coreSkills || []).forEach(function (skill) {
      groups.push({ id: skill.id, name: skill.name, icon: skill.icon, status: skill.status, detail: skill.detail, traits: (C.skillTraits || []).filter(function (trait) { return trait.skillId === skill.id; }) });
    });
    return groups;
  };
  Game.killEnemy = function (index) {
    var enemy = S.enemies[index], info = C.enemies[enemy.type];
    S.session.kills++;
    Game.gainXp(info.xp);
    Game.addText(enemy.x, enemy.y, "+" + info.xp + " XP", C.colors.yellow);
    Game.burst(enemy.x, enemy.y, enemy.type === "boss" ? 24 : info.splitInto ? 14 : 8, info.splitInto ? C.colors.purple : info.accent);
    if (info.splitInto) Game.addText(enemy.x, enemy.y - 20, "分裂 ×" + info.splitCount, C.colors.purple);
    Game.queueSplitSpawns(enemy, info);
    S.enemies.splice(index, 1);
  };
  Game.damageEnemy = function (enemy, amount, bullet) {
    if (Game.blockWithArmor(enemy)) { enemy.hitFlash = .08; Game.addText(enemy.x + U.rand(-5, 5), enemy.y - C.enemies[enemy.type].radius, "格挡", C.colors.cyan); return; }
    var actualDamage = amount * (enemy.damageTakenTimer > 0 ? enemy.damageTakenMultiplier || 1 : 1); enemy.hp -= actualDamage; enemy.hitFlash = .08; if (!bullet.noWeaponEffects && S.player.burn) Game.applyBurn(enemy, 10 + S.player.burn * 3, 1.5 + S.player.burn * .4); if (!bullet.noWeaponEffects && S.player.freeze) Game.applySlow(enemy, 1.2 + S.player.freeze * .25, .58); if (!bullet.silentText) Game.addText(enemy.x + U.rand(-5, 5), enemy.y - C.enemies[enemy.type].radius, bullet.critical ? Math.ceil(actualDamage) + " 暴击" : String(Math.ceil(actualDamage)), bullet.critical ? C.colors.yellow : C.colors.text);
  };
  Game.throwEnemyShot = function (enemy) {
    var info = C.enemies[enemy.type], ranged = info.ranged;
    if (!ranged) return false;
    S.enemyShots.push({ type: "basketball", x: enemy.x, y: enemy.y + info.radius * .3, targetY: S.wall.y - S.wall.height / 2, startY: enemy.y + info.radius * .3, damage: ranged.damage, speed: ranged.projectileSpeed, radius: ranged.projectileRadius, spin: 0, travel: 0 });
    return true;
  };
  Game.updateEnemyShots = function (dt) {
    for (var i = S.enemyShots.length - 1; i >= 0; i--) {
      var shot = S.enemyShots[i];
      shot.y += shot.speed * dt;
      shot.spin += dt * 7;
      shot.travel += shot.speed * dt;
      if (shot.y < shot.targetY) continue;
      shot.y = shot.targetY;
      S.wall.hp -= shot.damage;
      Game.burst(shot.x, shot.targetY, 5, C.enemies.basketball.accent);
      Game.addText(shot.x, shot.targetY - 19, "-" + shot.damage, C.colors.red);
      S.enemyShots.splice(i, 1);
      if (S.wall.hp <= 0) {
        S.wall.hp = 0;
        if (S.session) { S.session.message = "城墙失守"; S.session.messageTimer = 3; }
        S.screen = "defeat";
        return;
      }
    }
  };
})(window.Game = window.Game || {});
