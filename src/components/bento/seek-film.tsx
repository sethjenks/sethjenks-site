"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function seekVideo(video: HTMLVideoElement | null, ratio: number) {
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const next = Math.min(0.98, Math.max(0, ratio)) * video.duration;
  if (Math.abs(video.currentTime - next) < 0.04) {
    return;
  }

  video.currentTime = next;
}

export function SeekFilm({
  src,
  poster,
  ratio,
  showFilm,
}: {
  src: string;
  poster: string;
  ratio: number;
  showFilm: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    const seek = () => seekVideo(video, ratio);
    if (video.readyState >= 1) {
      seek();
      return;
    }

    video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [ratio, showFilm]);

  return (
    <span className="bento-film-wrap">
      <Image className="bento-fill" src={poster} alt="" fill sizes="(min-width: 800px) 40rem, 100vw" draggable={false} />
      <video
        ref={videoRef}
        className="bento-fill bento-film"
        data-shown={showFilm ? "" : undefined}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  );
}
