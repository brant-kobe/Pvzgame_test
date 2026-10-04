# AGENTS.md

面向后续开发者的协作说明。修改代码前请先阅读本文件，并保持与 `README.md`、`DEVELOPMENT_PLAN.md` 同步。

## 项目概览

- 项目：`街区警戒线`，9:16 竖屏单手 Roguelite 僵尸生存射击游戏。
- 技术：原生 JavaScript + Canvas 2D，**无构建工具、无依赖、无包管理**。
- 运行：直接双击 `index.html`，或用任意静态服务器托管。所有脚本通过 `index.html` 按固定顺序加载，共享单一 `window.Game` 命名空间。

## 运行与验证

无需安装依赖。改完代码后至少执行：

```powershell
Get-ChildItem src -Filter *.js | ForEach-Object { node --check $_.FullName }
git diff --check
```

- `node --check`：语法校验，必须全部通过。
- `git diff --check`：空白字符校验。Windows 下出现的 `LF will be replaced by CRLF` 只是换行符提示，不是错误。
- 逻辑回归优先用一次性 `node -e` 冒烟测试；需要模拟 Canvas 时，用 `Proxy` 桩实现 `document.getElementById("game").getContext("2d")`。
- 不要引入测试框架、构建器或运行时依赖，除非用户明确要求。
- **调试中间产物统一放进 `tmp/`**：冒烟测试脚本、临时截图、日志、导出数据等一律写入工作区根目录的 `tmp/`，不要散落在项目根目录或 `src/`；该目录已在 `.gitignore` 中忽略，不会被提交。仅当临时产物需要长期保留或复用时，才正式收录进 `src/` 或文档。

## 代码结构与职责

脚本加载顺序（见 `index.html`）：`config → utils → state → combat → update → sprites → render → input → main`。

| 文件 | 职责 | 备注 |
| --- | --- | --- |
| `src/config.js` | 全部静态数据：尺寸、精灵、颜色、敌人、词条、技能、波次、关卡 | 调平衡/加内容优先改这里 |
| `src/utils.js` | 数学、随机、绘制、文本工具 | `Game.utils` |
| `src/state.js` | `Game.state` 单局状态、`Game.reset`、界面切换 | 只存数据，不写绘制逻辑 |
| `src/combat.js` | 生成、瞄准、射击、碰撞、伤害、经验、词条、技能效果 | 战斗规则集中于此 |
| `src/update.js` | 主循环推进、实体移动、波次、技能更新 | 只调用 combat 接口 |
| `src/sprites.js` | PNG 加载，多路径回退 | `Game.sprites.images.*` |
| `src/render.js` | 所有 Canvas 绘制、HUD、菜单、图鉴、结算 | 只读 `Game.state` |
| `src/input.js` | 鼠标/触控/键盘，界面点击区域 | 调用 `state`/`combat` 的公开函数 |
| `src/main.js` | 初始化与 `requestAnimationFrame` 主循环 | 精灵就绪后启动，含超时保护 |

**分层原则**：数据进 `config`，状态进 `state`，战斗规则进 `combat`/`update`，绘制只进 `render`，输入只进 `input`。不要把战斗逻辑写进 `render`。

## 命名与代码风格

- IIFE 模块包裹，严格模式：`(function (Game) { "use strict"; ... })(window.Game = window.Game || {});`
- 使用 `var`、函数表达式、ES5 语法，保持与现有代码一致；不要混入 ES Module 或可选链等新语法。
- 变量缩写约定：`C = Game.config`，`S = Game.state`，`U = Game.utils`。
- 函数挂在 `Game.*` 上，供其它模块调用。
- **不添加注释，除非用户明确要求。** 现有注释仅出现在配置和模块头部。
- 文本、界面文案与文档使用简体中文。

## 关键机制约定

