import React from "react";

export interface EditorProps {
  source: string;
  onChange: (next: string) => void;
}

export function Editor({ source, onChange }: EditorProps) {
  return (
    <textarea
      data-playground-editor
      value={source}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        borderRight: "1px solid #ddd",
        outline: "none",
        padding: "8px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "12px",
        resize: "none",
        background: "#fafafa",
        color: "#222",
      }}
    />
  );
}
