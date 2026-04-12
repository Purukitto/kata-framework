import { useState } from "react";
import type { GameStateSnapshot } from "@kata-framework/core";

interface SaveLoadMenuProps {
  onSave: () => GameStateSnapshot;
  onLoad: (data: unknown) => void;
}

const STORAGE_KEY = "kata-tech-demo-save";
const MAX_SLOTS = 3;

interface SaveSlot {
  timestamp: number;
  label: string;
  data: GameStateSnapshot;
}

function getSlots(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSlots(slots: SaveSlot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

export function SaveLoadMenu({ onSave, onLoad }: SaveLoadMenuProps) {
  const [open, setOpen] = useState(false);
  const [slots, setLocalSlots] = useState<SaveSlot[]>(getSlots);

  const refreshSlots = () => {
    setLocalSlots(getSlots());
  };

  const handleSave = () => {
    const snapshot = onSave();
    const slot: SaveSlot = {
      timestamp: Date.now(),
      label: `Save — ${new Date().toLocaleTimeString()}`,
      data: snapshot,
    };
    const current = getSlots();
    const updated = [slot, ...current].slice(0, MAX_SLOTS);
    setSlots(updated);
    refreshSlots();
  };

  const handleLoad = (slot: SaveSlot) => {
    onLoad(slot.data);
    setOpen(false);
  };

  const handleDelete = (index: number) => {
    const current = getSlots();
    current.splice(index, 1);
    setSlots(current);
    refreshSlots();
  };

  if (!open) {
    return (
      <button
        className="saveload-toggle"
        onClick={() => { setOpen(true); refreshSlots(); }}
      >
        Save / Load
      </button>
    );
  }

  return (
    <div className="saveload-menu" role="dialog" aria-label="Save and Load">
      <div className="saveload-header">
        <span>Save / Load</span>
        <button className="saveload-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <button className="saveload-save-btn" onClick={handleSave}>
        Save Current Progress
      </button>
      {slots.length === 0 ? (
        <p className="saveload-empty">No saves yet.</p>
      ) : (
        <ul className="saveload-list">
          {slots.map((slot, i) => (
            <li key={slot.timestamp} className="saveload-slot">
              <button className="saveload-load-btn" onClick={() => handleLoad(slot)}>
                {slot.label}
              </button>
              <button className="saveload-delete-btn" onClick={() => handleDelete(i)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
