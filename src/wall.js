/* 城墙层：钢材等级、稀土突破与防线血量修正。 */
(function (Game) {
  "use strict";
  var C = Game.config;

  var state = { data: null };

  function finite(value) { return typeof value === "number" && isFinite(value) ? value : 0; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function normalize(data) {
    if (!data || typeof data !== "object") return null;
    var maxLevel = clamp(Math.round(finite(data.maxLevel) || C.wall.maxLevel), 1, C.wall.maxLevel);
    var level = clamp(Math.round(finite(data.level) || 1), 1, maxLevel);
    var info = data.breakthrough && typeof data.breakthrough === "object" ? data.breakthrough : {};
    return {
      level: level,
      maxLevel: maxLevel,
      hpBonus: Math.max(0, finite(data.hpBonus)),
      hpPerLevel: Math.max(1, finite(data.hpPerLevel) || C.wall.hpPerLevel),
      nextSteelCost: data.nextSteelCost === null || data.nextSteelCost === undefined ? null : Math.max(0, Math.round(finite(data.nextSteelCost))),
      breakthrough: {
        required: !!info.required,
        atLevel: info.atLevel === null || info.atLevel === undefined ? null : Math.max(1, Math.round(finite(info.atLevel))),
        cost: info.cost === null || info.cost === undefined ? null : Math.max(0, Math.round(finite(info.cost))),
        completed: Math.max(0, Math.round(finite(info.completed))),
        max: Math.max(0, Math.round(finite(info.max)))
      },
      maxed: !!data.maxed || level >= maxLevel
    };
  }

  function syncWall() {
    if (!Game.attributes || !Game.state || !Game.state.wall) return;
    if (Game.state.screen === "testArena") return;
    var wall = Game.state.wall, maxHp = Game.attributes.get().wallMaxHp;
    var inRun = Game.state.screen === "playing" || Game.state.screen === "paused" || Game.state.screen === "upgrade";
    if (inRun) {
      var ratio = wall.maxHp > 0 ? wall.hp / wall.maxHp : 1;
      wall.maxHp = maxHp;
      wall.hp = Math.min(maxHp, Math.max(0, Math.round(maxHp * ratio)));
    } else {
      wall.maxHp = maxHp;
      wall.hp = maxHp;
    }
  }

  function applyAccount(data) {
    state.data = normalize(data);
    if (Game.attributes) Game.attributes.setWallHpBonus(state.data ? state.data.hpBonus : 0);
    syncWall();
  }

  function clear() {
    state.data = null;
    if (Game.attributes) Game.attributes.setWallHpBonus(0);
    syncWall();
  }

  function getView() {
    var resources = Game.accounts && Game.accounts.getResources ? Game.accounts.getResources() : {};
    var steel = resources.steel || 0, rareEarth = resources.rareEarth || 0;
    var data = state.data;
    if (!data) {
      return {
        ready: false, level: 1, maxLevel: C.wall.maxLevel, hpBonus: 0, maxHp: C.wallMaxHp, hpPerLevel: C.wall.hpPerLevel,
        nextSteelCost: null, steel: steel, rareEarth: rareEarth,
        breakthrough: { required: false, atLevel: C.wall.breakthroughStep, cost: C.wall.rareEarthBase, completed: 0, max: Math.floor((C.wall.maxLevel - 1) / C.wall.breakthroughStep) },
        breakthroughRequired: false, maxed: false, canLevel: false, canBreakthrough: false
      };
    }
    var cost = data.nextSteelCost, bt = data.breakthrough;
    return {
      ready: true,
      level: data.level,
      maxLevel: data.maxLevel,
      hpBonus: data.hpBonus,
      maxHp: C.wallMaxHp + data.hpBonus,
      hpPerLevel: data.hpPerLevel,
      nextSteelCost: cost,
      steel: steel,
      rareEarth: rareEarth,
      breakthrough: bt,
      breakthroughRequired: bt.required,
      maxed: data.maxed,
      canLevel: !data.maxed && !bt.required && cost !== null,
      canBreakthrough: !data.maxed && bt.required && bt.cost !== null
    };
  }

  Game.wall = {
    state: state,
    applyAccount: applyAccount,
    clear: clear,
    getView: getView,
    getData: function () { return state.data; }
  };
})(window.Game = window.Game || {});