- **瞄准**：自动索敌用预判 + 武器实际挂点（`Game.getWeaponMount`）；齐射时锁定一条真实弹道，用 `Game.getAimAngleForShot`，不要用两条弹道的角平分线。
- **弹药**：每个基础攻击周期只扣 1 发；齐射/连发额外弹丸不额外扣弹；最后一发连发完成后才换弹。
- **齐射**：相邻弹道角间隔为 `config.spreadAngle`（当前 0.12 弧度），步枪齐射与干冰弹齐射共用该值。
- **连发**：步枪沿同一锁定方向按短间隔依次发射，子弹前后排列而非横向并排；干冰弹和温压弹每次连发重新索敌，并优先选择与本轮已发弹方向差异较大的目标。
- **技能解锁**：温压弹、干冰弹、装甲车、空投轰炸、电磁穿刺、高能射线、旋风加农默认 `unlocked: false`，必须通过局内解锁词条获得；解锁时 `level = 1`，之后每个同技能专属词条 `level++`。未解锁时 `Game.updateSkills` 不得触发。
- **释放距离**：每个技能与步枪都有交战距离，僵尸进入对应距离后该技能才会释放，避免技能越过尸潮打空气。距离定义在 `config.ranges`（相对**城墙攻击线** `wall.y - wall.height/2` 的像素数，当前 `far 480 / mid 320 / near 125`），归属写在 `config.coreSkills[].range`，步枪单独用 `config.rifleRange`。判定入口是 `Game.isSkillRangeEngaged(id)`（`id` 为技能 id 或 `"rifle"`），`Game.getRangeLine(rangeName)` 给出该距离在画面上的 y 阈值；未配置 `range` 的技能回退为 `far`。所有释放点（`Game.fire`、`updateSkills` 的每个分支、`launchArmoredCars` 等）都必须经过它，且**冷却就绪后要停在 0 原地等待**，不能空转进冷却。索敌函数（`updateAim`、`getSkillTargetAngle`、`getElectromagneticTargets`、`getHighEnergyBeamAngle`、`getBombardmentTarget`）同样只考虑进入距离内的敌人，保证「谁触发就打谁」；已经释放的技能弹丸与实体（含龙卷风）不受距离限制。
- **距离范围预览**：战斗/测试场中长按技能槽（`config.skillRangeHoldMs`，默认 350 毫秒）会在战场上画出该技能的距离范围 —— 顶边为 `Game.getSkillRangeLine` 的阈值线，向下填充到城墙攻击线，使用 `coreSkills[].color` 淡色叠加，并附「技能名 · 档位 距离 / 范围内 N 只」标签；松手立即消失。状态只存在 `S.skillRangePreview`（技能 id 或 `null`），由 `Game.reset` 与 `Game.pause` 清空，`Game.drawRangePreview` 也只允许 `playing` / `testArena` 两种界面绘制，且会校验该技能确实在 `player.skillOrder` 中。长按判定在 `input.js`（`holdSkillSlot` / `releaseSkillSlot`，`pointerup`、`pointercancel`、`pointerleave`、`blur` 都会释放），技能槽矩形必须与 `config.skillSlots` 和 `drawSkillSlots` 保持一致。
- **技能槽上限**：`config.maxSkillSlots`（当前 4）限制每局能装备的核心技能数量，已获得技能按先后顺序记录在 `player.skillOrder`。**只进不出**：满槽后不提供卸下或替换机制，`Game.unlockSkill` 在满槽且未传 `force` 时直接返回 `false` 且不修改任何已有技能，任何新技能都不得顶替旧技能。`Game.unlockSkill(id, force)` 是唯一解锁入口：`Game.chooseTrait` 与其它常规流程**不得传 `force`**，只有测试场的 `Game.testUnlockSkill` 传 `true` 以便单独调试任意技能。`Game.rollTraits` 必须在 `Game.canUnlockSkill()` 为假时过滤掉全部 `unlocksSkill` 词条，否则会绕过上限；已装备技能的强化词条与步枪词条不受影响。新增技能时同时更新 `config.coreSkills` 的 `icon` 与 `color`，HUD 技能槽只从这两处取图标和颜色。
- **词条池**：`Game.rollTraits` 会过滤已满级词条、未满足解锁条件的技能词条、已解锁技能的解锁词条、以及满槽时全部新技能解锁词条（见「技能槽上限」）；三张卡不出现重复。
- **精英/首领规则**：每种小怪都要有对应精英（体型大、数值不弱于基础）；精英固定第 4 波每局 1 只（可配置 `elitePool` 随机选一种）；首领是独立类别、每局 1 只，首领波在本波小怪投放到 `floor(plan.total / 2)` 时登场，之后小怪继续按 `total` 投放（`total` 只计常规名额，首领额外 +1）。第 1 关首领在第 5 波，第 2、3、4 关在第 7 波。
- **分裂与回血**：`Game.killEnemy` 依据 `info.splitInto/splitCount` 把子体写入 `S.pendingSpawns`，由 `Game.flushPendingSpawns` 在 `update` 末尾统一生成，避免遍历中修改 `S.enemies`；带 `regenPerSecond` 的敌人在燃烧结算后按 `dt` 回血且不超过最大生命。
- **HUD 技能槽**：右上枪械图标下方是**单列 4 格**技能槽，几何集中在 `config.skillSlots`（`offsetX/y/width/height/gap`，当前 4 格共 48×21 的纵向步进），`drawHud` 通过 `drawSkillSlots` 按 `player.skillOrder` 从上往下填充：已有技能显示 `coreSkills` 里的图标 + 颜色 + `Lv.N`，剩余槽位显示空槽。技能槽只展示状态，不需要玩家点击触发。技能处于 `active` 存续期时，槽位进度条改为显示剩余时间（白色）；其余情况显示冷却就绪进度。改动 `skillSlots` 或 `maxSkillSlots` 时必须同步 `input.js` 中由同一份配置推导的技能槽点击穿透范围。
- **空投轰炸**：解锁后自动索敌，冷却 11 秒；技能就绪且场上有敌人时，优先选择预计爆炸时覆盖敌人更多的区域并从屏幕上方投弹；落地后造成范围伤害、击退并按词条施加中心增伤、眩晕或持续灼烧减速；热核区域不继承步枪效果，状态在 `Game.reset` 时清理。爆炸几何全在 `config.skillDefaults.bombardment`：`blastRadius`（当前 45，改动前 82）同时决定伤害判定、爆炸特效半径、击退衰减与热核区半径，`centerRadius`（当前 17，按同一比例缩放）决定「精准打击」的中心增伤范围 —— 两者必须同步缩放，否则精准打击会变相覆盖整个爆炸区。**多枚炸弹必须分别选定落点**：`Game.launchBombardment` 逐枚调用 `Game.getBombardmentTarget(skill, delay, avoid)`，把本枚的下落延迟（`skill.bombDropDelay × 序号`）计入爆炸时刻的敌人位置预判，并把已选落点作为 `avoid` 传入。索敌分两步：先取未过滤的最优候选 `main`，再在「与全部已选落点距离 ≥ `max(56, blastRadius × bombMinSeparationRatio)`」的候选里取最优 `alternative`；只有 `alternative.score ≥ main.score × bombAltScoreRatio` 时才改打另一个敌群，否则调用 `Game.spreadBombTarget` 把落点推离已选落点，并在推离后按 1/2 递减偏移量重试，直到落点仍能覆盖到敌人为止（最多 4 次）。这样既不会两枚炸弹完全重叠，也不会把后续炸弹丢到没有敌人的空地上。不要退回「一次索敌、多枚共用同一 `targetX/targetY`」的写法。
- **装甲车**：解锁时立即派出首辆，之后按 6.3 秒独立冷却从城墙前随机车道派车；车辆是独立实体而非技能弹丸。同一辆车对单个目标按 `hitInterval` 多段造成低伤害，首次接触只判定一次眩晕。碾压减速不覆盖更强的冰冻；车辆伤害不得继承步枪燃烧/冰冻词条，击杀仍走 `Game.killEnemy`。眩晕期间敌人不移动、不攻击城墙，但仍可受伤、燃烧和回血；车辆和状态在 `Game.reset` 时清空。
- **旋风加农**：龙卷风是独立实体（`S.tornadoes`）而非技能弹丸，边界由 `Game.getWhirlwindField` 依据 `S.wall` 与风圈半径计算。移动龙卷风不随机游走，而是由 `Game.getWhirlwindChaseTarget` 打分选点：`clusterWeight × clusterRadius 内的敌人权重和 − 距离 × 0.35 + threatWeight ×（纵向位置占战场比例）`，敌人权重首领 1.6／精英 1.3／小怪 1；并对贴近其他龙卷风的位置扣 `clusterWeight`，让双重旋风的两个龙卷风分头行动。目标点带 `clusterJitter × 风圈半径` 的随机偏移，`Game.pickWhirlwindTarget` 在无可行目标（场上无敌人，或敌人都在战场上方尚未进入追击范围）时才回退为随机点。重新选点只由 `retargetTimer` 驱动（追击 0.5–1.2 秒、游走 1.1–2.1 秒），到达目标点后原地停留而不是立刻改点，避免每帧重算 O(n²) 打分。命中按 `hitInterval` 对同一目标分段结算，牵引是叠加在敌人自身推进之上的位移（`pullSpeed * dt * (0.35 + 0.65 * 距离衰减)`），不打断移动、攻击或眩晕。技能冷却只在持续时间结束后开始计时：存续期记在 `skill.active/activeElapsed/duration`，结束帧才写 `skill.fireTimer = skill.fireInterval`。`stormGather` 在移动龙卷风自然到期时按原位置生成静止大龙卷风（双重旋风下每个各留一个），静止体不参与游走。龙卷风伤害用 `noWeaponEffects` 与 `silentText`，击杀仍走 `Game.killEnemy`；`Game.reset` 清空。
- **战斗平衡**：初始步枪伤害为 28；普通、快跑、分裂僵尸及其幼体、精英和首领的基础移动速度均较原配置降低约 20%。
- **经验与通关判定**：升级门槛由 `config.xpBase / xpMultiplier / xpBonus` 决定（当前 15 XP 起、`floor(当前门槛 × 1.13 + 6)` 递推），唯一实现在 `Game.nextXpAfter`，`Game.gainXp` 与 `Game.grantMaxLevel` 都必须调用它，不要在两处各写一份公式；升到 `config.maxLevel`（当前 15）累计需要 1384 XP，HUD 经验条按当前 `nextXp` 显示进度。升到 `config.maxLevel` **不立即胜利**，只切到 `LV.MAX` 并提示清剿；胜利必须同时满足「满级 + 末波全部计划投放完成 + 首领波的首领已登场并被击杀 + `S.enemies` 与 `S.pendingSpawns` 均为空」，统一由 `update.js` 在 `flushPendingSpawns` 之后调用 `Game.winLevel`（`winLevel` 自带 `screen === "playing"` 守卫，失败优先）。末波清场但经验不足时先 `Game.grantMaxLevel` 补足满级再结算，避免无怪可打。`Game.gainXp` 每次只弹一次三选一（靠 `break` 退出升级循环），盈余经验留到下一次 `gainXp` 继续结算；若 `Game.rollTraits` 返回空数组则跳过升级界面直接继续升级，避免词条池被榨干后卡在无卡可选的三选一界面 —— 当前池子可选取次数远多于 14 次升级，但改动词条上限时要重新核算。当前各关经验缩放值按旧门槛配置，经验可能早于清场达到满级。
- **关卡波次与解锁**：波次定义在 `config.levels[].waves`，`Game.reset` 存入 `S.session.waves`，逻辑与 HUD 只读它；解锁进度存 `localStorage`（`blockline.progress`）并带内存回退，用 `Game.isLevelUnlocked` 判断（第 N 关需要第 N-1 关已完成）。每关缩放：`levels[].xpScale` 缩放获得经验，`levels[].hpScale` 缩放敌人生命（`Game.spawnEnemy` 按 `Math.round(info.hp * hpScale * waveHpScale)` 生成 `hp/maxHp`，只影响生命，不动伤害/速度/经验/回血；前两关为 1，第 3、4 关为 1.35）。**单个波次还可再写 `hpScale`**，由 `Game.getWaveHpScale` 读出（缺省 1，测试场与无波次时回退 1），第 4 关「熔炉核心」靠它做到「前五波与第 3 关逐项一致、后五波数量与血量同步加码」。关卡选择面板几何集中在 `config.levelSelect`（`panelX/Y/Width/Height`、`cardX/Width/Height/Top/Gap`、`backY/backHeight`），`drawLevelSelect` 与 `input.js` 的点击判定都从它推导，增删关卡时只需保证最后一张卡片底边不越过 `backY`。

