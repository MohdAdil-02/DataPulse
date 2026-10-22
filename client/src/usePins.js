import { useState, useEffect } from "react";

const key = (id) => `dp-pins-${id}`;
const read = (id) => {
  if (!id) return [];
  try { return JSON.parse(localStorage.getItem(key(id))) || []; } catch { return []; }
};

export function usePins(datasetId) {
  const [pins, setPins] = useState(() => read(datasetId));
  useEffect(() => { setPins(read(datasetId)); }, [datasetId]);

  const save = (next) => {
    setPins(next);
    try { localStorage.setItem(key(datasetId), JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  return {
    pins,
    isPinned: (title) => pins.some((p) => p.title === title),
    addPin: (p) => { if (!pins.some((x) => x.title === p.title)) save([...pins, { ...p, id: Date.now(), pinnedAt: new Date().toISOString() }]); },
    removePin: (id) => save(pins.filter((p) => p.id !== id)),
    clearPins: () => save([]),
  };
}