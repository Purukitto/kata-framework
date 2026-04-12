import { useState, useEffect, useCallback } from "react";
import { useKata, useKataEngine, useReducedMotion } from "@kata-framework/react";
import { DialogueBox } from "./DialogueBox";
import { ChoicePanel } from "./ChoicePanel";
import { BackgroundLayer } from "./BackgroundLayer";
import { SaveLoadMenu } from "./SaveLoadMenu";

export function StudioView() {
  const { frame, actions } = useKata();
  const engine = useKataEngine();
  const reducedMotion = useReducedMotion();
  const [background, setBackground] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const handleEnd = () => setEnded(true);
    engine.on("end", handleEnd);
    return () => { engine.off("end", handleEnd); };
  }, [engine]);

  // Track background from visual actions
  useEffect(() => {
    if (frame?.action.type === "visual") {
      setBackground(frame.action.src);
    }
  }, [frame]);

  const handleUndo = useCallback(() => {
    engine.back();
    setEnded(false);
  }, [engine]);

  if (!frame && !ended) {
    return (
      <div className="studio__start">
        <h1 className="studio__start-logo">Radio Free Signal</h1>
        <p className="studio__start-tagline">
          The government silenced every channel. Every feed. Every voice.
          <br />
          Yours is the last one standing.
        </p>
        <div className="studio__start-modes">
          <button
            className="studio__mode-btn studio__mode-btn--accent"
            onClick={() => { setEnded(false); actions.start("prologue"); }}
          >
            Solo Broadcast
          </button>
          <button
            className="studio__mode-btn"
            onClick={() => { setEnded(false); actions.start("prologue"); }}
            title="Co-op uses BroadcastChannel — open this page in two tabs"
          >
            Co-op Broadcast
          </button>
        </div>
        <p className="studio__start-meta">
          A tech demo for the <a href="https://github.com/purukitto/kata-framework">kata-framework</a>
        </p>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="studio__end">
        <div className="studio__end-label">Transmission Complete</div>
        <p className="studio__end-text">
          The signal fades. The story is told.<br />
          But the frequency remains open.
        </p>
        <button
          className="studio__restart-btn"
          onClick={() => { setEnded(false); setBackground(null); actions.start("prologue"); }}
        >
          New Broadcast
        </button>
      </div>
    );
  }

  if (!frame) return null;

  const { action } = frame;

  // Auto-advance for non-interactive actions
  if (action.type === "visual" || action.type === "exec") {
    queueMicrotask(() => actions.next());
    return <BackgroundLayer src={background} />;
  }

  if (action.type === "wait") {
    const duration = reducedMotion ? 0 : action.duration;
    setTimeout(() => actions.next(), duration);
    return <BackgroundLayer src={background} />;
  }

  if (action.type === "tween" || action.type === "tween-group") {
    // Tweens are fire-and-forget — engine auto-advances, just render background
    return <BackgroundLayer src={background} />;
  }

  return (
    <>
      <BackgroundLayer src={background} />
      <div className="studio__toolbar">
        <button className="toolbar-btn" onClick={handleUndo}>
          Rewind
        </button>
        <SaveLoadMenu
          onSave={() => actions.getSnapshot()}
          onLoad={(data) => { setEnded(false); actions.loadSnapshot(data); }}
        />
      </div>
      {action.type === "text" && (
        <DialogueBox action={action} onContinue={() => actions.next()} />
      )}
      {action.type === "choice" && (
        <ChoicePanel
          choices={action.choices}
          onChoice={(id) => actions.makeChoice(id)}
        />
      )}
    </>
  );
}
