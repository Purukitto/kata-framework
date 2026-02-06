/**
 * Evaluator for user logic execution.
 * 
 * All logic evaluation must happen here, using new Function with restricted context.
 * NEVER use eval() - see project architecture rules.
 */

/**
 * Evaluates code string with a restricted context.
 * Uses new Function (not eval) for security.
 * 
 * @param code - The code string to evaluate
 * @param context - The context object providing variables to the code
 * @returns The result of evaluation, or null if an error occurred
 */
export function evaluate(code: string, context: Record<string, any>): any {
  try {
    // Create parameter names from context keys
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);
    
    // Use new Function with restricted context (never eval)
    // This creates a function with the context variables as parameters
    const fn = new Function(...paramNames, `return ${code}`);
    
    // Execute with the context values
    return fn(...paramValues);
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
