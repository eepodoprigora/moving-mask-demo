import { create } from 'zustand';

type State = {
    appReady: boolean;
};

type Action = {
    setAppReady: (value: boolean) => void;
};

export const useAppStore = create<State & Action>((set) => ({
    appReady: false,
    setAppReady: (value) => set({ appReady: value }),
}));
