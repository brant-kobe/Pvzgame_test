/* 运行时状态层：集中管理一局游戏的数据。 */
(function (Game) {
  "use strict";
  var C = Game.config;
  Game.state = { screen: "menu", selectedLevel: 1, accountMode: "login", player: null, bullets: [], skillProjectiles: [], armoredCars: [], bombDrops: [], bombZones: [], electromagneticZones: [], tornadoes: [], drones: [], hailStorms: [], fuelShells: [], fuelPools: [], enemyShots: [], explosions: [], enemies: [], pendingSpawns: [], particles: [], texts: [], upgradeCards: [], wall: null, session: null, testArena: null, skillRangePreview: null, levelPreview: null, gemPart: "arm", gemPage: 0, gemSynthQuality: 0, equipmentBagPart: "arm" };
  Game.reset = function () {
    var s = Game.state;
    var level = C.levels.find(function (item) { return item.id === s.selectedLevel; });
    var waves = level && level.waves && level.waves.length ? level.waves : C.waves;
    var skills = {};
    Object.keys(C.skillDefaults).forEach(function (id) {
      skills[id] = {};
      Object.keys(C.skillDefaults[id]).forEach(function (key) { skills[id][key] = C.skillDefaults[id][key]; });
      skills[id].fireTimer = skills[id].fireInterval * .5;
      skills[id].burstShotsRemaining = 0;
      skills[id].burstTimer = 0;
      skills[id].burstAngle = -Math.PI / 2;
    });
    s.player = { x: C.width / 2, y: C.height - 58, aimAngle: -Math.PI / 2, manualAimTimer: 0, maxHp: 100, hp: 100, damage: 28, fireInterval: .52, fireTimer: .05, magazineSize: C.magazineCapacity, ammo: C.magazineCapacity, reloadDuration: C.reloadDuration, reloadTimer: 0, rifleEnabled: true, burst: 0, burstShotsRemaining: 0, burstTimer: 0, burstAngle: -Math.PI / 2, spread: 0, pierce: 0, bulletRadius: 4, crit: C.attributes.base.critRate, critDamage: C.attributes.base.critDamage, burn: 0, freeze: 0, bulletType: "normal", skills: skills, skillOrder: [], level: 1, xp: 0, nextXp: C.xpBase, traits: {} };
    s.bullets = []; s.skillProjectiles = []; s.armoredCars = []; s.bombDrops = []; s.bombZones = []; s.electromagneticZones = []; s.tornadoes = []; s.drones = []; s.hailStorms = []; s.fuelShells = []; s.fuelPools = []; s.enemyShots = []; s.explosions = []; s.enemies = []; s.pendingSpawns = []; s.particles = []; s.texts = []; s.upgradeCards = []; s.skillRangePreview = null; s.levelPreview = null;
    s.gemPage = 0; s.gemSynthQuality = 0; s.equipmentBagPart = "arm";
    s.wall = { x: C.width / 2, y: C.height - 125, width: C.width - 30, height: 30, maxHp: C.wallMaxHp, hp: C.wallMaxHp };
    if (Game.attributes) { Game.attributes.applyPlayer(s.player); Game.attributes.applyWall(s.wall); }
    s.session = { level: s.selectedLevel, waves: waves, xpScale: (level && level.xpScale) || 1, hpScale: (level && level.hpScale) || 1, elapsed: 0, wave: 1, spawnCount: 0, spawnTimer: .25, eliteSpawned: false, bossSpawned: false, kills: 0, message: "", messageTimer: 0, reward: null };
  };
  Game.layoutWorld = function () {
    var s = Game.state;
    if (s.wall) s.wall.y = C.height - 125;
    if (s.player) s.player.y = C.height - 58;
  };
  Game.openLevelSelect = function () { Game.state.levelPreview = null; Game.state.screen = "levelSelect"; };
  Game.openLevelPreview = function (levelId) {
    var level = C.levels.find(function (item) { return item.id === levelId; });
    if (!level) return false;
    Game.state.levelPreview = level.id;
    return true;
  };
  Game.closeLevelPreview = function () { Game.state.levelPreview = null; };
  Game.openZombieCodex = function () { Game.state.zombieCodexCategory = "minion"; Game.state.selectedZombieCodexId = null; Game.state.codexPage = 0; Game.state.screen = "zombieCodex"; };
  Game.openSkillCodex = function () { Game.state.selectedSkillCodexId = null; Game.state.codexPage = 0; Game.state.screen = "skillCodex"; };
  Game.openAttributes = function () { Game.state.screen = "attributes"; };
  Game.openEquipment = function () {
    Game.accounts.state.equipmentError = "";
    Game.accounts.state.equipmentNotice = "";
    Game.state.screen = "equipment";
  };
  Game.openEquipmentBag = function () {
    Game.accounts.state.equipmentBagError = "";
    Game.accounts.state.equipmentBagNotice = "";
    Game.selectEquipmentBagPart(Game.state.equipmentBagPart);
    Game.state.screen = "equipmentBag";
  };
  Game.selectEquipmentBagPart = function (partId) {
    var valid = (C.equipment.slots || []).some(function (slot) { return slot.id === partId; });
    if (!valid) partId = (C.equipment.slots && C.equipment.slots[0] ? C.equipment.slots[0].id : "arm");
    Game.state.equipmentBagPart = partId;
  };
  Game.backToEquipment = function () { Game.state.screen = "equipment"; };
  Game.equipEquipmentItem = function (itemId) {
    if (Game.state.screen !== "equipmentBag") return Promise.resolve({ ok: false });
    return Game.accounts.equipEquipment(itemId);
  };
  Game.openWall = function () {
    Game.accounts.state.wallError = "";
    Game.accounts.state.wallNotice = "";
    Game.state.screen = "wall";
  };
  Game.selectGemPart = function (partId) {
    var valid = (C.equipment.slots || []).some(function (slot) { return slot.id === partId; });
    if (!valid) partId = (C.equipment.slots && C.equipment.slots[0] ? C.equipment.slots[0].id : "arm");
    Game.state.gemPart = partId;
    Game.state.gemPage = 0;
    Game.state.gemSynthQuality = Game.gems ? Game.gems.getDefaultSynthesisQuality(partId) : 0;
  };
  Game.openGems = function (partId) {
    Game.accounts.state.gemError = "";
    Game.accounts.state.gemNotice = "";
    Game.selectGemPart(partId || Game.state.gemPart);
    Game.state.screen = "gems";
  };
  Game.backToAttributes = function () { Game.state.screen = "attributes"; };
  Game.backToMenu = function () { Game.state.levelPreview = null; Game.state.screen = "menu"; };
  Game.getTestEnemyIds = function () { return Object.keys(C.enemies); };
  Game.startTestArena = function () {
    var s = Game.state, enemyIds = Game.getTestEnemyIds();
    s.selectedLevel = 1;
    Game.reset();
    s.testArena = { enemyIds: enemyIds, enemyIndex: 0, skillIndex: 0, traitIndex: 0, controlsVisible: true };
    s.session.testArena = true;
    s.session.level = 0;
    s.session.wave = 0;
    s.session.waves = [];
    s.wall.maxHp = 9999;
    s.wall.hp = s.wall.maxHp;
    s.screen = "testArena";
    document.getElementById("start-hint").style.display = "none";
  };
  Game.selectTestEnemy = function (offset) {
    var arena = Game.state.testArena, ids = Game.getTestEnemyIds();
    if (!arena || !ids.length) return;
    arena.enemyIndex = (arena.enemyIndex + offset + ids.length) % ids.length;
  };
  Game.setTestEnemy = function (id) {
    var arena = Game.state.testArena, ids = Game.getTestEnemyIds(), index = ids.indexOf(id);
    if (!arena || index < 0) return;
    arena.enemyIndex = index;
  };
  Game.selectTestSkill = function (offset) {
    var arena = Game.state.testArena, skills = C.coreSkills || [];
    if (!arena || !skills.length) return;
    arena.skillIndex = (arena.skillIndex + offset + skills.length) % skills.length;
    arena.traitIndex = 0;
  };
  Game.selectTestTrait = function (offset) {
    var arena = Game.state.testArena, skill = arena && C.coreSkills[arena.skillIndex], traits;
    if (!arena || !skill) return;
    traits = (C.skillTraits || []).filter(function (trait) { return trait.skillId === skill.id && !trait.unlocksSkill; });
    if (!traits.length) return;
    arena.traitIndex = (arena.traitIndex + offset + traits.length) % traits.length;
  };
  Game.exitTestArena = function () { Game.exitToMenu(); };
  Game.pause = function () { if (Game.state.screen === "playing") { Game.state.skillRangePreview = null; Game.state.screen = "paused"; } };
  Game.resume = function () { if (Game.state.screen === "paused") Game.state.screen = "playing"; };
  Game.quitLevel = function () {
    var s = Game.state;
    if (s.screen !== "paused" || !s.session) return;
    s.screen = "retreat";
    s.session.message = "已撤离";
    Game.settleRewards(false);
  };
  Game.start = function (levelId) {
    var level = Game.config.levels.find(function (item) { return item.id === (levelId || Game.state.selectedLevel); });
    if (!level || !Game.isLevelUnlocked(level.id)) return;
    Game.state.selectedLevel = level.id;
    Game.reset();
    Game.state.screen = "playing";
    document.getElementById("start-hint").style.display = "none";
  };
  Game.exitToMenu = function () { Game.reset(); Game.state.testArena = null; Game.state.screen = "menu"; document.getElementById("start-hint").style.display = "block"; };
  Game.getProgress = function () { return Game.accounts.getProgress(); };
  Game.isLevelCompleted = function (levelId) { return Game.accounts.isCompleted(levelId); };
  Game.markLevelComplete = function (levelId, stats) {
    return Game.accounts.reportRun(levelId, { time: stats && stats.time, kills: stats && stats.kills, win: true });
  };
  Game.reportRun = function (win) {
    var session = Game.state.session;
    if (!session || session.testArena || !session.level) return null;
    return Game.accounts.reportRun(session.level, { time: session.elapsed, kills: session.kills, win: !!win });
  };
  Game.settleRewards = function (win) {
    var s = Game.state, session = s.session;
    if (!session || session.testArena || !session.level || session.reward) return null;
    var level = Math.max(1, Math.min(C.maxLevel, (s.player && s.player.level) || 1));
    var reward = session.reward = { status: "pending", tier: -1, level: level, win: !!win, resources: {}, gems: [], equipment: [], note: "" };
    if (!Game.accounts || !Game.accounts.claimRewards) {
      reward.status = "failed";
      reward.note = "账户服务不可用";
      return null;
    }
    return Game.accounts.claimRewards(session.level, level, !!win).then(function (result) {
      if (result && result.ok) {
        reward.status = "done";
        reward.tier = result.tier;
        reward.resources = (result.rewards && result.rewards.resources) || {};
        reward.gems = (result.rewards && result.rewards.gems) || [];
        reward.equipment = (result.rewards && result.rewards.equipment) || [];
        return result;
      }
      reward.reason = (result && result.reason) || "";
      reward.note = reward.reason === "offline" ? "未连接数据库 · 奖励不会保存"
        : reward.reason === "guest" ? ((result && result.error === "登录已过期") ? "登录已过期 · 奖励不会保存" : "未登录 · 奖励不会保存")
          : reward.reason === "loading" ? "正在连接账户服务…"
            : ((result && result.error) || "奖励未保存");
      reward.status = reward.reason ? "unsaved" : "failed";
      return result;
    });
  };
  Game.loseLevel = function (message) {
    var s = Game.state;
    if (s.screen !== "playing" || !s.session) return;
    s.session.message = message || "城墙失守";
    s.screen = "defeat";
    Game.reportRun(false);
    Game.settleRewards(false);
  };
  Game.openLogin = function () { Game.state.accountMode = "login"; Game.state.screen = "login"; };
  Game.setAccountMode = function (mode) { Game.state.accountMode = mode === "register" ? "register" : "login"; };
  Game.openAccount = function () {
    if (Game.accounts.getStatus() === "ready") Game.state.screen = "account";
    else Game.openLogin();
  };
  Game.logoutAccount = function () {
    Game.accounts.logout().then(function () { Game.backToMenu(); });
  };
  Game.importLegacyProgress = function () {
    if (Game.accounts.getStatus() !== "ready") { Game.accounts.state.notice = "登录后才能导入旧进度"; return; }
    Game.accounts.importLegacy();
  };
  Game.upgradeEquipment = function (slotId) {
    if (Game.state.screen !== "equipment") return Promise.resolve({ ok: false });
    return Game.accounts.upgradeEquipment(slotId);
  };
  Game.upgradeWall = function (action) {
    if (Game.state.screen !== "wall") return Promise.resolve({ ok: false });
    return Game.accounts.upgradeWall(action);
  };
  Game.getGemPageCount = function (partId) {
    if (!Game.gems) return 1;
    var count = Game.gems.getPart(partId || Game.state.gemPart).inventory.length;
    return Math.max(1, Math.ceil(count / C.gemUI.inventory.rows));
  };
  Game.getGemPage = function (partId) {
    return Math.max(0, Math.min(Game.state.gemPage, Game.getGemPageCount(partId) - 1));
  };
  Game.setGemPage = function (delta) {
    Game.state.gemPage = Math.max(0, Math.min(Game.state.gemPage + delta, Game.getGemPageCount(Game.state.gemPart) - 1));
  };
  Game.cycleGemSynthesisQuality = function (delta) {
    var max = C.gems.maxQuality;
    Game.state.gemSynthQuality = ((Game.state.gemSynthQuality + delta) % (max + 1) + (max + 1)) % (max + 1);
  };
  Game.socketGem = function (gemId) {
    if (Game.state.screen !== "gems") return Promise.resolve({ ok: false });
    return Game.accounts.socketGem(gemId);
  };
  Game.unsocketGem = function (gemId) {
    if (Game.state.screen !== "gems") return Promise.resolve({ ok: false });
    return Game.accounts.unsocketGem(gemId);
  };
  Game.synthesizeGems = function (partId, quality) {
    if (Game.state.screen !== "gems") return Promise.resolve({ ok: false });
    return Game.accounts.synthesizeGems(partId, quality);
  };
  Game.isLevelUnlocked = function (levelId) {
    var level = C.levels.find(function (item) { return item.id === levelId; });
    if (!level) return false;
    if (level.unlocked) return true;
    return Game.isLevelCompleted(levelId - 1);
  };
  Game.getLevelRowRect = function (index) {
    var geo = C.levelSelect, count = Math.max(1, C.levels.length);
    var height = Math.min(geo.rowHeight, (geo.backY - 12 - geo.listY) / count);
    return { x: geo.listX, y: geo.listY + index * height, w: geo.listWidth, h: height };
  };
  Game.getLevelInfoRect = function (index) {
    var geo = C.levelSelect, row = Game.getLevelRowRect(index), size = geo.infoSize;
    return { x: row.x + geo.infoX - size / 2, y: row.y + (row.h - size) / 2, w: size, h: size };
  };
  Game.getEquipmentCardRect = function (index) {
    var geo = C.equipmentUI, column = index % 2, row = Math.floor(index / 2);
    return { x: geo.cardX[column], y: geo.cardY[row], w: geo.cardWidth, h: geo.cardHeight };
  };
  Game.getEquipmentUpgradeRect = function (index) {
    var card = Game.getEquipmentCardRect(index);
    return { x: card.x + 10, y: card.y + 80, w: card.w - 20, h: 20 };
  };
  Game.getEquipmentBagTabRect = function (index) {
    var geo = C.equipmentBagUI.partTabs;
    return { x: geo.x + index * (geo.w + geo.gap), y: geo.y, w: geo.w, h: geo.h };
  };
  Game.getEquipmentBagRowRect = function (index) {
    var geo = C.equipmentBagUI;
    return { x: geo.listX, y: geo.listY + index * geo.rowHeight, w: geo.listWidth, h: geo.rowHeight - 4 };
  };
  Game.getEquipmentBagButtonRect = function (index) {
    var geo = C.equipmentBagUI, row = Game.getEquipmentBagRowRect(index);
    return { x: row.x + geo.equip.offsetX, y: row.y + geo.equip.offsetY, w: geo.equip.w, h: geo.equip.h };
  };
  Game.getWallActionButtonRect = function () {
    var rect = C.wallUI.actionButton;
    return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  };
  Game.getGemPartTabRect = function (index) {
    var geo = C.gemUI.partTabs;
    return { x: geo.x + index * (geo.w + geo.gap), y: geo.y, w: geo.w, h: geo.h };
  };
  Game.getGemSocketRect = function (index) {
    var geo = C.gemUI.sockets, column = index % geo.columns, row = Math.floor(index / geo.columns);
    return { x: geo.x + column * (geo.w + geo.gapX), y: geo.y + row * (geo.h + geo.gapY), w: geo.w, h: geo.h };
  };
  Game.getGemInventoryRowRect = function (index) {
    var geo = C.gemUI.inventory;
    return { x: geo.x, y: geo.y + index * geo.rowHeight, w: geo.w, h: geo.rowHeight };
  };
  Game.getGemInventoryPrevRect = function () { return C.gemUI.inventoryPrev; };
  Game.getGemInventoryNextRect = function () { return C.gemUI.inventoryNext; };
  Game.getGemSynthesisPrevRect = function () { return C.gemUI.synthesisPrev; };
  Game.getGemSynthesisNextRect = function () { return C.gemUI.synthesisNext; };
  Game.getGemSynthesisButtonRect = function () { return C.gemUI.synthesisButton; };
  Game.getLevelBriefPanel = function () {
    var geo = C.levelSelect, roster = Game.getLevelRoster(Game.state.levelPreview);
    var rows = roster.minions.length + roster.elites.length + (roster.boss ? 1 : 0);
    var height = geo.briefTop + geo.briefHeadingStep * 3 + geo.briefGroupGap * 3 + geo.briefRowStep * rows + geo.briefBottom;
    return { x: geo.briefX, y: geo.briefY, w: geo.briefWidth, h: Math.max(geo.briefMinHeight, height) };
  };
  Game.getLevelBriefCloseRect = function () {
    var geo = C.levelSelect, box = Game.getLevelBriefPanel();
    return { x: box.x + box.w - geo.briefCloseSize - 10, y: box.y + 10, w: geo.briefCloseSize, h: geo.briefCloseSize };
  };
  Game.getLevelBriefLayout = function () {
    var geo = C.levelSelect, roster = Game.getLevelRoster(Game.state.levelPreview), y = geo.briefTop, groups = [];
    [roster.minions, roster.elites, roster.boss ? [roster.boss] : []].forEach(function (list) {
      var group = { y: y, rows: [] };
      list.forEach(function (entry, index) { group.rows.push({ entry: entry, y: y + geo.briefHeadingStep + index * geo.briefRowStep }); });
      y += geo.briefHeadingStep + list.length * geo.briefRowStep + geo.briefGroupGap;
      groups.push(group);
    });
    return { box: Game.getLevelBriefPanel(), groups: groups };
  };
  Game.getLevelRoster = function (levelId) {
    var level = C.levels.find(function (item) { return item.id === levelId; });
    var minions = [], elites = [], boss = null, bossWave = 0, minionSeen = {}, eliteSeen = {}, bossId = null;
    function collect(list, seen, id, wave) {
      var info = C.enemies[id];
      if (!info) return;
      if (seen[id]) { if (seen[id].waves.indexOf(wave) < 0) seen[id].waves.push(wave); return; }
      seen[id] = { id: id, name: info.name, color: info.color, accent: info.accent, wave: wave, waves: [wave] };
      list.push(seen[id]);
    }
    if (level && level.waves) {
      level.waves.forEach(function (wave, index) {
        var number = index + 1, unique = [];
        (wave.mix || []).forEach(function (id) { if (unique.indexOf(id) < 0) unique.push(id); });
        unique.forEach(function (id) { collect(minions, minionSeen, id, number); });
        if (wave.elite) collect(elites, eliteSeen, wave.elite, number);
        (wave.elitePool || []).forEach(function (id) { collect(elites, eliteSeen, id, number); });
        if (wave.boss) bossWave = number;
      });
    }
    Object.keys(C.enemies).forEach(function (id) { if (!bossId && (C.enemies[id].codexCategory || "minion") === "boss") bossId = id; });
    if (bossId && bossWave) boss = { id: bossId, name: C.enemies[bossId].name, color: C.enemies[bossId].color, accent: C.enemies[bossId].accent, wave: bossWave, waves: [bossWave] };
    return { minions: minions, elites: elites, boss: boss };
  };
  Game.getContinueLevel = function () {
    var pending = C.levels.filter(function (level) { return Game.isLevelUnlocked(level.id) && !Game.isLevelCompleted(level.id); });
    if (pending.length) return pending[0].id;
    var open = C.levels.filter(function (level) { return Game.isLevelUnlocked(level.id); });
    return open.length ? open[open.length - 1].id : 1;
  };
  Game.getRemainingEnemyCount = function () {
    var s = Game.state, session = s.session;
    if (!session) return 0;
    var plan = session.waves[session.wave - 1], count = s.enemies.length + s.pendingSpawns.length;
    if (plan) {
      count += Math.max(0, plan.total - session.spawnCount);
      if (plan.boss && !session.bossSpawned) count += 1;
    }
    return count;
  };
  Game.winLevel = function () {
    var s = Game.state;
    if (s.screen !== "playing" || !s.session) return;
    s.screen = "victory";
    s.session.message = "关卡通关";
    Game.reportRun(true);
    Game.settleRewards(true);
  };
})(window.Game = window.Game || {});
