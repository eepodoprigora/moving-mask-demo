import { useCallback, useEffect, useRef, useState } from "react";

import { usePreloaderStore } from "@/model/preloader-state";
import { PreloaderSilhouette } from "@/components/PreloaderSilhouette";
import { Counter } from "@/components/Counter";
import { useAppStore } from "@/model/app-ready";

const Preloader = () => {
  const [visible, setVisible] = useState(true);
  const [targetScale, setTargetScale] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preloaderWidth = usePreloaderStore((s) => s.preloaderWidth);
  const preloaderHeight = usePreloaderStore((s) => s.preloaderHeight);
  const preloaderScaleFromStore = usePreloaderStore((s) => s.preloaderScale);
  const preloaderShiftX = usePreloaderStore((s) => s.preloaderShiftX);
  const preloaderShiftY = usePreloaderStore((s) => s.preloaderShiftY);
  const setAppReady = useAppStore((s) => s.setAppReady);

  const durationMs = 3500;
  const fadeDelayFraction = 0.4;
  const digitsDuration = durationMs * fadeDelayFraction;
  const startScale = 0.25;
  const startShiftXPercent = 0;
  const startShiftYPercent = 0;

  useEffect(() => {
    const s = preloaderScaleFromStore;
    setTargetScale(s ?? 1);
  }, [preloaderScaleFromStore]);

  const handleFinish = useCallback(() => {
    setVisible(false);
    setAppReady(true);
  }, [setAppReady]);

  useEffect(() => {
    if (!targetScale) return;
    const node = rootRef.current;
    if (!node) return;

    const interp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let startTs = 0;
    let rafId = 0;

    const frame = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const raw = elapsed / durationMs;
      const clamped = Math.min(1, raw);
      const eased = easeInOut(clamped);

      const scale = interp(startScale, targetScale, eased);
      const shiftX = interp(startShiftXPercent, preloaderShiftX, eased);
      const shiftY = interp(startShiftYPercent, preloaderShiftY, eased);

      const delayed = clamp01(
        (eased - fadeDelayFraction) / (1 - fadeDelayFraction)
      );
      const grey255 = Math.round(255 * (1 - delayed));
      const whiteOpacity = 1 - delayed;

      if (elapsed >= digitsDuration) node.classList.add("digits-finish");

      node.style.setProperty("--scale", String(scale));
      node.style.setProperty("--shiftX", `${shiftX}%`);
      node.style.setProperty("--shiftY", `${shiftY}%`);
      node.style.setProperty("--grey", String(grey255));
      node.style.setProperty("--whiteOpacity", String(whiteOpacity));

      if (clamped < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        node.classList.add("preloader--fadeout");
        hideTimer.current = setTimeout(handleFinish, 700);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      cancelAnimationFrame(rafId);
    };
  }, [
    targetScale,
    preloaderShiftX,
    preloaderShiftY,
    handleFinish,
    durationMs,
    digitsDuration,
    fadeDelayFraction,
    startScale,
    startShiftXPercent,
    startShiftYPercent,
  ]);

  return (
    visible && (
      <div
        className="preloader"
        ref={rootRef}
        style={
          {
            "--scale": 0.25,
            "--shiftX": "0%",
            "--shiftY": "0%",
            "--grey": 255,
            "--whiteOpacity": 1,
          } as React.CSSProperties
        }>
        <div className="counter-wrapper">
          <Counter duration={digitsDuration} />
        </div>

        <svg
          viewBox={`0 0 ${preloaderWidth} ${preloaderHeight}`}
          preserveAspectRatio="xMidYMid slice"
          className="preloader__wrapper">
          <defs>
            <mask
              id="reveal"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={preloaderWidth}
              height={preloaderHeight}>
              <rect
                x="0"
                y="0"
                width={preloaderWidth}
                height={preloaderHeight}
                fill="white"
              />
              <PreloaderSilhouette fill="rgb(var(--grey) var(--grey) var(--grey))" />
            </mask>
          </defs>

          <rect
            x="0"
            y="0"
            width={preloaderWidth}
            height={preloaderHeight}
            fill="#f6f0e3"
            mask="url(#reveal)"
          />
          <g style={{ opacity: "var(--whiteOpacity)" }}>
            <PreloaderSilhouette fill="#ECE6D8" />
          </g>
        </svg>
      </div>
    )
  );
};

export default Preloader;
