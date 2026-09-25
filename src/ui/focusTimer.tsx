import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { syncThemeToEnvironment } from '../lib/theme';
import { fmtClock, fmtDuration } from '../lib/date';
import { uid } from '../lib/id';
import { useToast } from './toast';

export type TimerMode = 'pomodoro' | 'stopwatch';
export type TimerPhase = 'focus' | 'short' | 'long';
export type FocusEnvironment = 'woodland' | 'night' | 'rain';

export interface FocusTimerSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  breaksEnabled: boolean;
  environment: FocusEnvironment;
  soundscape: FocusEnvironment;
  soundEnabled: boolean;
  volume: number;
  mindfulnessEnabled: boolean;
  mindfulnessInterval: number;
}

interface TimerState {
  mode: TimerMode;
  phase: TimerPhase;
  running: boolean;
  elapsed: number;
  anchorElapsed: number;
  anchorAt: number;
  taskName: string;
  focusStartedAt: string | null;
  sessionId: string;
  completedFocusCycles: number;
}

interface FocusTimerValue {
  state: TimerState;
  settings: FocusTimerSettings;
  elapsed: number;
  displaySeconds: number;
  phaseSeconds: number;
  setTaskName: (name: string) => void;
  setMode: (mode: TimerMode) => void;
  setSettings: (patch: Partial<FocusTimerSettings>) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  finish: () => void;
  skipBreak: () => void;
  miniOpen: boolean;
  openMini: () => void;
  closeMini: () => void;
}

const TIMER_KEY = 'mup.focus-timer.v2';
const SETTINGS_KEY = 'mup.focus-timer.settings.v2';
const LOGGED_KEY = 'mup.focus-timer.logged.v2';
const audioUrl = (file: string) => `${import.meta.env.BASE_URL}sounds/${file}`;
const SOUNDS: Record<FocusEnvironment, string> = {
  woodland: 'woodland.mp3',
  night: 'night.mp3',
  rain: 'rain.mp3',
};

const DEFAULT_SETTINGS: FocusTimerSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  breaksEnabled: true,
  environment: 'woodland',
  soundscape: 'woodland',
  soundEnabled: false,
  volume: 45,
  mindfulnessEnabled: false,
  mindfulnessInterval: 5,
};

const defaultTimer = (): TimerState => ({
  mode: 'pomodoro', phase: 'focus', running: false, elapsed: 0,
  anchorElapsed: 0, anchorAt: Date.now(), taskName: '', focusStartedAt: null,
  sessionId: uid('timer'), completedFocusCycles: 0,
});

function safeRead<T>(key: string, fallback: T): T {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || 'null') || {}) }; }
  catch { return fallback; }
}

function elapsedFor(timer: TimerState, now = Date.now()): number {
  return timer.running ? timer.anchorElapsed + Math.max(0, now - timer.anchorAt) / 1000 : timer.elapsed;
}

