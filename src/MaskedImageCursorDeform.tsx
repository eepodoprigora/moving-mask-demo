// MaskedImageCursorDeform.tsx
import { useEffect, useMemo, useRef } from "react";
import { spline } from "@georgedoescode/spline";
import { PATH_D } from "./Silhouette";

type Props = {
  src: string;
  scale?: number; // как в прелоадере (примерно 1.1)
  shiftYPercent?: number; // как в прелоадере (примерно 12)
  samples?: number; // сколько точек по периметру (качество/нагрузка)
  radius?: number; // радиус влияния курсора (в координатах viewBox 2309x1877)
  strength?: number; // 0..1 — насколько сильно тянем точки к курсору
  debug?: boolean; // показать розовый контур-оверлей
};

// фиксированная система координат — та же, что в прелоадере
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
  radius = 260,
  strength = 0.25,
  debug = false,
}: Props) {
  const clipId = useMemo(
    () => "clip_" + Math.random().toString(36).slice(2),
    []
  );
  const pathRef = useRef<SVGPathElement>(null); // текущий деформированный путь (в клипе)
  const debugPathRef = useRef<SVGPathElement>(null); // розовый контур (опционально)
  const clipRef = useRef<SVGClipPathElement>(null); // чтобы повесить transform (scale+shift)
  const restPtsRef = useRef<Pt[]>([]); // исходные точки по периметру (в coords PATH_D)
  const haveMouse = useRef(false);

  // 1) Семплим исходный путь в точки (один раз)
  useEffect(() => {
    // создаём временный path, чтобы воспользоваться getTotalLength()
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", PATH_D);

    const total = p.getTotalLength();
    const pts: Pt[] = [];
    for (let i = 0; i < samples; i++) {
      const l = (i / samples) * total;
      const { x, y } = p.getPointAtLength(l);
      pts.push({ x, y });
    }
    restPtsRef.current = pts;
  }, [samples]);

  // 2) Вешаем transform на сам clipPath (как в рабочем варианте А)
  useEffect(() => {
    const shiftPx = (shiftYPercent / 100) * VBH;
    clipRef.current?.setAttribute(
      "transform",
      `translate(${VBCX},${VBCY}) translate(0,${shiftPx}) scale(${scale}) translate(${-VBCX},${-VBCY})`
    );
  }, [scale, shiftYPercent]);

  // 3) Обработчики курсора — деформация только при движении внутри SVG
  useEffect(() => {
    const svg = pathRef.current?.ownerSVGElement;
    if (!svg || !pathRef.current) return;

    const toViewBox = (evt: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      // координаты курсора в системе viewBox (2309x1877)
      const x = ((evt.clientX - r.left) / r.width) * VBW;
      const y = ((evt.clientY - r.top) / r.height) * VBH;
      return { x, y };
    };

    const inverseTransform = (vx: number, vy: number) => {
      // у нас клип смещён/масштабирован:
      // M = T(VBC) * Ty(shift) * S(scale) * T(-VBC)
      // инвертируем: T(VBC) * S(1/scale) * Ty(-shift) * T(-VBC)
      const shiftPx = (shiftYPercent / 100) * VBH;
      // в «центрированные» координаты:
      let x = vx - VBCX;
      let y = vy - VBCY;
      // убираем сдвиг по Y:
      y -= shiftPx;
      // убираем масштаб:
      x /= scale;
      y /= scale;
      // возвращаем из центра
      x += VBCX;
      y += VBCY;
      return { x, y };
    };

    const deformOnce = (evt: PointerEvent) => {
      const pth = pathRef.current!;
      const dbg = debugPathRef.current;

      const { x: vx, y: vy } = toViewBox(evt); // курсор в координатах viewBox
      const { x: cx, y: cy } = inverseTransform(vx, vy); // приводим к «исходным» coords PATH_D

      const base = restPtsRef.current;
      if (!base.length) return;

      const r2 = radius * radius;
      const pulled: Pt[] = new Array(base.length);

      for (let i = 0; i < base.length; i++) {
        const p0 = base[i];
        const dx = cx - p0.x;
        const dy = cy - p0.y;
        const d2 = dx * dx + dy * dy;

        if (d2 > r2) {
          pulled[i] = p0;
        } else {
          const d = Math.sqrt(d2);
          const nx = dx / (d || 1); // нормализованный вектор от курсора
          const ny = dy / (d || 1);

          // вес: максимум под курсором, плавное затухание
          //   const w = Math.exp(-d2 / (2 * r2));

          // глубина прогиба: тем больше, чем ближе к центру
          const depth = strength * (1 - d / radius) ** 2 * 10;

          pulled[i] = {
            x: p0.x + nx * depth * 40, // 40 = масштаб пикселей (подбери под вкус)
            y: p0.y + ny * depth * 40,
          };
        }
      }

      const d = spline(pulled, 1, true);
      pth.setAttribute("d", d);
      if (debug && dbg) dbg.setAttribute("d", d);
    };

    const onEnter = () => {
      haveMouse.current = true;
      // при входе — сбрасываем в исходную форму
      const d0 = spline(restPtsRef.current, 1, true);
      pathRef.current!.setAttribute("d", d0);
      if (debug && debugPathRef.current)
        debugPathRef.current.setAttribute("d", d0);
    };
    const onMove = (e: PointerEvent) => {
      if (!haveMouse.current) return;
      deformOnce(e);
    };
    const onLeave = () => {
      haveMouse.current = false;
      // вернуть исходную форму
      const d0 = spline(restPtsRef.current, 1, true);
      pathRef.current!.setAttribute("d", d0);
      if (debug && debugPathRef.current)
        debugPathRef.current.setAttribute("d", d0);
    };

    svg.addEventListener("pointerenter", onEnter);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);

    // начальный d = исходный (на случай, если курсора нет)
    const d0 = spline(restPtsRef.current, 1, true);
    pathRef.current!.setAttribute("d", d0);
    if (debug && debugPathRef.current)
      debugPathRef.current.setAttribute("d", d0);

    return () => {
      svg.removeEventListener("pointerenter", onEnter);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerleave", onLeave);
    };
  }, [scale, shiftYPercent, radius, strength, debug]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
      <svg
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
          {/* КЛЮЧ: transform вешаем прямо на clipPath (это рабочий кейс у тебя) */}
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse" ref={clipRef}>
            <path ref={pathRef} d="" fill="white" />
          </clipPath>
        </defs>

        {/* бежевый фон вокруг маски */}
        <rect x="0" y="0" width={VBW} height={VBH} fill="#F6EEDD" />

        {/* картинка, режем клипом */}
        <g clipPath={`url(#${clipId})`}>
          <image
            href={src}
            xlinkHref={src as string}
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
