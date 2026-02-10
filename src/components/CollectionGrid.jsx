import "./collectionGrid.css";

const CollectionGrid = () => {
  return (
    <section className="cg-section">

      <div className="cg-grid">

        {/* Create Dream Ring */}
        <div
          className="cg-item cg-dream"
          style={{ backgroundImage: "url('/dream-ring.webp')" }}
        >
          <div className="cg-dream-border">
            <h3>Create Your<br />Dream Ring</h3>
          </div>
        </div>

        {/* Her Bands */}
        <div className="cg-item cg-white">
          <img src="/her-bands.webp" alt="Her Bands" />
          <p>Her Bands</p>
        </div>

        {/* His Bands */}
        <div className="cg-item cg-white">
          <img src="/his-bands.webp" alt="His Bands" />
          <p>His Bands</p>
        </div>

        {/* Find Jeweler */}
        <div className="cg-item cg-white">
          <img src="/find-jeweler.webp" alt="Find A Local Jeweler" />
          <p>Find A Local Jeweler</p>
        </div>

        {/* Award Winners */}
        <div className="cg-item cg-white">
          <img src="/award-winners.webp" alt="Award Winners" />
          <p>Award Winners</p>
        </div>

        {/* Explore */}
        <div className="cg-item cg-explore">
          <h3>Explore</h3>
          <span>More Collections</span>
          <button>→ VIEW MORE</button>
        </div>

      </div>

    </section>
  );
};

export default CollectionGrid;
