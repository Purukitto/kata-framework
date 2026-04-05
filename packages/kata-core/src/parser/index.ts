import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import type { KSONScene, KSONAction, Choice } from "../types";

/**
 * Collects all descendant nodes of a given node recursively.
 */
function collectDescendants(
  node: any,
  result: Set<any> = new Set()
): Set<any> {
  if (node.children) {
    node.children.forEach((child: any) => {
      result.add(child);
      collectDescendants(child, result);
    });
  }
  return result;
}

/**
 * Splits children of a :::if container into then/elseif/else branches.
 * remark-directive nests elseif inside if, and else inside elseif,
 * forming a chain: if > [content, elseif > [content, else > [content]]]
 */
function splitConditionBranches(children: any[]): {
  thenChildren: any[];
  elseIfBranches: Array<{ condition: string; children: any[] }>;
  elseChildren: any[];
} {
  const thenChildren: any[] = [];
  const elseIfBranches: Array<{ condition: string; children: any[] }> = [];
  let elseChildren: any[] = [];

  for (const child of children) {
    if (child.type === "containerDirective" && child.name === "elseif") {
      // This elseif's own children may contain further elseif/else nesting
      const nested = splitConditionBranches(child.children || []);
      elseIfBranches.push({
        condition: child.attributes?.cond || "",
        children: nested.thenChildren,
      });
      // Propagate further nested elseIf and else branches
      elseIfBranches.push(...nested.elseIfBranches);
      if (nested.elseChildren.length > 0) {
        elseChildren = nested.elseChildren;
      }
    } else if (child.type === "containerDirective" && child.name === "else") {
      // All children of :::else are the else branch
      elseChildren = child.children || [];
    } else {
      thenChildren.push(child);
    }
  }

  return { thenChildren, elseIfBranches, elseChildren };
}

/**
 * Parses tween attributes from a string like: target="x" property="y" to="100" ...
 */
function parseTweenAttrs(text: string): any | null {
  const getAttr = (name: string) => {
    const m = text.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : undefined;
  };
  const target = getAttr("target") || "";
  const property = getAttr("property") || "";
  const to = getAttr("to");
  const duration = getAttr("duration");
  const from = getAttr("from");
  const easing = getAttr("easing");

  const tween: any = {
    target,
    property,
    to: to !== undefined ? parseFloat(to) : NaN,
    duration: duration !== undefined ? parseFloat(duration) : 0,
  };
  if (from !== undefined) tween.from = parseFloat(from);
  if (easing) tween.easing = easing;
  return tween;
}

/**
 * Extracts [tween-group ...]...[/tween-group] blocks and replaces them with placeholders.
 */
