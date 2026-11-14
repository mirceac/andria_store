import { useState } from "react";
import { Play } from "lucide-react";

export function VideoThumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const previewSrc = src.includes("#") ? src : `${src}#t=0.1`;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#273d39] text-white">
      {!failed ? (
        <video
          src={previewSrc}
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="px-1 text-center text-[10px]">Video preview unavailable</span>
      )}
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/60">
        <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
      </span>
    </div>
  );
}
