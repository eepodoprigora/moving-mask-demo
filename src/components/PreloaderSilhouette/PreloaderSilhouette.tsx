import { PRELOADER_PATH } from "@/model/const";

type Props = {
  fill: string;
};

export const PreloaderSilhouette = ({ fill }: Props) => {
  return (
    <g
      style={{
        transformOrigin: "50% 50%",
        transform:
          "translateX(var(--shiftX)) translateY(var(--shiftY)) scale(var(--scale))",
      }}>
      <path d={PRELOADER_PATH} fill={fill} />
    </g>
  );
};
