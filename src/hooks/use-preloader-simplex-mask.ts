import { useEffect, useMemo, useRef } from 'react';
import SimplexNoise from 'simplex-noise';
import { usePreloaderStore } from '@/model/preloader-state';
import { PRELOADER_PATH } from '@/model/const';


type Pt = { x: number; y: number };

export type MaskOptions = {
    containerRef: React.RefObject<HTMLElement | SVGSVGElement | null>;
    points?: number;
    animate?: boolean;
    strength?: number;
    sigma?: number;
    repel?: boolean;
    fillClassName?: string;
    seed?: string;
};

export function usePreloaderSimplexMask({
    containerRef,
    points = 1000,
    animate = true,
    strength = 26,
    sigma = 150,
    repel = true,
    fillClassName = 'masked-clip__fill',
    seed = 'preloader-simplex',
}: MaskOptions) {
    const vbW = usePreloaderStore((s) => s.preloaderWidth);
    const vbH = usePreloaderStore((s) => s.preloaderHeight);
    const baseScale = usePreloaderStore((s) => s.preloaderScale);
    const baseShiftX = usePreloaderStore((s) => s.preloaderShiftX);
    const baseShiftY = usePreloaderStore((s) => s.preloaderShiftY);

    const cx = vbW / 2;
    const cy = vbH / 2;
    const shiftXpx = (baseShiftX / 100) * vbW;
    const shiftYpx = (baseShiftY / 100) * vbH;

    const maskTransform = `translate(${cx + shiftXpx},${cy + shiftYpx}) scale(${baseScale}) translate(-${cx},-${cy})`;
    const inverseTransform = (vx: number, vy: number) => ({
        x: (vx - (cx + shiftXpx)) / baseScale + cx,
        y: (vy - (cy + shiftYpx)) / baseScale + cy,
    });

    const maskId = 'mask_simplex';
    const pathRef = useRef<SVGPathElement | null>(null);

    const simplex = useMemo(() => new SimplexNoise(seed), [seed]);

    const centerRef = useRef<Pt>({ x: 0, y: 0 });
    const taRef = useRef<{
        dirX: Float32Array;
        dirY: Float32Array;
        baseR: Float32Array;
        u: Float32Array;
        bx: Float32Array;
        by: Float32Array;
    } | null>(null);
    const bufRef = useRef<{ outX: Float32Array; outY: Float32Array; prevX: Float32Array; prevY: Float32Array } | null>(
        null,
    );

    const curTarget = useRef<Pt>({ x: vbW / 2, y: vbH / 2 });
    const curSmooth = useRef<Pt>({ x: vbW / 2, y: vbH / 2 });
    const presence = useRef(0);
    const lastActiveMs = useRef(0);

    const tRef = useRef(0);
    const lastTs = useRef(0);
    const ampRamp = useRef(0);

    const NOISE_AMPL = 18;
    const NOISE_FREQ = 0.012;
    const NOISE_SPEED = 0.22;
    const RAMP_MS = 300;
    const CURSOR_FOLLOW = 0.12;
    const DEBOUNCE_MS = 220;
    const PRESENCE_RISE = 0.35;
    const PRESENCE_FALL = 0.12;
    const RETURN_BOOST = 0.14;
    const SHAPE_SMOOTH = 0.38;

    const fDt = (k60: number, dt: number) => 1 - Math.pow(1 - k60, dt * 60);

    const pathFromXY = (x: Float32Array, y: Float32Array) => {
        let d = `M${x[0].toFixed(1)},${y[0].toFixed(1)}`;
        for (let i = 1; i < x.length; i++) d += ` L${x[i].toFixed(1)},${y[i].toFixed(1)}`;
        return d + ' Z';
    };

    useEffect(() => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', PRELOADER_PATH);
        const L = p.getTotalLength();

        const tx = new Float32Array(points);
        const ty = new Float32Array(points);
        for (let i = 0; i < points; i++) {
            const q = p.getPointAtLength((i / points) * L);
            tx[i] = q.x;
            ty[i] = q.y;
        }
        const cxx = tx.reduce((s, v) => s + v, 0) / points;
        const cyy = ty.reduce((s, v) => s + v, 0) / points;
        centerRef.current = { x: cxx, y: cyy };

        const dirX = new Float32Array(points);
        const dirY = new Float32Array(points);
        const baseR = new Float32Array(points);
        const u = new Float32Array(points);
        const bx = new Float32Array(points);
        const by = new Float32Array(points);

        for (let i = 0; i < points; i++) {
            const dx = tx[i] - cxx,
                dy = ty[i] - cyy;
            const len = Math.max(1e-6, Math.hypot(dx, dy));
            dirX[i] = dx / len;
            dirY[i] = dy / len;
            baseR[i] = Math.hypot(dx, dy);
            u[i] = i * NOISE_FREQ;
            bx[i] = cxx + dirX[i] * baseR[i];
            by[i] = cyy + dirY[i] * baseR[i];
        }

        const outX = new Float32Array(points);
        const outY = new Float32Array(points);
        const prevX = new Float32Array(points);
        const prevY = new Float32Array(points);
        for (let i = 0; i < points; i++) {
            prevX[i] = bx[i];
            prevY[i] = by[i];
        }

        taRef.current = { dirX, dirY, baseR, u, bx, by };
        bufRef.current = { outX, outY, prevX, prevY };

        pathRef.current?.setAttribute('d', pathFromXY(prevX, prevY));

        tRef.current = 0;
        lastTs.current = 0;
        ampRamp.current = 0;

        return () => { };
    }, [points]);

    useEffect(() => {
        const el = containerRef?.current;
        let cleanup = () => { };
        if (el) {
            const onMove: EventListener = (e) => {
                if (!(e instanceof PointerEvent)) return;

                const r = el.getBoundingClientRect();
                curTarget.current = inverseTransform(
                    ((e.clientX - r.left) / r.width) * vbW,
                    ((e.clientY - r.top) / r.height) * vbH,
                );
                lastActiveMs.current = performance.now();
            };
            el.addEventListener('pointermove', onMove, { passive: true });
            cleanup = () => el.removeEventListener('pointermove', onMove);
        }
        return cleanup;
    }, [containerRef, vbW, vbH, baseScale, baseShiftX, baseShiftY]);

    useEffect(() => {
        let rafId = 0;
        const tick = (now: number) => {
            if (!lastTs.current) lastTs.current = now;
            const dt = Math.min(0.033, (now - lastTs.current) / 1000);
            lastTs.current = now;

            const aCur = fDt(CURSOR_FOLLOW, dt);
            curSmooth.current.x += (curTarget.current.x - curSmooth.current.x) * aCur;
            curSmooth.current.y += (curTarget.current.y - curSmooth.current.y) * aCur;

            const inactive = now - lastActiveMs.current > DEBOUNCE_MS;
            const trg = inactive ? 0 : 1;
            const aP = fDt(trg > presence.current ? PRESENCE_RISE : PRESENCE_FALL, dt);
            presence.current += (trg - presence.current) * aP;

            tRef.current += NOISE_SPEED * dt;
            ampRamp.current = RAMP_MS > 0 ? Math.min(1, ampRamp.current + dt / (RAMP_MS / 1000)) : 1;
            const ampNow = NOISE_AMPL * ampRamp.current;

            const ta = taRef.current;
            const buf = bufRef.current;
            if (ta && buf) {
                const { dirX, dirY, baseR, u, bx, by } = ta;
                const { outX, outY, prevX, prevY } = buf;
                const n = baseR.length;
                const inv2Sig2 = 1 / (2 * sigma * sigma);
                const sgn = repel ? 1 : -1;
                const aShape = fDt(SHAPE_SMOOTH + (trg === 0 ? RETURN_BOOST * presence.current : 0), dt);
                const ux = curSmooth.current.x,
                    uy = curSmooth.current.y;
                const c = centerRef.current;

                for (let i = 0; i < n; i++) {
                    const rBreath = baseR[i] + simplex.noise2D(u[i], tRef.current) * ampNow;
                    const dx = bx[i] - ux,
                        dy = by[i] - uy;
                    const w = Math.exp(-(dx * dx + dy * dy) * inv2Sig2) * presence.current;
                    const r = Math.max(2, rBreath + sgn * strength * w);
                    const tx = c.x + dirX[i] * r;
                    const ty = c.y + dirY[i] * r;
                    outX[i] = prevX[i] + (tx - prevX[i]) * aShape;
                    outY[i] = prevY[i] + (ty - prevY[i]) * aShape;
                    prevX[i] = outX[i];
                    prevY[i] = outY[i];
                }
                pathRef.current?.setAttribute('d', pathFromXY(outX, outY));
            }
            rafId = requestAnimationFrame(tick);
        };
        if (animate) rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [animate, points, strength, sigma, repel]);

    return { vbW, vbH, maskId, maskTransform, fillClassName, pathRef };
}
