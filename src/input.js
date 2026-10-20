/* 输入层：将鼠标/触控事件转换为游戏动作。 */
(function (Game) {
  "use strict";
  var C = Game.config, S = Game.state, canvas = Game.view.canvas;

  Game.pointerPosition = function (event) {
    var rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * C.width / rect.width, y: (event.clientY - rect.top) * C.height / rect.height };
  };

  function pointInRect(point, rect) {
    return !!rect && point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function pointInCircle(point, circle) {
    if (!circle) return false;
    var dx = point.x - circle.x, dy = point.y - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }

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

  var slotHoldTimer = null, slotHoldId = null;

  function isInSkillSlotColumn(point) {
    var slots = C.skillSlots;
    if (!slots) return false;
    var left = C.width + slots.offsetX;
    return point.x >= left - 6 && point.x <= left + slots.width + 6 && point.y >= slots.y - 4 && point.y <= slots.y + C.maxSkillSlots * (slots.height + slots.gap);
  }

  function getSkillSlotAt(point) {
    var slots = C.skillSlots;
    if (!slots || !S.player) return null;
    var left = C.width + slots.offsetX;
    if (point.x < left - 6 || point.x > left + slots.width + 6) return null;
    var order = S.player.skillOrder || [];
    for (var slot = 0; slot < C.maxSkillSlots; slot++) {
      var y = slots.y + slot * (slots.height + slots.gap);
      if (point.y >= y - 4 && point.y <= y + slots.height + 4) return order[slot] || null;
    }
    return null;
  }

  function releaseSkillSlot() {
    if (slotHoldTimer) { clearTimeout(slotHoldTimer); slotHoldTimer = null; }
    slotHoldId = null;
    if (S.skillRangePreview) S.skillRangePreview = null;
  }

  function holdSkillSlot(point) {
    var id = getSkillSlotAt(point);
    releaseSkillSlot();
    if (!id) return;
    slotHoldId = id;
    slotHoldTimer = setTimeout(function () {
      slotHoldTimer = null;
      if (slotHoldId) S.skillRangePreview = slotHoldId;
    }, C.skillRangeHoldMs || 350);
  }

  bindTestButton("test-controls-hide", function () { S.testArena.controlsVisible = false; });
  bindTestButton("test-controls-tab", function () { S.testArena.controlsVisible = true; });
  var testEnemyRows = document.getElementById("test-enemy-rows");
  if (testEnemyRows && testEnemyRows.addEventListener) {
    var dragList = null, dragStartX = 0, dragStartLeft = 0, dragMoved = false;
    function endEnemyDrag() {
      if (!dragList) return;
      dragList.classList.remove("dragging");
      dragList = null;
    }
    testEnemyRows.addEventListener("pointerdown", function (event) {
      var list = event.target && event.target.closest ? event.target.closest(".test-enemy-list") : null;
      if (!list || (event.pointerType && event.pointerType !== "mouse")) return;
      dragList = list;
      dragStartX = event.clientX;
      dragStartLeft = list.scrollLeft;
      dragMoved = false;
      list.classList.add("dragging");
    });
    testEnemyRows.addEventListener("pointermove", function (event) {
      if (!dragList) return;
      var offset = event.clientX - dragStartX;
      if (!dragMoved && Math.abs(offset) <= 3) return;
      dragMoved = true;
      dragList.scrollLeft = dragStartLeft - offset;
      event.preventDefault();
    });
    testEnemyRows.addEventListener("pointerup", endEnemyDrag);
    testEnemyRows.addEventListener("pointercancel", endEnemyDrag);
    testEnemyRows.addEventListener("pointerleave", endEnemyDrag);
    testEnemyRows.addEventListener("click", function (event) {
      var chip = event.target, id = chip && chip.getAttribute ? chip.getAttribute("data-enemy-id") : null;
      if (dragMoved) { dragMoved = false; event.preventDefault(); event.stopPropagation(); return; }
      if (id) Game.setTestEnemy(id);
    });
  }
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

  var accountDialog = document.getElementById("account-dialog");
  var accountDialogTitle = document.getElementById("account-dialog-title");
  var accountDialogNote = document.getElementById("account-dialog-note");
  var accountDialogUserRow = document.getElementById("account-dialog-user-row");
  var accountDialogUser = document.getElementById("account-dialog-user");
  var accountDialogPass = document.getElementById("account-dialog-pass");
  var accountDialogError = document.getElementById("account-dialog-error");
  var accountDialogSubmit = document.getElementById("account-dialog-submit");
  var accountDialogCancel = document.getElementById("account-dialog-cancel");
  var accountDialogMode = null;

  function setDialogError(message) { if (accountDialogError) accountDialogError.textContent = message || ""; }

  function closeAccountDialog() {
    accountDialogMode = null;
    if (!accountDialog) return;
    accountDialog.hidden = true;
    if (accountDialogPass) accountDialogPass.value = "";
    setDialogError("");
  }

  Game.openAccountDialog = function (mode) {
    if (!accountDialog) return;
    var removing = mode === "delete", register = mode === "register";
    accountDialogMode = removing ? "delete" : register ? "register" : "login";
    if (accountDialogTitle) accountDialogTitle.textContent = removing ? "删除账户" : register ? "注册账户" : "登录账户";
    if (accountDialogNote) {
      accountDialogNote.textContent = removing
        ? "删除后该账户的关卡进度与资源会一并清除，且不可恢复。请输入密码确认。"
        : register ? "用户名 2–16 个中文 / 字母 / 数字 / 下划线，密码至少 6 位。" : "";
    }
    if (accountDialogUserRow) accountDialogUserRow.hidden = removing;
    if (accountDialogUser) {
      accountDialogUser.disabled = removing;
      accountDialogUser.value = removing ? Game.accounts.getUsername() : "";
    }
    if (accountDialogPass) accountDialogPass.value = "";
    setDialogError("");
    accountDialog.hidden = false;
    if (accountDialogPass) accountDialogPass.focus();
  };

  Game.syncAccountDialog = function () {
    if (!accountDialog || accountDialog.hidden) return;
    if (S.screen !== "login" && S.screen !== "account") closeAccountDialog();
  };

  function submitAccountDialog() {
    var mode = accountDialogMode || S.accountMode || "login";
    var limits = C.accounts || {};
    var username = accountDialogUser ? accountDialogUser.value.replace(/^\s+|\s+$/g, "") : "";
    var password = accountDialogPass ? accountDialogPass.value : "";
    if (mode !== "delete" && (username.length < (limits.usernameMin || 2) || username.length > (limits.usernameMax || 16))) {
      setDialogError("用户名需要 2 到 16 个字符");
      return;
    }
    if (password.length < (limits.passwordMin || 6)) {
      setDialogError("密码至少 6 位");
      return;
    }
    setDialogError("");
    if (accountDialogSubmit) accountDialogSubmit.disabled = true;
    var task = mode === "delete"
      ? Game.accounts.removeAccount(password)
      : Game.accounts[mode === "register" ? "register" : "login"](username, password);
    task.then(function (result) {
      if (accountDialogSubmit) accountDialogSubmit.disabled = false;
      if (result && result.ok) {
        closeAccountDialog();
        S.screen = mode === "delete" ? "menu" : "account";
        return;
      }
      setDialogError((result && result.error) || "操作失败");
    });
  }

  if (accountDialog) {
    if (accountDialogSubmit) accountDialogSubmit.addEventListener("click", function (event) { event.preventDefault(); submitAccountDialog(); });
    if (accountDialogCancel) accountDialogCancel.addEventListener("click", function (event) { event.preventDefault(); closeAccountDialog(); });
    if (accountDialogUser) accountDialogUser.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); submitAccountDialog(); } });
    if (accountDialogPass) accountDialogPass.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); submitAccountDialog(); } });
    window.addEventListener("keydown", function (event) { if (event.key === "Escape" && !accountDialog.hidden) closeAccountDialog(); });
  }

  canvas.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    var point = Game.pointerPosition(event), center = C.width / 2;

    if (S.screen === "menu") {
      var menuButtons = C.menu.buttons;
      if (pointInCircle(point, C.menu.accountCircle)) Game.openAccount();
      else if (pointInRect(point, menuButtons.start)) Game.start(Game.getContinueLevel());
      else if (pointInRect(point, menuButtons.levelSelect)) Game.openLevelSelect();
      else if (pointInRect(point, menuButtons.testArena)) Game.startTestArena();
      else if (pointInRect(point, menuButtons.attributes)) Game.openAttributes();
      else if (pointInRect(point, menuButtons.skillCodex)) Game.openSkillCodex();
      else if (pointInRect(point, menuButtons.zombieCodex)) Game.openZombieCodex();
      return;
    }
    if (S.screen === "attributes") {
      if (pointInRect(point, C.attributesUI.equipment)) Game.openEquipment();
      else if (pointInRect(point, C.attributesUI.gems)) Game.openGems();
      else if (pointInRect(point, C.attributesUI.wall)) Game.openWall();
      else if (pointInRect(point, C.attributesUI.back)) Game.backToMenu();
      return;
    }
    if (S.screen === "equipment") {
      if (pointInRect(point, C.equipmentUI.bag)) { Game.openEquipmentBag(); return; }
      if (pointInRect(point, C.equipmentUI.back)) { Game.backToAttributes(); return; }
      if (Game.accounts.getStatus() === "ready") {
        for (var ei = 0; ei < C.equipment.slots.length; ei++) {
          if (pointInRect(point, Game.getEquipmentUpgradeRect(ei))) { Game.upgradeEquipment(C.equipment.slots[ei].id); return; }
        }
      }
      return;
    }
    if (S.screen === "equipmentBag") {
      if (pointInRect(point, C.equipmentBagUI.back)) { Game.backToEquipment(); return; }
      if (Game.accounts.getStatus() !== "ready" || Game.accounts.state.equipmentBagBusy) return;
      for (var bi = 0; bi < C.equipment.slots.length; bi++) {
        if (pointInRect(point, Game.getEquipmentBagTabRect(bi))) { Game.selectEquipmentBagPart(C.equipment.slots[bi].id); return; }
      }
      var bagView = Game.equipment.getBagPart(S.equipmentBagPart);
      for (bi = 0; bi < bagView.rows.length; bi++) {
        var bagRow = bagView.rows[bi];
        if (bagRow.count > 0 && !bagRow.equipped && bagRow.itemId && pointInRect(point, Game.getEquipmentBagButtonRect(bi))) {
          Game.equipEquipmentItem(bagRow.itemId);
          return;
        }
      }
      return;
    }
    if (S.screen === "wall") {
      if (pointInRect(point, C.wallUI.back)) { Game.backToAttributes(); return; }
      if (Game.accounts.getStatus() === "ready") {
        var wallView = Game.wall.getView();
        if ((wallView.canLevel || wallView.canBreakthrough) && pointInRect(point, Game.getWallActionButtonRect())) {
          Game.upgradeWall(wallView.canBreakthrough ? "breakthrough" : "level");
          return;
        }
      }
      return;
    }
    if (S.screen === "gems") {
      if (pointInRect(point, C.gemUI.back)) { Game.backToAttributes(); return; }
      if (Game.accounts.getStatus() !== "ready" || Game.accounts.state.gemBusy) return;
      var gemPart = Game.gems.getPart(S.gemPart), gemPage = Game.getGemPage(S.gemPart), gemIndex;
      for (gemIndex = 0; gemIndex < C.equipment.slots.length; gemIndex++) {
        if (pointInRect(point, Game.getGemPartTabRect(gemIndex))) {
          Game.selectGemPart(C.equipment.slots[gemIndex].id);
          return;
        }
      }
      if (pointInRect(point, Game.getGemInventoryPrevRect())) { Game.setGemPage(-1); return; }
      if (pointInRect(point, Game.getGemInventoryNextRect())) { Game.setGemPage(1); return; }
      if (pointInRect(point, Game.getGemSynthesisPrevRect())) { Game.cycleGemSynthesisQuality(-1); return; }
      if (pointInRect(point, Game.getGemSynthesisNextRect())) { Game.cycleGemSynthesisQuality(1); return; }
      for (gemIndex = 0; gemIndex < gemPart.sockets.length; gemIndex++) {
        if (gemPart.sockets[gemIndex] && pointInRect(point, Game.getGemSocketRect(gemIndex))) {
          Game.unsocketGem(gemPart.sockets[gemIndex].id);
          return;
        }
      }
      var pageRows = C.gemUI.inventory.rows, pageStart = gemPage * pageRows;
      for (gemIndex = 0; gemIndex < pageRows; gemIndex++) {
        var gem = gemPart.inventory[pageStart + gemIndex];
        if (gem && gemPart.canSocket && pointInRect(point, Game.getGemInventoryRowRect(gemIndex))) {
          Game.socketGem(gem.id);
          return;
        }
      }
      if (S.gemSynthQuality < C.gems.maxQuality && gemPart.counts[S.gemSynthQuality] >= C.gems.synthesisCost && pointInRect(point, Game.getGemSynthesisButtonRect())) {
        Game.synthesizeGems(gemPart.partId, S.gemSynthQuality);
        return;
      }
      return;
    }
    if (S.screen === "login") {
      var login = C.accountUI.login;
      if (pointInRect(point, login.userName) || pointInRect(point, login.password) || pointInRect(point, login.submit)) Game.openAccountDialog(S.accountMode);
      else if (pointInRect(point, login.switchMode)) Game.setAccountMode(S.accountMode === "register" ? "login" : "register");
      else if (pointInRect(point, C.accountUI.back)) Game.backToMenu();
      return;
    }
    if (S.screen === "account") {
      var accountBox = C.accountUI.account;
      if (pointInRect(point, accountBox.importButton)) Game.importLegacyProgress();
      else if (pointInRect(point, accountBox.logoutButton)) Game.logoutAccount();
      else if (pointInRect(point, accountBox.deleteButton)) Game.openAccountDialog("delete");
      else if (pointInRect(point, C.accountUI.back)) Game.backToMenu();
      return;
    }
    if (S.screen === "zombieCodex" || S.screen === "skillCodex") { handleCodexPointer(point, S.screen); return; }
    if (S.screen === "levelSelect") {
      var geo = C.levelSelect;
      if (S.levelPreview) {
        var close = Game.getLevelBriefCloseRect(), box = Game.getLevelBriefPanel();
        if (point.x >= close.x && point.x <= close.x + close.w && point.y >= close.y && point.y <= close.y + close.h) Game.closeLevelPreview();
        else if (point.x < box.x || point.x > box.x + box.w || point.y < box.y || point.y > box.y + box.h) Game.closeLevelPreview();
        return;
      }
      for (var li = 0; li < C.levels.length; li++) {
        var row = Game.getLevelRowRect(li);
        if (point.x < row.x || point.x > row.x + row.w || point.y < row.y || point.y > row.y + row.h) continue;
        var info = Game.getLevelInfoRect(li);
        if (point.x >= info.x && point.x <= info.x + info.w && point.y >= info.y && point.y <= info.y + info.h) { Game.openLevelPreview(C.levels[li].id); return; }
        Game.start(C.levels[li].id);
        return;
      }
      if (point.y >= geo.backY - 8 && point.y <= geo.backY + geo.backHeight + 8) Game.backToMenu();
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
      else if (point.x >= center - 82 && point.x <= center + 82 && point.y >= 382 && point.y <= 422) Game.quitLevel();
      return;
    }
    if (S.screen === "victory" || S.screen === "defeat" || S.screen === "retreat") {
      if (pointInRect(point, C.resultUI.restart)) { Game.start(S.selectedLevel); return; }
      if (pointInRect(point, C.resultUI.back)) { Game.exitToMenu(); return; }
      return;
    }
    if (S.screen === "testArena") {
      if (point.x >= 14 && point.x <= 42 && point.y >= 15 && point.y <= 43) { Game.exitTestArena(); return; }
      if (point.x >= 286 && point.x <= 354 && point.y >= 10 && point.y <= 32) { Game.toggleRifle(); return; }
      if (isInSkillSlotColumn(point)) { holdSkillSlot(point); return; }
      Game.setManualAim(point.x, point.y);
      return;
    }
    if (S.screen === "playing") {
      if (point.x >= 14 && point.x <= 42 && point.y >= 15 && point.y <= 43) { Game.pause(); return; }
      if (point.x >= 286 && point.x <= 354 && point.y >= 10 && point.y <= 32) { Game.toggleRifle(); return; }
      if (isInSkillSlotColumn(point)) { holdSkillSlot(point); return; }
      Game.setManualAim(point.x, point.y);
    }
  });
  canvas.addEventListener("pointerup", releaseSkillSlot);
  canvas.addEventListener("pointercancel", releaseSkillSlot);
  canvas.addEventListener("pointerleave", releaseSkillSlot);
  window.addEventListener("pointerup", releaseSkillSlot);
  window.addEventListener("pointercancel", releaseSkillSlot);
  window.addEventListener("blur", releaseSkillSlot);
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
