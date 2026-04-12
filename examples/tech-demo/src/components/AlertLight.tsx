interface AlertLightProps {
  /** Suspicion level — active when >= threshold */
  level: number;
  threshold?: number;
}

export function AlertLight({ level, threshold = 3 }: AlertLightProps) {
  const active = level >= threshold;

  return (
    <div className="alert-light" role="status" aria-label={active ? "Alert: High suspicion" : "Alert: Normal"}>
      <div className={`alert-light__dot ${active ? "alert-light__dot--active" : ""}`} />
      <span className="alert-light__label">
        {active ? "ALERT" : "Clear"}
      </span>
    </div>
  );
}
