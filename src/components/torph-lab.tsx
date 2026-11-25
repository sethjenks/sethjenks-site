"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { TextMorph } from "torph/react";

const PHRASES = [
  "Hello world",
  "Morphing text",
  "Place by place",
  "Ask more questions",
  "Ship the sketch",
] as const;

type EaseMode = "bezier" | "spring";

const EASE = {
  bezier: "cubic-bezier(0.19, 1, 0.22, 1)",
  spring: { stiffness: 220, damping: 22, mass: 1 },
} as const;

export function TorphLab() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [total, setTotal] = useState(1204);
  const [draft, setDraft] = useState("Type here");
  const [caret, setCaret] = useState<number | undefined>(undefined);
  const [easeMode, setEaseMode] = useState<EaseMode>("bezier");
  const [numbers, setNumbers] = useState(true);
  const [scale, setScale] = useState(true);
  const [playing, setPlaying] = useState(true);

  const ease = EASE[easeMode];
  const phrase = PHRASES[phraseIndex] ?? PHRASES[0];

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % PHRASES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTotal((value) => value + (Math.random() > 0.45 ? 17 : -9));
    }, 1600);
    return () => window.clearInterval(id);
  }, [playing]);

  function onDraftChange(event: ChangeEvent<HTMLInputElement>) {
    setCaret(event.target.selectionStart ?? undefined);
    setDraft(event.target.value);
  }

  return (
    <main className="lab-page torph-lab">
      <h1>Torph</h1>
      <p className="lab-lede">
        Animated text morphing from{" "}
        <a href="https://torph.lochie.me" target="_blank" rel="noreferrer">
          torph
        </a>
        . Tap a control, watch letters and digits rearrange instead of blink.
      </p>
      <p className="lab-links">
        <Link href="/lab">Lab</Link>
      </p>

      <div className="torph-controls" role="group" aria-label="Morph settings">
        <label className="torph-toggle">
          <input
            type="checkbox"
            checked={playing}
            onChange={(event) => setPlaying(event.target.checked)}
          />
          Auto-play
        </label>
        <label className="torph-toggle">
          <input
            type="checkbox"
            checked={numbers}
            onChange={(event) => setNumbers(event.target.checked)}
          />
          Number places
        </label>
        <label className="torph-toggle">
          <input
            type="checkbox"
            checked={scale}
            onChange={(event) => setScale(event.target.checked)}
          />
          Exit scale
        </label>
        <div className="torph-ease" role="group" aria-label="Easing">
          <button
            type="button"
            className={easeMode === "bezier" ? "is-active" : undefined}
            onClick={() => setEaseMode("bezier")}
          >
            Bezier
          </button>
          <button
            type="button"
            className={easeMode === "spring" ? "is-active" : undefined}
            onClick={() => setEaseMode("spring")}
          >
            Spring
          </button>
        </div>
      </div>

      <section className="lab-bench">
        <h2>Phrase</h2>
        <div className="lab-preview torph-stage">
          <TextMorph
            as="span"
            className="torph-display"
            duration={420}
            ease={ease}
            numbers={numbers}
            scale={scale}
          >
            {phrase}
          </TextMorph>
        </div>
        <div className="torph-chips">
          {PHRASES.map((value, index) => (
            <button
              key={value}
              type="button"
              className={index === phraseIndex ? "is-active" : undefined}
              onClick={() => {
                setPlaying(false);
                setPhraseIndex(index);
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <section className="lab-bench">
        <h2>Numbers</h2>
        <div className="lab-preview torph-stage">
          <TextMorph
            as="span"
            className="torph-display torph-display-number"
            duration={420}
            ease={ease}
            numbers={numbers}
            scale={scale}
          >
            {`$${total.toLocaleString("en")}`}
          </TextMorph>
        </div>
        <div className="torph-chips">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setTotal((value) => value - 47);
            }}
          >
            −47
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setTotal((value) => value + 113);
            }}
          >
            +113
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setTotal(1204);
            }}
          >
            Reset
          </button>
        </div>
        <p className="lab-lede torph-note">
          With number places on, hundreds and tens roll while the thousands stay
          put.
        </p>
      </section>

      <section className="lab-bench">
        <h2>Caret</h2>
        <div className="lab-preview torph-stage torph-stage-input">
          <TextMorph
            as="span"
            className="torph-display"
            duration={280}
            ease={ease}
            numbers={numbers}
            scale={scale}
            cursorIndex={caret}
          >
            {draft || " "}
          </TextMorph>
        </div>
        <label className="torph-field">
          <span className="torph-field-label">Input</span>
          <input
            value={draft}
            onChange={onDraftChange}
            onSelect={(event) => {
              const target = event.currentTarget;
              setCaret(target.selectionStart ?? undefined);
            }}
            onKeyUp={(event) => {
              const target = event.currentTarget;
              setCaret(target.selectionStart ?? undefined);
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <p className="lab-lede torph-note">
          cursorIndex switches matching from place value to caret, so typing
          inserts instead of renumbering columns.
        </p>
      </section>
    </main>
  );
}
