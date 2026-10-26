import { useMemo, useState } from "react";
import { Button, Empty, formatPercent, Notice, Screen } from "../components/ui.jsx";
import { actions, getConfig, getGame } from "../game/actions.js";

function AttributeGrid({ attributes, config }) {
  if (!attributes) return null;
  return (
    <div className="attribute-grid">
      <div><span>攻击力</span><b>{attributes.attack}</b></div>
      <div><span>防线血量</span><b>{attributes.wallMaxHp}</b></div>
      <div><span>暴击率</span><b>{formatPercent(attributes.critRate)}</b></div>
      <div><span>暴击伤害</span><b>{formatPercent(attributes.critDamage)}</b></div>
      <div><span>冷却缩减</span><b>{formatPercent(attributes.cooldownReduction)}</b></div>
      <div><span>负面时间</span><b>{formatPercent(attributes.statusDurationMultiplier)}</b></div>
      {Object.keys(config.elements).map(function (id) {
        return <div key={id}><span>{config.elements[id].name}攻击</span><b style={{ color: config.elements[id].color }}>{attributes.elementAttack[id]}</b></div>;
      })}
    </div>
  );
}

export function AttributesScreen({ snapshot }) {
  const config = getConfig();
  return (
    <Screen title="角色属性" subtitle="基础值、装备、宝石与城墙修正后的最终数值" badge="ATTRIBUTES" onBack={actions.backToCharacter}>
      <AttributeGrid attributes={snapshot.attributes} config={config} />
      <div className="panel-actions">
        <Button variant="cyan" onClick={actions.openEquipment}>装备</Button>
        <Button variant="warning" onClick={actions.openWall}>城墙</Button>
        <Button variant="ghost" onClick={actions.backToCharacter}>返回角色</Button>
      </div>
    </Screen>
  );
}

function GemPanel({ partId }) {
  const config = getConfig();
  const view = getGame().gems.getPart(partId);
  return (
    <div className="gem-panel">
      <div className="gem-sockets">
        {view.sockets.map(function (gem, index) {
          return (
            <div className={"gem-socket " + (gem ? "filled" : "")} key={index}>
              {gem ? <button className="gem-bubble" title={gem.affix.text} style={{ borderColor: gem.color, color: gem.color }} onClick={function () { actions.unsocketGem(gem.id); }}>
                <b>{gem.qualityShort}</b><small>{gem.affix.name}</small>
              </button> : <span>空槽 {index + 1}</span>}
            </div>
          );
        })}
      </div>
      <div className="gem-inventory">
        {view.inventory.map(function (gem) {
          return (
            <div className="gem-row" key={gem.id}>
              <i style={{ color: gem.color, borderColor: gem.color }}>{gem.qualityShort}</i>
              <div><b>{gem.affix.name}</b><small>{gem.affix.text} · {gem.qualityName}</small></div>
              <Button variant="ghost" className="mini" onClick={function () { actions.toggleGemLock(gem.id, !gem.locked); }}>{gem.locked ? "锁定" : "锁"}</Button>
              <Button variant="cyan" className="mini" onClick={function () {
                const plan = getGame().gems.planSocket(gem.id);
                if (plan.ok) actions.socketGem(gem.id, plan.slotIndex);
              }}>镶嵌</Button>
            </div>
          );
        })}
        {!view.inventory.length ? <Empty>该部位暂无未镶嵌宝石</Empty> : null}
      </div>
    </div>
  );
}

