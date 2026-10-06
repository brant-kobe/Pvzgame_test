/* 运行时状态层：集中管理一局游戏的数据。 */
(function (Game) {
  "use strict";
  var C = Game.config;
  Game.state = { screen: "menu", selectedLevel: 1, player: null, bullets: [], skillProjectiles: [], armoredCars: [], bombDrops: [], bombZones: [], electromagneticZones: [], tornadoes: [], drones: [], hailStorms: [], fuelShells: [], fuelPools: [], enemyShots: [], explosions: [], enemies: [], pendingSpawns: [], particles: [], texts: [], upgradeCards: [], wall: null, session: null, testArena: null, skillRangePreview: null };
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
    s.player = { x: C.width / 2, y: C.height - 58, aimAngle: -Math.PI / 2, manualAimTimer: 0, maxHp: 100, hp: 100, damage: 28, fireInterval: .52, fireTimer: .05, magazineSize: C.magazineCapacity, ammo: C.magazineCapacity, reloadDuration: C.reloadDuration, reloadTimer: 0, rifleEnabled: true, burst: 0, burstShotsRemaining: 0, burstTimer: 0, burstAngle: -Math.PI / 2, spread: 0, pierce: 0, bulletRadius: 4, crit: .08, critDamage: 1.5, burn: 0, freeze: 0, bulletType: "normal", skills: skills, skillOrder: [], level: 1, xp: 0, nextXp: C.xpBase, traits: {} };
    s.bullets = []; s.skillProjectiles = []; s.armoredCars = []; s.bombDrops = []; s.bombZones = []; s.electromagneticZones = []; s.tornadoes = []; s.drones = []; s.hailStorms = []; s.fuelShells = []; s.fuelPools = []; s.enemyShots = []; s.explosions = []; s.enemies = []; s.pendingSpawns = []; s.particles = []; s.texts = []; s.upgradeCards = []; s.skillRangePreview = null;
    s.wall = { x: C.width / 2, y: C.height - 125, width: C.width - 30, height: 30, maxHp: C.wallMaxHp, hp: C.wallMaxHp };
    s.session = { level: s.selectedLevel, waves: waves, xpScale: (level && level.xpScale) || 1, hpScale: (level && level.hpScale) || 1, elapsed: 0, wave: 1, spawnCount: 0, spawnTimer: .25, eliteSpawned: false, bossSpawned: false, kills: 0, message: "", messageTimer: 0 };
  };
  Game.layoutWorld = function () {
    var s = Game.state;
    if (s.wall) s.wall.y = C.height - 125;
    if (s.player) s.player.y = C.height - 58;
  };
  Game.openLevelSelect = function () { Game.state.screen = "levelSelect"; };
  Game.openZombieCodex = function () { Game.state.zombieCodexCategory = "minion"; Game.state.selectedZombieCodexId = null; Game.state.codexPage = 0; Game.state.screen = "zombieCodex"; };
  Game.openSkillCodex = function () { Game.state.selectedSkillCodexId = null; Game.state.codexPage = 0; Game.state.screen = "skillCodex"; };
  Game.backToMenu = function () { Game.state.screen = "menu"; };
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
  Game.start = function (levelId) {
    var level = Game.config.levels.find(function (item) { return item.id === (levelId || Game.state.selectedLevel); });
    if (!level || !Game.isLevelUnlocked(level.id)) return;
    Game.state.selectedLevel = level.id;
    Game.reset();
    Game.state.screen = "playing";
    document.getElementById("start-hint").style.display = "none";
  };
  Game.exitToMenu = function () { Game.reset(); Game.state.testArena = null; Game.state.screen = "menu"; document.getElementById("start-hint").style.display = "block"; };
  var progressKey = "blockline.progress", memoryProgress = {};
  function readStoredProgress() {
    try { return JSON.parse(window.localStorage.getItem(progressKey)) || {}; } catch (error) { return {}; }
  }
  Game.getProgress = function () {
    var completed = {}, stored = readStoredProgress();
    if (stored.completed) Object.keys(stored.completed).forEach(function (id) { completed[id] = true; });
    Object.keys(memoryProgress).forEach(function (id) { completed[id] = true; });
    return { completed: completed };
  };
  Game.isLevelCompleted = function (levelId) { return !!Game.getProgress().completed[levelId]; };
  Game.markLevelComplete = function (levelId) {
    memoryProgress[levelId] = true;
    try {
      var stored = readStoredProgress();
      stored.completed = stored.completed || {};
      stored.completed[levelId] = true;
      window.localStorage.setItem(progressKey, JSON.stringify(stored));
    } catch (error) {}
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
    Game.markLevelComplete(s.session.level);
    s.screen = "victory";
    s.session.message = "关卡通关";
  };
})(window.Game = window.Game || {});
