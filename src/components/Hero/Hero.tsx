import { useAppStore } from "@/model/app-ready";
import image from "/image.jpg";
import classNames from "classnames";

export const Hero = () => {
  const appReady = useAppStore((s) => s.appReady);
  return (
    <div className="hero">
      <div
        className={classNames("hero__text", { "hero__text--ready": appReady })}>
        <h1 className="hero__header">Интерактивная маска</h1>
        <p className="hero__descr">
          Двигайтесь к границе и наблюдайте реакцию.
        </p>
      </div>
      <img className="hero__image" src={image}></img>
    </div>
  );
};
