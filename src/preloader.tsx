import { useEffect, useRef } from "react";
import { Silhouette } from "./Silhouette";

type Props = { toScale: number; toY: number };

export default function Preloader({ toScale, toY }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current!;
    let t0 = 0;
    let rafId = 0;

    const DUR = 2000; // общая длительность
    const DELAY = 0.2; // процент сколько держать белое в центре
    const fromScale = 0.25;
    const fromY = 0;

    const ease = (x: number) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    function tick(t: number) {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / DUR); // 0..1
      const e = ease(p);

      // масштаб и сдвиг
      const s = fromScale + (toScale - fromScale) * e;
      const y = fromY + (toY - fromY) * e;

      // прогресс «после задержки»: 0 до DELAY, затем 0→1
      const delayed = clamp01((e - DELAY) / (1 - DELAY));

      // цвет для маски: 255 (белый) → 0 (чёрный)
      const grey = Math.round(255 * (1 - delayed));

      // непрозрачность белой «затычки» поверх: 1 → 0
      const whiteOpacity = 1 - delayed;

      el.style.setProperty("--scale", String(s));
      el.style.setProperty("--shiftY", `${y}%`); // ✅ фикс твоей интерполяции
      el.style.setProperty("--grey", String(grey));
      el.style.setProperty("--whiteOpacity", String(whiteOpacity));

      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // скрываем прелоадер после завершения
        el.style.display = "none";
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [toScale, toY]);

  return (
    <div
      ref={rootRef}
      style={
        {
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "none",
          // стартовые значения переменных
          "--scale": 0.25,
          "--shiftY": "0%",
          "--grey": 255,
          "--whiteOpacity": 1,
        } as React.CSSProperties
      }>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 2309 1877"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}>
        <defs>
          <mask
            id="reveal"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="2309"
            height="1877">
            <rect x="0" y="0" width="2309" height="1877" fill="white" />
            {/* тот же силуэт — внутри маски, с серым цветом из CSS-переменной */}
            <Silhouette fill={`rgb(var(--grey), var(--grey), var(--grey))`} />
          </mask>
        </defs>

        {/* бежевый фон, который «открывается» по маске */}
        <rect
          x="0"
          y="0"
          width="2309"
          height="1877"
          fill="#F6EEDD"
          mask="url(#reveal)"
        />

        {/* белая «затычка» поверх, постепенно исчезает */}
        <g style={{ opacity: "var(--whiteOpacity)" }}>
          <Silhouette fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