## 常见扩展路径

**新增敌人**
1. 在 `config.enemies` 增加条目，设置 `hp/speed/radius/damage/xp/color/accent`。
2. 必须带 `codexCategory`（`minion`/`elite`/`boss`）、`description`、`tactics`，图鉴会自动收录。
3. 精英需同时规划对应小怪；如需新行为，在 `combat.spawnEnemy` 或 `update.js` 补充。

**新增步枪词条**
1. 在 `config.traits` 增加条目：`id/name/rarity/max/icon/desc/detail/apply(p)`。
2. `apply` 直接修改玩家对象 `p`；升级池与技能图鉴自动收录。
3. `id` 与 `player.traits[id]` 计数器绑定，改名时注意兼容。

**新增关卡**
1. 在 `config.js` 顶部加一份 `levelNWaves`（每波 `total`/`interval`/`mix`，可选 `elite`/`elitePool`/`boss`/`hpScale`），再往 `config.levels` 追加 `{ id, name, subtitle, unlocked:false, hpScale, xpScale, waves }`。
2. 新关卡默认锁定，`Game.isLevelUnlocked` 要求第 `id-1` 关已完成，无需额外代码；经验缩放 `xpScale` 越小升级越慢，按该关数量与血量校准。
3. 关卡选择面板会按 `config.levels` 自动多画一张卡片，务必确认最后一张卡片底边仍不越过 `config.levelSelect.backY`，并同步微调 `cardTop`/`cardGap`，否则卡片会压住返回按钮。

