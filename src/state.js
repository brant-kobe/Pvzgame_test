/* 运行时状态层：集中管理一局游戏的数据。 */
(function (Game) {
  "use strict";
  var C = Game.config;
  Game.state = { screen: "menu", selectedLevel: 1, player: null, bullets: [], skillProjectiles: [], armoredCars: [], explosions: [], enemies: [], pendingSpawns: [], particles: [], texts: [], upgradeCards: [], wall: null, session: null };
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
    s.player = { x: C.width / 2, y: C.height - 58, aimAngle: -Math.PI / 2, manualAimTimer: 0, maxHp: 100, hp: 100, damage: 18, fireInterval: .52, fireTimer: .05, magazineSize: C.magazineCapacity, ammo: C.magazineCapacity, reloadDuration: C.reloadDuration, reloadTimer: 0, burst: 0, burstShotsRemaining: 0, burstTimer: 0, burstAngle: -Math.PI / 2, spread: 0, pierce: 0, bulletRadius: 4, crit: .08, critDamage: 1.5, burn: 0, freeze: 0, bulletType: "normal", skills: skills, level: 1, xp: 0, nextXp: 35, traits: {} };
    s.bullets = []; s.skillProjectiles = []; s.armoredCars = []; s.explosions = []; s.enemies = []; s.pendingSpawns = []; s.particles = []; s.texts = []; s.upgradeCards = [];
    s.wall = { x: C.width / 2, y: C.height - 125, width: C.width - 30, height: 30, maxHp: 260, hp: 260 };
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
  Game.pause = function () { if (Game.state.screen === "playing") Game.state.screen = "paused"; };
  Game.resume = function () { if (Game.state.screen === "paused") Game.state.screen = "playing"; };
  Game.start = function (levelId) {
    var level = Game.config.levels.find(function (item) { return item.id === (levelId || Game.state.selectedLevel); });
    if (!level || !Game.isLevelUnlocked(level.id)) return;
    Game.state.selectedLevel = level.id;
    Game.reset();
    Game.state.screen = "playing";
    document.getElementById("start-hint").style.display = "none";
  };
  Game.exitToMenu = function () { Game.reset(); Game.state.screen = "menu"; document.getElementById("start-hint").style.display = "block"; };
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
  Game.getLatestUnlockedLevel = function () {
    var latest = C.levels[0] ? C.levels[0].id : 1;
    C.levels.forEach(function (level) { if (Game.isLevelUnlocked(level.id)) latest = level.id; });
    return latest;
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
