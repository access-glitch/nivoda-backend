import { useEffect, useState } from "react";
import "./productSlider.css";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { getProducts } from "../api/getProducts"; 

const ProductSlider = ({ title = "Wedding Bands" }) => {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const visible = 4;

  useEffect(() => {
    getProducts(12)
      .then(setProducts)
      .catch((err) => {
        console.error("Failed to load products", err);
      });
  }, []);

  const next = () => {
    if (index < products.length - visible) {
      setIndex((prev) => prev + 1);
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  if (!products.length) {
    return <p style={{ textAlign: "center" }}>Loading products...</p>;
  }

  return (
    <section className="product-slider-section">
      <h2 className="slider-title">{title}</h2>

      <div className="slider-wrapper">
        <button className="nav-btn left" onClick={prev}>
          <ChevronLeft />
        </button>

        <div className="slider-window">
          <div
            className="slider-track"
            style={{ transform: `translateX(-${index * 25}%)` }}
          >
            {products.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-image">
                  <img src={product.image} alt={product.title} />
                </div>

                <div className="product-info">
                  <div>
                    <h3>{product.title}</h3>
                    <p className="price">{product.price}</p>
                  </div>

                  <button className="wishlist">
                    <Heart size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="nav-btn right" onClick={next}>
          <ChevronRight />
        </button>
      </div>

      <div className="load-more-wrap">
        <button className="load-more">LOAD MORE</button>
      </div>
    </section>
  );
};

export default ProductSlider;
