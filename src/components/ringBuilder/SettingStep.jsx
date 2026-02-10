import { useEffect, useMemo, useState } from "react";
import { useRingBuilder } from "../../context/RingBuilderContext";
import { getProducts } from "../../api/getProducts";

const categories = [
  "Solitaire",
  "Three Stone",
  "Accents",
  "Hidden Halo",
  "Nature Inspired",
  "Yellow Gold",
  "White Gold",
  "Bridal Sets",
  "Halo",
];

const categorySwatches = {
  Solitaire: "#f2f2f2",
  "Three Stone": "#e9ecef",
  Accents: "#f5e9e0",
  "Hidden Halo": "#efe7f7",
  "Nature Inspired": "#e6f3e8",
  "Yellow Gold": "#f5d37a",
  "White Gold": "#e5e7eb",
  "Bridal Sets": "#f8e6ee",
  Halo: "#e8f1fb",
};

const parsePrice = (value) => {
  if (!value) return 0;
  const number = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const formatPrice = (value) =>
  Number.isFinite(value) ? `$${value.toLocaleString()}` : "Price on request";

const SettingStep = () => {
  const { step, setStep, setSetting, diamond } = useRingBuilder();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [sortBy, setSortBy] = useState("best");

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const products = await getProducts(8);
        if (isMounted) {
          setSettings(products);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load settings right now.");
          setSettings([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (step === 2) {
      loadSettings();
    }

    return () => {
      isMounted = false;
    };
  }, [step]);

  if (step !== 2) return null;

  const diamondCert = diamond?.diamond?.certificate;
  const diamondShape = diamondCert?.shape || diamond?.diamond?.shape || "Diamond";
  const diamondCarat = diamondCert?.carats ? `${diamondCert.carats} ct` : "";
  const diamondPrice = formatPrice(parsePrice(diamond?.price));

  const sortedSettings = useMemo(() => {
    const list = [...settings];
    if (sortBy === "price-asc") {
      return list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }
    if (sortBy === "price-desc") {
      return list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    return list;
  }, [settings, sortBy]);

  return (
    <>
      <div className="rb-setting-header">
        <div className="rb-setting-title">
          <h2>Select a Setting</h2>
          <p>Choose a setting to pair with your selected diamond.</p>
        </div>
        <div className="rb-setting-summary">
          <div className="rb-summary-label">Diamond</div>
          <div className="rb-summary-value">
            {diamondCarat} {diamondShape}
          </div>
          <div className="rb-summary-price">{diamondPrice}</div>
        </div>
      </div>

      <div className="rb-category-strip">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              category === activeCategory
                ? "rb-category active"
                : "rb-category"
            }
            onClick={() => setActiveCategory(category)}
          >
            <span
              className="rb-category-thumb"
              style={{ background: categorySwatches[category] || "#e5e5e5" }}
            />
            <span>{category}</span>
          </button>
        ))}
      </div>

      <div className="rb-settings-toolbar">
        <button className="rb-filter-btn" type="button">
          Filters
        </button>
        <div className="rb-results-count">{settings.length} Results</div>
        <div className="rb-sort">
          <label htmlFor="setting-sort">Sort by</label>
          <select
            id="setting-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="best">Best Sellers</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading settings...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && settings.length === 0 && (
        <p>No settings found.</p>
      )}

      <div className="rb-setting-grid">
        {sortedSettings.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              setSetting(s);
              setStep(3);
            }}
            className="rb-card rb-setting-card"
          >
            {s.image && (
              <img src={s.image} alt={s.title} className="rb-card-image" />
            )}
            <div className="rb-card-body">
              <h3>{s.title}</h3>
              <p>{s.price}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default SettingStep;
