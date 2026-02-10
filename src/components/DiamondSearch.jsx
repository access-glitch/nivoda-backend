import "./diamondSearch.css";

const shapes = [
  { name: "Round", icon: "/shapes/round.svg" },
  { name: "Oval", icon: "/shapes/oval.svg" },
  { name: "Cushion", icon: "/shapes/cushion.svg" },
  { name: "Princess", icon: "/shapes/princess.svg" },
  { name: "Emerald", icon: "/shapes/emerald.svg" },
  { name: "Pear", icon: "/shapes/pear.svg" },
  { name: "Marquise", icon: "/shapes/marquise.svg" },
  { name: "Asscher", icon: "/shapes/asscher.svg" },
  { name: "Radiant", icon: "/shapes/radiant.svg" },
  { name: "Heart", icon: "/shapes/heart.svg" },
];

const DiamondSearch = () => {
  return (
    <section className="diamond-search">
      <h2>Search For Diamonds</h2>

      <div className="shape-row">
        {shapes.map((shape, index) => (
          <div className="shape-item" key={index}>
            <img src={shape.icon} alt={shape.name} />
            <span>{shape.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DiamondSearch;
