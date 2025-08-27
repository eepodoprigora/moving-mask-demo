// MaskedImageCursorDeform.tsx
// Мягкое «дыхание» маски (SimplexNoise по кольцу) + плавное смещение всей маски за курсором.

import { useEffect, useMemo, useRef } from "react";
import { spline } from "@georgedoescode/spline";
import SimplexNoise from "simplex-noise";
import { PATH_D } from "./Silhouette";

type Props = {
  src: string;
  scale?: number; // ~1.1
  shiftYPercent?: number; // ~12
  samples?: number; // кол-во точек контура
  noiseAmplitude?: number; // амплитуда «дыхания» в px
  noiseSpeed?: number; // скорость анимации нойза (0.0003..0.001)
  shapeLerp?: number; // временное сглаживание формы (0..1), меньше = нежнее
  spatialSmoothPasses?: number; // кол-во проходов сглаживания по контуру (0..2)
  moveRangePx?: number; // макс. смещение маски курсором
  moveLerp?: number; // сглаживание движения маски (0..1)
  debug?: boolean;
};

// Фиксированный viewBox как в прелоадере
const VBW = 2309;
const VBH = 1877;
const VBCX = VBW / 2;
const VBCY = VBH / 2;

type Pt = { x: number; y: number };

export default function MaskedImageCursorDeform({
  src,
  scale = 1.1,
  shiftYPercent = 12,
  samples = 220,
  noiseAmplitude = 12,
  noiseSpeed = 0.0005,
  shapeLerp = 0.08,
  spatialSmoothPasses = 1,
  moveRangePx = 40,
  moveLerp = 0.1,
  debug = false,
}: Props) {
  const clipId = useMemo(
    () => "clip_" + Math.random().toString(36).slice(2),
    []
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const debugPathRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGClipPathElement>(null);

  const basePtsRef = useRef<Pt[]>([]);
  const prevPtsRef = useRef<Pt[]>([]);
  const rafRef = useRef<number | null>(null);

  // целевое смещение маски ([-1..1] от центра), и сглаженное смещение (в пикселях)
  const mouseTargetRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const mouseSmoothRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- utils ---
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const smoothCircular = (pts: Pt[], passes: number): Pt[] => {
    if (passes <= 0) return pts;
    const kernel = [0.25, 0.5, 0.25]; // лёгкое ядро
    const n = pts.length;
    let cur = pts;
    for (let p = 0; p < passes; p++) {
      const out = new Array<Pt>(n);
      for (let i = 0; i < n; i++) {
        const i0 = (i - 1 + n) % n;
        const i1 = i;
        const i2 = (i + 1) % n;
        out[i] = {
          x:
            cur[i0].x * kernel[0] +
            cur[i1].x * kernel[1] +
            cur[i2].x * kernel[2],
          y:
            cur[i0].y * kernel[0] +
            cur[i1].y * kernel[1] +
            cur[i2].y * kernel[2],
        };
      }
      cur = out;
    }
    return cur;
  };

  // 1) Семплируем базовый PATH_D в точки
  useEffect(() => {
    const tmp = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tmp.setAttribute("d", PATH_D);

    const total = tmp.getTotalLength();
    const pts: Pt[] = [];
    for (let i = 0; i < samples; i++) {
      const l = (i / samples) * total;
      const { x, y } = tmp.getPointAtLength(l);
      pts.push({ x, y });
    }
    basePtsRef.current = pts;
    prevPtsRef.current = pts.map((p) => ({ ...p }));

    const d0 = spline(pts, 1, true);
    pathRef.current?.setAttribute("d", d0);
    if (debug && debugPathRef.current)
      debugPathRef.current.setAttribute("d", d0);
  }, [samples, debug]);

  // 2) Движение курсора: целевое смещение от центра
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = (e.clientX - cx) / (r.width / 2) || 0;
      const ny = (e.clientY - cy) / (r.height / 2) || 0;
      mouseTargetRef.current.nx = Math.max(-1, Math.min(1, nx));
      mouseTargetRef.current.ny = Math.max(-1, Math.min(1, ny));
    };

    const resetToCenter = () => {
      mouseTargetRef.current.nx = 0;
      mouseTargetRef.current.ny = 0;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", resetToCenter);
    el.addEventListener("pointercancel", resetToCenter);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", resetToCenter);
      el.removeEventListener("pointercancel", resetToCenter);
    };
  }, []);

  // 3) Анимация: мягкий кольцевой нойз + плавный сдвиг маски
  useEffect(() => {
    const noise = new SimplexNoise();

    const tick = (tMs: number) => {
      const t = tMs * noiseSpeed;

      // сглаживаем смещение маски к цели
      const target = mouseTargetRef.current;
      const cur = mouseSmoothRef.current;
      const tx = target.nx * moveRangePx;
      const ty = target.ny * moveRangePx;
      cur.x = lerp(cur.x, tx, moveLerp);
      cur.y = lerp(cur.y, ty, moveLerp);

      // transform для clipPath: курсорный translate -> центр/shift/scale
      const shiftPx = (shiftYPercent / 100) * VBH;
      if (clipRef.current) {
        clipRef.current.setAttribute(
          "transform",
          `translate(${cur.x},${cur.y}) ` +
            `translate(${VBCX},${VBCY}) translate(0,${shiftPx}) ` +
            `scale(${scale}) translate(${-VBCX},${-VBCY})`
        );
      }

      // --- МЯГКИЙ КОНТУР ---
      // 1) «Кольцевой» нойз: берем фазу по окружности, чтобы вдоль контура было гладко
      const base = basePtsRef.current;
      const nPts = base.length;
      const targetPts: Pt[] = new Array(nPts);

      for (let i = 0; i < nPts; i++) {
        const p0 = base[i];
        // нормаль наружу от центра
        const vx = p0.x - VBCX;
        const vy = p0.y - VBCY;
        const len = Math.hypot(vx, vy) || 1;
        const nx = vx / len;
        const ny = vy / len;

        // угол точки на «кольце»
        const ang = (i / nPts) * Math.PI * 2;

        // шум вдоль окружности + время — очень плавный, без рваных переходов по индексу
        const n = noise.noise2D(Math.cos(ang) + t, Math.sin(ang) - t); // [-1..1]
        const offs = n * noiseAmplitude;

        targetPts[i] = { x: p0.x + nx * offs, y: p0.y + ny * offs };
      }

      // 2) Пространственное сглаживание контура (по желанию)
      const spatial =
        spatialSmoothPasses > 0
          ? smoothCircular(targetPts, spatialSmoothPasses)
          : targetPts;

      // 3) Временное сглаживание (пер-пойнтовый low-pass к предыдущей форме)
      const prev = prevPtsRef.current;
      const out: Pt[] = new Array(nPts);
      for (let i = 0; i < nPts; i++) {
        out[i] = {
          x: lerp(prev[i].x, spatial[i].x, shapeLerp),
          y: lerp(prev[i].y, spatial[i].y, shapeLerp),
        };
      }
      prevPtsRef.current = out;

      const d = spline(out, 1, true);
      pathRef.current?.setAttribute("d", d);
      if (debug && debugPathRef.current)
        debugPathRef.current.setAttribute("d", d);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    scale,
    shiftYPercent,
    noiseAmplitude,
    noiseSpeed,
    shapeLerp,
    spatialSmoothPasses,
    moveRangePx,
    moveLerp,
    debug,
  ]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}>
        <defs>
          {/* transform вешаем на clipPath: scale/shift + курсорный сдвиг */}
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse" ref={clipRef}>
            <path ref={pathRef} d="" fill="white" />
          </clipPath>
        </defs>

        {/* фон вокруг маски */}
        <rect x="0" y="0" width={VBW} height={VBH} fill="#F6EEDD" />

        {/* изображение, обрезанное маской */}
        <g clipPath={`url(#${clipId})`}>
          <image
            href={src}
            x="0"
            y="0"
            width={VBW}
            height={VBH}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>

        {debug && (
          <path
            ref={debugPathRef}
            d=""
            fill="none"
            stroke="hotpink"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
