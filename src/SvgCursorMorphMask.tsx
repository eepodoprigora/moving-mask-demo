// MaskedImageNoise.tsx
import { useEffect, useMemo, useRef } from "react";
import SimplexNoise from "simplex-noise";
import { PATH_D } from "./Silhouette";

type Props = {
  src: string;
  scale?: number;
  shiftYPercent?: number;
  debug?: boolean;
};

const VBW = 2309;
const VBH = 1877;
const VBCX = VBW / 2;
const VBCY = VBH / 2;

export default function MaskedImageNoise({
  src,
  scale = 1.1,
  shiftYPercent = 12,
  debug = false,
}: Props) {
  const clipId = useMemo(
    () => "clip_" + Math.random().toString(36).slice(2),
    []
  );
  const clipRef = useRef<SVGClipPathElement>(null);

  useEffect(() => {
    const el = clipRef.current!;
    const simplex = new SimplexNoise();
    let raf = 0;
    const shiftPx = (shiftYPercent / 100) * VBH;

    const loop = (t: number) => {
      const n = simplex.noise2D(t * 0.0003, 0); // [-1..1]
      const breathe = 1 + n * 0.03; // ±3%
      const k = scale * breathe;

      // КЛЮЧ: transform прямо на <clipPath>, не на его потомках
      el.setAttribute(
        "transform",
        `translate(${VBCX},${VBCY}) translate(0,${shiftPx}) scale(${k}) translate(${-VBCX},${-VBCY})`
      );

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scale, shiftYPercent]);

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
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse" ref={clipRef}>
            {/* явный fill на всякий случай */}
            <path d={PATH_D} fill="white" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width={VBW} height={VBH} fill="#F6EEDD" />

        {/* вешаем клип на группу */}
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
          <g
            transform={`translate(${VBCX},${VBCY}) translate(0,${
              (shiftYPercent / 100) * VBH
            }) scale(${scale}) translate(${-VBCX},${-VBCY})`}>
            <path d={PATH_D} fill="none" stroke="hotpink" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}
