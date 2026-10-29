"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Pokeball } from "./pokeball";

type CardImageProps = {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function CardImage(props: CardImageProps) {
  return (
    <CardImageInner
      key={`${props.src ?? ""}|${props.fallbackSrc ?? ""}`}
      {...props}
    />
  );
}

function CardImageInner({
  src,
  fallbackSrc,
  alt,
  className,
  priority,
}: CardImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(() => src?.startsWith("data:") ?? false);

  const bases = [src, fallbackSrc].filter(
    (value): value is string => Boolean(value),
  );
  const sources: string[] = [];
  for (const base of bases) {
    if (!sources.includes(base)) sources.push(base);
  }
  for (const base of bases) {
    if (base.includes("/fr/")) {
      const english = base.replace("/fr/", "/en/");
      if (!sources.includes(english)) sources.push(english);
    }
  }

  const current = sources[attempt];

  if (!current) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center text-line-strong ${
          className ?? ""
        }`}
      >
        <Pokeball className="h-10 w-10 opacity-70" />
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-line-strong">
        <Pokeball className="h-10 w-10 opacity-70" />
      </div>
      <img
        key={current}
        src={current}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setAttempt((value) => value + 1)}
        className={`relative h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className ?? ""}`}
      />
    </>
  );
}
