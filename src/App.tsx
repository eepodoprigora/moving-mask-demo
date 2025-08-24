import "./App.scss";
import MaskedImageCursorDeform from "./MaskedImageCursorDeform";
import Preloader from "./preloader";
// import MaskedImageNoise from "./SvgCursorMorphMask";

export default function App() {
  const toScale = 1.1;
  const toY = 12;
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Preloader toScale={toScale} toY={toY} />
      <div className="first-block">
        {/* <img className="first-image" src="image.jpg" /> */}
        {/* <MaskedImageNoise src="image.jpg" scale={toScale} shiftYPercent={toY} />
         */}
        <MaskedImageCursorDeform
          src="/image.jpg" // <-- твоя картинка (из public или импортом)
          scale={toScale} // чтобы совпадало с прелоадером
          shiftYPercent={toY}
          radius={300} // радиус влияния курсора
          strength={0.25} // сила притяжения точек
          debug={false} // включи true, если хочешь видеть розовый контур
        />
      </div>
    </div>
  );
}
