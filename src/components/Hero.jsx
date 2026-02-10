import "./hero.css";

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-overlay"></div>

      <div className="hero-container">
        {/* LEFT CONTENT */}
        <div className="hero-content">
          <h1>
            Love Is in <br /> The Air
          </h1>

          <p>
            These handcrafted engagement rings are designed to accentuate
            the center diamond and capture the spotlight.
          </p>

          <button className="hero-btn">EXPLORE MORE</button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
