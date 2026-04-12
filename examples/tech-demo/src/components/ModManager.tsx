import { useState } from "react";

export interface ModInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

interface ModManagerProps {
  mods: ModInfo[];
  onToggle: (modId: string, enabled: boolean) => void;
  onClose: () => void;
}

export function ModManager({ mods, onToggle, onClose }: ModManagerProps) {
  return (
    <div className="mod-manager" role="dialog" aria-label="Mod Manager">
      <div className="mod-manager__header">
        <h3 className="mod-manager__title">Mods</h3>
        <button className="mod-manager__close" onClick={onClose} aria-label="Close mod manager">
          ×
        </button>
      </div>
      <div className="mod-manager__list">
        {mods.length === 0 && (
          <p className="mod-manager__empty">No mods available</p>
        )}
        {mods.map((mod) => (
          <div key={mod.id} className="mod-manager__item">
            <div className="mod-manager__info">
              <div className="mod-manager__name">{mod.name}</div>
              <div className="mod-manager__desc">{mod.description}</div>
              <div className="mod-manager__version">v{mod.version}</div>
            </div>
            <label className="mod-manager__toggle">
              <input
                type="checkbox"
                checked={mod.enabled}
                onChange={(e) => onToggle(mod.id, e.target.checked)}
                aria-label={`${mod.enabled ? "Disable" : "Enable"} ${mod.name}`}
              />
              <span className="mod-manager__slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
