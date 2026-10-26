export function cx() {
  return Array.prototype.slice.call(arguments).filter(Boolean).join(" ");
}

export function Button({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) {
  return (
    <button type={type} className={cx("ui-button", "ui-button-" + variant, className)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Screen({ children, className = "", title, subtitle, badge, onBack, actions }) {
  return (
    <section className={cx("screen", className)}>
      <header className="screen-header">
        {onBack ? <Button variant="ghost" className="screen-back" onClick={onBack}>‹ 返回</Button> : <span />}
        <div className="screen-heading">
          {badge ? <span className="screen-badge">{badge}</span> : null}
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="screen-actions">{actions}</div>
      </header>
      <div className="screen-body">{children}</div>
    </section>
  );
}

export function StatBar({ label, value, max, tone = "green" }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="stat-bar">
      <span>{label}</span>
      <div className="stat-track"><i className={"stat-fill " + tone} style={{ width: (ratio * 100).toFixed(1) + "%" }} /></div>
      <b>{Math.ceil(value)}/{Math.ceil(max)}</b>
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty-state">{children}</p>;
}

export function Notice({ children, tone = "info" }) {
  if (!children) return null;
  return <p className={"notice notice-" + tone}>{children}</p>;
}

export function formatTime(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const total = Math.max(0, Math.floor(Number(value)));
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

export function formatPercent(value) {
  const number = Math.round(Number(value || 0) * 1000) / 10;
  return (Number.isInteger(number) ? number.toFixed(0) : number.toFixed(1)) + "%";
}
