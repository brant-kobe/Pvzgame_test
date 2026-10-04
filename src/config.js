/* 静态数据层：新增敌人、词条或波次时优先修改这里。 */
(function (Game) {
  "use strict";
  var levelOneWaves = [
    { total: 12, interval: .72, mix: ["normal"] },
    { total: 18, interval: .65, mix: ["normal", "runner", "normal"] },
    { total: 20, interval: .62, mix: ["normal", "runner", "splitter"] },
    { total: 26, interval: .54, mix: ["normal", "runner", "splitter", "runner"], elitePool: ["normalElite", "runnerElite", "splitterElite"] },
    { total: 28, interval: .5, mix: ["normal", "runner", "normal", "runner"], boss: true }
  ];
  var levelTwoWaves = [
    { total: 8, interval: 1.2, mix: ["normal"] },
    { total: 11, interval: 1.1, mix: ["normal", "runner"] },
    { total: 15, interval: 1, mix: ["normal", "runner", "splitter"] },
    { total: 19, interval: .6, mix: ["normal", "runner", "splitter"], elite: "runnerElite" },
    { total: 22, interval: .58, mix: ["splitter", "runner"] },
    { total: 32, interval: .56, mix: ["normal", "splitter", "runner"] },
    { total: 34, interval: .54, mix: ["runner", "splitter"], boss: true },
    { total: 36, interval: .52, mix: ["normal", "runner", "splitter"] },
    { total: 38, interval: .5, mix: ["runner", "splitter", "runner"] },
    { total: 43, interval: .48, mix: ["normal", "runner", "splitter"] }
  ];
  var levelThreeWaves = [
    { total: 10, interval: 1.6, mix: ["normal"] },
    { total: 14, interval: 1.45, mix: ["normal", "runner"] },
    { total: 19, interval: 1.3, mix: ["normal", "runner", "splitter"] },
    { total: 23, interval: .55, mix: ["normal", "runner", "splitter"], elite: "splitterElite" },
    { total: 27, interval: .52, mix: ["splitter", "runner"] },
    { total: 44, interval: .5, mix: ["normal", "splitter", "runner"] },
    { total: 48, interval: .48, mix: ["runner", "splitter"], boss: true },
    { total: 53, interval: .46, mix: ["normal", "runner", "splitter"] },
    { total: 58, interval: .45, mix: ["runner", "splitter", "runner"] },
    { total: 62, interval: .42, mix: ["normal", "runner", "splitter"] }
  ];
  var levelFourWaves = [
    { total: 10, interval: 1.6, mix: ["normal"] },
    { total: 14, interval: 1.45, mix: ["normal", "runner"] },
    { total: 19, interval: 1.3, mix: ["normal", "runner", "splitter"] },
    { total: 23, interval: .55, mix: ["normal", "runner", "splitter"], elite: "splitterElite" },
    { total: 27, interval: .52, mix: ["splitter", "runner"] },
    { total: 52, interval: .46, mix: ["normal", "splitter", "runner"], hpScale: 1.15 },
    { total: 58, interval: .44, mix: ["runner", "splitter"], boss: true, hpScale: 1.25 },
    { total: 66, interval: .42, mix: ["normal", "runner", "splitter"], hpScale: 1.4 },
    { total: 74, interval: .4, mix: ["runner", "splitter", "runner"], hpScale: 1.5 },
    { total: 84, interval: .38, mix: ["normal", "runner", "splitter"], hpScale: 1.6 }
  ];
  Game.config = {
    width: 360, height: 640, maxLevel: 15, maxSkillSlots: 4, wallMaxHp: 1000, xpBase: 15, xpMultiplier: 1.13, xpBonus: 6, rifleSideOffset: -6, muzzleDistance: 34, magazineCapacity: 35, reloadDuration: 2, spreadAngle: .12,
    sprites: {
      playerBody: { src: ["assets/player-man.png", "assets/player-body.png", "assets/man.png"], width: 74, height: 131, anchorX: 37, anchorY: 78 },
      playerRifle: { src: "assets/player-rifle.png", width: 18, height: 46, anchorX: 9, anchorY: 38, mountX: -6, mountY: -40 }
    },
    skillRing: { offsetX: 64, offsetY: -100 },
    skillSlots: { offsetX: -54, y: 46, width: 48, height: 18, gap: 3 },
    levelSelect: { panelX: 16, panelY: 56, panelWidth: 328, panelHeight: 538, cardX: 30, cardWidth: 300, cardHeight: 82, cardTop: 172, cardGap: 88, backY: 540, backHeight: 40 },
    ranges: { far: 480, mid: 320, near: 125 },
    rifleRange: "far",
    skillRangeHoldMs: 350,
    colors: { bg: "#0b202c", text: "#f4f8fb", muted: "#9ab0bc", green: "#63e6a0", yellow: "#ffd166", red: "#ff6b6b", cyan: "#68d8ff", ice: "#58aaff", fire: "#ff9b52", purple: "#c9a1ff" },
    enemies: {
      normal: { name: "普通僵尸", codexCategory: "minion", description: "尸潮中的基础单位，生命与速度均衡，会持续向防线推进。", tactics: "优先利用自动锁定快速清理；单体威胁低，数量增加后会给城墙造成压力。", hp: 28, speed: 20, radius: 14, damage: 10, xp: 8, color: "#6eaa7b", accent: "#b1e4a0" },
      runner: { name: "快跑僵尸", codexCategory: "minion", description: "体型轻巧、生命较低，但移动速度明显快于普通僵尸。", tactics: "尽早击杀以免快速逼近城墙；齐射、连发和冰冻效果都能有效应对。", hp: 16, speed: 42, radius: 11, damage: 7, xp: 7, color: "#e5a052", accent: "#ffe0a7" },
      splitter: { name: "分裂僵尸", codexCategory: "minion", description: "两个头共用一个身体的变异僵尸，被击杀后会分裂成两个更小的分裂幼体。", tactics: "分裂会立刻补充敌人数量，建议用穿透、齐射或范围技能一次清理本体与幼体，尽量在它们靠近城墙前解决。", hp: 60, speed: 22, radius: 16, damage: 10, xp: 12, color: "#6f6398", accent: "#c9b6ff", splitInto: "splitterChild", splitCount: 2 },
      splitterChild: { name: "分裂僵尸幼体", codexCategory: "minion", codexHidden: true, description: "分裂僵尸死亡后产生的单头幼体，体型和生命较低，但移动更快。", tactics: "数量较多，注意不要让它们同时抵达防线；范围伤害能高效清除。", hp: 18, speed: 30, radius: 9, damage: 5, xp: 3, color: "#8478ad", accent: "#d8ccff" },
      normalElite: { name: "普通僵尸精英", codexCategory: "elite", description: "普通僵尸的精英强化形态，体型更大，生命、移速和攻击力全面提升，仍以稳定推进为主要特性。", tactics: "精英单位更耐打且对城墙威胁更高，应集中火力尽早消灭。", hp: 420, speed: 26, radius: 22, damage: 20, xp: 35, color: "#647847", accent: "#ffd166" },
      runnerElite: { name: "快跑僵尸精英", codexCategory: "elite", description: "快跑僵尸的精英强化形态，保留高速冲锋特性，并拥有更大的体型、更高的生命和更强的攻击。", tactics: "速度与耐久兼备，出现后应优先集火；冰冻效果可以压制其推进速度。", hp: 300, speed: 54, radius: 19, damage: 16, xp: 30, color: "#a86735", accent: "#ffe08a" },
      splitterElite: { name: "分裂僵尸精英", codexCategory: "elite", description: "分裂僵尸的精英形态，体型更大并持续回复生命；死亡后分裂出两个同样会自愈的精英幼体。", tactics: "自愈会拉长战斗时间，需要集中持续输出；击杀本体后立即处理两个精英幼体，避免它们回满生命。", hp: 620, speed: 27, radius: 25, damage: 22, xp: 55, color: "#5d4f8a", accent: "#ffd166", splitInto: "splitterEliteChild", splitCount: 2, regenPerSecond: 8 },
      splitterEliteChild: { name: "分裂僵尸精英幼体", codexCategory: "elite", codexHidden: true, description: "分裂僵尸精英死亡后产生的精英幼体，体型较小但保留精英特征并会持续回复生命。", tactics: "尽快击杀防止回血堆积，冰冻、眩晕和爆发伤害都很有效。", hp: 100, speed: 34, radius: 12, damage: 10, xp: 10, color: "#7767a5", accent: "#ffe08a", regenPerSecond: 3 },
      boss: { name: "尸潮领主", codexCategory: "boss", description: "关卡首领，体型巨大、生命值极高；生命低于一半时进入狂暴状态，移动速度提升。", tactics: "持续输出并留意其接近城墙；燃烧、暴击与高伤害构筑有助于缩短战斗时间。", hp: 3000, speed: 10, radius: 34, damage: 24, xp: 100, color: "#9d5264", accent: "#ffb0bc" }
    },
    skillDefaults: {
      thermobaric: { unlocked: false, level: 0, fireInterval: 5, projectileSpeed: 250, projectileRadius: 8, impactDamage: 32, impactKnockback: 24, explosionDamage: 58, explosionRadius: 68, explosionKnockback: 42, burnDps: 10, burnDuration: 2.5, pierce: 0, burst: 0 },
      dryIce: { unlocked: false, level: 0, fireInterval: 3.5, projectileSpeed: 300, projectileRadius: 7, damage: 28, knockback: 12, pierce: 3, freezeDuration: 0, slowFactor: .58, splitCount: 0, spread: 0, burst: 0 },
      armoredCar: { unlocked: false, level: 0, fireInterval: 6.3, speed: 140, carWidth: 34, carLength: 64, damage: 4, hitInterval: .16, slowFactor: .55, slowDuration: 1.2, stunChance: 0, stunDuration: .6, extraCars: 0, sizeLevel: 0 },
      bombardment: { unlocked: false, level: 0, fireInterval: 11, bombSpeed: 560, damage: 180, blastRadius: 45, centerRadius: 17, knockback: 105, extraBombs: 0, stunDuration: 0, centerDamageMultiplier: 1, thermonuclear: false, heatDuration: 4, heatDps: 25, heatSlowFactor: .5, bombDropDelay: .42, bombMinSeparationRatio: .9, bombAltScoreRatio: .45 },
      electromagnetic: { unlocked: false, level: 0, fireInterval: 3, damage: 72, stunDuration: 2.5, extraTargets: 0, explosion: false, explosionDamage: 44, explosionRadius: 54, matrix: false, matrixDuration: 4, matrixDps: 12, matrixRadius: 38, matrixSlowFactor: .5 },
      highEnergyBeam: { unlocked: false, level: 0, fireInterval: 3, damage: 6, baseDamageHits: 20, bonusDamageHits: 0, damageHits: 20, beamWidth: 16, duration: 4, slowEnabled: false, slowFactor: .1, slowDuration: 1, crippleEnabled: false, damageTakenMultiplier: 1.25, damageTakenDuration: 5, overcharged: false },
      whirlwindCannon: { unlocked: false, level: 0, fireInterval: 12, duration: 10, speed: 72, radius: 40, damage: 20, hitInterval: .35, pullSpeed: 18, clusterRadius: 58, clusterWeight: 130, threatWeight: 60, clusterJitter: .55, extraTornadoes: 0, stormGather: false, stormDuration: 2, stormRadiusScale: 1.7, stormDamageScale: 1, stormPullScale: 1.2 }
    },
    traits: [
      { id: "damage", name: "增伤", rarity: "普通", max: 5, icon: "✦", desc: "子弹伤害 +25%", detail: "每级使所有步枪子弹伤害提高 25%，最高 5 级。稳定提升清理普通敌人和攻击首领的效率。", apply: function (p) { p.damage *= 1.25; } },
      { id: "burst", name: "连发", rarity: "普通", max: 3, icon: "➤", desc: "每次沿同一弹道连续发射 1 枚子弹", detail: "每级令每次攻击沿同一条弹道追加 1 颗子弹，最高 3 级；额外子弹不改变方向，连发整轮只消耗 1 发弹药。", apply: function (p) { p.burst += 1; } },
      { id: "firerate", name: "射速", rarity: "普通", max: 5, icon: "⚡", desc: "射击间隔 -15%", detail: "每级将步枪射击间隔缩短 15%，最高 5 级。提高持续输出频率，但弹匣耗尽时仍需完成换弹。", apply: function (p) { p.fireInterval *= .85; } },
      { id: "spread", name: "齐射", rarity: "稀有", max: 3, icon: "✣", desc: "每级增加 1 条分角弹道", detail: "每级增加 1 条同时发射的分角弹道，最高 3 级；相邻弹道角度间隔为 0.12 弧度，形成扇形覆盖。齐射整轮只消耗 1 发弹药。", apply: function (p) { p.spread += 1; } },
      { id: "pierce", name: "穿透", rarity: "稀有", max: 4, icon: "↠", desc: "子弹额外穿透 1 个敌人", detail: "每级令子弹额外穿过 1 个敌人，最高 4 级。适合沿同一方向聚集的尸潮。", apply: function (p) { p.pierce += 1; } },
      { id: "caliber", name: "大口径", rarity: "稀有", max: 3, icon: "●", desc: "子弹更大，伤害 +15%", detail: "每级令子弹半径增加 2，并使伤害提高 15%，最高 3 级；更容易命中，也能提升单发伤害。", apply: function (p) { p.bulletRadius += 2; p.damage *= 1.15; } },
      { id: "crit", name: "暴击", rarity: "普通", max: 5, icon: "♦", desc: "暴击率 +12%", detail: "每级增加 12% 暴击率，最高 5 级。暴击子弹造成基础伤害的 1.5 倍；可与弱点打击叠加。", apply: function (p) { p.crit += .12; } },
      { id: "weakpoint", name: "弱点打击", rarity: "稀有", max: 3, icon: "☄", desc: "暴击伤害 +50%", detail: "每级使暴击伤害倍率增加 0.5，最高 3 级。与暴击率配合时收益更高。", apply: function (p) { p.critDamage += .5; } },
      { id: "burn", name: "燃烧弹", rarity: "稀有", max: 3, icon: "♨", desc: "命中后附加持续伤害", detail: "将子弹切换为火焰属性，命中后施加持续燃烧；燃烧伤害和持续时间随等级提升，最高 3 级。", apply: function (p) { p.burn += 1; p.bulletType = "fire"; } },
      { id: "freeze", name: "冰冻弹", rarity: "稀有", max: 3, icon: "❄", desc: "命中后减缓敌人移动", detail: "将子弹切换为冰冻属性，命中后减缓敌人移动；减速持续时间随等级提升，最高 3 级。", apply: function (p) { p.freeze += .12; p.bulletType = "ice"; } }
    ],
    skillTraits: [
      { id: "unlockThermobaric", skillId: "thermobaric", unlocksSkill: true, name: "温压弹", rarity: "稀有", max: 1, icon: "♨", desc: "解锁温压弹技能", detail: "首次获取后解锁温压弹，技能槽显示 Lv1；之后可获取温压弹专属词条继续升级。", apply: function () {} },
      { id: "thermoBlast", skillId: "thermobaric", name: "爆炸增伤", rarity: "稀有", max: 5, icon: "✹", desc: "温压弹爆炸伤害 +25%", detail: "每级提升温压弹爆炸伤害 25%，最高 5 级；不影响命中时的冲击伤害。", apply: function (p) { p.skills.thermobaric.explosionDamage *= 1.25; } },
      { id: "thermoPierce", skillId: "thermobaric", name: "温压弹穿透", rarity: "稀有", max: 3, icon: "↠", desc: "温压弹穿透 +1", detail: "每级增加 1 次穿透；温压弹先对沿途目标造成冲击，穿透耗尽后再爆炸。", apply: function (p) { p.skills.thermobaric.pierce += 1; } },
      { id: "thermoBurst", skillId: "thermobaric", name: "温压弹连发", rarity: "稀有", max: 3, icon: "➤", desc: "每轮额外发射 1 颗温压弹", detail: "每级在一次温压弹攻击周期中追加 1 颗炮弹；每发重新索敌，并优先选择与本轮已发炮弹方向差异较大的目标，最高 3 级。", apply: function (p) { p.skills.thermobaric.burst += 1; } },
      { id: "thermoRadius", skillId: "thermobaric", name: "爆炸范围增大", rarity: "稀有", max: 3, icon: "◉", desc: "温压弹爆炸范围 +20%", detail: "每级扩大温压弹爆炸半径 20%，最高 3 级，可覆盖更密集的敌群。", apply: function (p) { p.skills.thermobaric.explosionRadius *= 1.2; } },
      { id: "thermoKnockback", skillId: "thermobaric", name: "击退强化", rarity: "稀有", max: 3, icon: "⇢", desc: "温压弹击退距离 +25%", detail: "每级强化温压弹命中冲击和爆炸冲击的击退距离 25%，最高 3 级。", apply: function (p) { p.skills.thermobaric.impactKnockback *= 1.25; p.skills.thermobaric.explosionKnockback *= 1.25; } },
      { id: "thermoImpact", skillId: "thermobaric", name: "冲击伤害增加", rarity: "稀有", max: 5, icon: "✦", desc: "温压弹冲击伤害 +25%", detail: "每级提升温压弹炮弹直接命中的冲击伤害 25%，最高 5 级；爆炸伤害由爆炸增伤强化。", apply: function (p) { p.skills.thermobaric.impactDamage *= 1.25; } },
      { id: "unlockDryIce", skillId: "dryIce", unlocksSkill: true, name: "干冰弹", rarity: "稀有", max: 1, icon: "❄", desc: "解锁干冰弹技能", detail: "首次获取后解锁干冰弹，技能槽显示 Lv1；之后可获取干冰弹专属词条继续升级。", apply: function () {} },
      { id: "iceFreeze", skillId: "dryIce", name: "冰冻", rarity: "稀有", max: 4, icon: "❄", desc: "干冰弹命中后减速", detail: "命中后冻结敌人移动，每级增加减速持续时间并增强减速效果，最高 4 级。", apply: function (p) { var skill = p.skills.dryIce; skill.freezeDuration += .55; skill.slowFactor = Math.max(.25, skill.slowFactor - .06); } },
      { id: "iceDamage", skillId: "dryIce", name: "干冰弹增伤", rarity: "稀有", max: 5, icon: "✦", desc: "干冰弹伤害 +25%", detail: "每级提升干冰弹及其分裂冰弹的命中伤害 25%，最高 5 级。", apply: function (p) { p.skills.dryIce.damage *= 1.25; } },
      { id: "icePierce", skillId: "dryIce", name: "干冰弹穿透", rarity: "稀有", max: 4, icon: "↠", desc: "干冰弹穿透 +1", detail: "每级增加 1 次额外穿透；基础干冰弹已可穿透 3 次。", apply: function (p) { p.skills.dryIce.pierce += 1; } },
      { id: "iceSplit", skillId: "dryIce", name: "分裂小冰弹", rarity: "稀有", max: 3, icon: "❄", desc: "干冰弹命中后分裂", detail: "干冰弹首次命中后分裂出 2 枚小冰弹，每级再增加 2 枚，最高 3 级；小冰弹造成部分伤害。", apply: function (p) { p.skills.dryIce.splitCount += 2; } },
      { id: "iceSpread", skillId: "dryIce", name: "干冰弹齐射", rarity: "稀有", max: 3, icon: "✣", desc: "每级增加 1 枚分角干冰弹", detail: "每级增加 1 枚同时发射的干冰弹，角度分开形成扇形覆盖，最高 3 级。", apply: function (p) { p.skills.dryIce.spread += 1; } },
      { id: "iceBurst", skillId: "dryIce", name: "干冰弹连发", rarity: "稀有", max: 3, icon: "➤", desc: "每轮额外发射 1 枚干冰弹", detail: "每级在一次干冰弹攻击周期中追加 1 轮发射；每轮重新索敌，并优先选择与本轮已发弹丸方向差异较大的目标，最高 3 级。", apply: function (p) { p.skills.dryIce.burst += 1; } },
      { id: "unlockArmoredCar", skillId: "armoredCar", unlocksSkill: true, name: "装甲车支援", rarity: "稀有", max: 1, icon: "▰", desc: "解锁装甲车支援", detail: "首次获取后解锁装甲车，技能槽显示 Lv1；之后可获取装甲车专属词条继续升级。", apply: function () {} },
      { id: "armoredCarDamage", skillId: "armoredCar", name: "装甲车增伤", rarity: "稀有", max: 5, icon: "✦", desc: "装甲车碾压伤害 +20%", detail: "每级提升装甲车每次碾压伤害 20%，保留多段命中机制，最高 5 级。", apply: function (p) { p.skills.armoredCar.damage *= 1.2; } },
      { id: "armoredCarReinforcement", skillId: "armoredCar", name: "车辆增援", rarity: "稀有", max: 2, icon: "▰", desc: "每轮多派遣 1 辆装甲车", detail: "每级使每轮派遣的装甲车数量增加 1 辆，多车会分散在不同车道，最高 2 级。", apply: function (p) { p.skills.armoredCar.extraCars++; } },
      { id: "armoredCarSlow", skillId: "armoredCar", name: "减速延长", rarity: "稀有", max: 4, icon: "❄", desc: "碾压减速时间 +0.4 秒", detail: "每级延长装甲车碾压附加的减速时间 0.4 秒，重复命中会刷新减速，最高 4 级。", apply: function (p) { p.skills.armoredCar.slowDuration += .4; } },
      { id: "armoredCarStun", skillId: "armoredCar", name: "眩晕冲撞", rarity: "稀有", max: 3, icon: "✹", desc: "碾压眩晕概率 +10%", detail: "每级使装甲车首次接触敌人时有额外 10% 概率将其眩晕 0.6 秒；同一辆车不会对同一目标重复判定，最高 3 级。", apply: function (p) { p.skills.armoredCar.stunChance += .1; } },
      { id: "armoredCarChassis", skillId: "armoredCar", name: "重型底盘", rarity: "稀有", max: 3, icon: "⬟", desc: "装甲车体型 +15%", detail: "每级同步增大装甲车车身与碾压范围 15%，最高 3 级。", apply: function (p) { p.skills.armoredCar.sizeLevel++; } },
      { id: "unlockBombardment", skillId: "bombardment", unlocksSkill: true, name: "空投轰炸", rarity: "稀有", max: 1, icon: "✹", desc: "解锁空投轰炸", detail: "首次获取后解锁空投轰炸，技能槽显示 Lv.1；技能就绪后自动索敌并轰炸敌群。", apply: function () {} },
      { id: "bombardmentDamage", skillId: "bombardment", name: "轰炸增伤", rarity: "稀有", max: 3, icon: "✦", desc: "轰炸伤害 +60%", detail: "每级使空投轰炸伤害提高 60%，最高 3 级。", apply: function (p) { p.skills.bombardment.damage *= 1.6; } },
      { id: "bombardmentExtra", skillId: "bombardment", name: "连续轰炸", rarity: "稀有", max: 2, icon: "✹", desc: "额外投下一枚炸弹", detail: "每级使一次空投轰炸额外投下一枚炸弹，依次轰击自动选定的敌群区域，最高 2 级。", apply: function (p) { p.skills.bombardment.extraBombs++; } },
      { id: "bombardmentRadius", skillId: "bombardment", name: "轰炸扩张", rarity: "稀有", max: 1, icon: "◉", desc: "爆炸范围 +105%", detail: "空投轰炸爆炸半径扩大 105%。", apply: function (p) { p.skills.bombardment.blastRadius *= 2.05; } },
      { id: "bombardmentStun", skillId: "bombardment", name: "轰炸震荡", rarity: "稀有", max: 1, icon: "⚡", desc: "爆炸造成眩晕", detail: "空投轰炸命中范围内的敌人时使其眩晕 1.5 秒。", apply: function (p) { p.skills.bombardment.stunDuration = 1.5; } },
      { id: "bombardmentPrecision", skillId: "bombardment", name: "精准打击", rarity: "稀有", max: 1, icon: "◎", desc: "轰炸中心伤害 +200%", detail: "轰炸中心 30 像素范围内的敌人受到 3 倍伤害。", apply: function (p) { p.skills.bombardment.centerDamageMultiplier = 3; } },
      { id: "bombardmentThermonuclear", skillId: "bombardment", name: "热核轰炸", rarity: "稀有", max: 1, icon: "♨", desc: "留下灼烧减速区域", detail: "爆炸后留下持续 4 秒的热核区域，每秒造成 25 点伤害并将敌人移速降低 50%。", apply: function (p) { p.skills.bombardment.thermonuclear = true; } },
      { id: "unlockElectromagnetic", skillId: "electromagnetic", unlocksSkill: true, name: "电磁穿刺", rarity: "稀有", max: 1, icon: "ϟ", desc: "解锁电磁穿刺技能", detail: "首次获取后解锁电磁穿刺，技能槽显示 Lv.1；技能就绪后自动召唤闪电劈击敌人并施加麻痹。", apply: function () {} },
      { id: "electromagneticDamage", skillId: "electromagnetic", name: "电磁增伤", rarity: "稀有", max: 1, icon: "✦", desc: "电磁穿刺伤害 +80%", detail: "每级使电磁穿刺的闪电伤害提高 80%。", apply: function (p) { p.skills.electromagnetic.damage *= 1.8; } },
      { id: "electromagneticSplit", skillId: "electromagnetic", name: "电磁分流", rarity: "稀有", max: 4, icon: "ϟ", desc: "额外选定 1 个目标释放闪电", detail: "每级使电磁穿刺额外选择 1 个目标劈下闪电，最高 4 级。", apply: function (p) { p.skills.electromagnetic.extraTargets++; } },
      { id: "electromagneticExplosion", skillId: "electromagnetic", name: "电磁爆炸", rarity: "稀有", max: 1, icon: "✹", desc: "命中后发生爆炸", detail: "闪电命中目标后发生爆炸，对小范围内的敌人造成额外伤害。", apply: function (p) { p.skills.electromagnetic.explosion = true; } },
      { id: "electromagneticStun", skillId: "electromagnetic", name: "麻痹增伤", rarity: "稀有", max: 1, icon: "⚡", desc: "伤害 +30%，麻痹时间 +1.5 秒", detail: "电磁穿刺伤害提高 30%，并使命中目标的麻痹时间延长 1.5 秒。", apply: function (p) { p.skills.electromagnetic.damage *= 1.3; p.skills.electromagnetic.stunDuration += 1.5; } },
      { id: "electromagneticMatrix", skillId: "electromagnetic", name: "电磁矩阵", rarity: "稀有", max: 1, icon: "▦", desc: "命中后形成持续 4 秒的电磁矩阵", detail: "闪电命中目标后在其脚下形成小范围电磁矩阵，持续造成低伤害并减速敌人 4 秒。", apply: function (p) { p.skills.electromagnetic.matrix = true; } },
      { id: "unlockHighEnergyBeam", skillId: "highEnergyBeam", unlocksSkill: true, name: "高能射线", rarity: "稀有", max: 1, icon: "ϟ", desc: "解锁高能射线技能", detail: "首次获取后解锁高能射线，技能槽显示 Lv.1；幻形会自动发射贯穿全场的蓝色射线。", apply: function () {} },
      { id: "highEnergyBeamDamage", skillId: "highEnergyBeam", name: "射线增伤", rarity: "稀有", max: 1, icon: "✦", desc: "高能射线伤害 +60%", detail: "高能射线每次脉冲造成的伤害提高 60%。", apply: function (p) { p.skills.highEnergyBeam.damage *= 1.6; } },
      { id: "highEnergyBeamSlow", skillId: "highEnergyBeam", name: "减速射线", rarity: "稀有", max: 1, icon: "❄", desc: "命中目标减速 90%，持续 1 秒", detail: "高能射线命中目标后使其移动速度降低 90%，持续 1 秒。", apply: function (p) { p.skills.highEnergyBeam.slowEnabled = true; p.skills.highEnergyBeam.slowFactor = .1; p.skills.highEnergyBeam.slowDuration = 1; } },
      { id: "highEnergyBeamCripple", skillId: "highEnergyBeam", name: "致残射线", rarity: "稀有", max: 1, icon: "ϟ", desc: "命中目标受到的伤害 +25%，持续 5 秒", detail: "高能射线命中目标后，使其受到的所有伤害提高 25%，持续 5 秒。", apply: function (p) { p.skills.highEnergyBeam.crippleEnabled = true; p.skills.highEnergyBeam.damageTakenMultiplier = 1.25; p.skills.highEnergyBeam.damageTakenDuration = 5; } },
      { id: "highEnergyBeamCharge", skillId: "highEnergyBeam", name: "充能", rarity: "稀有", max: 1, icon: "＋", desc: "射线伤害次数 +5", detail: "高能射线持续时间内造成的伤害次数增加 5 次。", apply: function (p) { var skill = p.skills.highEnergyBeam; skill.bonusDamageHits += 5; skill.damageHits = (skill.baseDamageHits + skill.bonusDamageHits) * (skill.overcharged ? 2 : 1); } },
      { id: "highEnergyBeamOverload", skillId: "highEnergyBeam", name: "超能过载", rarity: "稀有", max: 1, icon: "ϟ", desc: "射线伤害次数翻倍，冷却 +50%", detail: "高能射线伤害次数翻倍，技能冷却时间增加 50%。", apply: function (p) { var skill = p.skills.highEnergyBeam; skill.overcharged = true; skill.damageHits = (skill.baseDamageHits + skill.bonusDamageHits) * 2; skill.fireInterval *= 1.5; } },
      { id: "unlockWhirlwindCannon", skillId: "whirlwindCannon", unlocksSkill: true, name: "旋风加农", rarity: "稀有", max: 1, icon: "☈", desc: "解锁旋风加农技能", detail: "首次获取后解锁旋风加农，技能槽显示 Lv.1；幻形会召唤龙卷风主动扑向敌人密集处，持续 10 秒后消失并进入冷却。", apply: function () {} },
      { id: "whirlwindDamage", skillId: "whirlwindCannon", name: "旋风增伤", rarity: "稀有", max: 3, icon: "✦", desc: "龙卷风伤害 +60%", detail: "每级使龙卷风每次命中的伤害提高 60%，最高 3 级。", apply: function (p) { p.skills.whirlwindCannon.damage *= 1.6; } },
      { id: "whirlwindPull", skillId: "whirlwindCannon", name: "风力加强", rarity: "稀有", max: 3, icon: "≋", desc: "龙卷风牵引速度 +50%", detail: "每级使龙卷风把命中目标拉向风眼的速度提高 50%，最高 3 级；牵引不会打断敌人自身的推进。", apply: function (p) { p.skills.whirlwindCannon.pullSpeed *= 1.5; } },
      { id: "whirlwindTurbo", skillId: "whirlwindCannon", name: "涡轮增压", rarity: "稀有", max: 3, icon: "⚡", desc: "持续时间 +40%，伤害 +20%", detail: "每级使龙卷风持续时间延长 40%，同时使每次命中的伤害提高 20%，最高 3 级。", apply: function (p) { var skill = p.skills.whirlwindCannon; skill.duration *= 1.4; skill.damage *= 1.2; } },
      { id: "whirlwindTwin", skillId: "whirlwindCannon", name: "双重旋风", rarity: "稀有", max: 1, icon: "✣", desc: "同时召唤两个龙卷风，持续时间 -50%", detail: "额外召唤一个龙卷风，两个龙卷风在战场不同区域各自游走；持续时间缩短 50%。", apply: function (p) { var skill = p.skills.whirlwindCannon; skill.extraTornadoes += 1; skill.duration *= .5; } },
      { id: "whirlwindStorm", skillId: "whirlwindCannon", name: "风暴聚集", rarity: "稀有", max: 1, icon: "◉", desc: "消失位置留下 2 秒大龙卷风", detail: "龙卷风持续时间结束并进入冷却时，会在消失位置释放一个体型更大、牵引更强的静止龙卷风，持续 2 秒；双重旋风下每个龙卷风各自留下一个。", apply: function (p) { p.skills.whirlwindCannon.stormGather = true; } }
    ],
    coreSkills: [
      { id: "bombardment", name: "空投轰炸", icon: "✹", color: "#ffd166", range: "far", status: "已实装", detail: "冷却就绪后自动索敌，优先轰炸预计爆炸时敌人更密集的区域；炸弹落地造成高额范围伤害与击退，并可强化伤害、连续投弹、爆炸范围、眩晕、中心伤害及热核灼烧减速区域。" },
      { id: "thermobaric", name: "温压弹", icon: "♨", color: "#ff9b52", range: "mid", status: "已实装", detail: "幻形自动发射红色炮弹。命中后造成冲击伤害与击退，穿透耗尽后发生范围爆炸，对范围内敌人造成爆炸伤害并施加燃烧。" },
      { id: "dryIce", name: "干冰弹", icon: "❄", color: "#58aaff", range: "mid", status: "已实装", detail: "幻形自动发射蓝色圆锥弹，初始可额外穿透 3 个目标。命中造成伤害与微弱击退，可通过冰冻、分裂、齐射和连发词条强化。" },
      { id: "armoredCar", name: "装甲车", icon: "▰", color: "#63e6a0", range: "far", status: "已实装", detail: "自动从城墙前方派遣装甲车驶向尸潮，沿途多段碾压并减速敌人；可强化伤害、派遣数量、减速、眩晕与车身尺寸。" },
      { id: "electromagnetic", name: "电磁穿刺", icon: "ϟ", color: "#68d8ff", range: "mid", status: "已实装", detail: "自动从天而降闪电劈向敌人，造成伤害并施加麻痹；可通过分流、爆炸、麻痹增伤和电磁矩阵词条强化。" },
      { id: "highEnergyBeam", name: "高能射线", icon: "ϟ", color: "#51cfff", range: "far", status: "已实装", detail: "幻形自动朝覆盖敌人最多的方向发射蓝色宽光束，贯穿全场并持续 4 秒、造成 20 次低额伤害；可强化伤害、减速与致残效果，也可增加脉冲次数或过载翻倍。" },
      { id: "whirlwindCannon", name: "旋风加农", icon: "☈", color: "#9fe6ff", range: "mid", status: "已实装", detail: "幻形召唤龙卷风主动扑向敌人最密集的位置，并优先照顾靠近城墙的敌群；持续 10 秒，沿途对接触到的敌人持续造成伤害并施加轻微牵引，持续时间结束后龙卷风消失并进入冷却。可强化伤害、牵引、持续时间与数量，也可在消失位置留下大龙卷风。" }
    ],
    levels: [
      { id: 1, name: "街区警戒线", subtitle: "基础尸潮防守", unlocked: true, hpScale: 1, xpScale: 1.76, waves: levelOneWaves },
      { id: 2, name: "地铁入口", subtitle: "分裂僵尸与更密集的波次", unlocked: false, hpScale: 1, xpScale: .63, waves: levelTwoWaves },
      { id: 3, name: "封锁工厂", subtitle: "更密集的尸潮与分裂精英", unlocked: false, hpScale: 1.35, xpScale: .43, waves: levelThreeWaves },
      { id: 4, name: "熔炉核心", subtitle: "后期尸潮成倍压上，个体更硬", unlocked: false, hpScale: 1.35, xpScale: .34, waves: levelFourWaves }
    ],
    waves: levelOneWaves
  };
})(window.Game = window.Game || {});
