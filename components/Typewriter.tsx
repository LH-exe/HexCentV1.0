"use client";

import { useEffect, useState } from "react";

export default function Typewriter({ text, speed = 22 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      <span className={`inline-block w-2 h-4 ml-0.5 -mb-1 bg-accent-cyan ${done ? "animate-blink" : ""}`} aria-hidden />
    </span>
  );
}
