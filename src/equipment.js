/* 装备层：账号装备缓存、六部位汇总与属性修正。 */
(function (Game) {
  "use strict";
  var C = Game.config;

  var state = { data: null, bag: [] };

  function slots() { return C.equipment.slots || []; }
  function finite(value) { return typeof value === "number" && isFinite(value) ? value : 0; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function normalize(data) {
    var out = {}, source = data;
    if (Object.prototype.toString.call(source) === "[object Array]") {
      source = {};
      data.forEach(function (row) { if (row && row.slotId) source[row.slotId] = row; });
    }
    if (!source || typeof source !== "object") return out;
    slots().forEach(function (slot) {
      var row = source[slot.id];
      if (!row || typeof row !== "object") return;
      var fallback = finite(row.maxLevel) || C.equipment.maxLevel;
      out[slot.id] = {
        element: C.elements[row.element] ? row.element : "physical",
        level: clamp(Math.round(finite(row.level) || 1), 1, fallback),
        maxLevel: clamp(Math.round(fallback), 1, C.equipment.maxLevel),
        attackBonus: Math.max(0, finite(row.attackBonus)),
        elementBonus: Math.max(0, finite(row.elementBonus)),
        nextCost: row.nextCost && typeof row.nextCost === "object" ? row.nextCost : null
      };
    });
    return out;
  }

  function applyModifiers() {
    if (!Game.attributes) return;
    var attack = 0, elements = {}, hasData = false;
    Object.keys(C.elements).forEach(function (id) { elements[id] = 0; });
    slots().forEach(function (slot) {
      var row = state.data && state.data[slot.id];
      if (!row) return;
      hasData = true;
      attack += row.attackBonus;
      elements[row.element] = (elements[row.element] || 0) + row.elementBonus;
    });
    if (hasData) Game.attributes.setModifiers({ attack: attack, elementAttack: elements });
    else Game.attributes.clearModifiers();
    if (Game.state && Game.state.player) Game.attributes.applyPlayer(Game.state.player);
  }

  function applyAccount(data) {
    state.data = normalize(data);
    applyModifiers();
  }

  function normalizeBag(items) {
    if (Object.prototype.toString.call(items) !== "[object Array]") return [];
    var validSlots = {}, validElements = {}, seen = {}, out = [];
    slots().forEach(function (slot) { validSlots[slot.id] = true; });
    Object.keys(C.elements).forEach(function (id) { validElements[id] = true; });
    items.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      var id = Math.max(0, Math.round(finite(row.id)));
      if (!id || !validSlots[row.slotId] || !validElements[row.element] || seen[id]) return;
      seen[id] = true;
      out.push({ id: id, slotId: row.slotId, element: row.element });
    });
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  }

  function applyBag(items) { state.bag = normalizeBag(items); }

  function getBag() { return state.bag.slice(); }

  function getBagPart(partId) {
    var slot = getSlot(partId);
    if (!slot) slot = getSlots()[0];
    var id = slot ? slot.id : "arm", equipped = slot ? slot.element : null;
    var counts = {}, firstIds = {}, total = 0, rows = [];
    Object.keys(C.elements).forEach(function (element) { counts[element] = 0; });
    state.bag.forEach(function (item) {
      if (item.slotId !== id) return;
      counts[item.element] += 1;
      total += 1;
      if (!firstIds[item.element]) firstIds[item.element] = item.id;
    });
    Object.keys(C.elements).forEach(function (element) {
      var info = C.elements[element];
      rows.push({ element: element, name: info.name, color: info.color, count: counts[element], itemId: firstIds[element] || null, equipped: equipped === element });
    });
    return {
      partId: id,
      name: slot ? slot.name : "",
      short: slot ? slot.short : "",
      color: slot ? slot.color : C.colors.cyan,
      level: slot ? slot.level : 0,
      maxLevel: slot ? slot.maxLevel : C.equipment.maxLevel,
      attackBonus: slot ? slot.attackBonus : 0,
      elementBonus: slot ? slot.elementBonus : 0,
      equipped: equipped,
      equippedName: equipped && C.elements[equipped] ? C.elements[equipped].name : "",
      counts: counts,
      total: total,
      rows: rows
    };
  }

  function getBagOverview() {
    return getSlots().map(function (slot) {
      var counts = {}, parts = [], total = 0;
      Object.keys(C.elements).forEach(function (element) { counts[element] = 0; });
      state.bag.forEach(function (item) {
        if (item.slotId !== slot.id) return;
        counts[item.element] += 1;
        total += 1;
      });
      Object.keys(C.elements).forEach(function (element) {
        if (!counts[element]) return;
        parts.push({ element: element, name: C.elements[element].name, color: C.elements[element].color, count: counts[element] });
      });
      return {
        id: slot.id,
        name: slot.name,
        short: slot.short,
        color: slot.color,
        level: slot.level,
        maxLevel: slot.maxLevel,
        element: slot.element,
        elementName: slot.elementName,
        elementColor: slot.elementColor,
        equippedName: slot.elementName,
        bagTotal: total,
        parts: parts
      };
    });
  }

  function clear() {
    state.data = null;
    state.bag = [];
    if (!Game.attributes) return;
    Game.attributes.clearModifiers();
    if (Game.state && Game.state.player) Game.attributes.applyPlayer(Game.state.player);
  }

  function getSlots() {
    var resources = Game.accounts && Game.accounts.getResources ? Game.accounts.getResources() : {};
    var coin = resources.coin || 0;
    return slots().map(function (slot) {
      var row = state.data && state.data[slot.id];
      var cost = row && row.nextCost;
      var blueprint = resources[slot.blueprintId] || 0;
      var maxed = !row || !cost || row.level >= row.maxLevel;
      return {
        id: slot.id,
        name: slot.name,
        short: slot.short,
        color: slot.color,
        blueprintId: slot.blueprintId,
        element: row ? row.element : null,
        elementName: row && C.elements[row.element] ? C.elements[row.element].name : "",
        elementColor: row && C.elements[row.element] ? C.elements[row.element].color : C.colors.muted,
        level: row ? row.level : 0,
        maxLevel: row ? row.maxLevel : C.equipment.maxLevel,
        attackBonus: row ? row.attackBonus : 0,
        elementBonus: row ? row.elementBonus : 0,
        nextCost: cost,
        coin: coin,
        blueprint: blueprint,
        maxed: maxed,
        affordable: !!cost && coin >= finite(cost.coin) && blueprint >= finite(cost[slot.blueprintId])
      };
    });
  }

  function getSlot(slotId) {
    var list = getSlots();
    for (var i = 0; i < list.length; i++) if (list[i].id === slotId) return list[i];
    return null;
  }

  function getTotals() {
    var attack = 0, elements = {};
    Object.keys(C.elements).forEach(function (id) { elements[id] = 0; });
    slots().forEach(function (slot) {
      var row = state.data && state.data[slot.id];
      if (!row) return;
      attack += row.attackBonus;
      elements[row.element] = (elements[row.element] || 0) + row.elementBonus;
    });
    return { attack: attack, elementAttack: elements };
  }

  Game.equipment = {
    state: state,
    applyAccount: applyAccount,
    applyBag: applyBag,
    clear: clear,
    getSlots: getSlots,
    getSlot: getSlot,
    getBag: getBag,
    getBagPart: getBagPart,
    getBagOverview: getBagOverview,
    getTotals: getTotals
  };
})(window.Game = window.Game || {});
