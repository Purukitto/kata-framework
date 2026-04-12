import type { KSONAction } from "@kata-framework/core";
import { useFocusManagement } from "@kata-framework/react";

interface DialogueBoxProps {
  action: KSONAction & { type: "text" };
  onContinue: () => void;
}

export function DialogueBox({ action, onContinue }: DialogueBoxProps) {
  const focusRef = useFocusManagement(action.content);

  const isNarrator = action.speaker === "Narrator";

  return (
    <div className="dialogue" role="dialog" aria-live="assertive" aria-label={`${action.speaker}: ${action.content}`}>
      {action.speaker && (
        <div className={`dialogue__speaker ${isNarrator ? "dialogue__speaker--narrator" : ""}`}>
          {action.speaker}
        </div>
      )}
      <div className="dialogue__content">{action.content}</div>
      <button
        className="dialogue__continue"
        onClick={onContinue}
        ref={focusRef as React.RefObject<HTMLButtonElement>}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onContinue(); }}
      >
        Continue
      </button>
    </div>
  );
}
