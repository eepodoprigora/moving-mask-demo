import classNames from "classnames";
import React, { useEffect, useRef } from "react";

import { type MaskOptions, usePreloaderSimplexMask } from "@/hooks";

type Props = React.HTMLAttributes<HTMLDivElement> &
  Pick<
    MaskOptions,
    | "containerRef"
    | "animate"
    | "points"
    | "strength"
    | "sigma"
    | "repel"
    | "fillClassName"
  > & {
    ref?: React.Ref<HTMLDivElement>;
  };

export const MaskedClipCursorDeform = ({
  containerRef,
  animate = true,
  points = 1000,
  strength = 26,
  sigma = 150,
  repel = true,
  fillClassName = "masked-clip__fill",
  children,
  className,
  ref,
  ...props
}: Props) => {
  const {
    vbW,
    vbH,
    maskId,
    maskTransform,
    pathRef,
    fillClassName: cls,
  } = usePreloaderSimplexMask({
    containerRef,
    animate,
    points,
    strength,
    sigma,
    repel,
    fillClassName,
  });
  const maskRef = useRef<SVGSVGElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!maskRef.current) return;
    const delay = 2500;
    timer.current = setTimeout(() => {
      maskRef.current?.classList.add("masked-clip__svg--active");
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div {...props} className={classNames("masked-clip", className)} ref={ref}>
      {children}
      <svg
        className="masked-clip__svg"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        ref={maskRef}>
        <defs>
          <mask
            id={maskId}
            x="0"
            y="0"
            width={vbW}
            height={vbH}
            maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={vbW} height={vbH} fill="white" />
            <path ref={pathRef} d="" fill="black" transform={maskTransform} />
          </mask>
        </defs>
        <rect x="0" y="0" width={vbW} height={vbH} fill="transparent" />
        <rect
          x="0"
          y="0"
          width={vbW}
          height={vbH}
          mask={`url(#${maskId})`}
          className={cls ?? fillClassName}
        />
      </svg>
    </div>
  );
};
