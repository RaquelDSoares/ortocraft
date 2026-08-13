import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ilha das Letras — Aventura de Leitura" },
      {
        name: "description",
        content:
          "Jogo de plataforma 2D para aprender os casos de leitura do português: c/qu, g/gu, r/rr e s/ss.",
      },
    ],
  }),
  component: Game,
});

/* -------------------------------------------------------------------------- */
/*  Sons (Web Audio API — gerados no navegador)                               */
/* -------------------------------------------------------------------------- */

let audioCtx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

type SoundName = "jump" | "coin" | "correct" | "wrong" | "portal" | "win" | "hurt";

function playSound(name: SoundName) {
  const ctx = ac();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;

  const tone = (
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.15,
    slideTo?: number,
    delay = 0,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + delay);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, slideTo),
        now + delay + dur,
      );
    }
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + dur + 0.05);
  };

  switch (name) {
    case "jump":
      tone(340, 0.18, "square", 0.12, 720);
      break;
    case "coin":
      tone(880, 0.08, "triangle", 0.18);
      tone(1320, 0.12, "triangle", 0.18, undefined, 0.06);
      break;
    case "correct":
      tone(523, 0.12, "triangle", 0.18);
      tone(659, 0.12, "triangle", 0.18, undefined, 0.1);
      tone(784, 0.18, "triangle", 0.2, undefined, 0.2);
      break;
    case "wrong":
      tone(220, 0.18, "sawtooth", 0.15, 110);
      tone(180, 0.22, "sawtooth", 0.12, 90, 0.12);
      break;
    case "hurt":
      tone(300, 0.16, "square", 0.14, 140);
      break;
    case "portal":
      tone(660, 0.22, "triangle", 0.15, 1200);
      break;
    case "win":
      tone(523, 0.14, "triangle", 0.2);
      tone(659, 0.14, "triangle", 0.2, undefined, 0.12);
      tone(784, 0.14, "triangle", 0.2, undefined, 0.24);
      tone(1046, 0.35, "triangle", 0.22, undefined, 0.36);
      break;
  }
}

/* -------------------------------------------------------------------------- */
/*  Conteúdo pedagógico                                                       */
/* -------------------------------------------------------------------------- */

type Challenge = {
  word: string;
  options: [string, string];
  correct: 0 | 1;
  hint: string;
};

type Theme = {
  skyTop: string;
  skyBottom: string;
  mountains: string;
  grass: string;
  dirt: string;
  platformTop: string;
  platformBody: string;
  cloudColor: string;
  particle: "leaves" | "bats" | "embers" | "sand";
  showClouds: boolean;
  showStars: boolean;
};

type LevelDef = {
  id: string;
  title: string;
  subtitle: string;
  rule: string;
  emoji: string;
  themeCard: string;
  theme: Theme;
  challenges: Challenge[];
};