function extractTweenGroups(body: string): {
  body: string;
  tweenGroups: Array<{ mode: "parallel" | "sequence"; tweens: any[] }>;
} {
  const tweenGroups: Array<{ mode: "parallel" | "sequence"; tweens: any[] }> = [];

  const result = body.replace(
    /\[tween-group\s+(parallel|sequence)\]\s*([\s\S]*?)\s*\[\/tween-group\]/g,
    (_match, mode, content) => {
      const tweens: any[] = [];
      const lines = (content || "").split("\n");
      for (const line of lines) {
        if (/\[tween\s/.test(line)) {
          const tween = parseTweenAttrs(line);
          if (tween) tweens.push(tween);
        }
      }
      const idx = tweenGroups.length;
      tweenGroups.push({ mode: mode as "parallel" | "sequence", tweens });
      return `KATA_TWEEN_GROUP_${idx}`;
    }
  );

  return { body: result, tweenGroups };
}

/**
 * Parses a tree/subtree and extracts KSONActions from it.
 * execBlocks is passed through to resolve exec placeholders.
 */
function parseActions(
  tree: any,
  skipNodes: Set<any> = new Set(),
  execBlocks: string[] = [],
  tweenGroups: Array<{ mode: "parallel" | "sequence"; tweens: any[] }> = []
): KSONAction[] {
  const actions: KSONAction[] = [];
  const nodesToSkip = new Set(skipNodes);

  // First pass: identify container directives and mark their descendants to skip
  visit(tree, (node: any) => {
    if (
      node.type === "containerDirective" &&
      (node.name === "if" || node.name === "else" || node.name === "elseif")
    ) {
      const descendants = collectDescendants(node);
      descendants.forEach((desc: any) => nodesToSkip.add(desc));
    }
  });

  // Second pass: parse actions, skipping nodes inside container directives
  visit(tree, (node: any) => {
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

    // Handle [tween ...] leaf directive
    if (node.type === "leafDirective" && node.name === "tween") {
      const attrs = node.attributes || {};
      const tween: any = {
        type: "tween",
        target: attrs.target || "",
        property: attrs.property || "",
        to: attrs.to !== undefined ? parseFloat(attrs.to) : NaN,
        duration: attrs.duration !== undefined ? parseFloat(attrs.duration) : 0,
      };
      if (attrs.from !== undefined && attrs.from !== "") tween.from = parseFloat(attrs.from);
      if (attrs.easing) tween.easing = attrs.easing;
      actions.push(tween as KSONAction);
    }

    // Handle Container Directives: :::if{cond="..."}
    if (node.type === "containerDirective" && node.name === "if") {
      const condition = node.attributes?.cond || "";
      const { thenChildren, elseIfBranches, elseChildren } =
        splitConditionBranches(node.children || []);

      const thenActions = parseActions(
        { type: "root", children: thenChildren },
        new Set(),
        execBlocks,
        tweenGroups
      );

      const condAction: any = {
        type: "condition",
        condition,
        then: thenActions,
      };

      if (elseIfBranches.length > 0) {
        condAction.elseIf = elseIfBranches.map((branch) => ({
          condition: branch.condition,
          then: parseActions(
            { type: "root", children: branch.children },
            new Set(),
            execBlocks,
            tweenGroups
          ),
        }));
      }

      if (elseChildren.length > 0) {
        condAction.else = parseActions(
          { type: "root", children: elseChildren },
          new Set(),
          execBlocks,
          tweenGroups
        );
      }

      actions.push(condAction as KSONAction);
    }

    // Handle Speaker / text patterns in paragraphs
    if (node.type === "paragraph") {
      const text = node.children.map((n: any) => n.value).join("");

      // Handle exec placeholders
      const execMatch = text.match(/^KATA_EXEC_(\d+)$/);
      if (execMatch) {
        const idx = parseInt(execMatch[1], 10);
        if (idx < execBlocks.length) {
          actions.push({ type: "exec", code: execBlocks[idx]! });
        }
        return;
      }

      // Handle tween-group placeholders
      const tweenGroupMatch = text.match(/^KATA_TWEEN_GROUP_(\d+)$/);
      if (tweenGroupMatch) {
        const idx = parseInt(tweenGroupMatch[1], 10);
        if (idx < tweenGroups.length) {
          const group = tweenGroups[idx]!;
          actions.push({
            type: "tween-group",
            mode: group.mode,
            tweens: group.tweens,
          } as KSONAction);
        }
        return;
      }

      // Handle [wait N] syntax
      const waitMatch = text.match(/^\[wait\s+(\d+)\]$/);
      if (waitMatch) {
        actions.push({ type: "wait", duration: parseInt(waitMatch[1]!, 10) });
        return;
      }

      // Handle [wait] without duration (will be caught by diagnostics)
      const waitNoArgs = text.match(/^\[wait\]$/);
      if (waitNoArgs) {
        actions.push({ type: "wait", duration: 0 });
        return;
      }

      // Handle [tween ...] text-based syntax (fallback when not parsed as directive)
      if (/^\[tween\s/.test(text) && text.endsWith("]")) {
        const tween = parseTweenAttrs(text);
        if (tween) {
          actions.push({ type: "tween", ...tween } as KSONAction);
          return;
        }
      }

      // Handle custom directive syntax: [bg src="..."]
      const bgMatch = text.match(
        /^\[bg\s+src="([^"]+)"(?:\s+transition="([^"]+)")?\]$/
      );
      if (bgMatch) {
        actions.push({
          type: "visual",
          layer: "background",
          src: bgMatch[1]!,
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
        const m = text.match(/\[(.*?)\]\s*(?:->\s*@([\w\/_]+))?/);
        if (m) choices.push({ id: `c_${idx}`, label: m[1], target: m[2] });
      });
      if (choices.length) actions.push({ type: "choice", choices });
    }
  });

  return actions;
}

/**
 * Strips // comment lines from the body text.
 * Only strips lines where // is at the beginning (after optional whitespace).
 */
function stripComments(body: string): string {
  return body
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

/**
 * Extracts [exec]...[/exec] blocks and replaces them with placeholders.
 */
function extractExecBlocks(body: string): {
  body: string;
  execBlocks: string[];
  unclosed: boolean;
} {
  const execBlocks: string[] = [];

  const result = body.replace(
    /\[exec\]\s*\n([\s\S]*?)\n\s*\[\/exec\]/g,
    (_match, code) => {
      const idx = execBlocks.length;
      execBlocks.push(code.trim());
      return `KATA_EXEC_${idx}`;
    }
  );

  // Check for unclosed [exec] blocks (has [exec] but no matching [/exec])
  const unclosed =
    /\[exec\]/.test(result) && !/\[\/exec\]/.test(result);

  return { body: result, execBlocks, unclosed };
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

  // 3. Extract [exec]...[/exec] blocks before markdown parsing
  const { body: bodyAfterExec, execBlocks } = extractExecBlocks(rawBody);
  rawBody = bodyAfterExec;

  // 4. Extract [tween-group ...]...[/tween-group] blocks before markdown parsing
  const { body: bodyAfterTweenGroups, tweenGroups } = extractTweenGroups(rawBody);
  rawBody = bodyAfterTweenGroups;

  // 5. Strip // comments (only full-line comments)
  rawBody = stripComments(rawBody);

  // 6. Parse Markdown
  const processor = unified().use(remarkParse).use(remarkDirective);

  const tree = processor.runSync(processor.parse(rawBody));
  const actions = parseActions(tree, new Set(), execBlocks, tweenGroups);

  return {
    meta: { id: meta.id || "unknown", ...meta },
    script: scriptContent,
    actions,
  };
}
