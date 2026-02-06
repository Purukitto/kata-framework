import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import type { KSONScene, KSONAction, Choice } from "../types";

/**
 * Collects all descendant nodes of a given node recursively.
 */
function collectDescendants(node: any, result: Set<any> = new Set()): Set<any> {
  if (node.children) {
    node.children.forEach((child: any) => {
      result.add(child);
      collectDescendants(child, result);
    });
  }
  return result;
}

/**
 * Parses a tree/subtree and extracts KSONActions from it.
 * This function is reusable for parsing nested structures like conditionals.
 */
function parseActions(tree: any, skipNodes: Set<any> = new Set()): KSONAction[] {
  const actions: KSONAction[] = [];
  const nodesToSkip = new Set(skipNodes);

  // First pass: identify container directives and mark their descendants to skip
  visit(tree, (node: any) => {
    if (node.type === "containerDirective" && node.name === "if") {
      // Mark all descendants of this container directive to skip in main parsing
      const descendants = collectDescendants(node);
      descendants.forEach((desc: any) => nodesToSkip.add(desc));
    }
  });

  // Second pass: parse actions, skipping nodes inside container directives
  visit(tree, (node: any) => {
    // Skip nodes that are descendants of container directives (they're parsed recursively)
    if (nodesToSkip.has(node)) {
      return;
    }

    // Handle Directives: [bg src="..."]
    if (node.type === "leafDirective" && node.name === "bg") {
      actions.push({
        type: "visual",
        layer: "background",
        src: node.attributes.src,
        effect: node.attributes.transition,
      });
    }

    // Handle Container Directives: :::if{cond="..."}
    if (node.type === "containerDirective" && node.name === "if") {
      const condition = node.attributes?.cond || "";
      // Recursively parse the children of this conditional block (without skip list)
      const thenActions = parseActions({ type: "root", children: node.children || [] });
      actions.push({
        type: "condition",
        condition,
        then: thenActions,
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

  return actions;
}

export function parseKata(fileContent: string): KSONScene {
  // 1. Extract YAML Frontmatter
  const parsed = matter(fileContent);
  const meta = parsed.data as any;
  let rawBody = parsed.content;

  // 2. Extract <script> blocks (MVP Regex)
  const scriptMatch = rawBody.match(/<script>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch?.[1]?.trim() || "";
  if (scriptMatch) rawBody = rawBody.replace(scriptMatch[0], "");

  // 3. Parse Markdown
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective);

  const tree = processor.runSync(processor.parse(rawBody));
  const actions = parseActions(tree);

  return {
    meta: { id: meta.id || "unknown", ...meta },
    script: scriptContent,
    actions,
  };
}