export function CharacterScreen({ snapshot }) {
  const config = getConfig();
  const [partId, setPartId] = useState(config.equipment.slots[0].id);
  const [tab, setTab] = useState("gems");
  const summary = getGame().gems.getSynthesisSummary();
  return (
    <Screen title="角色大厅" subtitle="装备、宝石与资源构筑" badge="OPERATOR" onBack={actions.backToMenu} actions={<Button variant="ghost" className="mini" onClick={actions.openAttributes}>属性</Button>}>
      <div className="character-summary">
        <AttributeGrid attributes={snapshot.attributes} config={config} />
      </div>
      <div className="tab-row">
        <Button variant={tab === "gems" ? "cyan" : "ghost"} onClick={function () { setTab("gems"); }}>宝石</Button>
        <Button variant={tab === "equipment" ? "cyan" : "ghost"} onClick={function () { setTab("equipment"); }}>装备</Button>
        <Button variant={tab === "resources" ? "cyan" : "ghost"} onClick={function () { setTab("resources"); }}>资源</Button>
      </div>
      {tab === "gems" ? (
        <div>
          <div className="part-tabs">
            {config.equipment.slots.map(function (slot) {
              const part = getGame().gems.getPart(slot.id);
              return <button key={slot.id} className={partId === slot.id ? "active" : ""} style={{ "--part-color": slot.color }} onClick={function () { setPartId(slot.id); }}><b>{slot.short}</b><span>{part.socketedCount}/{part.capacity}</span></button>;
            })}
          </div>
          <GemPanel partId={partId} />
          <div className="panel-actions">
            <Button variant="violet" disabled={!summary.recipes || snapshot.gemBusy} onClick={actions.synthesizeAllGems}>一键合成 {summary.recipes ? "(" + summary.recipes + " 组)" : ""}</Button>
            <Button variant="ghost" onClick={actions.openEquipmentBag}>装备背包</Button>
          </div>
          <Notice tone="error">{snapshot.gemError}</Notice>
          <Notice tone="success">{snapshot.gemNotice}</Notice>
        </div>
      ) : null}
      {tab === "equipment" ? (
        <div className="equipment-panel">
          {snapshot.equipment.map(function (item) {
            return <div className="equipment-row" key={item.id}><i style={{ color: item.elementColor }}>{item.short}</i><div><b>{item.name} · {item.elementName}</b><small>Lv.{item.level} · 攻击 +{item.attackBonus} · 元素 +{item.elementBonus}</small></div><Button variant="cyan" className="mini" onClick={actions.openEquipment}>强化</Button></div>;
          })}
          <div className="panel-actions"><Button variant="cyan" onClick={actions.openEquipment}>装备强化</Button><Button variant="warning" onClick={actions.openWall}>城墙强化</Button><Button variant="ghost" onClick={actions.openEquipmentBag}>装备背包</Button></div>
        </div>
      ) : null}
      {tab === "resources" ? (
        <div className="resource-grid">
          {snapshot.resources.map(function (resource) { return <div className="resource-cell" key={resource.id}><i style={{ background: resource.color }} /><span>{resource.name}</span><b>{resource.amount}</b></div>; })}
        </div>
      ) : null}
    </Screen>
  );
}

export function EquipmentScreen({ snapshot }) {
  const config = getConfig();
  return (
    <Screen title="装备强化" subtitle="强化等级属于部位 · 六部位 Lv.1–100" badge="EQUIPMENT" onBack={actions.backToCharacter}>
      <div className="equipment-panel">
        {snapshot.equipment.map(function (item) {
          const cost = item.nextCost;
          return (
            <div className="equipment-upgrade" key={item.id}>
              <div className="equipment-title"><i style={{ color: item.elementColor }}>{item.short}</i><div><b>{item.name} · {item.elementName}</b><small>Lv.{item.level} / {item.maxLevel}</small></div></div>
              <div className="cost-line"><span>金币 {cost ? cost.coin : "—"}</span><span>{config.resources.find(function (resource) { return resource.id === item.blueprintId; }).name} {cost ? cost[item.blueprintId] : "—"}</span></div>
              <Button variant={item.maxed ? "ghost" : item.affordable ? "success" : "warning"} disabled={item.maxed || snapshot.equipmentBusy} onClick={function () { actions.upgradeEquipment(item.id); }}>{item.maxed ? "满级" : snapshot.equipmentBusySlot === item.id ? "强化中…" : "强化"}</Button>
            </div>
          );
        })}
      </div>
      <Notice tone="error">{snapshot.equipmentError}</Notice>
      <Notice tone="success">{snapshot.equipmentNotice}</Notice>
      <div className="panel-actions"><Button variant="cyan" onClick={actions.openEquipmentBag}>装备背包</Button><Button variant="ghost" onClick={actions.backToCharacter}>返回角色</Button></div>
    </Screen>
  );
}

