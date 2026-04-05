export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const KNOWN_HOOKS = [
  "beforeAction",
  "afterAction",
  "onChoice",
  "beforeSceneChange",
  "onEnd",
  "init",
] as const;

const KNOWN_PROPERTIES = new Set<string>(["name", ...KNOWN_HOOKS]);

export function validatePlugin(plugin: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plugin === null || plugin === undefined || typeof plugin !== "object") {
    return { valid: false, errors: ["Plugin must be a non-null object"], warnings };
  }

  const obj = plugin as Record<string, unknown>;

  // Check name
  if (!("name" in obj) || typeof obj.name !== "string" || obj.name.length === 0) {
    errors.push("Plugin must have a non-empty string 'name' property");
  }

  // Check hooks are functions if present
  for (const hook of KNOWN_HOOKS) {
    if (hook in obj && typeof obj[hook] !== "function") {
      errors.push(`Plugin hook '${hook}' must be a function, got ${typeof obj[hook]}`);
    }
  }

  // Check for unknown properties
  for (const key of Object.keys(obj)) {
    if (!KNOWN_PROPERTIES.has(key)) {
      warnings.push(`Unknown plugin property '${key}'`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
