import "./App.scss";
import BlockMaskInteractive from "./BlockMaskInteractive";
import Preloader from "./preloader";

export default function App() {
  const toScale = 1.1;
  const toY = 12;
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Preloader toScale={toScale} toY={toY} />
      <div className="first-block">
        <img className="first-image" src="image.jpg" />
        <BlockMaskInteractive
          scale={toScale}
          shiftYPercent={toY}
          strength={26}
          radius={160}
          color={0xf6eedd}
        />
      </div>
    </div>
  );
}
