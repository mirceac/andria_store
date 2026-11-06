import { useCallback, useState } from "react";

export type GalleryLayout = "rows" | "grid" | "masonry";
export type GallerySize = "sm" | "md" | "lg";

// Target tile width in px for each size
export const GALLERY_SIZE_PX: Record<GallerySize, number> = { sm: 130, md: 190, lg: 270 };

const STORAGE_KEY = "gallery-prefs";

type Prefs = { layout: GalleryLayout; size: GallerySize };

const DEFAULTS: Prefs = { layout: "rows", size: "md" };

function read(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      layout: ["rows", "grid", "masonry"].includes(raw.layout) ? raw.layout : DEFAULTS.layout,
      size: ["sm", "md", "lg"].includes(raw.size) ? raw.size : DEFAULTS.size,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useGalleryPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(read);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable; keep the in-memory choice
      }
      return next;
    });
  }, []);

  return { ...prefs, setLayout: (layout: GalleryLayout) => update({ layout }), setSize: (size: GallerySize) => update({ size }) };
}
