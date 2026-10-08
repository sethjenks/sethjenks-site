"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { voiceEffectById, type VoiceEffectId } from "@/lib/voice-effects";

const CALLOUT_EASE = [0.32, 0.72, 0, 1] as const;
const TITLE_S = 0.4;

type VoiceEffectProps = {
  effect: VoiceEffectId;
  secret: string;
  title: string;
};

export function VoiceEffect({ effect, secret, title }: VoiceEffectProps) {
  const reduced = useReducedMotion() === true;
  const spec = voiceEffectById(effect);
  const [playId, setPlayId] = useState(0);
  const [phase, setPhase] = useState<"secret" | "title">("secret");

  useEffect(() => {
    if (reduced || playId === 0) {
      return;
    }

    const timer = window.setTimeout(() => setPhase("title"), spec.ms);
    return () => window.clearTimeout(timer);
  }, [playId, reduced, spec.ms]);

  const replay = () => {
    setPhase("secret");
    setPlayId((value) => value + 1);
  };

  return (
    <div className="voice-effect">
      <p className="voice-effect-stage">
        {phase === "title" ? (
          <TitleLine key={playId} title={title} />
        ) : playId === 0 ? (
          secret
        ) : (
          <SecretLine key={playId} effect={effect} text={secret} />
        )}
      </p>
      {reduced ? null : (
        <button className="voice-effect-replay" type="button" onClick={replay}>
          Replay {spec.name}
        </button>
      )}
    </div>
  );
}

function TitleLine({ title }: { title: string }) {
  return (
    <motion.span
      className="voice-effect-title"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: TITLE_S, ease: CALLOUT_EASE }}
    >
      {title}
    </motion.span>
  );
}

function SecretLine({ effect, text }: { effect: VoiceEffectId; text: string }) {
  switch (effect) {
    case "shine":
      return <Shine text={text} />;
    case "glow":
      return <Glow text={text} />;
    case "pulse":
      return <Pulse text={text} />;
    case "ripple":
      return <Ripple text={text} />;
    case "ink":
      return <Tint text={text} tint="ink" duration={0.55} />;
    case "blood":
      return <Tint text={text} tint="blood" duration={0.55} />;
    case "marker":
      return <Marker text={text} />;
    case "ember":
      return <Tint text={text} tint="ember" duration={0.6} />;
    case "vaporize":
      return <Vaporize text={text} />;
    case "smoke":
      return <Smoke text={text} />;
    default: {
      const unknown: never = effect;
      throw new Error(`Unknown voice effect: ${unknown}`);
    }
  }
}

function Shine({ text }: { text: string }) {
  return (
    <span className="voice-effect-clip">
      <span>{text}</span>
      <motion.span
        className="voice-effect-band"
        aria-hidden
        initial={{ x: "-160%" }}
        animate={{ x: "420%" }}
        transition={{ duration: 0.65, ease: CALLOUT_EASE }}
      />
    </span>
  );
}

function Glow({ text }: { text: string }) {
  return (
    <span className="voice-effect-copy">
      <motion.span
        className="voice-effect-halo"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0.4] }}
        transition={{ duration: 0.7, ease: CALLOUT_EASE }}
      >
        {text}
      </motion.span>
      <span>{text}</span>
    </span>
  );
}

function Pulse({ text }: { text: string }) {
  return (
    <motion.span
      className="voice-effect-pulse"
      initial={{ scale: 0.98 }}
      animate={{ scale: [0.98, 1.02, 1] }}
      transition={{ duration: 0.5, ease: CALLOUT_EASE }}
    >
      {text}
    </motion.span>
  );
}

function Ripple({ text }: { text: string }) {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  let wordIndex = 0;

  return (
    <>
      {words.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return part;
        }

        const delay = wordIndex * 0.04;
        wordIndex += 1;
        return (
          <motion.span
            key={`${part}-${index}`}
            className="voice-effect-letter"
            initial={{ y: 0 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.4, delay, ease: CALLOUT_EASE }}
          >
            {part}
          </motion.span>
        );
      })}
    </>
  );
}

function Tint({
  text,
  tint,
  duration,
}: {
  text: string;
  tint: "ink" | "blood" | "ember";
  duration: number;
}) {
  return (
    <span className="voice-effect-copy">
      <span>{text}</span>
      <motion.span
        className="voice-effect-tint"
        data-tint={tint}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration, ease: CALLOUT_EASE }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function Marker({ text }: { text: string }) {
  const words = text.split(/(\s+)/).filter((part) => part.length > 0);
  let wordIndex = 0;

  return (
    <>
      {words.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return part;
        }

        const delay = wordIndex * 0.045;
        wordIndex += 1;
        return (
          <span key={`${part}-${index}`} className="voice-effect-word">
            <motion.span
              className="voice-effect-mark"
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.28, delay, ease: CALLOUT_EASE }}
            />
            <span className="voice-effect-gray">{part}</span>
            <motion.span
              className="voice-effect-ink"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.28, delay, ease: CALLOUT_EASE }}
            >
              {part}
            </motion.span>
          </span>
        );
      })}
    </>
  );
}

function Vaporize({ text }: { text: string }) {
  const glyphs = Array.from(text).filter((char) => char.trim().length > 0);
  const step = glyphs.length > 1 ? 0.22 / (glyphs.length - 1) : 0;
  let glyphIndex = 0;

  return (
    <>
      {Array.from(text).map((char, index) => {
        if (char.trim().length === 0) {
          return char;
        }

        const delay = 1 + glyphIndex * step;
        glyphIndex += 1;
        return (
          <motion.span
            key={`${char}-${index}`}
            className="voice-effect-letter"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.28, delay, ease: CALLOUT_EASE }}
          >
            {char}
          </motion.span>
        );
      })}
    </>
  );
}

function Smoke({ text }: { text: string }) {
  return (
    <motion.span
      className="voice-effect-smoke"
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -12, opacity: 0 }}
      transition={{ duration: 0.5, delay: 1, ease: CALLOUT_EASE }}
    >
      <span className="voice-effect-copy">
        <motion.span
          className="voice-effect-haze"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.5, delay: 1, ease: CALLOUT_EASE }}
        >
          {text}
        </motion.span>
        <span>{text}</span>
      </span>
    </motion.span>
  );
}
