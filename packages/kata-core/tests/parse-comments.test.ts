import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";

describe("Parse comments", () => {
  test("// comment lines are stripped from output", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: Hello

// This is a comment

:: Narrator :: World
`);
    expect(scene.actions).toHaveLength(2);
    expect(scene.actions[0]).toEqual({ type: "text", speaker: "Narrator", content: "Hello" });
    expect(scene.actions[1]).toEqual({ type: "text", speaker: "Narrator", content: "World" });
  });

  test("// inside :: Speaker :: text with // slashes is NOT stripped", () => {
    const scene = parseKata(`---
id: test
---
:: Narrator :: The URL is http://example.com
`);
    expect(scene.actions).toHaveLength(1);
    expect(scene.actions[0]).toEqual({
      type: "text",
      speaker: "Narrator",
      content: "The URL is http://example.com",
    });
  });

  test("// inside <script> blocks are NOT stripped", () => {
    const scene = parseKata(`---
id: test
---
<script>
// this is a JS comment
ctx.x = 1;
</script>

:: Narrator :: Hello
`);
    expect(scene.script).toContain("// this is a JS comment");
    expect(scene.actions).toHaveLength(1);
  });
});
