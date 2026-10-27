import { Button } from "../components/ui.jsx";
import { actions, getConfig } from "../game/actions.js";

const statusText = {
  ready: "账户已连接",
  guest: "未登录 · 成绩不保存",
  offline: "离线 · 成绩不保存",
  loading: "正在连接账户"
};

export function MenuScreen({ snapshot }) {
  const config = getConfig();
  const statusClass = "menu-status-pill " + snapshot.accountStatus;
  return (
    <section className="menu-screen">
      <button className={"account-orb " + snapshot.accountStatus} onClick={actions.openAccount}>
        <span>{snapshot.account ? snapshot.account.username.slice(0, 4) : "账户"}</span>
        <small>{statusText[snapshot.accountStatus] || "账户"}</small>
      </button>
      <div className="menu-panel">
        <div className="menu-topline">
          <span className="screen-badge">SURVIVAL PROTOCOL</span>
          <span className={statusClass}>{statusText[snapshot.accountStatus] || "账户"}</span>
        </div>
        <h1>街区警戒线</h1>
        <p>竖屏僵尸生存射击</p>
        <p className="menu-tip">步枪自动锁定目标 · 点击画面调整方向</p>
        <div className="menu-actions">
          <Button variant="success" className="menu-primary" onClick={actions.startContinue}>开始战斗</Button>
        </div>
        <div className="menu-secondary">
          <Button variant="cyan" onClick={actions.openLevelSelect}>选择关卡</Button>
          <Button variant="warning" onClick={actions.startTestArena}>进入测试场</Button>
        </div>
        <div className="menu-grid">
          <Button variant="soft" onClick={actions.openCharacter}>角色</Button>
          <Button variant="violet" onClick={actions.openSkillCodex}>技能图鉴</Button>
          <Button variant="blue" onClick={actions.openZombieCodex}>僵尸图鉴</Button>
        </div>
        <div className="menu-footer">
          <span>已通关 {snapshot.completedCount} / {config.levels.length}</span>
          <span>全部关卡已开放</span>
        </div>
      </div>
      {snapshot.statusNote ? <div className={"account-banner " + snapshot.accountStatus}>{snapshot.statusNote}</div> : null}
    </section>
  );
}
