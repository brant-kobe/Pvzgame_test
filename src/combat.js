/* 战斗领域：敌人生成、瞄准、射击、伤害、经验和词条。 */
(function (Game) {
  "use strict";
  var C = Game.config, S = Game.state, U = Game.utils;
  Game.spawnEnemy = function (type, options) {
    var info = C.enemies[type], opts = options || {}, radius = info.radius;
    var edge = Math.max(22, radius + 4);
    var x = opts.x === undefined ? U.rand(edge, C.width - edge) : U.clamp(opts.x, radius, C.width - radius);
    var y = opts.y === undefined ? -radius - 8 : U.clamp(opts.y, -radius, S.wall ? S.wall.y - S.wall.height / 2 - radius - 3 : C.height);
    var maxHp = Math.round(info.hp * ((S.session && S.session.hpScale) || 1));
    var enemy = { type: type, x: x, y: y, hp: maxHp, maxHp: maxHp, slow: 0, slowFactor: .58, damageTakenTimer: 0, damageTakenMultiplier: 1, burn: 0, burnDps: 0, hitFlash: 0, attackTimer: 0, regenPerSecond: info.regenPerSecond || 0 };
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
      skill.unlocked = true;
      skill.level = 1;
      skill.fireTimer = 0;
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
    p.damage = 28; p.fireInterval = .52; p.burst = 0; p.spread = 0; p.pierce = 0; p.bulletRadius = 4; p.crit = .08; p.critDamage = 1.5; p.burn = 0; p.freeze = 0; p.bulletType = "normal"; p.skills = skills; p.traits = {};
    p.ammo = p.magazineSize; p.reloadTimer = 0; p.rifleEnabled = true; p.fireTimer = 0; p.burstShotsRemaining = 0; p.burstTimer = 0;
    S.bullets = []; S.skillProjectiles = []; S.armoredCars = []; S.bombDrops = []; S.bombZones = []; S.electromagneticZones = []; S.explosions = [];
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
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type];
      var speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
      if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
      var attackY = S.wall ? S.wall.y - S.wall.height / 2 - info.radius - 3 : C.height;
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
    return { x: C.width / 2 + (ring.offsetX || 86), y: C.height + (ring.offsetY || -102) };
  };
  Game.getSkillTargetAngle = function (type, origin, preferredAwayFrom) {
    var skill = S.player.skills[type], targetAngle = null, bestTime = Infinity, bestDiversity = -1;
    S.enemies.forEach(function (enemy) {
      var info = C.enemies[enemy.type], speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
      if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
      var attackY = S.wall ? S.wall.y - S.wall.height / 2 - info.radius - 3 : C.height;
      var predictedX = enemy.x, predictedY = enemy.y, flightTime = 0, targetX, targetY;
      for (var i = 0; i < 3; i++) {
        var dx = predictedX - origin.x, dy = predictedY - origin.y;
        flightTime = Math.max(0, (Math.sqrt(dx * dx + dy * dy) - skill.projectileRadius) / skill.projectileSpeed);
        predictedY = Math.min(attackY, enemy.y + speed * flightTime);
        targetX = predictedX;
        targetY = predictedY;
      }
      var angle = Math.atan2(targetY - origin.y, targetX - origin.x);
      if (type === "dryIce" && skill.spread > 0) {
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
    return S.enemies.slice().sort(function (a, b) {
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
    var bestAngle = null, bestScore = -1;
    S.enemies.forEach(function (candidate) {
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
      if (skill.slowEnabled && skill.slowDuration > 0) { enemy.slow = Math.max(enemy.slow || 0, skill.slowDuration); enemy.slowFactor = Math.min(enemy.slowFactor || .58, skill.slowFactor); }
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
      S.armoredCars.push({ x: U.clamp(x, minX, maxX), y: startY, speed: skill.speed, width: skill.carWidth * scale, length: skill.carLength * scale, damage: skill.damage, hitInterval: skill.hitInterval, slowFactor: skill.slowFactor, slowDuration: skill.slowDuration, stunChance: skill.stunChance, stunDuration: skill.stunDuration, contacts: [], impactFlash: 0 });
    }
  };
  Game.updateSkills = function (dt) {
    var p = S.player;
    Object.keys(p.skills).forEach(function (type) {
      var skill = p.skills[type];
      if (!skill.unlocked) return;
      if (type === "armoredCar") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0) { Game.launchArmoredCars(skill); skill.fireTimer = skill.fireInterval; }
        return;
      }
      if (type === "bombardment") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && S.enemies.length) Game.launchBombardment();
        return;
      }
      if (type === "electromagnetic") {
        skill.fireTimer = Math.max(0, skill.fireTimer - dt);
        if (skill.fireTimer <= 0 && S.enemies.length) Game.launchElectromagnetic();
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
          if (skill.fireTimer <= 0 && S.enemies.length) Game.launchHighEnergyBeam(skill);
        }
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
      if (skill.fireTimer > 0 || !S.enemies.length) return;
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
  Game.applyBurn = function (enemy, dps, duration) {
    enemy.burn = Math.max(enemy.burn || 0, duration);
    enemy.burnDps = Math.max(enemy.burnDps || 0, dps);
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
          Game.applyKnockback(enemy, projectile.x - projectile.vx, projectile.y - projectile.vy, projectile.knockback);
          if (projectile.freezeDuration > 0) {
            enemy.slow = Math.max(enemy.slow || 0, projectile.freezeDuration);
            enemy.slowFactor = Math.min(enemy.slowFactor || .58, projectile.slowFactor);
          }
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
    enemy.stun = Math.max(enemy.stun || 0, strike.stunDuration);
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
        enemy.slow = Math.max(enemy.slow || 0, .24);
        enemy.slowFactor = Math.min(enemy.slowFactor || .58, zone.slowFactor);
        if (enemy.hp <= 0) Game.killEnemy(j);
      }
    }
  };
  Game.getBombardmentTarget = function (skill) {
    if (!S.enemies.length) return null;
    var minY = 82, maxY = S.wall.y - S.wall.height / 2 - C.enemies.boss.radius, best = null, bestScore = -1;
    S.enemies.forEach(function (candidate) {
      var candidateInfo = C.enemies[candidate.type], candidateSpeed = candidate.stun > 0 ? 0 : candidateInfo.speed * (candidate.slow > 0 ? candidate.slowFactor || .58 : 1);
      if (candidate.type === "boss" && candidate.hp < candidate.maxHp * .5) candidateSpeed *= 1.5;
      var candidateAttackY = S.wall.y - S.wall.height / 2 - candidateInfo.radius - 3, targetY = candidate.y;
      for (var step = 0; step < 3; step++) {
        var estimateY = U.clamp(targetY, minY, maxY), dropTime = (estimateY + 24) / skill.bombSpeed;
        targetY = Math.min(candidateAttackY, candidate.y + candidateSpeed * dropTime);
      }
      var targetX = U.clamp(candidate.x, C.enemies.boss.radius, C.width - C.enemies.boss.radius);
      targetY = U.clamp(targetY, minY, maxY);
      var impactTime = (targetY + 24) / skill.bombSpeed, score = 0;
      S.enemies.forEach(function (enemy) {
        var info = C.enemies[enemy.type], speed = enemy.stun > 0 ? 0 : info.speed * (enemy.slow > 0 ? enemy.slowFactor || .58 : 1);
        if (enemy.type === "boss" && enemy.hp < enemy.maxHp * .5) speed *= 1.5;
        var attackY = S.wall.y - S.wall.height / 2 - info.radius - 3, predictedY = Math.min(attackY, enemy.y + speed * impactTime);
        var dx = enemy.x - targetX, dy = predictedY - targetY, distance = Math.sqrt(dx * dx + dy * dy), reach = skill.blastRadius + info.radius;
        if (distance > reach) return;
        var weight = enemy.type === "boss" ? 1.6 : info.codexCategory === "elite" ? 1.3 : 1;
        score += weight * (1.1 - distance / reach);
      });
      if (score > bestScore) { bestScore = score; best = { x: targetX, y: targetY }; }
    });
    return best;
  };
  Game.launchBombardment = function () {
    var skill = S.player.skills.bombardment;
    if (!skill.unlocked || skill.fireTimer > 0) return false;
    var target = Game.getBombardmentTarget(skill);
    if (!target) return false;
    var x = target.x, y = target.y;
    for (var i = 0; i <= skill.extraBombs; i++) {
      S.bombDrops.push({ x: x, y: -24, targetX: x, targetY: y, delay: i * .42, speed: skill.bombSpeed, damage: skill.damage, radius: skill.blastRadius, centerRadius: skill.centerRadius, knockback: skill.knockback, centerDamageMultiplier: skill.centerDamageMultiplier, stunDuration: skill.stunDuration, thermonuclear: skill.thermonuclear, heatDuration: skill.heatDuration, heatDps: skill.heatDps, heatSlowFactor: skill.heatSlowFactor });
    }
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
      if (bomb.stunDuration > 0) enemy.stun = Math.max(enemy.stun || 0, bomb.stunDuration);
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
        enemy.slow = Math.max(enemy.slow || 0, .24);
        enemy.slowFactor = Math.min(enemy.slowFactor || .58, zone.slowFactor);
        if (enemy.hp <= 0) Game.killEnemy(k);
      }
    }
  };
  Game.gainXp = function (amount) {
    var p = S.player;
    if (S.session && S.session.testArena) return;
    if (p.level >= C.maxLevel) return;
    p.xp += amount * (S.session.xpScale || 1);
    while (p.xp >= p.nextXp && p.level < C.maxLevel) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = Math.floor(p.nextXp * 1.22 + 10);
      if (p.level >= C.maxLevel) {
        p.xp = p.nextXp;
        S.session.message = "LV.MAX · 清空剩余尸潮";
        S.session.messageTimer = 2.6;
        break;
      }
      S.screen = "upgrade";
      S.upgradeCards = Game.rollTraits();
      break;
    }
  };
  Game.grantMaxLevel = function () {
    var p = S.player;
    while (p.level < C.maxLevel) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = Math.floor(p.nextXp * 1.22 + 10);
    }
    p.xp = p.nextXp;
  };
  Game.rollTraits = function () {
    var p = S.player, allTraits = C.traits.concat(C.skillTraits || []);
    var pool = allTraits.filter(function (trait) {
      if ((p.traits[trait.id] || 0) >= trait.max) return false;
      if (trait.unlocksSkill) return !p.skills[trait.skillId].unlocked;
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
      var skill = p.skills[trait.skillId];
      if (trait.unlocksSkill) { skill.unlocked = true; skill.level = 1; skill.fireTimer = 0; }
      else skill.level++;
    }
    trait.apply(p);
    Game.addText(p.x, p.y - 38, trait.name + (trait.skillId ? " Lv." + p.skills[trait.skillId].level : " Lv." + p.traits[trait.id]), C.colors.green);
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
  Game.damageEnemy = function (enemy, amount, bullet) { var actualDamage = amount * (enemy.damageTakenTimer > 0 ? enemy.damageTakenMultiplier || 1 : 1); enemy.hp -= actualDamage; enemy.hitFlash = .08; if (!bullet.noWeaponEffects && S.player.burn) Game.applyBurn(enemy, 10 + S.player.burn * 3, 1.5 + S.player.burn * .4); if (!bullet.noWeaponEffects && S.player.freeze) { enemy.slow = Math.max(enemy.slow, 1.2 + S.player.freeze * .25); enemy.slowFactor = Math.min(enemy.slowFactor || .58, .58); } if (!bullet.silentText) Game.addText(enemy.x + U.rand(-5, 5), enemy.y - C.enemies[enemy.type].radius, bullet.critical ? Math.ceil(actualDamage) + " 暴击" : String(Math.ceil(actualDamage)), bullet.critical ? C.colors.yellow : C.colors.text); };
})(window.Game = window.Game || {});
