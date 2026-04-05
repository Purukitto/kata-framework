import type { KSONAction, LocaleOverride, LocaleData } from "../types";

/**
 * Manages locale overrides for scene text content.
 * Resolves localized text before interpolation occurs.
 */
export class LocaleManager {
  private locale = "";
  private fallback = "";
  // Map<sceneId, Map<locale, LocaleOverride[]>>
  private overrides = new Map<string, Map<string, LocaleOverride[]>>();

  setLocale(locale: string): void {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale;
  }

  setFallback(fallback: string): void {
    this.fallback = fallback;
  }

  getFallback(): string {
    return this.fallback;
  }

  registerLocale(sceneId: string, locale: string, overrides: LocaleOverride[]): void {
    if (!this.overrides.has(sceneId)) {
      this.overrides.set(sceneId, new Map());
    }
    this.overrides.get(sceneId)!.set(locale, overrides);
  }

  /**
   * Resolves text for a given action, applying locale overrides.
   * Returns a new action if localized, or the original if no override found.
   * Only applies to text actions — other action types pass through unchanged.
   */
  resolveText(sceneId: string, actionIndex: number, action: KSONAction): KSONAction {
    if (!this.locale || action.type !== "text") {
      return action;
    }

    const override = this.findOverride(sceneId, actionIndex, this.locale)
      ?? this.findOverride(sceneId, actionIndex, this.fallback);

    if (!override) {
      return action;
    }

    return {
      ...action,
      speaker: override.speaker ?? action.speaker,
      content: override.content ?? action.content,
    };
  }

  private findOverride(
    sceneId: string,
    actionIndex: number,
    locale: string
  ): LocaleOverride | undefined {
    if (!locale) return undefined;
    const sceneOverrides = this.overrides.get(sceneId);
    if (!sceneOverrides) return undefined;
    const localeOverrides = sceneOverrides.get(locale);
    if (!localeOverrides) return undefined;
    return localeOverrides.find((o) => o.index === actionIndex);
  }
}

/**
 * Parses a locale YAML string into LocaleData.
 * Expected format:
 * ```yaml
 * locale: ja
 * overrides:
 *   - index: 0
 *     content: "..."
 *   - index: 2
 *     speaker: "..."
 *     content: "..."
 * ```
 */
export function parseLocaleYaml(content: string): LocaleData {
  // Simple YAML-like parser for locale files
  // Avoids adding a YAML dependency — uses basic line parsing
  const lines = content.split("\n");
  let locale = "";
  const overrides: LocaleOverride[] = [];
  let current: Partial<LocaleOverride> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const localeMatch = trimmed.match(/^locale:\s*(.+)$/);
    if (localeMatch) {
      locale = localeMatch[1]!.trim().replace(/^["']|["']$/g, "");
      continue;
    }

    if (trimmed === "overrides:") continue;

    const indexMatch = trimmed.match(/^-\s*index:\s*(\d+)$/);
    if (indexMatch) {
      if (current && current.index !== undefined) {
        overrides.push(current as LocaleOverride);
      }
      current = { index: parseInt(indexMatch[1]!, 10) };
      continue;
    }

    if (current) {
      const contentMatch = trimmed.match(/^content:\s*"(.+)"$/);
      if (contentMatch) {
        current.content = contentMatch[1];
        continue;
      }
      const speakerMatch = trimmed.match(/^speaker:\s*"(.+)"$/);
      if (speakerMatch) {
        current.speaker = speakerMatch[1];
        continue;
      }
    }
  }

  if (current && current.index !== undefined) {
    overrides.push(current as LocaleOverride);
  }

  return { locale, overrides };
}
