import { mount } from "./mount";

/**
 * Walks `[data-playground]` elements and lazy-mounts a playground on each.
 * Uses IntersectionObserver so boot happens only when the element nears the viewport.
 *
 * Expected markup:
 *   <div data-playground data-scene-src="..." data-height="480"></div>
 *
 * `data-scene-src` may be either inline `.kata` source or a URL ending in `.kata`
 * that will be fetched on first intersection.
 */
export function autoMountAll(selector: string = "[data-playground]"): void {
  if (typeof document === "undefined") return;

  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (elements.length === 0) return;

  const bootOne = async (el: HTMLElement) => {
    if (el.dataset.playgroundBooted === "1") return;
    el.dataset.playgroundBooted = "1";

    const sceneRaw = el.dataset.sceneSrc ?? "";
    let scene = sceneRaw;
    if (sceneRaw.endsWith(".kata") && /^https?:\/\//.test(sceneRaw)) {
      try {
        scene = await fetch(sceneRaw).then((r) => r.text());
      } catch {
        scene = `---\nid: error\n---\n:: Error :: Could not load ${sceneRaw}`;
      }
    }

    const height = Number(el.dataset.height ?? "480");
    mount(el, { scene, height });
  };

  const IO = (globalThis as any).IntersectionObserver;
  if (!IO) {
    for (const el of elements) void bootOne(el);
    return;
  }

  const observer = new IO(
    (entries: any[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void bootOne(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "200px" },
  );
  for (const el of elements) observer.observe(el);
}
