import type { Choice } from "@kata-framework/core";
import { useKeyboardNavigation } from "@kata-framework/react";

interface ChoicePanelProps {
  choices: Choice[];
  onChoice: (id: string) => void;
}

export function ChoicePanel({ choices, onChoice }: ChoicePanelProps) {
  const { focusedIndex, onKeyDown } = useKeyboardNavigation(choices, onChoice);

  return (
    <div className="choices" role="group" aria-label="Choose your next action" onKeyDown={onKeyDown}>
      <div className="choices__prompt">What will you do?</div>
      {choices.map((choice, i) => (
        <button
          key={choice.id}
          className={`choices__btn ${i === focusedIndex ? "choices__btn--focused" : ""}`}
          onClick={() => onChoice(choice.id)}
          aria-label={`Choice ${i + 1}: ${choice.label}`}
          tabIndex={i === focusedIndex ? 0 : -1}
        >
          <span className="choices__btn-index">{i + 1}.</span>
          {choice.label}
          <span className="choices__btn-key">{i + 1}</span>
        </button>
      ))}
    </div>
  );
}
