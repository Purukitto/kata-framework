import { useState } from "react";

const LOCALES = [
  { code: "", label: "EN", full: "English" },
  { code: "es", label: "ES", full: "Español" },
  { code: "ja", label: "JA", full: "日本語" },
] as const;

interface LocaleSwitcherProps {
  currentLocale: string;
  onSwitch: (locale: string) => void;
}

export function LocaleSwitcher({ currentLocale, onSwitch }: LocaleSwitcherProps) {
  return (
    <div className="locale-switcher" role="radiogroup" aria-label="Language">
      {LOCALES.map((loc) => (
        <button
          key={loc.code}
          className={`locale-switcher__btn ${currentLocale === loc.code ? "locale-switcher__btn--active" : ""}`}
          onClick={() => onSwitch(loc.code)}
          role="radio"
          aria-checked={currentLocale === loc.code}
          aria-label={loc.full}
          title={loc.full}
        >
          {loc.label}
        </button>
      ))}
    </div>
  );
}
