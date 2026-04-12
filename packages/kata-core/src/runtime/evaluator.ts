/**
 * Evaluator for user logic execution.
 *
 * All logic evaluation must happen here, using new Function with restricted context.
 * NEVER use eval() - see project architecture rules.
 */

/**
 * Globals blocked from expression and exec evaluation.
 * Shadowed as undefined parameters in the new Function call.
 * If a user's context has a key matching a blocked global, the user's value wins.
 */
const BLOCKED_GLOBALS = [
  "process", "require", "fetch",
  "XMLHttpRequest", "globalThis", "window",
  "self", "global", "__proto__", "constructor",
];

/**
 * Builds a sandboxed new Function that shadows blocked globals as undefined.
 * Context keys that overlap with blocked globals are NOT shadowed (user value wins).
 */
function buildSandboxedFunction(paramNames: string[], body: string) {
  const shadows = BLOCKED_GLOBALS.filter(g => !paramNames.includes(g));
  const allParams = [...shadows, ...paramNames];
  const fn = new Function(...allParams, body);
  const shadowCount = shadows.length;
  return (paramValues: any[]) => {
    const undefineds = new Array(shadowCount).fill(undefined);
    return fn(...undefineds, ...paramValues);
  };
}

/**
 * Evaluates code string with a restricted context.
 * Uses new Function (not eval) for security.
 * Blocked globals are shadowed as undefined.
 *
 * @param code - The code string to evaluate
 * @param context - The context object providing variables to the code
 * @returns The result of evaluation, or null if an error occurred
 */
export function evaluate(code: string, context: Record<string, any>): any {
  try {
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);
    const exec = buildSandboxedFunction(paramNames, `return ${code}`);
    return exec(paramValues);
  } catch (error) {
    console.warn(`Evaluation error: ${error instanceof Error ? error.message : String(error)}`, {
      code,
      context,
    });
    return null;
  }
}

/**
 * Interpolates variable paths in text strings.
 * Replaces ${path} patterns with values from context.
 * Supports dot notation (e.g., player.stats.str).
 *
 * @param text - The text string containing ${path} patterns
 * @param context - The context object to resolve paths from
 * @returns The interpolated string with variables replaced
 */
export function interpolate(text: string, context: Record<string, any>): string {
  // Match ${...} patterns, including dot notation
  return text.replace(/\$\{([^}]+)\}/g, (match, path) => {
    // Trim whitespace from the path
    const trimmedPath = path.trim();

    // Resolve the value using dot notation
    const value = resolvePath(context, trimmedPath);

    // Return the value as string, or empty string if not found
    return value != null ? String(value) : "";
  });
}

/**
 * Evaluates code with structured error return instead of console.warn.
 * Blocked globals are shadowed as undefined.
 */
export function evaluateWithDiagnostic(
  code: string,
  context: Record<string, any>
): { result: any; error?: string } {
  try {
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);
    const exec = buildSandboxedFunction(paramNames, `return ${code}`);
    return { result: exec(paramValues) };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Interpolates text with structured error collection.
 */
export function interpolateWithDiagnostic(
  text: string,
  context: Record<string, any>
): { result: string; errors: string[] } {
  const errors: string[] = [];
  const result = text.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const trimmedPath = path.trim();
    try {
      const value = resolvePath(context, trimmedPath);
      return value != null ? String(value) : "";
    } catch (error) {
      errors.push(
        `Failed to interpolate \${${trimmedPath}}: ${error instanceof Error ? error.message : String(error)}`
      );
      return "";
    }
  });
  return { result, errors };
}

/**
 * Instruments loop constructs in code with an iteration guard.
 * Inserts a counter check at the start of every for/while/do loop body.
 */
function instrumentLoops(code: string, counterName: string, max: number): string {
  const guard = `if(++${counterName}>${max})throw new Error("Evaluation timeout: loop iteration limit exceeded");`;
  return code
    .replace(/(for\s*\([^)]*\)\s*\{)/g, `$1${guard}`)
    .replace(/(while\s*\([^)]*\)\s*\{)/g, `$1${guard}`)
    .replace(/(do\s*\{)/g, `$1${guard}`);
}

/**
 * Creates a sandboxed exec function for [exec] blocks.
 * - Blocked globals are shadowed as undefined
 * - Loop iteration is guarded against infinite loops
 * - ctx is expected to be a null-prototype object (caller responsibility)
 *
 * @param code - The exec block code
 * @param maxIterations - Maximum loop iterations before throwing (default 100_000)
 * @returns A function that accepts (ctx) and executes the code
 */
export function createSandboxedExec(code: string, maxIterations: number = 100_000): (ctx: any) => void {
  const counterName = `__kata_lg__`;
  const instrumented = instrumentLoops(code, counterName, maxIterations);
  const body = `var ${counterName}=0;\n${instrumented}`;
  const shadows = BLOCKED_GLOBALS.filter(g => g !== "ctx");
  const allParams = [...shadows, "ctx"];
  const fn = new Function(...allParams, body);
  const shadowCount = shadows.length;
  return (ctx: any) => {
    const undefineds = new Array(shadowCount).fill(undefined);
    fn(...undefineds, ctx);
  };
}

/**
 * Resolves a dot-notation path in an object.
 *
 * @param obj - The object to resolve the path in
 * @param path - The dot-notation path (e.g., "player.stats.str")
 * @returns The resolved value, or undefined if not found
 */
function resolvePath(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