export function EquipmentBagScreen({ snapshot }) {
  const config = getConfig();
  const [partId, setPartId] = useState(config.equipment.slots[0].id);
  const rows = snapshot.equipmentBag.filter(function (item) { return item.slotId === partId; });
  const equipped = snapshot.equipment.find(function (item) { return item.id === partId; });
  return (
    <Screen title="装备背包" subtitle="换装只改变元素，部位强化等级保留" badge="INVENTORY" onBack={actions.backToEquipment}>
      <div className="part-tabs">
        {config.equipment.slots.map(function (slot) {
          const count = snapshot.equipmentBag.filter(function (item) { return item.slotId === slot.id; }).length;
          return <button key={slot.id} className={partId === slot.id ? "active" : ""} style={{ "--part-color": slot.color }} onClick={function () { setPartId(slot.id); }}><b>{slot.short}</b><span>{count}</span></button>;
        })}
      </div>
      <div className="bag-current">当前：{equipped ? equipped.elementName + " · Lv." + equipped.level : "—"}</div>
      <div className="bag-grid">
        {rows.map(function (item) {
          const element = config.elements[item.element];
          const isEquipped = equipped && equipped.element === item.element;
          return <button className={"bag-item " + (isEquipped ? "equipped" : "")} key={item.id} onClick={function () { if (!isEquipped) actions.equipEquipment(item.id); }}><i style={{ color: element.color }}>{element.short || element.name.slice(0, 1)}</i><b>{element.name}</b><small>{isEquipped ? "已装备" : "点击替换"}</small></button>;
        })}
        {!rows.length ? <Empty>该部位背包为空</Empty> : null}
      </div>
      <Notice tone="error">{snapshot.equipmentBagError}</Notice>
      <Notice tone="success">{snapshot.equipmentBagNotice}</Notice>
    </Screen>
  );
}

export function WallScreen({ snapshot }) {
  const wall = snapshot.wall;
  if (!wall) return <Screen title="城墙强化" badge="DEFENSE" onBack={actions.backToCharacter}><Empty>正在读取城墙数据…</Empty></Screen>;
  const breakthrough = wall.breakthrough || {};
  return (
    <Screen title="城墙强化" subtitle={"每级 +" + wall.hpPerLevel + " 血量 · 每 10 级需要稀土突破"} badge="DEFENSE" onBack={actions.backToCharacter}>
      <div className="wall-card">
        <span className="screen-badge">WALL INTEGRITY</span>
        <h2>Lv.{wall.level} / {wall.maxLevel}</h2>
        <p>最大血量 <b>{wall.maxHp}</b> · 累计加成 +{wall.hpBonus}</p>
        <div className="wall-progress"><i style={{ width: (wall.level / wall.maxLevel * 100).toFixed(1) + "%" }} /></div>
        <div className="wall-cost">
          <span>钢材 {wall.steel}</span>
          <span>{wall.breakthroughRequired ? "稀土 " + wall.rareEarth + " / " + breakthrough.cost : "下次突破 Lv." + (breakthrough.atLevel || "—")}</span>
        </div>
        <Button variant="success" disabled={wall.maxed || snapshot.wallBusy || (!wall.canLevel && !wall.canBreakthrough)} onClick={function () { actions.upgradeWall(wall.canBreakthrough ? "breakthrough" : "level"); }}>
          {wall.maxed ? "已满级" : snapshot.wallBusy ? "处理中…" : wall.canBreakthrough ? "稀土突破" : "强化城墙" + (wall.nextSteelCost !== null ? " · " + wall.nextSteelCost + " 钢材" : "")}
        </Button>
      </div>
      <Notice tone="error">{snapshot.wallError}</Notice>
      <Notice tone="success">{snapshot.wallNotice}</Notice>
    </Screen>
  );
}
