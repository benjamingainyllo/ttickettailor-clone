"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ArrowLeft, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Keyboard, RotateCcw, Users,
} from "lucide-react";
import { checkInTicket, undoCheckIn, getDoorStats, markCollected, type CheckInResult } from "@/app/actions/check-in";
import { toast } from "sonner";

/**
 * The door.
 *
 * Built for one hand, outdoors, on a stranger's phone. The result banner
 * is the whole screen and colour-coded, because the person holding this
 * is looking up at a queue, not reading. Every decision the door needs —
 * let them in, already used, wrong event — is legible at arm's length.
 *
 * Scanning prefers the browser's native BarcodeDetector where it exists
 * (Android Chrome) and falls back to decoding frames with jsQR, which is
 * what iOS Safari ends up using. Manual entry is always available,
 * because a cracked screen or a dead camera can't stop a door.
 */

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const SCAN_INTERVAL_MS = 250;
/** How long the same code is ignored after a scan, so one badge held up
 *  to the lens doesn't fire a dozen times. */
const REPEAT_COOLDOWN_MS = 2500;

type Mode = "camera" | "manual";

export function DoorScanner({
  eventId,
  eventTitle,
  initialStats,
}: {
  eventId: string;
  eventTitle: string;
  initialStats: { admitted: number; total: number };
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live" | "denied" | "unavailable">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  /** Lines being marked handed-over, so the button cannot be double-tapped. */
  const [collecting, setCollecting] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [stats, setStats] = useState(initialStats);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await getDoorStats(eventId));
    } catch {
      // A stale counter is not worth interrupting the door for.
    }
  }, [eventId]);

  const submitCode = useCallback(
    async (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);

      try {
        const outcome = await checkInTicket(eventId, code);
        setResult(outcome);

        // Distinct buzz per outcome — the door often hears this before
        // it sees the screen.
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(outcome.outcome === "admitted" ? 60 : [40, 60, 40]);
        }

        if (outcome.outcome === "admitted") {
          setStats((s) => ({ ...s, admitted: s.admitted + 1 }));
        }
      } catch (error) {
        console.error("Check-in failed:", error);
        setResult({ outcome: "not_found", message: "Something went wrong. Try again." });
      } finally {
        busyRef.current = false;
        setChecking(false);
      }
    },
    [eventId]
  );

  // ---- Camera loop ----
  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);

    let found: string | null = null;

    if (detectorRef.current) {
      try {
        const codes = await detectorRef.current.detect(canvas);
        found = codes[0]?.rawValue ?? null;
      } catch {
        // Native detection can fail on a frame; jsQR picks up the next one.
        detectorRef.current = null;
      }
    }

    if (!found) {
      const image = context.getImageData(0, 0, width, height);
      found = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
    }

    if (!found) return;

    const previous = lastScanRef.current;
    const now = Date.now();
    if (previous && previous.code === found && now - previous.at < REPEAT_COOLDOWN_MS) return;

    lastScanRef.current = { code: found, at: now };
    await submitCode(found);
  }, [submitCode]);

  useEffect(() => {
    if (mode !== "camera" || cameraState !== "live") return;

    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      await tick();
      if (cancelled) return;
      timerRef.current = setTimeout(loop, SCAN_INTERVAL_MS);
    };

    loop();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, cameraState, tick]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      return;
    }

    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (window.BarcodeDetector) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detectorRef.current = null;
        }
      }

      setCameraState("live");
    } catch (error) {
      console.error("Camera unavailable:", error);
      setCameraState("denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (mode === "camera") startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode, startCamera, stopCamera]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await submitCode(manualCode);
    setManualCode("");
  }

  /**
   * Mark merchandise handed over.
   *
   * Removed from the card optimistically. The person on the door has already
   * passed the shirt across by the time they tap this, and a spinner in a
   * queue is worse than a rare stale row — a failure is logged and the line
   * reappears on the next scan of the same order.
   */
  async function handleCollect(orderProductId: string) {
    setCollecting((ids) => [...ids, orderProductId]);
    setResult((current) =>
      current
        ? { ...current, collect: (current.collect ?? []).filter((l) => l.id !== orderProductId) }
        : current
    );

    const { ok } = await markCollected(orderProductId);
    if (!ok) toast.error("Couldn't mark that as given. It'll show again on the next scan.");

    setCollecting((ids) => ids.filter((id) => id !== orderProductId));
  }

  async function handleUndo() {
    if (!result?.ticket?.code) return;
    const undone = await undoCheckIn(result.ticket.code);
    if (undone.outcome === "admitted") {
      toast.success("Check-in undone.");
      setResult(null);
      lastScanRef.current = null;
      await refreshStats();
    } else {
      toast.error(undone.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-24">
      <header className="flex items-center gap-3">
        <Link
          href="/events"
          aria-label="Back to events"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] text-subtle transition-colors hover:bg-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Door</p>
          <h1 className="truncate text-sm font-bold text-text">{eventTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-[3px] bg-[var(--dl-panel)] px-3 py-2">
          <Users className="h-3.5 w-3.5 text-subtle" />
          <span className="text-xs font-bold text-text">
            {stats.admitted}
            <span className="font-normal text-subtle">/{stats.total}</span>
          </span>
        </div>
      </header>

      {result && (
        <ResultBanner
          result={result}
          onDismiss={() => setResult(null)}
          onUndo={handleUndo}
          onCollect={handleCollect}
          collecting={collecting}
        />
      )}

      <div className="flex gap-2">
        {(["camera", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[3px] border py-2.5 text-xs font-bold transition-colors ${
              mode === m
                ? "border-transparent bg-text text-background"
                : "border-border text-subtle hover:bg-muted"
            }`}
          >
            {m === "camera" ? <Camera className="h-3.5 w-3.5" /> : <Keyboard className="h-3.5 w-3.5" />}
            {m === "camera" ? "Scan" : "Type it"}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
        <div className="overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-black">
          <div className="relative aspect-square w-full">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraState === "live" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-[3px] border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            )}

            {checking && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/70 py-3 text-xs font-semibold text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking…
              </div>
            )}

            {cameraState !== "live" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--dl-panel)] px-6 text-center">
                {cameraState === "starting" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
                    <p className="text-xs text-[var(--dl-ink-soft)]">Starting the camera…</p>
                  </>
                ) : (
                  <>
                    <CameraOff className="h-8 w-8 text-[var(--dl-ink-faint)]" />
                    <p className="text-sm font-semibold text-white">
                      {cameraState === "denied" ? "No camera access" : "Camera unavailable"}
                    </p>
                    <p className="text-xs text-[var(--dl-ink-soft)]">
                      {cameraState === "denied"
                        ? "Allow camera access in your browser, or type codes in instead."
                        : "This browser won't give us a camera. Type codes in instead."}
                    </p>
                    <div className="flex gap-2">
                      {cameraState === "denied" && (
                        <button
                          onClick={startCamera}
                          className="rounded-[3px] bg-white px-3 py-2 text-xs font-bold text-black"
                        >
                          Try again
                        </button>
                      )}
                      <button
                        onClick={() => setMode("manual")}
                        className="rounded-[3px] border border-[var(--dl-line)] px-3 py-2 text-xs font-bold text-white"
                      >
                        Type it instead
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label htmlFor="code" className="block text-xs font-semibold text-subtle">
            Ticket code
          </label>
          <input
            id="code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="PL-7K4M-9XQ2"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 text-center font-mono text-lg font-bold uppercase tracking-[0.15em] text-text placeholder:font-sans placeholder:tracking-normal placeholder:text-subtle focus:border-[var(--dl-line)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking || !manualCode.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-text text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
          </button>
          <p className="text-center text-xs text-subtle">
            Codes are on the ticket, under the QR.
          </p>
        </form>
      )}
    </div>
  );
}

function ResultBanner({
  result,
  onDismiss,
  onUndo,
  onCollect,
  collecting,
}: {
  result: CheckInResult;
  onDismiss: () => void;
  onUndo: () => void;
  onCollect: (orderProductId: string) => void;
  collecting: string[];
}) {
  const tone = {
    admitted: {
      bg: "bg-[var(--mint)]",
      text: "text-black",
      icon: CheckCircle2,
      title: "Let them in",
    },
    already_checked_in: {
      bg: "bg-[var(--marker)]",
      text: "text-black",
      icon: AlertTriangle,
      title: "Already used",
    },
    wrong_event: {
      bg: "bg-[var(--marker)]",
      text: "text-black",
      icon: AlertTriangle,
      title: "Wrong event",
    },
    void: { bg: "bg-[var(--danger)]", text: "text-white", icon: XCircle, title: "Not valid" },
    not_found: { bg: "bg-[var(--danger)]", text: "text-white", icon: XCircle, title: "Not found" },
    not_yours: { bg: "bg-[var(--danger)]", text: "text-white", icon: XCircle, title: "Not your event" },
  }[result.outcome];

  const Icon = tone.icon;

  return (
    <div className={`rounded-[3px] ${tone.bg} ${tone.text} p-5`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-7 w-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">{tone.title}</p>
          <p className="mt-0.5 text-sm font-medium opacity-90">{result.message}</p>

          {result.ticket && (
            <div className="mt-3 space-y-0.5 border-t border-black/15 pt-3 text-sm">
              <p className="font-bold">{result.ticket.holderName || "Guest"}</p>
              <p className="text-xs opacity-80">
                {result.ticket.ticketTypeName || "Admission"}
                {" · "}
                <span className="font-mono">{result.ticket.code}</span>
              </p>
            </div>
          )}

          {/* Anything bought that still has to be handed over. Deliberately
              loud: the door is dark, there is a queue, and a shirt somebody
              paid for and did not receive becomes a refund request. */}
          {result.collect && result.collect.length > 0 && (
            <div className="mt-3 rounded-[3px] border-2 border-black/25 bg-black/15 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider">
                Also hand over
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.collect.map((line) => (
                  <li key={line.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      {line.quantity > 1 && `${line.quantity} × `}
                      {line.name}
                      {line.variant && (
                        <span className="ml-1.5 rounded bg-black/20 px-1.5 py-0.5 text-xs">
                          {line.variant}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => onCollect(line.id)}
                      disabled={collecting.includes(line.id)}
                      className="shrink-0 rounded-[3px] bg-black/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors hover:bg-black/40 disabled:opacity-50"
                    >
                      {collecting.includes(line.id) ? "…" : "Given"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 rounded-[3px] bg-black/15 py-2.5 text-xs font-bold transition-colors hover:bg-black/25"
        >
          Next
        </button>
        {result.outcome === "admitted" && (
          <button
            onClick={onUndo}
            className="flex items-center justify-center gap-1.5 rounded-[3px] bg-black/15 px-4 py-2.5 text-xs font-bold transition-colors hover:bg-black/25"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
