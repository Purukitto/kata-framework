import type { KSONFrame } from "@kata-framework/core";

export interface FrameExpectation {
  type?: string;
  speaker?: string;
  content?: string;
  sceneId?: string;
  actionIndex?: number;
}

export function assertFrame(frame: KSONFrame, expected: FrameExpectation): void {
  if (expected.type !== undefined) {
    if (frame.action.type !== expected.type) {
      throw new Error(
        `Frame type mismatch: expected "${expected.type}", got "${frame.action.type}"`
      );
    }
  }

  if (expected.speaker !== undefined) {
    if (frame.action.type !== "text") {
      throw new Error(
        `Expected text action with speaker "${expected.speaker}", but action type is "${frame.action.type}"`
      );
    }
    if (frame.action.speaker !== expected.speaker) {
      throw new Error(
        `Speaker mismatch: expected "${expected.speaker}", got "${frame.action.speaker}"`
      );
    }
  }

  if (expected.content !== undefined) {
    if (frame.action.type !== "text") {
      throw new Error(
        `Expected text action with content, but action type is "${frame.action.type}"`
      );
    }
    if (frame.action.content !== expected.content) {
      throw new Error(
        `Content mismatch: expected "${expected.content}", got "${frame.action.content}"`
      );
    }
  }

  if (expected.sceneId !== undefined) {
    const actual = frame.state.currentSceneId;
    if (actual !== expected.sceneId) {
      throw new Error(
        `Scene ID mismatch: expected "${expected.sceneId}", got "${actual}"`
      );
    }
  }

  if (expected.actionIndex !== undefined) {
    const actual = frame.state.currentActionIndex;
    if (actual !== expected.actionIndex) {
      throw new Error(
        `Action index mismatch: expected ${expected.actionIndex}, got ${actual}`
      );
    }
  }
}
