import React, { useState } from "react";

export function KsonInspector({ json }: { json: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      data-playground-kson
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{ marginTop: "8px", fontSize: "11px" }}
    >
      <summary style={{ cursor: "pointer", color: "#aaa" }}>Parsed KSON</summary>
      <pre
        style={{
          margin: "4px 0",
          padding: "6px",
          background: "#0d0d0d",
          color: "#ddd",
          borderRadius: "4px",
          fontFamily: "ui-monospace, monospace",
          fontSize: "11px",
          maxHeight: "200px",
          overflow: "auto",
        }}
      >
        {json}
      </pre>
    </details>
  );
}
