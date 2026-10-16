"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Record the actual WebGL performance and local audio; no camera, mic or upload. */
export function useAvatarRecording() {
  const [recording, setRecording] = useState(false);
  const [download, setDownload] = useState<string>();
  const [recordError, setRecordError] = useState("");
  const cleanup = useRef<() => void>(() => {});
  const url = useRef<string | undefined>(undefined);
  const audioGraph = useRef<
    | {
        context: AudioContext;
        source: MediaElementAudioSourceNode;
        destination: MediaStreamAudioDestinationNode;
      }
    | undefined
  >(undefined);
  useEffect(
    () => () => {
      cleanup.current();
      if (url.current) URL.revokeObjectURL(url.current);
      void audioGraph.current?.context.close();
    },
    [],
  );
  const record = useCallback(
    async (canvas: HTMLCanvasElement, audio: HTMLAudioElement) => {
      setRecordError("");
      if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
        setRecordError(
          "Video export is unavailable in this browser. The interactive preview still works.",
        );
        return;
      }
      cleanup.current();
      if (url.current) URL.revokeObjectURL(url.current);
      setDownload(undefined);
      try {
        const context = audioGraph.current?.context ?? new AudioContext();
        if (!audioGraph.current) {
          const source = context.createMediaElementSource(audio);
          const destination = context.createMediaStreamDestination();
          source.connect(destination);
          source.connect(context.destination);
          audioGraph.current = { context, source, destination };
        }
        await context.resume();
        const output = document.createElement("canvas");
        output.width = 800;
        output.height = 900;
        const ctx = output.getContext("2d");
        if (!ctx) throw new Error("Could not create the recording canvas.");
        let raf = 0;
        const paint = () => {
          ctx.fillStyle = "#f4f2f5";
          ctx.fillRect(0, 0, 800, 900);
          const factor = Math.min(800 / canvas.width, 810 / canvas.height);
          const w = canvas.width * factor,
            h = canvas.height * factor;
          ctx.drawImage(canvas, (800 - w) / 2, (810 - h) / 2, w, h);
          ctx.fillStyle = "#39323f";
          ctx.font = "22px sans-serif";
          ctx.fillText("AI Ubaid · Conversation study", 36, 846);
          ctx.fillStyle = "#817789";
          ctx.font = "15px sans-serif";
          ctx.fillText("Real 3D performance · synthetic system voice", 36, 874);
          raf = requestAnimationFrame(paint);
        };
        paint();
        const video = output.captureStream(30);
        const stream = new MediaStream([
          ...video.getVideoTracks(),
          ...audioGraph.current.destination.stream.getAudioTracks(),
        ]);
        const mimeType = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/mp4",
        ].find((m) => MediaRecorder.isTypeSupported(m));
        const recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 4_000_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        const finish = () => {
          if (recorder.state !== "inactive") recorder.stop();
        };
        audio.addEventListener("ended", finish, { once: true });
        recorder.onstop = () => {
          cancelAnimationFrame(raf);
          video.getTracks().forEach((t) => t.stop());
          audio.removeEventListener("ended", finish);
          const blob = new Blob(chunks, { type: recorder.mimeType });
          url.current = URL.createObjectURL(blob);
          setDownload(url.current);
          setRecording(false);
        };
        cleanup.current = finish;
        audio.currentTime = 0;
        recorder.start(1000);
        setRecording(true);
        await audio.play();
      } catch (error) {
        cleanup.current();
        setRecording(false);
        setRecordError(
          error instanceof Error
            ? error.message
            : "Could not record the preview.",
        );
      }
    },
    [],
  );
  return {
    recording,
    download,
    recordError,
    record,
    stopRecording: () => cleanup.current(),
  };
}
