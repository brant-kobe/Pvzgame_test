import { useMemo } from "react";
import { Button } from "../components/ui.jsx";
import { actions, getConfig, getGame } from "../game/actions.js";

export function TestArenaPanel({ snapshot }) {
  const config = getConfig();
  const arenaState = getGame().state.testArena;
  if (!arenaState) return null;
  const enemyIds = snapshot.testArena ? snapshot.testArena.enemyIds : [];
  const enemyId = enemyIds[arenaState.enemyIndex] || enemyIds[0];
  const enemy = config.enemies[enemyId];
  const skill = config.coreSkills[arenaState.skillIndex] || config.coreSkills[0];
  const traits = useMemo(function () {
    return (config.skillTraits || []).filter(function (trait) { return trait.skillId === skill.id && !trait.unlocksSkill; });
  }, [skill.id]);
  const trait = traits[arenaState.traitIndex] || traits[0];
  if (!snapshot.testArena || !snapshot.testArena.controlsVisible) {
    return <aside className="test-panel collapsed"><button onClick={actions.toggleTestControls}>‹ 测试场工具</button></aside>;
  }
  return (
    <aside className="test-panel">
      <header><span>测试场调试工具</span><Button variant="ghost" className="mini" onClick={actions.toggleTestControls}>收起</Button></header>
      <section>
        <h2>测试僵尸</h2>
        <div className="test-enemy-chips">
          {enemyIds.map(function (id) { return <button key={id} className={id === enemyId ? "active" : ""} onClick={function () { actions.setTestEnemy(id); }}>{config.enemies[id].name}</button>; })}
        </div>
        <p className="test-current">当前：{enemy ? enemy.name + " · 生命 " + enemy.hp + " · 移速 " + enemy.speed : "暂无敌人"}</p>
        <div className="panel-actions"><Button variant="cyan" onClick={function () { actions.testSpawnEnemy(1); }}>生成 1 只</Button><Button variant="cyan" onClick={function () { actions.testSpawnEnemy(config.waves[0].total); }}>生成一波</Button></div>
        <div className="panel-actions"><Button variant="danger" onClick={actions.testClearEnemies}>清空敌人</Button><Button variant="warning" onClick={actions.testRestore}>恢复状态</Button></div>
      </section>
      <section>
        <h2>核心技能</h2>
        <div className="selector-row"><Button variant="ghost" className="mini" onClick={function () { actions.selectTestSkill(-1); }}>‹</Button><span>{skill.name}</span><Button variant="ghost" className="mini" onClick={function () { actions.selectTestSkill(1); }}>›</Button></div>
        <Button variant="violet" className="wide" onClick={actions.testUnlockSkill}>解锁所选技能</Button>
      </section>
      <section>
        <h2>专属词条</h2>
        <div className="selector-row"><Button variant="ghost" className="mini" onClick={function () { actions.selectTestTrait(-1); }}>‹</Button><span>{trait ? trait.name : "无可选词条"}</span><Button variant="ghost" className="mini" onClick={function () { actions.selectTestTrait(1); }}>›</Button></div>
        <Button variant="violet" className="wide" onClick={actions.testApplyTrait}>应用所选词条</Button>
      </section>
      <div className="panel-actions"><Button variant="warning" onClick={actions.toggleRifle}>切换步枪</Button><Button variant="danger" onClick={actions.testClearBuild}>清空构筑</Button><Button variant="ghost" onClick={actions.exitTestArena}>退出测试场</Button></div>
      <p className="test-hint">←/→ 僵尸 · [/] 技能 · ,/. 词条 · 1 单只 · 5 一波 · H 隐藏</p>
    </aside>
  );
}
