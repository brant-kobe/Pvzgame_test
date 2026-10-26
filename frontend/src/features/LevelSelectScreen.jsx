import { useMemo, useState } from "react";
import { Button, Empty, formatTime, Screen } from "../components/ui.jsx";
import { actions, getConfig, getGame } from "../game/actions.js";

export function LevelSelectScreen({ snapshot }) {
  const config = getConfig();
  const [previewId, setPreviewId] = useState(null);
  const completed = useMemo(function () {
    const map = {};
    (snapshot.completedLevels || []).forEach(function (id) { map[id] = true; });
    return map;
  }, [snapshot.completedLevels]);
  const preview = previewId ? config.levels.find(function (level) { return level.id === previewId; }) : null;
  const roster = previewId && getGame().getLevelRoster ? getGame().getLevelRoster(previewId) : null;

  return (
    <Screen title="选择关卡" subtitle="所有关卡已开放 · 点击行开战，点详情查看敌人阵容" badge="MISSION SELECT" onBack={actions.backToMenu}>
      <div className="level-list">
        {config.levels.map(function (level) {
          const isCompleted = !!completed[level.id];
          return (
            <div className={"level-row " + (isCompleted ? "completed" : "")} key={level.id}>
              <button className="level-main" onClick={function () { actions.startLevel(level.id); }}>
                <b>{String(level.id).padStart(2, "0")}</b>
                <span><strong>{level.name}</strong><small>{level.subtitle}</small></span>
                <em>{isCompleted ? "已通关" : "›"}</em>
              </button>
              <button className="level-info" onClick={function () { setPreviewId(level.id); }}>?</button>
            </div>
          );
        })}
      </div>
      {preview ? (
        <div className="modal-backdrop" onClick={function () { setPreviewId(null); }}>
          <div className="modal-card level-preview" onClick={function (event) { event.stopPropagation(); }}>
            <button className="modal-close" onClick={function () { setPreviewId(null); }}>×</button>
            <span className="screen-badge">MISSION BRIEF</span>
            <h2>{preview.name}</h2>
            <p>{preview.brief}</p>
            <div className="brief-stats">
              <span><b>{preview.waves.length}</b> 波</span>
              <span><b>×{(preview.hpScale || 1).toFixed(2)}</b> 生命</span>
              <span><b>×{(preview.xpScale || 1).toFixed(2)}</b> 经验</span>
            </div>
            {roster ? (
              <div className="roster">
                <h3>敌人阵容</h3>
                {roster.minions.map(function (enemy) { return <p key={enemy.id}><i style={{ background: enemy.color }} />{enemy.name}<span>小怪 · 第 {enemy.wave} 波起</span></p>; })}
                {roster.elites.map(function (enemy) { return <p key={enemy.id}><i style={{ background: enemy.color }} />{enemy.name}<span>精英 · 第 {enemy.wave} 波起</span></p>; })}
                {roster.boss ? <p key={roster.boss.id}><i style={{ background: roster.boss.color }} />{roster.boss.name}<span>首领 · 第 {roster.boss.wave} 波</span></p> : null}
              </div>
            ) : null}
            <Button variant="success" className="wide" onClick={function () { setPreviewId(null); actions.startLevel(preview.id); }}>开始关卡</Button>
          </div>
        </div>
      ) : null}
      {!config.levels.length ? <Empty>暂无关卡</Empty> : null}
    </Screen>
  );
}
