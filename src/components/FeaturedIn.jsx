import "./featuredIn.css";

const brands = [
  { name: "Vogue", logo: "/brands/vogue.webp" },
  { name: "Bazaar", logo: "/brands/bazaar.webp" },
  { name: "WWD", logo: "/brands/wwd.webp" },
  { name: "Brides", logo: "/brands/brides.webp" },
  { name: "Who What Wear", logo: "/brands/whowhatwear.webp" },
];

const FeaturedIn = () => {
  return (
    <section className="fi-wrapper">
      <div className="fi-container">

        {/* LEFT */}
        <div className="fi-title">
          <span>Featured In</span>
          <span className="fi-arrow">→</span>
        </div>

        {/* RIGHT */}
        <div className="fi-logos">
          {brands.map((brand, index) => (
            <div className="fi-logo-box" key={index}>
              <img src={brand.logo} alt={brand.name} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturedIn;
