import { expect, test, describe } from "bun:test";
import { StoryTestRunner } from "../src/StoryTestRunner";

const FOREST = `---
id: forest
---

:: Narrator :: You enter the forest.

[exec]
ctx.visited_forest = true;
[/exec]

:: Narrator :: A path forks ahead.

* [Take the left path] -> @left
* [Take the right path] -> @right
`;

const LEFT = `---
id: left
---

:: Narrator :: You find a stream.
`;

const RIGHT = `---
id: right
---

:: Narrator :: You find a cave.
`;

describe("StoryTestRunner — basic flow", () => {
  test("advanceUntilChoice stops at the next choice action", () => {
    const story = new StoryTestRunner([FOREST, LEFT, RIGHT]);
    story.start("forest");
    story.advanceUntilChoice();
    expect(story.currentFrame?.action.type).toBe("choice");
  });

  test("currentChoices returns the labels of the available choices", () => {
    const story = new StoryTestRunner([FOREST, LEFT, RIGHT]);
    story.start("forest");
    story.advanceUntilChoice();
    expect(story.currentChoices).toEqual(["Take the left path", "Take the right path"]);
  });

  test("choose(label) selects the matching choice", () => {
    const story = new StoryTestRunner([FOREST, LEFT, RIGHT]);
    story.start("forest");
    story.advanceUntilChoice();
    story.choose("Take the left path");
    expect(story.currentFrame?.state.currentSceneId).toBe("left");
  });

  test("advanceUntilText stops when text containing the substring appears", () => {
    const story = new StoryTestRunner([FOREST, LEFT, RIGHT]);
    story.start("forest");
    story.advanceUntilText("path forks");
    expect(story.currentFrame?.action.type).toBe("text");
    if (story.currentFrame?.action.type === "text") {
      expect(story.currentFrame.action.content).toContain("path forks");
    }
  });
});
