import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import type { KSONScene, KSONAction, Choice } from "../types";

export function parseKata(fileContent: string): KSONScene {
  // 1. Extract YAML Frontmatter
  const parsed = matter(fileContent);
  const meta = parsed.data as any;
  let rawBody = parsed.content;

  // 2. Extract <script> blocks (MVP Regex)
  const scriptMatch = rawBody.match(/<script>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch?.[1]?.trim() || "";
  if (scriptMatch) rawBody = rawBody.replace(scriptMatch[0], "");

  const actions: KSONAction[] = [];

  // 3. Parse Markdown
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(() => (tree) => {
      visit(tree, (node: any) => {
        // Handle Directives: [bg src="..."]
        if (node.type === "leafDirective" && node.name === "bg") {
          actions.push({
            type: "visual",
            layer: "background",
            src: node.attributes.src,
            effect: node.attributes.transition,
          });
        }

        // Handle Speaker: :: Name ::
        if (node.type === "paragraph") {
          const text = node.children.map((n: any) => n.value).join("");
          
          // Handle custom directive syntax: [bg src="..."]
          const bgMatch = text.match(/^\[bg\s+src="([^"]+)"(?:\s+transition="([^"]+)")?\]$/);
          if (bgMatch) {
            actions.push({
              type: "visual",
              layer: "background",
              src: bgMatch[1],
              effect: bgMatch[2],
            });
            return;
          }
          
          if (text.trim().startsWith("::")) {
            const match = text.match(/^::\s*(.*?)\s*::\s*([\s\S]*)/);
            if (match) {
              actions.push({
                type: "text",
                speaker: match[1],
                content: match[2].trim(),
              });
              return;
            }
          }
        }

        // Handle Choices (Lists)
        if (node.type === "list") {
          const choices: Choice[] = [];
          node.children.forEach((li: any, idx: number) => {
            const text = li.children[0]?.children[0]?.value || "";
            // Matches: [Label] -> @target
            const m = text.match(/\[(.*?)\]\s*(?:->\s*@([\w\/_]+))?/);
            if (m) choices.push({ id: `c_${idx}`, label: m[1], target: m[2] });
          });
          if (choices.length) actions.push({ type: "choice", choices });
        }
      });
    });

  processor.runSync(processor.parse(rawBody));

  return {
    meta: { id: meta.id || "unknown", ...meta },
    script: scriptContent,
    actions,
  };
}
