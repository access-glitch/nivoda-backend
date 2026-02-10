import "./topSellers.css";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { getTopSellers } from "../api/getTopSellers";

const TopSellers = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopSellers(4)
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading products...</p>;

  return (
    <section className="ts-wrapper">
      <h2 className="ts-title">Shop Top Sellers</h2>

      <div className="ts-grid">
        {products.map(({ node }) => (
          <div className="ts-card" key={node.id}>
            <div className="ts-image-box">
              <img src={node.featuredImage?.url} alt={node.title} />
            </div>

            <div className="ts-info">
              <div className="ts-text">
                <h3>{node.title}</h3>
                <p>
                  {node.variants.edges[0].node.price.amount}{" "}
                  {node.variants.edges[0].node.price.currencyCode}
                </p>
              </div>

              <button className="ts-wishlist">
                <Heart size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TopSellers;
