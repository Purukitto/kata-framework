import { expect, test, describe } from "bun:test";
import { parseKata } from "../src/parser/index";

describe("Kata Parser", () => {
  test("Parses a full scene", () => {
    const raw = `---
id: intro
title: The Beginning
---
<script>console.log('init')</script>

[bg src="rain.mp4"]

:: Hero ::
Is anyone there?

* [Yes] -> @/scene/yes
* [No] -> @/scene/no
`;
    
    const result = parseKata(raw);

    // Assertions
    expect(result.meta.id).toBe("intro");
    expect(result.script).toBe("console.log('init')");
    expect(result.actions).toHaveLength(3); // Visual, Text, Choice
    expect(result.actions[1]).toEqual({ 
        type: 'text', 
        speaker: 'Hero', 
        content: 'Is anyone there?' 
    });
  });
});