const FocusTimerContext = createContext<FocusTimerValue | null>(null);

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const { addFocusSession, authState, updateSettings } = useStore();
  const { push } = useToast();
  const [settings, setSettingsState] = useState<FocusTimerSettings>(() => safeRead(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [state, setState] = useState<TimerState>(() => safeRead(TIMER_KEY, defaultTimer()));
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const [now, setNow] = useState(Date.now());
  const [miniOpen, setMiniOpen] = useState(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const completionLock = useRef(false);
  const lastBellMinute = useRef(0);
  const loggedIds = useRef<Set<string>>(new Set<string>());
  if (loggedIds.current.size === 0) {
    try { loggedIds.current = new Set(JSON.parse(localStorage.getItem(LOGGED_KEY) || '[]') as string[]); }
    catch { /* no prior completion ids */ }
  }

  useEffect(() => { stateRef.current = state; try { localStorage.setItem(TIMER_KEY, JSON.stringify(state)); } catch { /* optional persistence */ } }, [state]);
  useEffect(() => { settingsRef.current = settings; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* optional persistence */ } }, [settings]);

  const elapsed = elapsedFor(state, now);
  const phaseMinutes = state.phase === 'focus' ? settings.focusMinutes : state.phase === 'long' ? settings.longBreakMinutes : settings.breakMinutes;
  const phaseSeconds = phaseMinutes * 60;
  const displaySeconds = state.mode === 'pomodoro' ? Math.max(0, phaseSeconds - elapsed) : elapsed;

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [state.running]);

  const playBell = useCallback((kind: 'time-up' | 'mindfulness') => {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio(audioUrl(kind === 'time-up' ? 'time-up.mp3' : 'mindfulness-bell.mp3'));
    audio.volume = Math.max(0, Math.min(1, settingsRef.current.volume / 100));
    void audio.play().catch(() => {});
  }, []);

  const rememberLogged = (id: string) => {
    loggedIds.current.add(id);
    const recent = [...loggedIds.current].slice(-60);
    try { localStorage.setItem(LOGGED_KEY, JSON.stringify(recent)); } catch { /* refresh protection is best effort */ }
  };

  const logFocus = useCallback((timer: TimerState, seconds: number) => {
    if (seconds < 12 || loggedIds.current.has(timer.sessionId)) return false;
    rememberLogged(timer.sessionId);
    const minutes = Math.round(seconds / 6) / 10;
    addFocusSession({
      startedAt: timer.focusStartedAt ?? new Date(Date.now() - seconds * 1000).toISOString(),
      durationMinutes: minutes,
      taskName: timer.taskName.trim() || 'Focus study',
      sessionType: 'focus',
      completed: true,
    });
    return true;
  }, [addFocusSession]);

  const moveAfterCompletion = useCallback((timer: TimerState, seconds: number, automatic: boolean) => {
    if (completionLock.current) return;
    completionLock.current = true;
    if (timer.phase === 'focus') {
      const didLog = logFocus(timer, automatic && timer.mode === 'pomodoro' ? settingsRef.current.focusMinutes * 60 : seconds);
      const completedFocusCycles = timer.completedFocusCycles + (didLog ? 1 : 0);
      const longBreak = completedFocusCycles > 0 && completedFocusCycles % settingsRef.current.sessionsBeforeLongBreak === 0;
      const nextPhase: TimerPhase = settingsRef.current.breaksEnabled ? (longBreak ? 'long' : 'short') : 'focus';
      if (didLog) push(`${fmtDuration(seconds / 60)} of focus logged`, 'ok');
      playBell('time-up');
      setState({
        ...timer, running: false, elapsed: 0, anchorElapsed: 0, anchorAt: Date.now(),
        phase: nextPhase, focusStartedAt: null, sessionId: uid('timer'), completedFocusCycles,
      });
    } else {
      playBell('time-up');
      push('Break complete — return to focus when ready', 'ok');
      setState({ ...timer, running: false, elapsed: 0, anchorElapsed: 0, anchorAt: Date.now(), phase: 'focus', focusStartedAt: null, sessionId: uid('timer') });
    }
    window.setTimeout(() => { completionLock.current = false; }, 0);
  }, [logFocus, playBell, push]);

  useEffect(() => {
    if (state.mode === 'pomodoro' && state.running && elapsed >= phaseSeconds) moveAfterCompletion(state, phaseSeconds, true);
  }, [elapsed, moveAfterCompletion, phaseSeconds, state]);

  useEffect(() => {
    if (!state.running || state.phase !== 'focus' || !settings.mindfulnessEnabled) return;
    const interval = Math.max(1, settings.mindfulnessInterval);
    const minute = Math.floor(elapsed / 60);
    if (minute > 0 && minute % interval === 0 && minute !== lastBellMinute.current) {
      lastBellMinute.current = minute;
      playBell('mindfulness');
    }
  }, [elapsed, playBell, settings.mindfulnessEnabled, settings.mindfulnessInterval, state.phase, state.running]);

  const ensureAmbient = useCallback((soundscape = settingsRef.current.soundscape) => {
    const expected = audioUrl(SOUNDS[soundscape]);
    if (!ambientRef.current || !ambientRef.current.src.endsWith(expected.replace(/^.*?:\/\//, '').replace(/^.*?\//, ''))) {
      ambientRef.current?.pause();
      const audio = new Audio(expected);
      audio.loop = true;
      audio.preload = 'none';
      ambientRef.current = audio;
    }
    ambientRef.current.volume = settingsRef.current.volume / 100;
    if (settingsRef.current.soundEnabled) void ambientRef.current.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings.soundEnabled) {
      ambientRef.current?.pause();
      return;
    }
    ensureAmbient(settings.soundscape);
  }, [ensureAmbient, settings.soundEnabled, settings.soundscape, settings.volume]);
  useEffect(() => () => { ambientRef.current?.pause(); pipWindowRef.current?.close(); }, []);
  useEffect(() => {
    if (authState === 'gate' || authState === 'loading') {
      setMiniOpen(false);
      pipWindowRef.current?.close();
      pipWindowRef.current = null;
    }
  }, [authState]);

  // Night atmosphere is the native dark app + sky: keep the whole-app theme in
  // lockstep whenever the environment changes (setSettings below), and re-assert
  // it on load when the saved atmosphere is already Night (idempotent).
  useEffect(() => {
    syncThemeToEnvironment(settingsRef.current.environment, updateSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSettings = useCallback((patch: Partial<FocusTimerSettings>) => {
    // Atmosphere -> theme sync lives here (not in the select's onChange) so every
    // caller gets it: entering Night forces dark mode, leaving restores the
    // pre-Night theme unless the user manually toggled one meanwhile.
    if (patch.environment) syncThemeToEnvironment(patch.environment, updateSettings);
    setSettingsState((current) => ({ ...current, ...patch }));
  }, [updateSettings]);

  const setTaskName = useCallback((taskName: string) => setState((timer) => ({ ...timer, taskName })), []);
  const setMode = useCallback((mode: TimerMode) => setState((timer) => ({ ...defaultTimer(), mode, taskName: timer.taskName, completedFocusCycles: timer.completedFocusCycles })), []);

  const start = useCallback(() => {
    if (settingsRef.current.soundEnabled) ensureAmbient();
    setState((timer) => {
      if (timer.running) return timer;
      const currentElapsed = elapsedFor(timer);
      lastBellMinute.current = Math.floor(currentElapsed / 60);
      return {
        ...timer, running: true, anchorAt: Date.now(), anchorElapsed: currentElapsed,
        focusStartedAt: timer.phase === 'focus' && !timer.focusStartedAt
          ? new Date(Date.now() - currentElapsed * 1000).toISOString() : timer.focusStartedAt,
      };
    });
  }, [ensureAmbient]);

  const pause = useCallback(() => setState((timer) => {
    if (!timer.running) return timer;
    const currentElapsed = elapsedFor(timer);
    return { ...timer, running: false, elapsed: currentElapsed, anchorElapsed: currentElapsed };
  }), []);

  const reset = useCallback(() => {
    completionLock.current = false;
    setState((timer) => ({ ...timer, running: false, elapsed: 0, anchorElapsed: 0, anchorAt: Date.now(), focusStartedAt: null, sessionId: uid('timer') }));
  }, []);

  const finish = useCallback(() => {
    const timer = stateRef.current;
    moveAfterCompletion(timer, elapsedFor(timer), false);
  }, [moveAfterCompletion]);

  const skipBreak = useCallback(() => setState((timer) => ({ ...timer, running: false, phase: 'focus', elapsed: 0, anchorElapsed: 0, anchorAt: Date.now(), focusStartedAt: null, sessionId: uid('timer') })), []);

  const closeMini = useCallback(() => {
    setMiniOpen(false);
    pipWindowRef.current?.close();
    pipWindowRef.current = null;
  }, []);

  const openMini = useCallback(() => {
    const api = (window as unknown as { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!api) { setMiniOpen(true); return; }
    void api.requestWindow({ width: 340, height: 220 }).then((win) => {
      pipWindowRef.current = win;
      win.document.body.innerHTML = `<main><div id="phase"></div><div id="clock"></div><div id="work"></div><button id="control">Pause</button></main>`;
      // Dress the PiP window in the same design tokens as the app, read live
      // from the current (light/dark) theme.
      const token = (name: string, fallback: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
      };
      const cssBg = token('--bg', '#0b1020');
      const cssSurface2 = token('--surface-2', '#18213f');
      const cssLine = token('--line-strong', 'rgba(148, 163, 204, .26)');
      const cssText = token('--text', '#e8ecf8');
      const cssFaint = token('--text-faint', '#6f7ba0');
      const cssAccent = token('--accent', '#6d8cff');
      const cssAccentSoft = token('--accent-soft', 'rgba(109, 140, 255, .16)');
      const style = win.document.createElement('style');
      style.textContent = `*{box-sizing:border-box}body{margin:0;background:${cssBg};color:${cssText};font-family:Inter,system-ui}main{height:100vh;display:grid;place-content:center;text-align:center;padding:20px;background:radial-gradient(circle at top, ${cssAccentSoft}, transparent 62%)}#phase{font-size:11px;letter-spacing:.18em;color:${cssAccent};font-weight:800}#clock{font:800 48px ui-monospace,monospace;margin:7px}#work{font-size:12px;color:${cssFaint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:290px}button{margin:14px auto 0;border:1px solid ${cssLine};border-radius:9px;background:${cssSurface2};color:${cssText};padding:8px 18px;cursor:pointer}`;
      win.document.head.appendChild(style);
      win.document.getElementById('control')?.addEventListener('click', () => stateRef.current.running ? pause() : start());
      win.addEventListener('pagehide', () => { pipWindowRef.current = null; });
      setNow(Date.now());
    }).catch(() => setMiniOpen(true));
  }, [pause, start]);

  useEffect(() => {
    const win = pipWindowRef.current;
    if (!win) return;
    const timer = stateRef.current;
    const seconds = timer.mode === 'pomodoro' ? Math.max(0, (timer.phase === 'focus' ? settings.focusMinutes : timer.phase === 'long' ? settings.longBreakMinutes : settings.breakMinutes) * 60 - elapsedFor(timer)) : elapsedFor(timer);
    const phase = timer.mode === 'stopwatch' ? 'STOPWATCH' : timer.phase === 'focus' ? 'FOCUS' : timer.phase === 'long' ? 'LONG BREAK' : 'BREAK';
    const put = (id: string, text: string) => { const node = win.document.getElementById(id); if (node) node.textContent = text; };
    put('phase', phase); put('clock', fmtClock(seconds)); put('work', timer.taskName || 'Open focus session'); put('control', timer.running ? 'Pause' : 'Start');
  }, [now, settings.breakMinutes, settings.focusMinutes, settings.longBreakMinutes, state]);

  const value = useMemo<FocusTimerValue>(() => ({
    state, settings, elapsed, displaySeconds, phaseSeconds,
    setTaskName, setMode, setSettings, start, pause, reset, finish, skipBreak,
    miniOpen, openMini, closeMini,
  }), [state, settings, elapsed, displaySeconds, phaseSeconds, setTaskName, setMode, setSettings, start, pause, reset, finish, skipBreak, miniOpen, openMini, closeMini]);

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
      {miniOpen && authState !== 'gate' && authState !== 'loading' && <FallbackMiniPlayer value={value} />}
    </FocusTimerContext.Provider>
  );
}

function FallbackMiniPlayer({ value }: { value: FocusTimerValue }) {
  const phase = value.state.mode === 'stopwatch' ? 'STOPWATCH' : value.state.phase === 'focus' ? 'FOCUS' : value.state.phase === 'long' ? 'LONG BREAK' : 'BREAK';
  return (
    <aside className="focus-mini-player" aria-label="Focus timer mini player">
      <button className="mini-close" onClick={value.closeMini} aria-label="Close mini player">×</button>
      <div><span>{phase}</span><b>{fmtClock(value.displaySeconds)}</b><small>{value.state.taskName || 'Open focus session'}</small></div>
      <button className="mini-control" onClick={value.state.running ? value.pause : value.start}>{value.state.running ? '❚❚' : '▶'}</button>
    </aside>
  );
}

export function useFocusTimer(): FocusTimerValue {
  const value = useContext(FocusTimerContext);
  if (!value) throw new Error('useFocusTimer must be used within FocusTimerProvider');
  return value;
}
