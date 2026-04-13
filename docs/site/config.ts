/**
 * Collection metadata for the Kata documentation site.
 *
 * Consumed by the sync script and purukitto-web's content collection config.
 * Each section has a stable slug, a human label, and an ordered list of pages
 * for the sidebar. Pages not listed here still render, but won't appear in
 * navigation — add them here to expose them.
 */

export interface DocsSection {
  slug: string;
  label: string;
  description: string;
  pages: Array<{ slug: string; title: string; order: number }>;
}

export const DOCS_SECTIONS: DocsSection[] = [
  {
    slug: "start",
    label: "Getting Started",
    description: "Run your first scene in 60 seconds, then build up.",
    pages: [
      { slug: "install", title: "Install", order: 1 },
      { slug: "first-scene", title: "Your first scene", order: 2 },
      { slug: "variables", title: "Variables & logic", order: 3 },
      { slug: "audio-visuals", title: "Audio & visuals", order: 4 },
      { slug: "save-load", title: "Save & load", order: 5 },
      { slug: "publish", title: "Publish your game", order: 6 },
    ],
  },
  {
    slug: "guides",
    label: "Guides",
    description: "Goal-oriented walkthroughs. Find by what you want to ship.",
    pages: [
      { slug: "plugins", title: "Plugins", order: 1 },
      { slug: "plugins-catalog", title: "Plugin catalog", order: 2 },
      { slug: "multiplayer", title: "Multiplayer", order: 3 },
      { slug: "testing", title: "Testing stories", order: 4 },
      { slug: "devtools", title: "Devtools", order: 5 },
      { slug: "modding", title: "Modding", order: 6 },
      { slug: "localization", title: "Localization", order: 7 },
      { slug: "accessibility", title: "Accessibility", order: 8 },
      { slug: "tweens", title: "Tweens & animation", order: 9 },
    ],
  },
  {
    slug: "reference",
    label: "Reference",
    description: "Complete, hand-written reference material.",
    pages: [
      { slug: "kata-file-syntax", title: ".kata file syntax", order: 1 },
      { slug: "kson-protocol", title: "KSON protocol", order: 2 },
      { slug: "cli", title: "CLI", order: 3 },
      { slug: "vscode", title: "VS Code extension", order: 4 },
    ],
  },
];

export const SITE = {
  title: "Kata Framework Docs",
  tagline: "Headless narrative engine for the web",
  landingPath: "/kata/docs",
};
