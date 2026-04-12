import "./setup-dom";
import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React from "react";
import { TweenProvider } from "../src/TweenContext";
import { useTween } from "../src/useTween";
import { TweenTarget } from "../src/TweenTarget";
import type { KSONFrame, KSONMeta } from "@kata-framework/core";
import { renderToContainer, mockMatchMedia, waitFor } from "./test-utils";

function makeMeta(): KSONMeta {
  return { id: "test-scene" };
}

function makeTweenFrame(
  target: string,
  property: string,
  to: number,
  duration = 500,
  easing = "ease"
): KSONFrame {
  return {
    meta: makeMeta(),
    action: { type: "tween", target, property, to, duration, easing },
    state: {},
  };
}

function makeTweenGroupFrame(
  tweens: Array<{ target: string; property: string; to: number; duration?: number; easing?: string }>,
  mode: "parallel" | "sequence" = "parallel"
): KSONFrame {
  return {
    meta: makeMeta(),
    action: {
      type: "tween-group",
      mode,
      tweens: tweens.map((t) => ({
        target: t.target,
        property: t.property,
        to: t.to,
        duration: t.duration ?? 500,
        easing: t.easing ?? "ease",
      })),
    },
    state: {},
  };
}

/** Test harness: renders TweenProvider + useTween + TweenTargets */
function TweenTestHarness({
  frame,
  targets,
}: {
  frame: KSONFrame | null;
  targets: Array<{ id: string; userStyle?: React.CSSProperties }>;
}) {
  return (
    <TweenProvider>
      <TweenConsumer frame={frame} />
      {targets.map((t) => (
        <TweenTarget key={t.id} id={t.id} style={t.userStyle}>
          <span data-testid={t.id}>content</span>
        </TweenTarget>
      ))}
    </TweenProvider>
  );
}

function TweenConsumer({ frame }: { frame: KSONFrame | null }) {
  useTween(frame);
  return null;
}

describe("Tween Renderer", () => {
  let cleanup: (() => void) | null = null;
  let restoreMedia: (() => void) | null = null;

  beforeEach(() => {
    restoreMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    restoreMedia?.();
    restoreMedia = null;
  });

  test("tween x property produces translateX on matching TweenTarget", async () => {
    const frame = makeTweenFrame("stranger", "x", 400);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "stranger" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const divs = container.getElementsByTagName("div");
    // Find the TweenTarget div (first div inside container)
    const targetDiv = divs[0] as HTMLElement;
    expect(targetDiv.style.transform).toContain("translateX(400px)");
  });

  test("tween y property produces translateY", async () => {
    const frame = makeTweenFrame("char", "y", 200);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "char" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transform).toContain("translateY(200px)");
  });

  test("tween opacity property applies opacity", async () => {
    const frame = makeTweenFrame("fade-target", "opacity", 0);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "fade-target" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.opacity).toBe("0");
  });

  test("duration and easing are applied via CSS transition", async () => {
    const frame = makeTweenFrame("anim", "x", 100, 800, "ease-in-out");
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "anim" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transition).toContain("transform 800ms ease-in-out");
  });

  test("tween-group parallel applies styles to all targets", async () => {
    const frame = makeTweenGroupFrame([
      { target: "a", property: "x", to: 100 },
      { target: "b", property: "opacity", to: 0.5 },
    ]);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "a" }, { id: "b" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const divs = container.getElementsByTagName("div");
    const divA = divs[0] as HTMLElement;
    const divB = divs[1] as HTMLElement;
    expect(divA.style.transform).toContain("translateX(100px)");
    expect(divB.style.opacity).toBe("0.5");
  });

  test("tween-group merges multiple properties on same target", async () => {
    const frame = makeTweenGroupFrame([
      { target: "hero", property: "x", to: 50 },
      { target: "hero", property: "opacity", to: 1 },
    ]);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "hero" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transform).toContain("translateX(50px)");
    expect(targetDiv.style.opacity).toBe("1");
  });

  test("unknown target IDs render TweenTarget normally", async () => {
    const frame = makeTweenFrame("nonexistent", "x", 100);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "other" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    // No tween styles applied — transform should be empty
    expect(targetDiv.style.transform).toBe("");
  });

  test("reduced motion applies transition: none", async () => {
    restoreMedia?.();
    restoreMedia = mockMatchMedia(true);

    const frame = makeTweenFrame("target", "x", 300, 1000);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "target" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transition).toBe("none");
    // But the value should still be applied
    expect(targetDiv.style.transform).toContain("translateX(300px)");
  });

  test("user style prop is merged with tween styles (tween takes precedence)", async () => {
    const frame = makeTweenFrame("styled", "opacity", 0.5);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness
        frame={frame}
        targets={[{ id: "styled", userStyle: { backgroundColor: "red", opacity: 1 } }]}
      />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    // Tween opacity overrides user opacity
    expect(targetDiv.style.opacity).toBe("0.5");
    // User background preserved
    expect(targetDiv.style.backgroundColor).toBe("red");
  });

  test("scale property produces scale transform", async () => {
    const frame = makeTweenFrame("scaler", "scale", 2);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "scaler" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transform).toContain("scale(2)");
  });

  test("rotation property produces rotate transform", async () => {
    const frame = makeTweenFrame("rotator", "rotation", 45);
    const { container, unmount } = renderToContainer(
      <TweenTestHarness frame={frame} targets={[{ id: "rotator" }]} />
    );
    cleanup = unmount;

    await waitFor(50);
    const targetDiv = container.getElementsByTagName("div")[0] as HTMLElement;
    expect(targetDiv.style.transform).toContain("rotate(45deg)");
  });
});
