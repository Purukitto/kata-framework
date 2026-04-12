interface SignalMeterProps {
  /** 0-100 signal strength */
  value: number;
  label?: string;
}

export function SignalMeter({ value, label = "Signal" }: SignalMeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const barClass =
    clamped >= 70 ? "" :
    clamped >= 40 ? "signal-meter__bar--warning" :
    "signal-meter__bar--danger";

  return (
    <div className="signal-meter" role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${clamped}%`}>
      <span className="signal-meter__label">{label}</span>
      <div className="signal-meter__bar-container">
        <div
          className={`signal-meter__bar ${barClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="signal-meter__value">{clamped}%</span>
    </div>
  );
}
