import { expect, test, describe } from "bun:test";
import { StoryTestRunner } from "../src/StoryTestRunner";

const INTRO = `---
id: intro
---

:: Narrator :: Welcome.

:: Hero :: Hello, world.

* [Continue] -> @forest
`;

const FOREST = `---
id: forest
---

:: Narrator :: You enter the forest.

* [Go deeper] -> @cave
`;

const CAVE = `---
id: cave
---

:: Narrator :: A dark cave.
`;

const ORPHAN = `---
id: orphan
---

:: Narrator :: Nobody comes here.
`;

describe("StoryTestRunner — assertions", () => {
  test("dialogueLog contains all text spoken so far", () => {
    const story = new StoryTestRunner([INTRO, FOREST, CAVE]);
    story.start("intro");
    story.advanceUntilChoice();
    expect(story.dialogueLog).toEqual(["Welcome.", "Hello, world."]);
  });

  test("speakerLog contains all speakers in order", () => {
    const story = new StoryTestRunner([INTRO, FOREST, CAVE]);
    story.start("intro");
    story.advanceUntilChoice();
    expect(story.speakerLog).toEqual(["Narrator", "Hero"]);
  });

  test("canReach reports graph reachability across scenes", () => {
    const story = new StoryTestRunner([INTRO, FOREST, CAVE, ORPHAN]);
    expect(story.canReach("cave", "intro")).toBe(true);
    expect(story.canReach("forest", "intro")).toBe(true);
    expect(story.canReach("orphan", "intro")).toBe(false);
  });

  test("ctx getter exposes the latest context state", () => {
    const story = new StoryTestRunner(
      `---
id: stats
---

:: Narrator :: Hello \${name}.
`,
      { name: "Lyra" }
    );
    story.start("stats");
    expect(story.ctx.name).toBe("Lyra");
  });
});
