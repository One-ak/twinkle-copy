"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import gsap from "gsap";
import Lenis from "lenis";
import {
  CalendarDays,
  Heart,
  Image as ImageIcon,
  LockKeyhole,
  Mic,
  Moon,
  Pause,
  Pin,
  Play,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmbientParticles } from "@/components/AmbientParticles";
import { CosmicCanvas } from "@/components/CosmicCanvas";
import { GrowingPlant } from "@/components/GrowingPlant";
import {
  poemLines,
  universe,
  type ChatMessage,
  type DiaryEntry,
  type Memory,
  type Reminder
} from "@/data/universe";
import { useLoveBackend } from "@/lib/useLoveBackend";

const trackSource = "/api/audio/din-chadheya";

function useMusicReactive() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const synthRef = useRef<{ gain: GainNode; oscillators: OscillatorNode[] } | null>(null);
  const syntheticModeRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [ducking, setDucking] = useState(false);
  const [intensity, setIntensity] = useState(0);

  const ensureContext = useCallback(() => {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!contextRef.current) {
      contextRef.current = new AudioCtx();
      analyserRef.current = contextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyserRef.current.frequencyBinCount));
      analyserRef.current.connect(contextRef.current.destination);
    }

    return contextRef.current;
  }, []);

  const startSyntheticPad = useCallback(
    (context: AudioContext) => {
      if (synthRef.current) {
        synthRef.current.gain.gain.setTargetAtTime(volume * (ducking ? 0.3 : 0.46), context.currentTime, 0.12);
        syntheticModeRef.current = true;
        return;
      }

      const gain = context.createGain();
      const low = context.createOscillator();
      const high = context.createOscillator();
      low.type = "sine";
      high.type = "triangle";
      low.frequency.value = 98;
      high.frequency.value = 196;
      gain.gain.value = 0.0001;
      low.connect(gain);
      high.connect(gain);
      gain.connect(analyserRef.current!);
      low.start();
      high.start();
      gain.gain.setTargetAtTime(volume * (ducking ? 0.3 : 0.46), context.currentTime, 0.18);
      synthRef.current = { gain, oscillators: [low, high] };
      syntheticModeRef.current = true;
    },
    [ducking, volume]
  );

  const play = useCallback(async () => {
    const context = ensureContext();
    if (!context || !analyserRef.current) return;

    await context.resume();
    const hasTrack = await fetch(trackSource, { method: "HEAD" })
      .then((response) => response.ok)
      .catch(() => false);

    if (hasTrack && audioRef.current) {
      syntheticModeRef.current = false;
      if (!sourceRef.current) {
        sourceRef.current = context.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
      }
      audioRef.current.src = trackSource;
      audioRef.current.loop = true;
      audioRef.current.volume = volume * (ducking ? 0.55 : 1);
      await audioRef.current.play();
    } else {
      startSyntheticPad(context);
    }

    setPlaying(true);
  }, [ducking, ensureContext, startSyntheticPad, volume]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    if (contextRef.current && synthRef.current) {
      synthRef.current.gain.gain.setTargetAtTime(0.0001, contextRef.current.currentTime, 0.12);
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume * (ducking ? 0.55 : 1);
    }
    if (contextRef.current && synthRef.current && playing) {
      synthRef.current.gain.gain.setTargetAtTime(
        volume * (ducking ? 0.3 : 0.46),
        contextRef.current.currentTime,
        0.1
      );
    }
  }, [ducking, playing, volume]);

  useEffect(() => {
    let lastCommit = 0;
    let lastIntensity = 0;

    const tick = () => {
      const now = performance.now();
      let nextIntensity = lastIntensity;

      if (analyserRef.current && dataRef.current && playing) {
        analyserRef.current.getByteFrequencyData(dataRef.current);
        const average = dataRef.current.reduce((sum, value) => sum + value, 0) / dataRef.current.length / 255;
        const syntheticPulse = syntheticModeRef.current ? 0.16 + Math.sin(performance.now() / 900) * 0.07 : 0;
        nextIntensity = Math.min(1, Math.max(average * 1.65, syntheticPulse));
      } else {
        nextIntensity = lastIntensity * 0.88;
      }

      if (now - lastCommit > 72 && Math.abs(nextIntensity - lastIntensity) > 0.012) {
        lastIntensity = nextIntensity;
        lastCommit = now;
        setIntensity(nextIntensity);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [playing]);

  return {
    audioRef,
    playing,
    play,
    pause,
    volume,
    setVolume,
    ducking,
    setDucking,
    intensity
  };
}

function IntroOverlay({
  introState,
  onStartBurst
}: {
  introState: "orbiting" | "atStar" | "bursting" | "entered";
  onStartBurst: () => void;
}) {
  const [showTwinkle, setShowTwinkle] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);

  useEffect(() => {
    if (introState === "atStar") {
      const t1 = window.setTimeout(() => setShowTwinkle(true), 720);
      const t2 = window.setTimeout(() => setShowInvitation(true), 2450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (introState === "bursting" || introState === "entered") {
      setShowTwinkle(false);
      setShowInvitation(false);
    }
  }, [introState]);

  return (
    <AnimatePresence>
      {introState !== "entered" ? (
        <motion.div
          className="intro-curtain"
          exit={{ opacity: 0, scale: 1.08, filter: "blur(14px)" }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: introState === "atStar" ? "auto" : "none" }}
        >
          <AnimatePresence>
            {showInvitation ? (
              <motion.button
                className="intro-star-hit-area"
                type="button"
                onClick={onStartBurst}
                aria-label="Enter through the star"
                initial={{ opacity: 0, scale: 0.76 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.18 }}
                transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <span />
              </motion.button>
            ) : null}
          </AnimatePresence>
          <div className="intro-inner">
            <AnimatePresence>
              {showTwinkle ? (
                <motion.div
                  className="name-constellation"
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 2.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  Twinkle
                </motion.div>
              ) : (
                <div className="intro-title-space" />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showInvitation ? (
                <motion.button
                  className="enter-button"
                  type="button"
                  onClick={onStartBurst}
                  aria-label="Click the star to enter my heart"
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="enter-button-star" aria-hidden />
                  <span>Click here to enter my heart</span>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MusicOrb({
  audioRef,
  playing,
  play,
  pause,
  volume,
  setVolume,
  intensity
}: ReturnType<typeof useMusicReactive>) {
  return (
    <div className="music-orb">
      <button
        className="wave-ring"
        type="button"
        style={{ animationPlayState: playing ? "running" : "paused" }}
        onClick={playing ? pause : play}
        aria-label={playing ? "Pause music" : "Play music"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0">
        <p className="m-0 truncate text-sm font-medium text-white">{universe.trackTitle}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#cdb9ff,#f2a8d1,#fff)]"
            style={{ width: `${24 + intensity * 76}%` }}
          />
        </div>
      </div>
      <label className="grid grid-cols-[auto_64px] items-center gap-2 text-white/70">
        {volume <= 0.02 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        <input
          aria-label="Music volume"
          className="accent-[#cdb9ff]"
          max="1"
          min="0"
          step="0.01"
          type="range"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
      <audio ref={audioRef} preload="none" />
    </div>
  );
}

function HeroSection({ memories }: { memories: Memory[] }) {
  return (
    <section className="section min-h-[112vh]">
      <div className="section-inner">
        <motion.div
          className="text-center mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.5 }}
        >
          <p className="eyebrow">Entering Our Universe</p>
          <h1 className="display-title text-[clamp(1rem,2vw,2rem)]">
            A private sky made from everything I remember about you.
          </h1>
          <p className="section-copy">
            Not a page. A slow little cosmos of firsts, promises, hidden letters, quiet photos, and all
            the feelings that never fit inside a normal message.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {memories.slice(0, 3).map((memory, index) => (
            <motion.figure
              className="glass-panel overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/20"
              key={memory.id}
              initial={{ opacity: 0, y: 42, rotate: index === 1 ? 1.6 : -1.4 }}
              animate={{ opacity: 1, y: index === 1 ? 28 : 0, rotate: index === 1 ? 1.6 : -1.4 }}
              whileHover={{ scale: 1.05, rotate: 0 }}
              transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.85 + index * 0.14 }}
            >
              <img
                alt={memory.title}
                className="h-[420px] w-full object-cover opacity-85"
                loading={index === 0 ? "eager" : "lazy"}
                src={memory.photos?.[0] ?? "/memories/cassette-smile.jpg"}
              />
              <figcaption className="sr-only">{memory.title}</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FirstMeetingSection({
  onSacredVisible
}: {
  onSacredVisible: (visible: boolean) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { amount: 0.36 });
  const hasPlayedRef = useRef(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showButterfly, setShowButterfly] = useState(false);

  const photos = [
    "/memories/first-meeting-sacred.jpg",
    "/memories/first-meeting-soft.jpg",
    "/memories/car-glasses.jpg",
    "/memories/car-laughing.jpg"
  ];
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setCurrentPhoto((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isInView, photos.length]);

  useEffect(() => {
    onSacredVisible(isInView);
  }, [isInView, onSacredVisible]);

  useEffect(() => {
    if (!isInView || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    const timers = poemLines.map((line, index) =>
      window.setTimeout(() => {
        setVisibleLines(index + 1);
        if (line.effect === "butterfly") setShowButterfly(true);
      }, 700 + index * 1180)
    );

    return () => timers.forEach(window.clearTimeout);
  }, [isInView]);

  return (
    <section className="section" ref={ref}>
      {showButterfly ? (
        <div className="butterfly" aria-hidden>
          <span />
        </div>
      ) : null}
      <div className="section-inner first-meeting-grid">
        <motion.div
          className="sacred-photo relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.92, filter: "blur(18px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentPhoto}
              alt="First meeting memory"
              src={photos[currentPhoto]}
              onError={(e) => {
                e.currentTarget.src = "/memories/first-meeting-sacred.jpg";
              }}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </AnimatePresence>
        </motion.div>

        <div className="text-center mx-auto max-w-3xl">
          <p className="eyebrow">First Meeting</p>
          <h2 className="display-title text-[clamp(1rem,2vw,2rem)]">
            The day reality stopped feeling real.
          </h2>
          <div className="poem-stage mt-8">
            <AnimatePresence initial={false}>
              {poemLines.slice(0, visibleLines).map((line, index) => (
                <motion.p
                  className={`poem-line ${line.effect ?? ""}`}
                  key={`${line.text}-${index}`}
                  initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConstellationTimeline({
  memories,
  onOpenMemory
}: {
  memories: Memory[];
  onOpenMemory: (memory: Memory) => void;
}) {
  const sortedMemories = useMemo(
    () => [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [memories]
  );

  return (
    <section className="section">
      <div className="section-inner">
        <div className="mb-10 max-w-3xl text-center mx-auto">
          <p className="eyebrow">Relationship Constellation</p>
          <h2 className="display-title text-[clamp(1rem,2vw,2rem)]">Every memory became a star.</h2>
          <p className="section-copy">
            Some are already glowing. Some are waiting for the day they are meant to open.
          </p>
        </div>

        <div className="constellation-map">
          <svg className="constellation-lines" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden>
            {sortedMemories.slice(0, -1).map((memory, index) => {
              const next = sortedMemories[index + 1];
              return (
                <motion.line
                  key={`${memory.id}-${next.id}`}
                  x1={memory.constellation.x}
                  y1={memory.constellation.y}
                  x2={next.constellation.x}
                  y2={next.constellation.y}
                  stroke="rgba(205,185,255,0.38)"
                  strokeWidth="0.18"
                  strokeDasharray="1.4 1.8"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 1.2, delay: index * 0.18 }}
                />
              );
            })}
          </svg>

          {sortedMemories.map((memory, index) => {
            const locked = memory.unlockAt ? new Date(memory.unlockAt).getTime() > Date.now() : false;
            return (
              <motion.button
                aria-label={`Open memory ${memory.title}`}
                className={`constellation-star ${locked ? "locked" : ""}`}
                key={memory.id}
                style={{ left: `${memory.constellation.x}%`, top: `${memory.constellation.y}%` }}
                type="button"
                onClick={() => onOpenMemory(memory)}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: "backOut" }}
              >
                <span className="sr-only">{memory.title}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MemoryModal({
  memory,
  onClose
}: {
  memory: Memory | null;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [memory?.id]);

  if (!memory) return null;
  const locked = memory.unlockAt ? new Date(memory.unlockAt).getTime() > Date.now() : false;

  return (
    <AnimatePresence>
      <motion.div
        className="memory-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.article
          className="memory-dialog glass-panel"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          onClick={(event) => event.stopPropagation()}
        >
          <img alt={memory.title} src={memory.photos?.[0] ?? "/memories/cassette-smile.jpg"} />
          <div className="memory-dialog-copy">
            <button className="icon-button justify-self-end" type="button" onClick={onClose} aria-label="Close memory">
              <X size={18} />
            </button>
            <p className="eyebrow">{new Date(memory.date).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
            <h3 className="m-0 font-serif text-4xl leading-tight text-white">{memory.title}</h3>
            <p className="m-0 text-lg leading-8 text-white/72">{memory.text}</p>
            {locked ? (
              <div className="glass-panel p-4 text-white/72">
                <LockKeyhole className="mb-3" size={20} />
                This star is keeping its secret until{" "}
                {new Date(memory.unlockAt!).toLocaleDateString("en-IN", { dateStyle: "long" })}.
              </div>
            ) : (
              <>
                <button className="soft-button justify-self-start" type="button" onClick={() => setRevealed(true)}>
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={16} />
                    Open the hidden note
                  </span>
                </button>
                <AnimatePresence>
                  {revealed ? (
                    <motion.p
                      className="m-0 rounded-[8px] border border-white/10 bg-white/[0.06] p-4 font-serif text-2xl leading-9 text-white/86"
                      initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0 }}
                    >
                      {memory.hiddenNote}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.article>
      </motion.div>
    </AnimatePresence>
  );
}

function getDurationParts(from: string, now: number) {
  const diff = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const year = 365.25 * 24 * 60 * 60;
  const month = 30.44 * 24 * 60 * 60;
  const day = 24 * 60 * 60;
  const years = Math.floor(diff / year);
  const months = Math.floor((diff - years * year) / month);
  const days = Math.floor((diff - years * year - months * month) / day);
  const hours = Math.floor((diff % day) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return { years, months, days, hours, minutes, seconds };
}

function RelationshipCounters() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const counters = [
    { label: "Since first Instagram message", date: universe.firstConversationAt },
    { label: "Since first meeting", date: universe.firstMeetingAt },
    { label: "Relationship duration", date: universe.relationshipStartedAt }
  ];

  return (
    <section className="section">
      <div className="section-inner">
        <div className="mb-10 max-w-3xl text-center mx-auto">
          <p className="eyebrow">Time, Still Learning Her Name</p>
          <h2 className="display-title text-[clamp(1rem,2vw,2rem)]">Every second keeps choosing you.</h2>
        </div>

        <div className="counter-grid">
          {counters.map((counter) => {
            const parts = now
              ? getDurationParts(counter.date, now)
              : { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
            return (
              <article className="counter-panel glass-panel" key={counter.label}>
                <p className="m-0 text-sm uppercase tracking-[0.22em] text-white/48">{counter.label}</p>
                <p className="counter-number mt-8">{parts.years}y {parts.months}m</p>
                <div className="counter-units">
                  {[
                    ["days", parts.days],
                    ["hours", parts.hours],
                    ["min", parts.minutes],
                    ["sec", parts.seconds]
                  ].map(([unit, value]) => (
                    <div className="counter-unit" key={unit}>
                      <div className="text-xl text-white">{String(value).padStart(2, "0")}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/42">{unit}</div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DiarySystem({
  diary,
  reminders,
  addDiaryEntry,
  addMemory,
  addReminder
}: {
  diary: DiaryEntry[];
  reminders: Reminder[];
  addDiaryEntry: ReturnType<typeof useLoveBackend>["addDiaryEntry"];
  addMemory: ReturnType<typeof useLoveBackend>["addMemory"];
  addReminder: ReturnType<typeof useLoveBackend>["addReminder"];
}) {
  const [tab, setTab] = useState<"diary" | "memory" | "reminder">("diary");
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryNote, setDiaryNote] = useState("");
  const [diaryMood, setDiaryMood] = useState<DiaryEntry["mood"]>("soft");
  const [diaryFile, setDiaryFile] = useState<File | null>(null);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [memoryText, setMemoryText] = useState("");
  const [memoryHidden, setMemoryHidden] = useState("");
  const [memoryFiles, setMemoryFiles] = useState<File[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reminderNote, setReminderNote] = useState("");
  const [reminderKind, setReminderKind] = useState<Reminder["kind"]>("care");

  async function submitDiary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!diaryTitle.trim() || !diaryNote.trim()) return;
    await addDiaryEntry({ title: diaryTitle, note: diaryNote, mood: diaryMood }, diaryFile);
    setDiaryTitle("");
    setDiaryNote("");
    setDiaryFile(null);
  }

  async function submitMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memoryTitle.trim() || !memoryText.trim()) return;
    await addMemory(
      {
        title: memoryTitle,
        text: memoryText,
        date: memoryDate,
        photos: ["/memories/held-hands.jpg"],
        hiddenNote: memoryHidden || "I kept this little note here because some feelings deserve a quiet room."
      },
      memoryFiles
    );
    setMemoryTitle("");
    setMemoryText("");
    setMemoryHidden("");
    setMemoryFiles([]);
  }

  async function submitReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderNote.trim()) return;
    await addReminder({ title: reminderTitle, note: reminderNote, date: reminderDate, kind: reminderKind });
    setReminderTitle("");
    setReminderNote("");
  }

  return (
    <section className="section">
      <div className="section-inner diary-grid">
        <div>
          <p className="eyebrow">Living Love Diary</p>
          <h2 className="display-title text-[clamp(2.1rem,6vw,5.2rem)]">A place where new memories learn to glow.</h2>
          <p className="section-copy">
            The universe can keep changing: diary pages, future goals, anniversaries, private notes,
            and new stars for days that have not happened yet.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              ["diary", "Diary"],
              ["memory", "Memory"],
              ["reminder", "Reminder"]
            ].map(([value, label]) => (
              <button
                className={`soft-button ${tab === value ? "border-white/40 bg-white/15" : ""}`}
                key={value}
                type="button"
                onClick={() => setTab(value as typeof tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="glass-panel p-4 sm:p-6">
            {tab === "diary" ? (
              <form className="grid gap-3" onSubmit={submitDiary}>
                <input
                  className="field px-4 py-3"
                  placeholder="Tonight I remembered..."
                  value={diaryTitle}
                  onChange={(event) => setDiaryTitle(event.target.value)}
                />
                <textarea
                  className="field min-h-36 px-4 py-3"
                  placeholder="Write it like a page only she will understand."
                  value={diaryNote}
                  onChange={(event) => setDiaryNote(event.target.value)}
                />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    className="field px-4 py-3"
                    value={diaryMood}
                    onChange={(event) => setDiaryMood(event.target.value as DiaryEntry["mood"])}
                  >
                    <option value="soft">soft</option>
                    <option value="safe">safe</option>
                    <option value="longing">longing</option>
                    <option value="magic">magic</option>
                    <option value="future">future</option>
                  </select>
                  <label className="soft-button inline-flex items-center justify-center gap-2">
                    <ImageIcon size={16} />
                    <span>Photo</span>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setDiaryFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <button className="soft-button justify-self-start" type="submit">
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} />
                    Add diary page
                  </span>
                </button>
              </form>
            ) : null}

            {tab === "memory" ? (
              <form className="grid gap-3" onSubmit={submitMemory}>
                <input
                  className="field px-4 py-3"
                  placeholder="Memory title"
                  value={memoryTitle}
                  onChange={(event) => setMemoryTitle(event.target.value)}
                />
                <input
                  className="field px-4 py-3"
                  type="date"
                  value={memoryDate}
                  onChange={(event) => setMemoryDate(event.target.value)}
                />
                <textarea
                  className="field min-h-28 px-4 py-3"
                  placeholder="What happened, and what it quietly meant."
                  value={memoryText}
                  onChange={(event) => setMemoryText(event.target.value)}
                />
                <textarea
                  className="field min-h-24 px-4 py-3"
                  placeholder="Hidden note"
                  value={memoryHidden}
                  onChange={(event) => setMemoryHidden(event.target.value)}
                />
                <label className="soft-button inline-flex w-fit items-center gap-2">
                  <ImageIcon size={16} />
                  <span>Photos</span>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setMemoryFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
                <button className="soft-button justify-self-start" type="submit">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={16} />
                    Add star
                  </span>
                </button>
              </form>
            ) : null}

            {tab === "reminder" ? (
              <form className="grid gap-3" onSubmit={submitReminder}>
                <input
                  className="field px-4 py-3"
                  placeholder="Reminder title"
                  value={reminderTitle}
                  onChange={(event) => setReminderTitle(event.target.value)}
                />
                <input
                  className="field px-4 py-3"
                  type="date"
                  value={reminderDate}
                  onChange={(event) => setReminderDate(event.target.value)}
                />
                <textarea
                  className="field min-h-28 px-4 py-3"
                  placeholder="What should love remember?"
                  value={reminderNote}
                  onChange={(event) => setReminderNote(event.target.value)}
                />
                <select
                  className="field px-4 py-3"
                  value={reminderKind}
                  onChange={(event) => setReminderKind(event.target.value as Reminder["kind"])}
                >
                  <option value="care">care</option>
                  <option value="anniversary">anniversary</option>
                  <option value="promise">promise</option>
                  <option value="dream">dream</option>
                </select>
                <button className="soft-button justify-self-start" type="submit">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} />
                    Save reminder
                  </span>
                </button>
              </form>
            ) : null}
          </div>

          <div className="diary-list">
            {diary.slice(0, 4).map((entry) => (
              <article className="diary-entry glass-panel" key={entry.id}>
                <img alt="" src={entry.photo ?? "/memories/cassette-smile.jpg"} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/42">
                    <span>{entry.mood}</span>
                    <span>{new Date(entry.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                  </div>
                  <h3 className="mt-2 truncate font-serif text-2xl text-white">{entry.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/62">{entry.note}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="glass-panel p-4">
            <p className="m-0 text-xs uppercase tracking-[0.22em] text-white/42">Next lights</p>
            <div className="mt-3 grid gap-3">
              {reminders.slice(0, 3).map((reminder) => (
                <div className="flex gap-3 border-t border-white/10 pt-3" key={reminder.id}>
                  <CalendarDays className="mt-1 shrink-0 text-[#cdb9ff]" size={18} />
                  <div>
                    <p className="m-0 text-white">{reminder.title}</p>
                    <p className="m-0 text-sm text-white/52">
                      {new Date(reminder.date).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {reminder.kind}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HiddenSecrets({ memories }: { memories: Memory[] }) {
  const [moonOpen, setMoonOpen] = useState(false);
  const [wingOpen, setWingOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const futureLetter = memories.find((memory) => memory.id === "future-letter");

  return (
    <section className="section">
      <div className="section-inner private-grid">
        <div>
          <p className="eyebrow">Hidden Rooms</p>
          <h2 className="display-title text-[clamp(2.1rem,6vw,5.2rem)]">Some feelings should be discovered slowly.</h2>
          <p className="section-copy">
            The moon keeps one letter. A wing carries one message. A constellation holds one promise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="soft-button inline-flex items-center gap-2" type="button" onClick={() => setWingOpen(true)}>
              <Sparkles size={16} />
              Follow the wing
            </button>
            <button className="soft-button inline-flex items-center gap-2" type="button" onClick={() => setPromiseOpen(true)}>
              <Heart size={16} />
              Open the promise
            </button>
          </div>
        </div>

        <div className="grid justify-items-center gap-5">
          <button className="secret-moon" type="button" onClick={() => setMoonOpen((current) => !current)}>
            <Moon size={44} />
          </button>
          <AnimatePresence mode="popLayout">
            {moonOpen ? (
              <motion.article
                className="secret-note glass-panel"
                initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10 }}
              >
                <p className="m-0 font-script text-4xl text-[#ffe6f2]">Private letter</p>
                <p className="mt-5 font-serif text-2xl leading-10 text-white/82">
                  You are not loved loudly here. You are loved carefully. In all the places you think
                  nobody notices, I do.
                </p>
              </motion.article>
            ) : null}
            {wingOpen ? (
              <motion.article
                className="secret-note glass-panel"
                initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10 }}
              >
                <p className="m-0 font-script text-4xl text-[#ffe6f2]">When you miss me</p>
                <p className="mt-5 font-serif text-2xl leading-10 text-white/82">
                  Put your hand on your heart. Somewhere, in the same universe, mine is still answering.
                </p>
              </motion.article>
            ) : null}
            {promiseOpen ? (
              <motion.article
                className="secret-note glass-panel"
                initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10 }}
              >
                <p className="m-0 font-script text-4xl text-[#ffe6f2]">Future wedding letter</p>
                <p className="mt-5 font-serif text-2xl leading-10 text-white/82">
                  {futureLetter?.hiddenNote ??
                    "I will keep learning how to love you in the language your quietest days need."}
                </p>
              </motion.article>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function RelationshipTreeSection() {
  return (
    <section className="section">
      <div className="section-inner">
        <div className="mb-10 max-w-3xl text-center mx-auto">
          <p className="eyebrow">A Living Universe</p>
          <h2 className="display-title text-[clamp(1.8rem,4vw,4rem)]">Our love takes root.</h2>
          <p className="section-copy mx-auto">
            This magical plant grows with the time we spend together. What started as a seed is now reaching for the stars.
          </p>
        </div>
        <div className="glass-panel overflow-hidden w-full rounded-[16px] relative z-10">
          <GrowingPlant />
        </div>
      </div>
    </section>
  );
}

function EvolvingUniverse({ memories, isRealtime }: { memories: Memory[]; isRealtime: boolean }) {
  const unlocked = memories.filter((memory) => !memory.unlockAt || new Date(memory.unlockAt).getTime() <= Date.now());
  const locked = memories.length - unlocked.length;

  return (
    <section className="section min-h-[70vh]">
      <div className="section-inner">
        <div className="grid gap-4 md:grid-cols-[1fr_0.8fr] md:items-end">
          <div className="text-center mx-auto max-w-3xl">
            <p className="eyebrow">Evolving Universe</p>
            <h2 className="display-title text-[clamp(1rem,2vw,2rem)]">The sky is not finished.</h2>
            <p className="section-copy">
              New memories become new stars. Future dates unlock later. The relationship tree grows
              quietly as the story keeps living.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["glowing", unlocked.length],
              ["waiting", locked],
              [isRealtime ? "realtime" : "local", isRealtime ? 1 : 0]
            ].map(([label, value]) => (
              <div className="glass-panel p-5" key={label}>
                <p className="m-0 font-serif text-4xl">{value}</p>
                <p className="m-0 text-xs uppercase tracking-[0.2em] text-white/42">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingChatWidget({
  messages,
  sendMessage,
  reactToMessage
}: {
  messages: ChatMessage[];
  sendMessage: ReturnType<typeof useLoveBackend>["sendMessage"];
  reactToMessage: ReturnType<typeof useLoveBackend>["reactToMessage"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState<ChatMessage["author"]>("me");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() && !imageFile) return;
    await sendMessage({ author, body: body || "A photo saved in the thread." }, imageFile);
    setBody("");
    setImageFile(null);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onload = async () => {
        await sendMessage({ author, body: "A voice note from the quiet part of the universe.", voice: String(reader.result) });
        stream.getTracks().forEach((track) => track.stop());
      };
      reader.readAsDataURL(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <>
      <motion.button
        className="fixed bottom-[clamp(1rem,3vw,2rem)] right-[clamp(1rem,3vw,2rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#cdb9ff,#f2a8d1)] text-[#15092d] shadow-[0_0_20px_rgba(205,185,255,0.4)]"
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[clamp(5rem,8vw,6rem)] right-[clamp(1rem,3vw,2rem)] z-50 w-[calc(100vw-2rem)] max-w-[400px] origin-bottom-right"
          >
            <div className="relative">
              <button
                className="absolute -top-12 right-0 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
              <article className="chat-panel glass-panel flex max-h-[70vh] flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <p className="m-0 text-sm font-medium text-white">Only us</p>
              <p className="m-0 text-xs text-white/42">{body ? "typing in moonlight" : "stars are listening"}</p>
            </div>
            <select
              className="field w-auto px-3 py-2 text-sm"
              value={author}
              onChange={(event) => setAuthor(event.target.value as ChatMessage["author"])}
            >
              <option value="me">me</option>
              <option value="her">her</option>
            </select>
          </div>

          <div className="message-list" ref={listRef}>
            {messages.map((message) => (
              <div className={`message-bubble ${message.author}`} key={message.id}>
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/38">
                  <span>{message.author}</span>
                  {message.pinned ? <Pin size={12} /> : null}
                </div>
                {message.image ? (
                  <img alt="" className="mb-3 max-h-72 w-full rounded-[8px] object-cover" src={message.image} />
                ) : null}
                {message.voice ? <audio className="mb-3 w-full" controls src={message.voice} /> : null}
                <p className="m-0 leading-7 text-white/82">{message.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["always", "home", "mine"].map((reaction) => (
                    <button
                      className={`rounded-full border border-white/10 px-3 py-1 text-xs text-white/58 ${
                        message.reaction === reaction ? "bg-white/15 text-white" : ""
                      }`}
                      key={reaction}
                      type="button"
                      onClick={() => reactToMessage(message.id, reaction)}
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <form className={`grid gap-3 border-t border-white/10 p-4 ${body ? "typing-glow" : ""}`} onSubmit={submitMessage}>
            <textarea
              className="field min-h-20 px-4 py-3"
              placeholder="Say it gently..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <label className="icon-button" aria-label="Attach image">
                  <ImageIcon size={17} />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  className="icon-button"
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  aria-label={recording ? "Stop recording" : "Record voice note"}
                >
                  {recording ? <Square size={17} /> : <Mic size={17} />}
                </button>
              </div>
              <button className="soft-button inline-flex items-center gap-2" type="submit">
                <Send size={16} />
                Send
              </button>
            </div>
          </form>
              </article>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PromisesSection() {
  const promises = [
    "I will notice every little thing about you",
    "I will always look at you like it's the first time",
    "I will choose you, every single day",
    "I will be your safe place in this world",
    "I will love your simplicity the way it deserves to be loved",
    "I will build a future with you — not just dream about it",
    "I will make you feel how deeply you are loved"
  ];

  return (
    <section className="section min-h-[80vh]">
      <div className="section-inner text-center">
        <p className="eyebrow">✦ My promises to you ✦</p>
        <h2 className="display-title text-[clamp(1.2rem,2.2vw,2.2rem)] mb-12">
          Things I will always mean
        </h2>
        <div className="mx-auto max-w-3xl flex flex-col gap-6">
          {promises.map((promise, index) => (
            <motion.p
              key={index}
              className="glass-panel p-5 font-serif text-[clamp(1.2rem,2vw,1.8rem)] text-white/90"
              initial={{ opacity: 0, y: 20, rotateX: 20 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ type: "spring", stiffness: 80, damping: 14, delay: index * 0.15 }}
            >
              {promise}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalScene() {
  return (
    <section className="section min-h-[112vh]">
      <div className="section-inner text-center">
        <p className="eyebrow">After The Last Scroll</p>
        <motion.p
          className="mx-auto max-w-4xl whitespace-pre-line font-serif text-[clamp(1.4rem,3vw,2.4rem)] leading-[1.6] text-white/90"
          initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {universe.finalMessage}
        </motion.p>
        <div className="final-constellation">
          <motion.div
            className="final-names"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.6, delay: 0.4 }}
          >
            {universe.myName}
            <br />
            <span className="font-script text-[#ffe6f2]">&</span>
            <br />
            {universe.herName}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function LoveUniverse() {
  const backend = useLoveBackend();
  const music = useMusicReactive();
  const [introState, setIntroState] = useState<"orbiting" | "atStar" | "bursting" | "entered">("orbiting");
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 0.82
    });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--audio-intensity", music.intensity.toFixed(3));
  }, [music.intensity]);

  const handleStarReached = useCallback(() => {
    setIntroState("atStar");
  }, []);

  const handleStartBurst = useCallback(() => {
    setIntroState("bursting");
  }, []);

  const handleBurstComplete = useCallback(() => {
    setIntroState("entered");
    music.play();
  }, [music]);

  const handleSacredVisible = useCallback(
    (visible: boolean) => {
      music.setDucking(visible);
    },
    [music]
  );

  return (
    <main className={`universe-shell ${introState === "entered" ? "is-entered" : "is-intro"}`}>
      <CosmicCanvas 
        entered={introState === "entered"} 
        introState={introState}
        onStarReached={handleStarReached}
        onBurstComplete={handleBurstComplete}
        intensity={music.intensity} 
      />
      <IntroOverlay introState={introState} onStartBurst={handleStartBurst} />
      <div className="content-layer">
        <HeroSection memories={backend.memories} />
        <FirstMeetingSection onSacredVisible={handleSacredVisible} />
        <ConstellationTimeline memories={backend.memories} onOpenMemory={setSelectedMemory} />
        <RelationshipCounters />
        <RelationshipTreeSection />
        <DiarySystem
          diary={backend.diary}
          reminders={backend.reminders}
          addDiaryEntry={backend.addDiaryEntry}
          addMemory={backend.addMemory}
          addReminder={backend.addReminder}
        />
        <HiddenSecrets memories={backend.memories} />
        <EvolvingUniverse memories={backend.memories} isRealtime={backend.isRealtime} />
        <FloatingChatWidget
          messages={backend.messages}
          sendMessage={backend.sendMessage}
          reactToMessage={backend.reactToMessage}
        />
        <PromisesSection />
        <FinalScene />
        <AmbientParticles />
      </div>
      <MusicOrb {...music} />
      <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
    </main>
  );
}
