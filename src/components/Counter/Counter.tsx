import {
  MotionValue,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect } from "react";

type Props = {
  duration: number;
};

export const Counter = ({ duration }: Props) => {
  const progress = useMotionValue(0);

  useEffect(() => {
    const controls = animate(progress, 100, {
      duration: duration / 1000,
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [progress, duration]);

  const places = [100, 10, 1];

  return (
    <div className="odometer h1">
      {places.map((place) => (
        <Digit key={place} place={place} mv={progress} />
      ))}
      <span className="odometer__suffix">%</span>
    </div>
  );
};

function Digit({ place, mv }: { place: number; mv: MotionValue<number> }) {
  const rounded = useTransform(mv, (v) => Math.floor(v / place));
  const smoothed = useSpring(rounded, { stiffness: 100, damping: 20, mass: 1 });

  return (
    <div className="odometer__digit">
      {Array.from({ length: 10 }, (_, n) => (
        <Glyph key={n} mv={smoothed} n={n} />
      ))}
    </div>
  );
}

function Glyph({ mv, n }: { mv: MotionValue<number>; n: number }) {
  const lineEm = 0.9;

  const y = useTransform(mv, (val) => {
    const current = val % 10;
    const offset = (10 + n - current) % 10;
    let em = offset * lineEm;
    if (offset > 5) em -= 10 * lineEm;
    return `${em}em`;
  });

  return (
    <motion.span className="odometer__glyph" style={{ y }}>
      {n}
    </motion.span>
  );
}