const LEVELS: LevelDef[] = [
  {
    id: "c-qu",
    title: "Fase 1 — C ou QU?",
    subtitle: "A Floresta das Vogais",
    rule: "Usamos QU antes de E e I. Usamos C antes de A, O e U.",
    emoji: "🌳",
    themeCard: "oklch(0.82 0.12 145)",
    theme: {
      skyTop: "#bfe3ff",
      skyBottom: "#eaf7ff",
      mountains: "rgba(90,140,90,0.5)",
      grass: "#7ac74f",
      dirt: "#8a5a3b",
      platformTop: "#a8e26a",
      platformBody: "#c48b5a",
      cloudColor: "rgba(255,255,255,0.9)",
      particle: "leaves",
      showClouds: true,
      showStars: false,
    },
    challenges: [
      { word: "__ilo", options: ["c", "qu"], correct: 1, hint: "Antes de I usamos QU." },
      { word: "__asa", options: ["c", "qu"], correct: 0, hint: "Antes de A usamos C." },
      { word: "__eijo", options: ["c", "qu"], correct: 1, hint: "Antes de E usamos QU." },
      { word: "__achorro", options: ["c", "qu"], correct: 0, hint: "Antes de A usamos C." },
      { word: "__erido", options: ["c", "qu"], correct: 1, hint: "Antes de E usamos QU." },
      { word: "__opo", options: ["c", "qu"], correct: 0, hint: "Antes de O usamos C." },
      { word: "má__ina", options: ["c", "qu"], correct: 1, hint: "Antes de I usamos QU." },
      { word: "__uidado", options: ["c", "qu"], correct: 0, hint: "Antes de U usamos C." },
      { word: "es__ilo", options: ["c", "qu"], correct: 1, hint: "Antes de I usamos QU." },
      { word: "__aneta", options: ["c", "qu"], correct: 0, hint: "Antes de A usamos C." },
    ],
  },
  {
    id: "g-gu",
    title: "Fase 2 — G ou GU?",
    subtitle: "As Cavernas do Som",
    rule: "Usamos GU antes de E e I (som de G forte). Usamos G antes de A, O e U.",
    emoji: "🕯️",
    themeCard: "oklch(0.78 0.10 300)",
    theme: {
      skyTop: "#2a1b3d",
      skyBottom: "#5a3a6b",
      mountains: "rgba(20,10,30,0.7)",
      grass: "#4a3555",
      dirt: "#2d1e3a",
      platformTop: "#6b4c7a",
      platformBody: "#3d2a48",
      cloudColor: "rgba(200,180,220,0.15)",
      particle: "bats",
      showClouds: false,
      showStars: true,
    },
    challenges: [
      { word: "__erra", options: ["g", "gu"], correct: 1, hint: "Antes de E usamos GU." },
      { word: "__ato", options: ["g", "gu"], correct: 0, hint: "Antes de A usamos G." },
      { word: "__itarra", options: ["g", "gu"], correct: 1, hint: "Antes de I usamos GU." },
      { word: "__orila", options: ["g", "gu"], correct: 0, hint: "Antes de O usamos G." },
      { word: "__uia", options: ["g", "gu"], correct: 1, hint: "Antes de I usamos GU (guia)." },
      { word: "__ula", options: ["g", "gu"], correct: 0, hint: "Antes de U usamos G." },
      { word: "san__e", options: ["g", "gu"], correct: 1, hint: "Antes de E, som forte = GU." },
      { word: "__oma", options: ["g", "gu"], correct: 0, hint: "Antes de O usamos G." },
      { word: "__inda", options: ["g", "gu"], correct: 1, hint: "Antes de I, som forte = GU." },
      { word: "__ota", options: ["g", "gu"], correct: 0, hint: "Antes de O usamos G." },
    ],
  },
  {
    id: "r-rr",
    title: "Fase 3 — R ou RR?",
    subtitle: "O Vale dos Rugidos",
    rule: "Entre duas vogais, R tem som fraco (caro) e RR tem som forte (carro).",
    emoji: "🔥",
    themeCard: "oklch(0.78 0.16 30)",
    theme: {
      skyTop: "#ff7a3d",
      skyBottom: "#ffd18a",
      mountains: "rgba(120,40,20,0.6)",
      grass: "#c94a2a",
      dirt: "#6b2a15",
      platformTop: "#e07a3a",
      platformBody: "#8a3a1a",
      cloudColor: "rgba(255,220,180,0.7)",
      particle: "embers",
      showClouds: true,
      showStars: false,
    },
    challenges: [
      { word: "ca__o (veículo)", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "ca__o (custa muito)", options: ["r", "rr"], correct: 0, hint: "Som fraco entre vogais = R." },
      { word: "fe__o (metal)", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "co__o (correr, verbo)", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "co__o (coro de igreja)", options: ["r", "rr"], correct: 0, hint: "Som fraco entre vogais = R." },
      { word: "mo__o (colina)", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "a__ara (papagaio)", options: ["r", "rr"], correct: 0, hint: "Som fraco entre vogais = R." },
      { word: "ba__iga", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "pa__ede", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
      { word: "ce__eja", options: ["r", "rr"], correct: 1, hint: "Som forte entre vogais = RR." },
    ],
  },
  {
    id: "s-ss",
    title: "Fase 4 — S ou SS?",
    subtitle: "As Dunas do Sussurro",
    rule: "Entre vogais, SS tem som de /s/ (passo). Um S sozinho entre vogais tem som de /z/ (casa).",
    emoji: "🏜️",
    themeCard: "oklch(0.85 0.11 90)",
    theme: {
      skyTop: "#ffe6a3",
      skyBottom: "#ffcc70",
      mountains: "rgba(180,120,60,0.55)",
      grass: "#e6b56a",
      dirt: "#b07d3a",
      platformTop: "#ffd98a",
      platformBody: "#c68a3c",
      cloudColor: "rgba(255,255,255,0.85)",
      particle: "sand",
      showClouds: true,
      showStars: false,
    },
    challenges: [
      { word: "pa__o (andar)", options: ["s", "ss"], correct: 1, hint: "Som /s/ entre vogais = SS." },
      { word: "ca__a (moradia)", options: ["s", "ss"], correct: 0, hint: "Som /z/ entre vogais = S." },
      { word: "ma__a (de bolo)", options: ["s", "ss"], correct: 1, hint: "Som /s/ entre vogais = SS." },
      { word: "va__o", options: ["s", "ss"], correct: 0, hint: "Som /z/ entre vogais = S." },
      { word: "pá__aro", options: ["s", "ss"], correct: 1, hint: "Som /s/ entre vogais = SS." },
      { word: "ro__a", options: ["s", "ss"], correct: 0, hint: "Som /z/ entre vogais = S (rosa)." },
      { word: "pe__oa", options: ["s", "ss"], correct: 1, hint: "Som /s/ entre vogais = SS." },
      { word: "me__a (móvel)", options: ["s", "ss"], correct: 0, hint: "Som /z/ entre vogais = S (mesa)." },
      { word: "profi__ão", options: ["s", "ss"], correct: 1, hint: "Som /s/ entre vogais = SS." },
      { word: "co__a (coxa da perna)", options: ["s", "ss"], correct: 0, hint: "Som /z/ entre vogais = S (cosa)." },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Motor do jogo                                                             */
/* -------------------------------------------------------------------------- */

const W = 960;
const H = 540;
const GROUND_Y = 440;
const GRAVITY = 1600;
const MOVE_SPEED = 260;
const JUMP_V = 640;
const PORTAL_COUNT = 10;

type Platform = { x: number; y: number; w: number; h: number };
type Portal = { x: number; y: number; challengeIndex: number; solved: boolean };
type Coin = { x: number; y: number; taken: boolean };

type LevelState = {
  platforms: Platform[];
  portals: Portal[];
  coins: Coin[];
  flagX: number;
  worldWidth: number;
};

function buildLevel(def: LevelDef): LevelState {
  const worldWidth = 4600;
  const platforms: Platform[] = [{ x: 0, y: GROUND_Y, w: worldWidth, h: 100 }];
  // plataformas flutuantes
  for (let i = 0; i < 14; i++) {
    const x = 220 + i * 300 + (i % 2) * 60;
    const y = 280 + ((i * 37) % 90);
    platforms.push({ x, y, w: 120 + ((i * 13) % 40), h: 18 });
  }

  const portals: Portal[] = [];
  const spacing = (worldWidth - 700) / PORTAL_COUNT;
  for (let i = 0; i < PORTAL_COUNT; i++) {
    portals.push({
      x: 400 + i * spacing,
      y: GROUND_Y - 80,
      challengeIndex: i % def.challenges.length,
      solved: false,
    });
  }

  const coins: Coin[] = [];
  for (let i = 0; i < 22; i++) {
    coins.push({ x: 200 + i * 200 + ((i * 53) % 60), y: 260 + ((i * 41) % 120), taken: false });
  }

  return { platforms, portals, coins, flagX: worldWidth - 120, worldWidth };
}

type Screen =
  | { kind: "menu" }
  | { kind: "level"; index: number }
  | { kind: "levelDone"; index: number; coins: number; hearts: number }
  | { kind: "gameOver"; index: number }
  | { kind: "allDone"; totalCoins: number };

function Game() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const [progress, setProgress] = useState<number>(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const enviarResultado = (index: number, hearts: number, duracaoMinutos: number) => {
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("souespecial_token");
    const origem = parametros.get("souespecial_origem");
    if (!token || !origem || !window.opener) return;
    const tentativas = PORTAL_COUNT + Math.max(0, 3 - hearts);
    window.opener.postMessage({
      tipo: "souespecial.resultado-jogo",
      versao: 1,
      token,
      competencia: LEVELS[index]?.title ?? "Ortografia",
      acertos: PORTAL_COUNT,
      tentativas,
      duracaoMinutos,
      observacoes: `Fase ${index + 1} concluída com ${hearts} coração(ões).`,
    }, origem);
  };

  // wrapper de som que respeita mute
  useEffect(() => {
    (window as any).__playIL = (n: SoundName) => {
      if (!mutedRef.current) playSound(n);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[var(--color-sky)]/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-6">
        <Header muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        {screen.kind === "menu" && (
          <MenuScreen
            progress={progress}
            onStart={(i) => setScreen({ kind: "level", index: i })}
          />
        )}
        {screen.kind === "level" && (
          <LevelScreen
            key={screen.index}
            def={LEVELS[screen.index]!}
            onComplete={(coins, hearts, duracaoMinutos) => {
              enviarResultado(screen.index, hearts, duracaoMinutos);
              setTotalCoins((c) => c + coins);
              setProgress((p) => Math.max(p, screen.index + 1));
              if (screen.index + 1 >= LEVELS.length) {
                setScreen({ kind: "allDone", totalCoins: totalCoins + coins });
              } else {
                setScreen({ kind: "levelDone", index: screen.index, coins, hearts });
              }
            }}
            onFail={() => setScreen({ kind: "gameOver", index: screen.index })}
            onQuit={() => setScreen({ kind: "menu" })}
          />
        )}
        {screen.kind === "levelDone" && (
          <ResultCard
            title="Fase concluída!"
            body={`Você juntou ${screen.coins} estrelas e terminou com ${screen.hearts} coração(ões).`}
            primary={{
              label: "Próxima fase",
              onClick: () => setScreen({ kind: "level", index: screen.index + 1 }),
            }}
            secondary={{ label: "Menu", onClick: () => setScreen({ kind: "menu" }) }}
          />
        )}
        {screen.kind === "gameOver" && (
          <ResultCard
            title="Ops! Tente de novo"
            body="Você perdeu todos os corações. Releia a dica no início da fase — você consegue!"
            primary={{
              label: "Tentar de novo",
              onClick: () => setScreen({ kind: "level", index: screen.index }),
            }}
            secondary={{ label: "Menu", onClick: () => setScreen({ kind: "menu" }) }}
          />
        )}
        {screen.kind === "allDone" && (
          <ResultCard
            title="Você venceu a Ilha das Letras!"
            body={`Total de estrelas: ${screen.totalCoins}. Em breve: s/z, ç, j/g, x/ch, m antes de p/b e mais!`}
            primary={{ label: "Jogar de novo", onClick: () => setScreen({ kind: "menu" }) }}
          />
        )}
      </div>
    </div>
  );
}

function Header({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  return (
    <header className="flex w-full items-center justify-between rounded-3xl bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary)] text-2xl">
          🦉
        </div>
        <div>
          <h1 className="text-xl leading-tight">Ilha das Letras</h1>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Aventura de leitura • 7 a 14 anos
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="hidden text-sm text-[var(--color-muted-foreground)] sm:block">
          ← → andar • ↑ / espaço pular
        </p>
        <button
          onClick={onToggleMute}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg shadow-sm ring-1 ring-[var(--color-border)] hover:bg-[var(--color-muted)]"
          title={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}

function MenuScreen({
  progress,
  onStart,
}: {
  progress: number;
  onStart: (i: number) => void;
}) {
  return (
    <div className="grid w-full gap-4 rounded-3xl bg-white p-6 shadow-lg sm:grid-cols-[1.2fr_1fr]">
      <div>
        <h2 className="text-3xl">Escolha uma fase</h2>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Cada fase tem um cenário e 10 desafios de leitura pelo caminho.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LEVELS.map((l, i) => {
            const locked = i > progress;
            return (
              <button
                key={l.id}
                disabled={locked}
                onClick={() => onStart(i)}
                className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: locked ? "var(--color-muted)" : l.themeCard }}
              >
                <div className="text-3xl">{l.emoji}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-black/60">
                  {l.subtitle}
                </div>
                <div className="mt-0.5 font-[var(--font-display)] text-lg font-semibold">
                  {l.title}
                </div>
                <div className="mt-2 text-sm text-black/70">{l.rule}</div>
                {locked && <div className="absolute right-3 top-3 text-2xl">🔒</div>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl bg-[var(--color-sky)]/40 p-5">
        <h3 className="text-lg">Como jogar</h3>
        <ul className="mt-2 space-y-2 text-sm">
          <li>🏃 Ande com ← → (ou A/D).</li>
          <li>🦘 Pule com ↑, W ou barra de espaço.</li>
          <li>⭐ Colete estrelas pelo caminho.</li>
          <li>🚪 Cada portal traz um desafio de leitura — acerte para abrir.</li>
          <li>❤️ Você começa com 3 corações. Erros custam um coração.</li>
          <li>🚩 Chegue à bandeira para concluir a fase.</li>
          <li>🔊 Use o botão no topo para ligar/desligar o som.</li>
        </ul>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="w-full rounded-3xl bg-white p-8 text-center shadow-lg">
      <h2 className="text-3xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-[var(--color-muted-foreground)]">{body}</p>
      <div className="mt-5 flex justify-center gap-3">
        <button className="btn-game" onClick={primary.onClick}>
          {primary.label}
        </button>
        {secondary && (
          <button className="btn-game-secondary" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}

function snd(n: SoundName) {
  const f = (window as any).__playIL as ((n: SoundName) => void) | undefined;
  if (f) f(n);
}

/* -------------------------------------------------------------------------- */
/*  Level (motor do jogo)                                                     */
/* -------------------------------------------------------------------------- */

type Particle = { x: number; y: number; vx: number; vy: number; life: number; kind: string };

function LevelScreen({
  def,
  onComplete,
  onFail,
  onQuit,
}: {
  def: LevelDef;
  onComplete: (coins: number, hearts: number, duracaoMinutos: number) => void;
  onFail: () => void;
  onQuit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    x: 60,
    y: GROUND_Y - 48,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    frame: 0,
    wasJumpDown: false,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const level = useMemo(() => buildLevel(def), [def]);
  const worldRef = useRef(level);
  worldRef.current = level;
  const particlesRef = useRef<Particle[]>([]);
  const particleTimerRef = useRef(0);

  const [hearts, setHearts] = useState(3);
  const [coins, setCoins] = useState(0);
  const [activePortal, setActivePortal] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const pausedRef = useRef(true);

  useEffect(() => {
    pausedRef.current = showIntro || activePortal !== null;
  }, [showIntro, activePortal]);

  const heartsRef = useRef(hearts);
  heartsRef.current = hearts;
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const inicioRef = useRef(Date.now());

  const spawnParticle = useCallback(() => {
    const th = def.theme;
    const camX = 0; // spawnamos em coords do mundo próximas do player
    const p = stateRef.current;
    let particle: Particle;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const cx = p.x + rand(-W / 2, W / 2);
    if (th.particle === "leaves") {
      particle = { x: cx, y: rand(-20, 100), vx: rand(-10, 10), vy: rand(20, 50), life: rand(4, 8), kind: "leaf" };
    } else if (th.particle === "bats") {
      particle = { x: cx, y: rand(60, 250), vx: rand(-40, 40), vy: rand(-10, 10), life: rand(3, 5), kind: "bat" };
    } else if (th.particle === "embers") {
      particle = { x: cx, y: rand(300, 400), vx: rand(-10, 10), vy: rand(-80, -40), life: rand(1.5, 3), kind: "ember" };
    } else {
      particle = { x: cx, y: rand(200, 400), vx: rand(60, 120), vy: rand(-4, 4), life: rand(2, 4), kind: "sand" };
    }
    void camX;
    particlesRef.current.push(particle);
    if (particlesRef.current.length > 40) particlesRef.current.shift();
  }, [def]);

  const update = useCallback(
    (dt: number) => {
      const p = stateRef.current;
      const w = worldRef.current;
      const k = keysRef.current;

      const left = k["arrowleft"] || k["a"];
      const right = k["arrowright"] || k["d"];
      const jump = k["arrowup"] || k["w"] || k[" "];

      p.vx = 0;
      if (left) {
        p.vx = -MOVE_SPEED;
        p.facing = -1;
      }
      if (right) {
        p.vx = MOVE_SPEED;
        p.facing = 1;
      }
      const jumpPressed = jump && !p.wasJumpDown;
      if (jumpPressed && p.onGround) {
        p.vy = -JUMP_V;
        p.onGround = false;
        snd("jump");
      }
      p.wasJumpDown = !!jump;

      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.frame += dt * 10;

      if (p.x < 0) p.x = 0;
      if (p.x > w.worldWidth - 40) p.x = w.worldWidth - 40;

      p.onGround = false;
      for (const pl of w.platforms) {
        const px = p.x + 20;
        const py = p.y + 48;
        if (
          px > pl.x &&
          px < pl.x + pl.w &&
          py > pl.y &&
          py < pl.y + pl.h + 20 &&
          p.vy >= 0
        ) {
          p.y = pl.y - 48;
          p.vy = 0;
          p.onGround = true;
        }
      }

      for (const c of w.coins) {
        if (c.taken) continue;
        if (Math.abs(c.x - (p.x + 20)) < 22 && Math.abs(c.y - (p.y + 24)) < 26) {
          c.taken = true;
          setCoins((v) => v + 1);
          snd("coin");
        }
      }

      // Portais são barreiras de altura total: não dá para pular por cima
      // enquanto não for respondido corretamente.
      for (let i = 0; i < w.portals.length; i++) {
        const po = w.portals[i]!;
        if (po.solved) continue;
        const playerRight = p.x + 40;
        const playerLeft = p.x;
        const portalLeft = po.x - 4;
        const portalRight = po.x + 32;
        if (playerRight > portalLeft && playerLeft < portalRight) {
          // empurra o jogador de volta para o lado de onde veio
          if (p.x + 20 < po.x + 16) {
            p.x = portalLeft - 40;
          } else {
            p.x = portalRight;
          }
          if (p.vx > 0) p.vx = 0;
          snd("portal");
          setActivePortal(i);
          return;
        }
      }


      if (p.x + 20 >= w.flagX) {
        snd("win");
        onComplete(coinsRef.current, heartsRef.current, Math.max(1, Math.round((Date.now() - inicioRef.current) / 60000)));
      }

      // partículas
      particleTimerRef.current += dt;
      if (particleTimerRef.current > 0.25) {
        particleTimerRef.current = 0;
        spawnParticle();
      }
      for (const pt of particlesRef.current) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    },
    [onComplete, spawnParticle],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const p = stateRef.current;
      const w = worldRef.current;
      const th = def.theme;

      const camX = Math.max(0, Math.min(w.worldWidth - W, p.x - W / 2 + 20));

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.skyTop);
      g.addColorStop(1, th.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      if (th.showStars) {
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 137) % W;
          const sy = (i * 71) % 260;
          ctx.globalAlpha = 0.4 + ((i * 13) % 60) / 100;
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
      }

      if (th.showClouds) {
        ctx.fillStyle = th.cloudColor;
        for (let i = 0; i < 6; i++) {
          const cx = ((i * 480 - camX * 0.3) % (W + 200)) - 100;
          const cy = 60 + (i % 3) * 30;
          drawCloud(ctx, cx, cy);
        }
      }

      ctx.fillStyle = th.mountains;
      for (let i = 0; i < 14; i++) {
        const mx = i * 300 - camX * 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, GROUND_Y);
        ctx.lineTo(mx + 150, 260);
        ctx.lineTo(mx + 300, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }

      // partículas atrás
      for (const pt of particlesRef.current) {
        drawParticle(ctx, pt, camX);
      }

      ctx.save();
      ctx.translate(-camX, 0);

      for (const pl of w.platforms) {
        if (pl.y >= GROUND_Y) {
          ctx.fillStyle = th.grass;
          ctx.fillRect(pl.x, pl.y, pl.w, 14);
          ctx.fillStyle = th.dirt;
          ctx.fillRect(pl.x, pl.y + 14, pl.w, pl.h - 14);
        } else {
          ctx.fillStyle = th.platformBody;
          roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 6);
          ctx.fill();
          ctx.fillStyle = th.platformTop;
          ctx.fillRect(pl.x, pl.y, pl.w, 5);
        }
      }

      for (const c of w.coins) {
        if (c.taken) continue;
        drawStar(ctx, c.x, c.y, 12);
      }

      for (const po of w.portals) {
        drawPortal(ctx, po.x, po.y, po.solved);
      }

      // bandeira
      ctx.fillStyle = "#8a5a3b";
      ctx.fillRect(w.flagX, GROUND_Y - 120, 6, 120);
      ctx.fillStyle = "#e94f37";
      ctx.beginPath();
      ctx.moveTo(w.flagX + 6, GROUND_Y - 120);
      ctx.lineTo(w.flagX + 60, GROUND_Y - 100);
      ctx.lineTo(w.flagX + 6, GROUND_Y - 80);
      ctx.closePath();
      ctx.fill();

      drawPlayer(ctx, p.x, p.y, p.facing, p.frame, !p.onGround);

      ctx.restore();

      // progresso de portais no HUD do canvas (topo)
      const solved = w.portals.filter((po) => po.solved).length;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      roundRect(ctx, W - 160, 14, 146, 28, 14);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "600 14px Nunito, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🚪 ${solved} / ${PORTAL_COUNT}`, W - 148, 33);
    },
    [def],
  );

  // Loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const step = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (!pausedRef.current) update(dt);
      draw(ctx);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [update, draw]);

  // Keys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const answerPortal = useCallback(
    (choiceIndex: 0 | 1) => {
      if (activePortal === null) return;
      const po = worldRef.current.portals[activePortal]!;
      const ch = def.challenges[po.challengeIndex]!;
      if (choiceIndex === ch.correct) {
        snd("correct");
        po.solved = true;
        setActivePortal(null);
      } else {
        snd("wrong");
        const nh = heartsRef.current - 1;
        setHearts(nh);
        if (nh <= 0) {
          snd("hurt");
          setActivePortal(null);
          onFail();
        }
      }
    },
    [activePortal, def, onFail],
  );

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/80 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="btn-game-secondary" onClick={onQuit}>
            ← Menu
          </button>
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {def.subtitle} {def.emoji}
            </div>
            <div className="font-[var(--font-display)] font-semibold">{def.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-lg">
          <span>
            {"❤️".repeat(Math.max(0, hearts))}
            <span className="opacity-30">{"❤️".repeat(Math.max(0, 3 - hearts))}</span>
          </span>
          <span>⭐ {coins}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-black/5 shadow-lg">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full"
          onClick={() => ac()?.resume()}
        />

        {showIntro && (
          <Overlay>
            <div className="text-4xl">{def.emoji}</div>
            <h3 className="mt-1 text-2xl">{def.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {def.subtitle}
            </p>
            <p className="mx-auto mt-3 max-w-md rounded-xl bg-[var(--color-accent)]/40 p-3 text-sm">
              💡 <b>Regra:</b> {def.rule}
            </p>
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              Passe por {PORTAL_COUNT} portais até a bandeira 🚩
            </p>
            <button
              className="btn-game mt-4"
              onClick={() => {
                ac()?.resume();
                setShowIntro(false);
              }}
            >
              Começar!
            </button>
          </Overlay>
        )}

        {activePortal !== null && (
          <PortalPuzzle
            challenge={def.challenges[worldRef.current.portals[activePortal]!.challengeIndex]!}
            onAnswer={answerPortal}
          />
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/40 p-6">
      <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-xl">{children}</div>
    </div>
  );
}

function PortalPuzzle({
  challenge,
  onAnswer,
}: {
  challenge: Challenge;
  onAnswer: (i: 0 | 1) => void;
}) {
  const [feedback, setFeedback] = useState<null | "right" | "wrong">(null);
  const [locked, setLocked] = useState(false);
  return (
    <Overlay>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        Portal de Leitura
      </div>
      <div className="mt-2 text-3xl font-[var(--font-display)]">Complete a palavra:</div>
      <div className="mt-3 rounded-2xl bg-[var(--color-muted)] px-4 py-3 text-2xl">
        {challenge.word}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {challenge.options.map((opt, i) => (
          <button
            key={opt}
            disabled={locked}
            className="btn-game !bg-[var(--color-secondary)] !shadow-[0_5px_0_oklch(0.55_0.14_200)] disabled:opacity-70"
            onClick={() => {
              if (locked) return;
              setLocked(true);
              const isRight = i === challenge.correct;
              setFeedback(isRight ? "right" : "wrong");
              setTimeout(() => {
                setFeedback(null);
                setLocked(false);
                onAnswer(i as 0 | 1);
              }, 800);
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            feedback === "right"
              ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
              : "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
          }`}
        >
          {feedback === "right" ? "Isso mesmo!" : `Não é essa. ${challenge.hint}`}
        </div>
      )}
      {!feedback && (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Dica: {challenge.hint}
        </p>
      )}
    </Overlay>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilitários de desenho                                                    */
/* -------------------------------------------------------------------------- */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2);
  ctx.arc(x + 42, y, 18, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 6, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#ffd43b";
  ctx.strokeStyle = "#a67c00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPortal(ctx: CanvasRenderingContext2D, x: number, y: number, solved: boolean) {
  const t = performance.now() / 400;
  const glow = solved ? "#7bd88f" : "#e94f37";
  ctx.save();
  // feixe de energia até o topo (barreira visível) — só se não resolvido
  if (!solved) {
    const beam = ctx.createLinearGradient(x, 0, x, y);
    beam.addColorStop(0, "rgba(233,79,55,0)");
    beam.addColorStop(1, "rgba(233,79,55,0.55)");
    ctx.fillStyle = beam;
    const wobble = Math.sin(t * 2) * 2;
    ctx.fillRect(x + 4 + wobble, 0, 24, y);
    // linhas de energia
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const off = ((t * 60 + i * 40) % (y + 40)) - 20;
      ctx.moveTo(x + 6, off);
      ctx.lineTo(x + 26, off + 10);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x - 4, y + 76, 40, 6);
  const grad = ctx.createLinearGradient(x, y, x, y + 80);
  grad.addColorStop(0, glow);
  grad.addColorStop(1, "#412");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, 32, 80, 16);
  ctx.fill();

  if (!solved) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(x + 16, y + 30 + Math.sin(t) * 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("?", x + 16, y + 50);
  } else {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✓", x + 16, y + 50);
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle, camX: number) {
  const x = pt.x - camX * 0.7;
  if (x < -20 || x > W + 20) return;
  ctx.save();
  const t = performance.now() / 300;
  if (pt.kind === "leaf") {
    ctx.fillStyle = "#7ac74f";
    ctx.beginPath();
    ctx.ellipse(x, pt.y, 5, 3, Math.sin(t + pt.x), 0, Math.PI * 2);
    ctx.fill();
  } else if (pt.kind === "bat") {
    ctx.fillStyle = "#111";
    const flap = Math.sin(t * 4 + pt.x) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, pt.y);
    ctx.lineTo(x, pt.y - 3 - flap);
    ctx.lineTo(x + 6, pt.y);
    ctx.lineTo(x, pt.y + 2);
    ctx.closePath();
    ctx.fill();
  } else if (pt.kind === "ember") {
    ctx.fillStyle = `rgba(255, ${140 + ((pt.x | 0) % 80)}, 40, ${Math.min(1, pt.life)})`;
    ctx.beginPath();
    ctx.arc(x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = `rgba(210,170,110,${Math.min(0.7, pt.life / 3)})`;
    ctx.fillRect(x, pt.y, 3, 2);
  }
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  frame: number,
  inAir: boolean,
) {
  ctx.save();
  ctx.translate(x + 20, y + 24);
  ctx.scale(facing, 1);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff7a4a";
  roundRect(ctx, -16, -20, 32, 40, 12);
  ctx.fill();
  ctx.fillStyle = "#ffd7bd";
  roundRect(ctx, -10, -6, 20, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(4, -10, 5, 0, Math.PI * 2);
  ctx.arc(-4, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(5, -9, 2, 0, Math.PI * 2);
  ctx.arc(-3, -9, 2, 0, Math.PI * 2);
  ctx.fill();
  const bob = inAir ? -6 : Math.sin(frame) * 3;
  ctx.fillStyle = "#3a2b22";
  roundRect(ctx, -12, 16, 8, 10 + bob, 3);
  ctx.fill();
  roundRect(ctx, 4, 16, 8, 10 - bob, 3);
  ctx.fill();
  ctx.restore();
}
