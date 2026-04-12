interface UndoButtonProps {
  onUndo: () => void;
  disabled?: boolean;
}

export function UndoButton({ onUndo, disabled }: UndoButtonProps) {
  return (
    <button
      className="undo-btn"
      onClick={onUndo}
      disabled={disabled}
      aria-label="Rewind the tape — undo last action"
      title="Rewind the tape"
    >
      Rewind
    </button>
  );
}
