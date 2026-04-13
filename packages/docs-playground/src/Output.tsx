import React from "react";
import type { KSONFrame } from "@kata-framework/core";

export interface OutputProps {
  frame: KSONFrame | null;
}

export function Output({ frame }: OutputProps) {
  if (!frame) {
    return (
      <div data-playground-output style={{ color: "#999", fontStyle: "italic" }}>
        No frame yet.
      </div>
    );
  }

  const action = frame.action;

  return (
    <div data-playground-output style={{ minHeight: "80px" }}>
      {action.type === "text" && (
        <div>
          <div style={{ fontWeight: 600, color: "#555" }}>{action.speaker}</div>
          <div>{action.content}</div>
        </div>
      )}
      {action.type === "choice" && (
        <ul style={{ margin: 0, paddingLeft: "16px" }}>
          {action.choices.map((c) => (
            <li key={c.id}>{c.label}</li>
          ))}
        </ul>
      )}
      {action.type === "visual" && (
        <div style={{ fontStyle: "italic", color: "#666" }}>
          [visual: {action.layer} → {action.src}]
        </div>
      )}
      {action.type === "wait" && (
        <div style={{ fontStyle: "italic", color: "#666" }}>[wait {action.duration}ms]</div>
      )}
      {action.type === "exec" && (
        <div style={{ fontStyle: "italic", color: "#666" }}>[exec]</div>
      )}
    </div>
  );
}
