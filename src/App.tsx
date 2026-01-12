import { useRef } from "react";
import { MaskedClipCursorDeform } from "@/components/MaskedClipCursorDeform";
import Preloader from "@/components/Preloader";
import { useAppStore } from "@/model/app-ready";
import { Hero } from "@/components/Hero";
import "./App.scss";

export const App = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appReady = useAppStore((s) => s.appReady);
  return (
    <div className="main">
      <Preloader />
      <div className="first-block" ref={containerRef}>
        <MaskedClipCursorDeform animate={appReady} containerRef={containerRef}>
          <Hero />
        </MaskedClipCursorDeform>
      </div>
    </div>
  );
};
