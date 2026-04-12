import { expect, test, describe } from "bun:test";
import { StoryTestRunner } from "../src/StoryTestRunner";

const NO_CHOICE = `---
id: linear
---

:: Narrator :: line one

:: Narrator :: line two
`;

const ONE_CHOICE = `---
id: pick
---

:: Narrator :: pick something

* [Yes] -> @pick
* [No]
`;

describe("StoryTestRunner — safety", () => {
  test("advanceUntilChoice on a scene with no choices ends gracefully", () => {
    const story = new StoryTestRunner(NO_CHOICE);
    story.start("linear");
    story.advanceUntilChoice();
    expect(story.isEnded).toBe(true);
  });

  test("choose with an unknown label throws and lists available choices", () => {
    const story = new StoryTestRunner(ONE_CHOICE);
    story.start("pick");
    story.advanceUntilChoice();
    expect(() => story.choose("Maybe")).toThrow(/Available: \[Yes, No\]/);
  });

  test("choose without a choice frame throws", () => {
    const story = new StoryTestRunner(NO_CHOICE);
    story.start("linear");
    expect(() => story.choose("Yes")).toThrow(/not a choice/);
  });

  test("advanceUntilText that never appears throws after maxSteps", () => {
    const story = new StoryTestRunner(NO_CHOICE, {}, { maxSteps: 5 });
    story.start("linear");
    expect(() => story.advanceUntilText("never written")).toThrow(/scene ended without matching text|not seen after/);
  });
});
