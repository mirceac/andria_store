import { useEffect, useState } from "react";

const THUMB_RETRIES = 2;
const RETRY_DELAY_MS = 700;

type ThumbnailState = {
  key: string;
  attempt: number;
  status: "loading" | "loaded" | "waiting" | "failed";
};

export function useGalleryThumbnail(thumbUrl: string, fullUrl: string) {
  const key = JSON.stringify([thumbUrl, fullUrl]);
  const [stored, setStored] = useState<ThumbnailState>({ key, attempt: 0, status: "loading" });
  const state: ThumbnailState = stored.key === key ? stored : { key, attempt: 0, status: "loading" };
  const maxAttempt = THUMB_RETRIES + (fullUrl !== thumbUrl ? 1 : 0);

  useEffect(() => {
    if (stored.key !== key || stored.status !== "waiting") return;
    const timer = window.setTimeout(() => {
      setStored((current) =>
        current.key === key && current.status === "waiting"
          ? { ...current, attempt: current.attempt + 1, status: "loading" }
          : current
      );
    }, stored.attempt < THUMB_RETRIES ? RETRY_DELAY_MS * (stored.attempt + 1) : 0);
    return () => window.clearTimeout(timer);
  }, [key, stored]);

  let src = thumbUrl;
  if (state.attempt > THUMB_RETRIES) {
    src = fullUrl;
  } else if (state.attempt > 0) {
    const hashIndex = thumbUrl.indexOf("#");
    const base = hashIndex === -1 ? thumbUrl : thumbUrl.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : thumbUrl.slice(hashIndex);
    src = `${base}${base.includes("?") ? "&" : "?"}retry=${state.attempt}${hash}`;
  }

  return {
    src,
    loaded: state.status === "loaded",
    failed: state.status === "failed",
    onLoad: () => setStored({ key, attempt: state.attempt, status: "loaded" }),
    onError: () => {
      const failed = state.attempt >= maxAttempt;
      if (failed) console.warn("Gallery thumbnail and fallback failed to load");
      setStored({ key, attempt: state.attempt, status: failed ? "failed" : "waiting" });
    },
    retry: () => {
      if (state.status === "failed") setStored({ key, attempt: 0, status: "loading" });
    },
  };
}
