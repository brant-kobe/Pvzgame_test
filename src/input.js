/* 输入层：将鼠标/触控事件转换为游戏动作。 */
(function (Game) {
  "use strict";
  var C = Game.config, S = Game.state, canvas = Game.view.canvas;

  Game.pointerPosition = function (event) {
    var rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * C.width / rect.width, y: (event.clientY - rect.top) * C.height / rect.height };
  };

  function getSkillCodexGroup() {
    if (!S.selectedSkillCodexId) return null;
    return Game.getSkillGroups().find(function (group) { return group.id === S.selectedSkillCodexId; });
  }
  function getCodexPageCount(screen) {
    if (screen === "zombieCodex") {
      var count = Game.getCodexEnemyIds(S.zombieCodexCategory).length;
      return Math.max(1, Math.ceil(count / 4));
    }
    var group = getSkillCodexGroup();
    if (group) return Math.max(1, Math.ceil(group.traits.length / 3));
    return Math.max(1, Math.ceil(Game.getSkillGroups().length / 5));
  }

  function handleCodexPointer(point, screen) {
    if (screen === "zombieCodex" && point.y >= 107 && point.y <= 138 && point.x >= 22 && point.x <= 336) {
      var categories = ["minion", "elite", "boss"], categoryIndex = Math.floor((point.x - 22) / 106);
      if (categories[categoryIndex]) { S.zombieCodexCategory = categories[categoryIndex]; S.selectedZombieCodexId = null; S.codexPage = 0; }
      return;
    }
    if (screen === "skillCodex") {
      var group = getSkillCodexGroup();
      if (group) {
        if (point.y >= 521 && point.y <= 552 && getCodexPageCount(screen) > 1) {
          if (point.x >= 94 && point.x <= 148) S.codexPage = Math.max(0, S.codexPage - 1);
          else if (point.x >= 212 && point.x <= 266) S.codexPage = Math.min(getCodexPageCount(screen) - 1, S.codexPage + 1);
          return;
        }
        if (point.x >= 108 && point.x <= 252 && point.y >= 561 && point.y <= 598) { S.selectedSkillCodexId = null; S.codexPage = 0; }
        return;
      }
      if (point.x >= 26 && point.x <= 334 && point.y >= 146 && point.y <= 496 && (point.y - 146) % 70 <= 62) {
        var row = Math.floor((point.y - 146) / 70), order = Game.getSkillGroups(), list = order.slice((S.codexPage || 0) * 5, (S.codexPage || 0) * 5 + 5);
        if (list[row]) { S.selectedSkillCodexId = list[row].id; S.codexPage = 0; }
        return;
      }
    }
    if (screen === "zombieCodex" && S.selectedZombieCodexId) {
      if (point.x >= 98 && point.x <= 262 && point.y >= 553 && point.y <= 593) S.selectedZombieCodexId = null;
      return;
    }
    if (point.y >= 521 && point.y <= 552 && getCodexPageCount(screen) > 1) {
      if (point.x >= 94 && point.x <= 148) S.codexPage = Math.max(0, S.codexPage - 1);
      else if (point.x >= 212 && point.x <= 266) S.codexPage = Math.min(getCodexPageCount(screen) - 1, S.codexPage + 1);
      return;
    }
    if (screen === "zombieCodex") {
      var column = point.x >= 26 && point.x <= 174 ? 0 : point.x >= 186 && point.x <= 334 ? 1 : -1;
      var row = point.y >= 155 && point.y <= 303 ? 0 : point.y >= 315 && point.y <= 463 ? 1 : -1;
      if (column >= 0 && row >= 0) {
        var entryIds = Game.getCodexEnemyIds(S.zombieCodexCategory);
        var entryId = entryIds[(S.codexPage || 0) * 4 + row * 2 + column];
        if (entryId) S.selectedZombieCodexId = entryId;
        return;
      }
    }
    if (point.x >= 108 && point.x <= 252 && point.y >= 561 && point.y <= 598) Game.backToMenu();
  }

  function bindTestButton(id, action) {
    var button = document.getElementById(id);
    if (button) button.addEventListener("click", function (event) { event.preventDefault(); action(); });
  }

  bindTestButton("test-controls-hide", function () { S.testArena.controlsVisible = false; });
  bindTestButton("test-controls-tab", function () { S.testArena.controlsVisible = true; });
  bindTestButton("test-enemy-prev", function () { Game.selectTestEnemy(-1); });
  bindTestButton("test-enemy-next", function () { Game.selectTestEnemy(1); });
  bindTestButton("test-spawn-one", function () { Game.testSpawnEnemy(1); });
  bindTestButton("test-spawn-wave", function () { Game.testSpawnEnemy(C.waves[0].total); });
  bindTestButton("test-clear-enemies", Game.testClearEnemies);
  bindTestButton("test-restore", Game.testRestore);
  bindTestButton("test-skill-prev", function () { Game.selectTestSkill(-1); });
  bindTestButton("test-skill-next", function () { Game.selectTestSkill(1); });
  bindTestButton("test-unlock-skill", Game.testUnlockSkill);
  bindTestButton("test-trait-prev", function () { Game.selectTestTrait(-1); });
  bindTestButton("test-trait-next", function () { Game.selectTestTrait(1); });
  bindTestButton("test-apply-trait", Game.testApplyTrait);
  bindTestButton("test-clear-build", Game.testClearBuild);
  bindTestButton("test-rifle-toggle", Game.toggleRifle);
  bindTestButton("test-exit", Game.exitTestArena);

  canvas.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    var point = Game.pointerPosition(event), center = C.width / 2;

    if (S.screen === "menu") {
      if (point.x > center - 100 && point.x < center + 100 && point.y >= 245 && point.y <= 300) Game.start(Game.getLatestUnlockedLevel());
      else if (point.x > center - 100 && point.x < center + 100 && point.y >= 306 && point.y <= 356) Game.openLevelSelect();
      else if (point.x >= 22 && point.x <= 172 && point.y >= 365 && point.y <= 409) Game.openZombieCodex();
      else if (point.x >= 188 && point.x <= 338 && point.y >= 365 && point.y <= 409) Game.openSkillCodex();
      else if (point.x > center - 100 && point.x < center + 100 && point.y >= 425 && point.y <= 467) Game.startTestArena();
      return;
    }
    if (S.screen === "zombieCodex" || S.screen === "skillCodex") { handleCodexPointer(point, S.screen); return; }
    if (S.screen === "levelSelect") {
      for (var li = 0; li < C.levels.length; li++) {
        var cardY = 180 + li * 100;
        if (point.y >= cardY && point.y <= cardY + 82) { Game.start(C.levels[li].id); return; }
      }
      if (point.y >= 510 && point.y <= 570) Game.backToMenu();
      return;
    }
    if (S.screen === "upgrade") {
      var cardW = 98, gap = 8, start = (C.width - cardW * 3 - gap * 2) / 2;
      for (var i = 0; i < 3; i++) {
        var x = start + i * (cardW + gap);
        if (point.x >= x && point.x <= x + cardW && point.y >= 175 && point.y <= 430) { Game.chooseTrait(i); return; }
      }
      return;
    }
    if (S.screen === "paused") {
      if (point.x >= center - 82 && point.x <= center + 82 && point.y >= 326 && point.y <= 370) Game.resume();
      else if (point.x >= center - 82 && point.x <= center + 82 && point.y >= 382 && point.y <= 422) Game.exitToMenu();
      return;
    }
    if (S.screen === "victory" || S.screen === "defeat") {
      if (point.y >= 305 && point.y <= 349) {
        if (point.x >= 42 && point.x <= 172) { Game.start(S.selectedLevel); return; }
        if (point.x >= 188 && point.x <= 318) { Game.exitToMenu(); return; }
      }
      return;
    }
    if (S.screen === "testArena") {
      if (point.x >= 14 && point.x <= 42 && point.y >= 15 && point.y <= 43) { Game.exitTestArena(); return; }
      if (point.x >= 286 && point.x <= 354 && point.y >= 10 && point.y <= 32) { Game.toggleRifle(); return; }
      Game.setManualAim(point.x, point.y);
      return;
    }
    if (S.screen === "playing") {
      if (point.x >= 14 && point.x <= 42 && point.y >= 15 && point.y <= 43) { Game.pause(); return; }
      if (point.x >= 286 && point.x <= 354 && point.y >= 10 && point.y <= 32) { Game.toggleRifle(); return; }
      if (point.x >= 204 && point.x <= 354 && point.y >= 45 && point.y <= 64) return;
      Game.setManualAim(point.x, point.y);
    }
  });
  window.addEventListener("keydown", function (event) {
    if (S.screen !== "testArena") return;
    var key = event.key.toLowerCase();
    if (key === "arrowleft") { Game.selectTestEnemy(-1); event.preventDefault(); }
    else if (key === "arrowright") { Game.selectTestEnemy(1); event.preventDefault(); }
    else if (key === "1") { Game.testSpawnEnemy(1); event.preventDefault(); }
    else if (key === "5") { Game.testSpawnEnemy(C.waves[0].total); event.preventDefault(); }
    else if (key === "c") { Game.testClearEnemies(); event.preventDefault(); }
    else if (key === "r") { Game.testRestore(); event.preventDefault(); }
    else if (key === "[") { Game.selectTestSkill(-1); event.preventDefault(); }
    else if (key === "]") { Game.selectTestSkill(1); event.preventDefault(); }
    else if (key === ",") { Game.selectTestTrait(-1); event.preventDefault(); }
    else if (key === ".") { Game.selectTestTrait(1); event.preventDefault(); }
    else if (key === "e") { Game.testUnlockSkill(); event.preventDefault(); }
    else if (key === "t") { Game.testApplyTrait(); event.preventDefault(); }
    else if (key === "x") { Game.testClearBuild(); event.preventDefault(); }
    else if (key === "h") { S.testArena.controlsVisible = !S.testArena.controlsVisible; event.preventDefault(); }
    else if (key === "escape") { Game.exitTestArena(); event.preventDefault(); }
  });
})(window.Game = window.Game || {});
