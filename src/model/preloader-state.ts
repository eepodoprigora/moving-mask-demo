import { create } from 'zustand';
import { MASK_PRELOADER_SCALE } from './const';

type State = {
    preloaderScale: number;
    preloaderShiftX: number;
    preloaderShiftY: number;
    preloaderWidth: number;
    preloaderHeight: number;
};

type Action = {
    setPreloaderScale: (value: number) => void;
    setPreloaderShiftX: (value: number) => void;
    setPreloaderShiftY: (value: number) => void;
    setPreloaderWidth: (value: number) => void;
    setPreloaderHeight: (value: number) => void;
};

export const usePreloaderStore = create<State & Action>((set) => ({
    preloaderScale: MASK_PRELOADER_SCALE,
    preloaderShiftX: 7,
    preloaderShiftY: 10,
    preloaderWidth: 1263,
    preloaderHeight: 1012,

    setPreloaderScale: (value) => set({ preloaderScale: value }),
    setPreloaderShiftX: (value) => set({ preloaderShiftX: value }),
    setPreloaderShiftY: (value) => set({ preloaderShiftY: value }),
    setPreloaderWidth: (value) => set({ preloaderWidth: value }),
    setPreloaderHeight: (value) => set({ preloaderHeight: value }),
}));