**新增核心技能**
1. 在 `config.skillDefaults` 加技能数值（含 `unlocked:false, level:0`），`coreSkills` 加图鉴条目。
2. 在 `config.skillTraits` 加一个 `unlocksSkill:true` 的解锁词条，以及若干 `skillId` 关联的强化词条。
3. 在 `combat.js` 实现发射/碰撞/效果，`update.js` 接入 `updateSkills`/弹丸推进，`render.js` 绘制弹丸与效果。
4. 在 `combat.updateSkills` 保持 `if (!skill.unlocked) return;` 守卫。

**调整人物/步枪/幻形**
- 精灵尺寸、锚点、挂载点都在 `config.sprites`；`muzzleDistance` 应等于枪口到握把锚点的距离；幻形位置改 `config.skillRing.offsetX/offsetY`。
- 替换人物：更新 `assets/man.png` 后生成透明裁切图（`player-man.png`/`player-body.png`），再按比例调锚点。

**调整分辨率与战场高度**
- 逻辑宽度固定为 `config.width`（360）；`config.height` 是基准值，`render.js` 的 `resizeCanvas` 会按画布显示比例把逻辑高度重算为 `width * 显示高 / 显示宽` 并夹在 640–960，再按设备像素比设置实际分辨率。
- 画布铺满浏览器高度由 `styles/main.css` 的 `#game-shell` 控制；改变战场长度会影响城墙/人物位置，它们由 `Game.layoutWorld` 依据 `C.height` 重排（城墙 `C.height-125`、人物 `C.height-58`），窗口缩放时会自动调用。
- 顶部战斗 HUD 使用紧凑布局，关卡标题显示为“关卡数字 关卡名称”（如“3 封锁工厂”），位于 `drawHud`；改动 HUD 尺寸时同步更新 `input.js` 中暂停按钮等点击区。

## 文档同步要求

- 功能或规则变更后，必须同步更新 `README.md`（当前已实现、限制）和 `DEVELOPMENT_PLAN.md`（系统设计、验收记录）。
- 提交信息使用单段纯文本，风格与近期提交保持一致。

## 已知限制

- 投掷僵尸、音效、长期养成、联网等均未实现。
- 人物与步枪使用 `assets/` PNG，敌人、装甲车、城墙、幻形仍为 Canvas 程序化绘制。
