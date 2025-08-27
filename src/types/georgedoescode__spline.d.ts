// src/types/georgedoescode__spline.d.ts
declare module "@georgedoescode/spline" {
    export type Point = { x: number; y: number };

    /**
     * Возвращает строку path d (SVG) по массиву точек.
     * @param points массив точек {x,y}
     * @param tension 0..1 (обычно 1)
     * @param close замкнуть путь
     */
    export function spline(
        points: Point[],
        tension?: number,
        close?: boolean
    ): string;
}
