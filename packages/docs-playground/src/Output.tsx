import React from "react";
import type { KSONFrame } from "@kata-framework/core";

export interface OutputProps {
  frame: KSONFrame | null;
  onNext: () => void;
  onChoice: (choiceId: string) => void;
  ended: boolean;
}

const buttonStyle: React.CSSProperties = {
  background: "#2d2d2d",
  color: "#e5e5e5",
  border: "1px solid #444",
  borderRadius: "4px",
  padding: "4px 10px",
  font: "inherit",
  cursor: "pointer",
};

const choiceButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  display: "block",
  width: "100%",
  textAlign: "left",
  marginTop: "4px",
};

export function Output({ frame, onNext, onChoice, ended }: OutputProps) {
  if (!frame) {
    return (
      <div data-playground-output style={{ color: "#888", fontStyle: "italic" }}>
        No frame yet.
      </div>
    );
  }

  const action = frame.action;

  return (
    <div data-playground-output style={{ minHeight: "80px" }}>
      {action.type === "text" && (
        <div>
          <div style={{ fontWeight: 600, color: "#bbb" }}>{action.speaker}</div>
          <div>{action.content}</div>
        </div>
      )}
      {action.type === "choice" && (
        <div data-playground-choices>
          {action.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              style={choiceButtonStyle}
              onClick={() => onChoice(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {action.type === "visual" && (
        <div style={{ fontStyle: "italic", color: "#888" }}>
          [visual: {action.layer} → {action.src}]
        </div>
      )}
      {action.type === "wait" && (
        <div style={{ fontStyle: "italic", color: "#888" }}>[wait {action.duration}ms]</div>
      )}
      {action.type === "exec" && (
        <div style={{ fontStyle: "italic", color: "#888" }}>[exec]</div>
      )}

      <div style={{ marginTop: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
        {action.type !== "choice" && !ended && (
          <button type="button" style={buttonStyle} onClick={onNext}>
            Next →
          </button>
        )}
        {ended && (
          <span style={{ color: "#888", fontStyle: "italic" }}>Scene ended.</span>
        )}
      </div>
    </div>
  );
}
