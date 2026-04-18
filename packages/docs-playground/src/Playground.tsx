import React, { useEffect, useRef, useState, useCallback } from "react";
import type { KSONFrame, Diagnostic } from "@kata-framework/core";
import { createIsolatedEngine } from "./engine-factory";
import { debounce } from "./parse-debounce";
import { Editor } from "./Editor";
import { Output } from "./Output";
import { EventsLog } from "./EventsLog";
import { KsonInspector } from "./KsonInspector";

export interface PlaygroundProps {
  initialScene: string;
  height: number;
  showKson: boolean;
  showEvents: boolean;
  onReset?: () => void;
  controlRef?: (api: { setScene: (s: string) => void; reset: () => void }) => void;
}

interface ParseState {
  source: string;
  frame: KSONFrame | null;
  diagnostics: Diagnostic[];
  fatalError: string | null;
  events: string[];
  ksonJson: string;
}

export function Playground(props: PlaygroundProps) {
  const [source, setSource] = useState(props.initialScene);
  const [state, setState] = useState<ParseState>(() => buildInitial(props.initialScene));
  const engineRef = useRef<ReturnType<typeof createIsolatedEngine> | null>(null);

  // Runs a full rebuild: tears down previous engine, creates new, starts first scene.
  const rebuild = useCallback((nextSource: string, preserveOnError: boolean) => {
    const result = createIsolatedEngine(nextSource);

    if (!result.engine || !result.scene) {
      // Keep previous frame visible if we can
      setState((prev) => ({
        ...prev,
        source: nextSource,
        diagnostics: result.diagnostics,
        fatalError: result.fatalError,
        ksonJson: result.scene ? safeJson(result.scene) : prev.ksonJson,
      }));
      return;
    }

    // Tear down previous engine listeners
    engineRef.current?.engine?.removeAllListeners();
    engineRef.current = result;

    const events: string[] = [];
    let currentFrame: KSONFrame | null = null;

    result.engine.on("update", (frame: KSONFrame) => {
      currentFrame = frame;
      events.push(`update → ${frame.action.type}`);
      setState({
        source: nextSource,
        frame,
        diagnostics: result.diagnostics,
        fatalError: null,
        events: [...events],
        ksonJson: safeJson(result.scene),
      });
    });

    result.engine.on("end", () => {
      events.push("end");
      setState((prev) => ({ ...prev, events: [...events] }));
    });

    result.engine.on("error", (e: any) => {
      events.push(`error: ${e?.message ?? "unknown"}`);
      setState((prev) => ({ ...prev, events: [...events] }));
    });

    try {
      result.engine.start(result.scene.meta.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        source: nextSource,
        fatalError: msg,
        diagnostics: result.diagnostics,
      }));
    }
  }, []);

  // Initial mount: boot the engine
  useEffect(() => {
    rebuild(props.initialScene, false);
    return () => {
      engineRef.current?.engine?.removeAllListeners();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedRebuildRef = useRef<ReturnType<typeof debounce> | null>(null);
  if (!debouncedRebuildRef.current) {
    debouncedRebuildRef.current = debounce((next: string) => rebuild(next, true), 150);
  }

  const onSourceChange = useCallback((next: string) => {
    setSource(next);
    debouncedRebuildRef.current!(next);
  }, []);

  const setSceneImperative = useCallback((next: string) => {
    setSource(next);
    debouncedRebuildRef.current!(next);
  }, []);

  const resetImperative = useCallback(() => {
    debouncedRebuildRef.current?.cancel();
    setSource(props.initialScene);
    rebuild(props.initialScene, false);
    props.onReset?.();
  }, [props.initialScene, props.onReset, rebuild]);

  // Expose imperative API to parent (mount())
  useEffect(() => {
    props.controlRef?.({ setScene: setSceneImperative, reset: resetImperative });
  }, [props, setSceneImperative, resetImperative]);

  const errorMsg = state.fatalError ?? state.diagnostics.find((d) => d.level === "error")?.message;

  return (
    <div
      className="kata-playground"
      data-playground-root
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        height: props.height,
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        overflow: "hidden",
        background: "#fff",
        color: "#222",
        colorScheme: "light",
      }}
    >
      <Editor source={source} onChange={onSourceChange} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "auto", padding: "8px" }}>
        {errorMsg && (
          <div
            data-playground-error
            style={{
              background: "#fee",
              border: "1px solid #f99",
              color: "#900",
              padding: "6px 8px",
              marginBottom: "6px",
              borderRadius: "4px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "12px",
            }}
          >
            {errorMsg}
          </div>
        )}
        <Output frame={state.frame} />
        {props.showEvents && <EventsLog events={state.events} />}
        {props.showKson && <KsonInspector json={state.ksonJson} />}
      </div>
    </div>
  );
}

function buildInitial(source: string): ParseState {
  const result = createIsolatedEngine(source);
  return {
    source,
    frame: null,
    diagnostics: result.diagnostics,
    fatalError: result.fatalError,
    events: [],
    ksonJson: result.scene ? safeJson(result.scene) : "",
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}
