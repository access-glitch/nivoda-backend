import "./awardStory.css";

const AwardStory = () => {
  return (
    <section className="award-section">
      <div className="award-content">

        {/* LEFT TEXT */}
        <div className="award-left">
          <span className="award-brand">DANHOV</span>

          <h2>
            <span>AWARD</span> WINNING
          </h2>

          <p className="award-sub">
            JEWELRY DESIGNER STORY
          </p>
        </div>

        {/* RIGHT TEXT */}
        <div className="award-right">
          <p>
            Founded in 1984 by Jack Hovsepian, Danhov is known in the luxury
            jewelry category for its innovative design philosophy. The designs
            of the custom-made engagement rings and wedding bands ensure that
            every Danhov customer wears a special ring that is an extension and
            personal statement of their discerning taste.
          </p>

          <button className="award-btn">LOAD MORE</button>
        </div>

      </div>
    </section>
  );
};

export default AwardStory;
