import image from "/image.jpg";

export const Hero = () => {
  return (
    <div className="hero">
      <img className="hero__image" src={image}></img>
    </div>
  );
};
