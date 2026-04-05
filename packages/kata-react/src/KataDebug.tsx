import React from "react";
import { useKata } from "./useKata";

export function KataDebug() {
  const { frame, state, actions } = useKata();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#000",
        color: "#00ff00",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      {/* Top Bar: Scene ID */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid #00ff00",
          backgroundColor: "#001100",
        }}
      >
        <strong>Scene ID:</strong> {frame?.meta.id ?? "None"}
      </div>

      {/* Main Content Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel: User Variables */}
        <div
          style={{
            width: "50%",
            padding: "20px",
            borderRight: "1px solid #00ff00",
            overflow: "auto",
          }}
        >
          <div style={{ marginBottom: "10px", color: "#00ff00" }}>
            <strong>User Variables:</strong>
          </div>
          <pre
            style={{
              color: "#00ff00",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>

        {/* Right Panel: Narrative */}
        <div
          style={{
            width: "50%",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {!frame ? (
            <div style={{ color: "#00ff00" }}>
              No frame available. Start a scene to see content.
            </div>
          ) : (
            <>
              <div style={{ flex: 1, marginBottom: "20px" }}>
                {frame.action.type === "text" && (
                  <div
                    style={{ color: "#00ff00", lineHeight: "1.6" }}
                    role="dialog"
                    aria-live="assertive"
                    aria-label={frame.a11y?.label}
                  >
                    <div style={{ marginBottom: "10px" }}>
                      <strong>{frame.action.speaker}:</strong>
                    </div>
                    <div>{frame.action.content}</div>
                  </div>
                )}

                {frame.action.type === "choice" && (
                  <div style={{ color: "#00ff00" }}>
                    <div style={{ marginBottom: "15px" }}>
                      <strong>Choices:</strong>
                    </div>
                    <div
                      role="group"
                      aria-label="Choices"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {frame.action.choices.map((choiceOption: { id: string; label: string }) => (
                        <button
                          key={choiceOption.id}
                          onClick={() => actions.makeChoice(choiceOption.id)}
                          style={{
                            padding: "10px 15px",
                            fontSize: "14px",
                            textAlign: "left",
                            backgroundColor: "#000",
                            color: "#00ff00",
                            border: "1px solid #00ff00",
                            fontFamily: "monospace",
                            cursor: "pointer",
                          }}
                          onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
                            (e.currentTarget as any).style.backgroundColor = "#001100";
                          }}
                          onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
                            (e.currentTarget as any).style.backgroundColor = "#000";
                          }}
                        >
                          &gt; {choiceOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frame.action.type !== "text" && frame.action.type !== "choice" && (
                  <div style={{ color: "#00ff00" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <strong>Action Type:</strong> {frame.action.type}
                    </div>
                    <pre
                      style={{
                        color: "#00ff00",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(frame.action, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Next Button (only if not at a choice) */}
              {frame.action.type !== "choice" && (
                <div>
                  <button
                    onClick={actions.next}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      backgroundColor: "#000",
                      color: "#00ff00",
                      border: "1px solid #00ff00",
                      fontFamily: "monospace",
                      cursor: "pointer",
                    }}
                    onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
                      (e.currentTarget as any).style.backgroundColor = "#001100";
                    }}
                    onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
                      (e.currentTarget as any).style.backgroundColor = "#000";
                    }}
                  >
                    &gt; Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
