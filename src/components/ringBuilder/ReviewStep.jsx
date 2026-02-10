import { useRingBuilder } from "../../context/RingBuilderContext";
import { useCart } from "../../context/CartContext";

const parsePrice = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatPrice = (value) =>
  Number.isFinite(value) ? `$${value.toLocaleString()}` : "Price on request";

const normalizeMedia = (items = [], target = 3) => {
  if (!items.length) return [];
  const result = [...items];
  while (result.length < target) {
    result.push(items[result.length % items.length]);
  }
  return result.slice(0, target);
};

const ReviewStep = () => {
  const { step, diamond, setting } = useRingBuilder();
  const { addRingToCart } = useCart();

  if (step !== 3) return null;

  const diamondPrice = parsePrice(diamond?.price);
  const settingPrice = parsePrice(setting?.price);
  const total = diamondPrice + settingPrice;
  const cert = diamond?.diamond?.certificate;
  const shape = cert?.shape || diamond?.diamond?.shape || "Diamond";
  const carats = cert?.carats ? `${cert.carats} ct` : null;
  const color = cert?.color || null;
  const clarity = cert?.clarity || null;
  const cut = cert?.cut || null;
  const polish = cert?.polish || null;
  const symmetry = cert?.symmetry || null;
  const lab = cert?.lab || null;
  const ringTitle = setting?.title || setting?.name || "Setting";
  const ringImages = setting?.images?.length
    ? setting.images
    : setting?.image
      ? [setting.image]
      : [];
  const ringMedia = normalizeMedia(ringImages, 3);
  const diamondImage = diamond?.diamond?.image || null;
  const diamondVideo = diamond?.diamond?.video || null;
  const diamondMedia = normalizeMedia(
    diamondImage ? [diamondImage] : [],
    3
  );

  const handleAddToCart = () => {
    if (!diamond || !setting) return;
    addRingToCart({
      id: `rb-${Date.now()}`,
      type: "ringBuilder",
      createdAt: new Date().toISOString(),
      title: ringTitle,
      settingId: setting?.id || null,
      diamondId: diamond?.id || null,
      prices: {
        setting: settingPrice,
        diamond: diamondPrice,
        total,
      },
      diamond: {
        shape,
        carats: cert?.carats || null,
        color,
        clarity,
        cut,
        lab,
      },
    });
  };

  return (
    <div className="rb-review">
      <h2>Review Your Ring</h2>

      <div className="rb-review-layout">
        <div className="rb-review-media">
          <div className="rb-review-card">
            <h4>Setting</h4>
            {ringMedia.length > 0 ? (
              <div className="rb-review-media-stack">
                <img src={ringMedia[0]} alt={ringTitle} />
                <div className="rb-review-thumbs">
                  {ringMedia.map((src, index) => (
                    <img
                      key={`${ringTitle}-thumb-${index}`}
                      src={src}
                      alt={`${ringTitle} view ${index + 1}`}
                      className="rb-review-thumb"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rb-review-placeholder">No setting image</div>
            )}
            <p>{ringTitle}</p>
          </div>

          <div className="rb-review-card">
            <h4>Diamond</h4>
            {diamondVideo ? (
              <div className="rb-review-media-stack">
                <video
                  controls
                  playsInline
                  muted
                  preload="metadata"
                  poster={diamondImage || undefined}
                >
                  <source src={diamondVideo} type="video/mp4" />
                </video>
                {diamondMedia.length > 0 && (
                  <div className="rb-review-thumbs">
                    {diamondMedia.map((src, index) => (
                      <img
                        key={`diamond-thumb-${index}`}
                        src={src}
                        alt={`Diamond view ${index + 1}`}
                        className="rb-review-thumb"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : diamondImage ? (
              <div className="rb-review-media-stack">
                <img src={diamondImage} alt={shape} />
                <div className="rb-review-thumbs">
                  {diamondMedia.map((src, index) => (
                    <img
                      key={`diamond-thumb-${index}`}
                      src={src}
                      alt={`Diamond view ${index + 1}`}
                      className="rb-review-thumb"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rb-review-placeholder">No diamond media</div>
            )}
            <p>
              {carats ? `${carats} ` : ""}
              {shape}
            </p>
          </div>
        </div>

        <aside className="rb-review-summary">
          <h3>Your One-of-a-Kind Ring</h3>
          <div className="rb-review-price">{formatPrice(total)}</div>
          <p className="rb-review-subtext">
            The total carat weight of your ring is {carats || "-"}.
          </p>

          <div className="rb-review-block">
            <div className="rb-review-block-title">Setting</div>
            <div className="rb-review-block-row">
              <span>{ringTitle}</span>
              <span>{formatPrice(settingPrice)}</span>
            </div>
          </div>

          <div className="rb-review-block">
            <div className="rb-review-block-title">Diamond</div>
            <div className="rb-review-block-row">
              <span>
                {carats ? `${carats} ` : ""}
                {shape}
                {color ? ` · ${color}` : ""}
                {clarity ? ` · ${clarity}` : ""}
                {cut ? ` · ${cut}` : ""}
              </span>
              <span>{formatPrice(diamondPrice)}</span>
            </div>
            <div className="rb-review-meta">
              {lab && <span>Lab: {lab}</span>}
              {polish && <span>Polish: {polish}</span>}
              {symmetry && <span>Symmetry: {symmetry}</span>}
            </div>
          </div>

          <div className="rb-review-total">
            <span>Ring Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <button
            className="rb-primary"
            onClick={handleAddToCart}
            disabled={!diamond || !setting}
          >
            Add Ring to Cart
          </button>
        </aside>
      </div>
    </div>
  );
};

export default ReviewStep;
