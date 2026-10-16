import {
  EMOTIONS,
  GESTURES,
  STATES,
  type AvatarGuideHandle,
  type AvatarState,
  type Emotion,
  type Gesture,
  type GuideSnapshot,
  type SpeechOptions,
  type Target,
  type FaceWeights,
} from "./vocabulary";
import { clamp, mouthAt, validateVisemes } from "./motion";

export class GuideController implements AvatarGuideHandle {
  snapshot: GuideSnapshot = {
    state: "idle",
    emotion: "neutral",
    intensity: 0.6,
    caption: "",
    word: -1,
    gesture: null,
    target: null,
    muted: false,
    speechKind: "none",
    audioStartedAt: null,
    timingQuality: null,
  };
  gaze = "viewer";
  gestureStarted = 0;
  gestureRevision = 0;
  pointStarted = 0;
  faceOverrides: FaceWeights = {};
  private listeners = new Set<() => void>();
  private targets: Target[] = [];
  private navigate: ((path: string) => void) | undefined;
  private pendingNavigations = new Set<() => void>();
  private version = 0;
  private highlighted: Element | null = null;
  private audio: HTMLAudioElement | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private finish: (() => void) | null = null;
  private frame = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private speechOptions: SpeechOptions = {};
  private spokenGestures = new Set<number>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;
  private publish(next: Partial<GuideSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
  configure(targets: Target[], navigate?: (path: string) => void) {
    this.targets = targets;
    this.navigate = navigate;
  }
  setMuted(muted: boolean) {
    this.publish({ muted });
    if (this.audio) this.audio.muted = muted;
    if (this.utterance) this.interrupt();
  }
  lookAt(target: string) {
    if (target === "viewer" || target === "cursor" || this.allowed(target))
      this.gaze = target;
  }
  private allowed(selector: string) {
    return this.targets.some((t) => t.selector === selector);
  }
  targetElement(selector: string): HTMLElement | null {
    if (!this.allowed(selector) || typeof document === "undefined") return null;
    try {
      const labTarget = Array.from(
        document.querySelectorAll<HTMLElement>("[data-guide-selector]"),
      ).find((element) => element.dataset.guideSelector === selector);
      if (labTarget) return labTarget;
      if (
        !this.targets.some(
          (target) =>
            target.selector === selector &&
            (!target.path || target.path === window.location.pathname),
        )
      )
        return null;
      return document.querySelector<HTMLElement>(selector);
    } catch {
      return null;
    }
  }
  clearPoint() {
    this.highlighted?.classList.remove("avatar-guide-highlight");
    this.highlighted = null;
    this.publish({ target: null });
    this.gaze = "viewer";
  }
  pointAt(selector: string) {
    const target = this.targetElement(selector);
    if (!target) return false;
    this.clearPoint();
    this.highlighted = target;
    target.classList.add("avatar-guide-highlight");
    this.pointStarted = performance.now() / 1000;
    this.gaze = selector;
    this.publish({ state: "pointing", target: selector });
    return true;
  }
  async navigateTo(sectionId: string) {
    const record = this.targets.find((t) => t.sectionId === sectionId);
    if (!record) return false;
    const generation = this.version;
    let target = this.targetElement(record.selector);
    if (
      !target &&
      record.path &&
      this.navigate &&
      /^\/(?!\/)/.test(record.path)
    ) {
      this.setState("navigating");
      this.navigate(record.path);
      target = await new Promise<HTMLElement | null>((resolve) => {
        let settled = false;
        const finish = (element: HTMLElement | null) => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          clearTimeout(timer);
          this.pendingNavigations.delete(cancel);
          resolve(element);
        };
        const cancel = () => finish(null);
        const inspect = () => {
          if (generation !== this.version) return finish(null);
          const found = this.targetElement(record.selector);
          if (found) finish(found);
        };
        const observer = new MutationObserver(inspect);
        const timer = setTimeout(() => finish(null), 8000);
        this.pendingNavigations.add(cancel);
        observer.observe(document.body, { childList: true, subtree: true });
        inspect();
      });
    }
    if (generation !== this.version) return false;
    if (!target) {
      this.setState("idle");
      return false;
    }
    this.setState("navigating");
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    this.schedule(() => this.pointAt(record.selector), 550);
    return true;
  }
  setEmotion(emotion: Emotion, intensity = 0.7) {
    this.faceOverrides = {};
    this.publish({
      emotion: EMOTIONS.includes(emotion) ? emotion : "neutral",
      intensity: clamp(intensity),
    });
  }
  playGesture(gesture: Gesture) {
    if (!GESTURES.includes(gesture)) return;
    this.gestureStarted = performance.now() / 1000;
    this.gestureRevision++;
    this.publish({ gesture });
  }
  setState(state: AvatarState) {
    this.publish({ state: STATES.includes(state) ? state : "idle" });
  }
  inspectFace(weights: FaceWeights) {
    this.faceOverrides = Object.fromEntries(
      Object.entries(weights).map(([name, value]) => [name, clamp(value)]),
    );
  }
  private schedule(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }
  interrupt() {
    this.version++;
    this.pendingNavigations.forEach((cancel) => cancel());
    this.pendingNavigations.clear();
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    cancelAnimationFrame(this.frame);
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    if (this.utterance) {
      window.speechSynthesis?.cancel();
      this.utterance = null;
    }
    this.finish?.();
    this.finish = null;
    this.speechOptions = {};
    this.spokenGestures.clear();
    this.faceOverrides = {};
    this.clearPoint();
    this.publish({
      state: "interrupted",
      caption: "",
      word: -1,
      gesture: null,
      speechKind: "none",
      audioStartedAt: null,
    });
  }
  mouth(): FaceWeights {
    return this.audio && !this.audio.paused
      ? mouthAt(this.speechOptions.visemes ?? [], this.audio.currentTime)
      : {};
  }
  private word(index: number) {
    if (index !== this.snapshot.word) this.publish({ word: index });
    for (const cue of this.speechOptions.gestures ?? [])
      if (cue.atWord <= index && !this.spokenGestures.has(cue.atWord)) {
        this.spokenGestures.add(cue.atWord);
        this.playGesture(cue.name);
      }
  }
  async say(text: string, options: SpeechOptions = {}) {
    if (!text.trim()) return;
    if (options.visemes) validateVisemes(options.visemes);
    // Keep the pointed section highlighted while replacing only the speech track.
    const point = this.snapshot.target;
    this.interrupt();
    if (point) {
      this.pointAt(point);
      this.schedule(() => this.lookAt("viewer"), 1200);
    }
    const version = this.version;
    this.speechOptions = options;
    let lastScene = -1;
    if (options.emotion) this.setEmotion(options.emotion, options.intensity);
    this.publish({ state: "speaking", caption: text.trim(), word: -1 });
    await new Promise<void>((resolve) => {
      let complete = false;
      const done = () => {
        if (complete) return;
        complete = true;
        resolve();
        if (version !== this.version) return;
        this.audio = null;
        this.utterance = null;
        this.finish = null;
        this.speechOptions = {};
        this.publish({ state: "idle", speechKind: "none", word: -1 });
      };
      this.finish = done;
      if (options.audioUrl) {
        const audio = new Audio(options.audioUrl);
        this.audio = audio;
        audio.muted = this.snapshot.muted;
        this.publish({
          speechKind: "audio",
          timingQuality: options.timingQuality ?? "aligned",
        });
        audio.onended = done;
        audio.onerror = done;
        audio.onplaying = () => {
          if (version === this.version)
            this.publish({ audioStartedAt: performance.now() });
        };
        const tick = () => {
          if (version !== this.version || complete) return;
          const scenes = options.scenes ?? [];
          const sceneIndex = scenes.findIndex(
            (scene) =>
              audio.currentTime >= scene.start && audio.currentTime < scene.end,
          );
          if (sceneIndex !== lastScene) {
            lastScene = sceneIndex;
            const scene = scenes[sceneIndex];
            if (scene) {
              this.publish({ caption: scene.text, state: scene.state });
              this.setEmotion(scene.emotion, 0.65);
              if (scene.gesture) this.playGesture(scene.gesture);
            }
          }
          const words = options.wordTimings ?? [];
          this.word(
            words.findIndex(
              (w) => audio.currentTime >= w.start && audio.currentTime < w.end,
            ),
          );
          this.frame = requestAnimationFrame(tick);
        };
        audio.play().then(tick).catch(done);
        return;
      }
      if ("speechSynthesis" in window && !this.snapshot.muted) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        speech.rate = 0.98;
        this.utterance = speech;
        const voices = window.speechSynthesis.getVoices();
        speech.voice =
          voices.find(
            (v) =>
              /^en[-_]/.test(v.lang) && /Daniel|Alex|Samantha/.test(v.name),
          ) ??
          voices.find((v) => /^en[-_]/.test(v.lang)) ??
          null;
        speech.onboundary = (event) => {
          if (version === this.version && event.name === "word")
            this.word(
              text.slice(0, event.charIndex).trim().split(/\s+/).filter(Boolean)
                .length,
            );
        };
        speech.onstart = () => {
          if (version === this.version)
            this.publish({ audioStartedAt: performance.now() });
        };
        speech.onend = done;
        speech.onerror = done;
        this.publish({ speechKind: "browser-demo" });
        window.speechSynthesis.speak(speech);
        return;
      }
      this.publish({ speechKind: "captions" });
      this.schedule(done, Math.max(2200, text.split(/\s+/).length * 320));
    });
  }
  dispose() {
    this.interrupt();
    this.listeners.clear();
  }
}
