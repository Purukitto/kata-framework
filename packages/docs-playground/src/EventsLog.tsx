import React, { useState } from "react";

export function EventsLog({ events }: { events: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      data-playground-events
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{ marginTop: "8px", fontSize: "11px" }}
    >
      <summary style={{ cursor: "pointer", color: "#666" }}>
        Events ({events.length})
      </summary>
      <ul style={{ margin: "4px 0", paddingLeft: "16px", fontFamily: "ui-monospace, monospace" }}>
        {events.slice(-20).map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </details>
  );
}
