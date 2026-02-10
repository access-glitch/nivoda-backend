import { useEffect, useMemo, useState } from "react";
import { useRingBuilder } from "../../context/RingBuilderContext";
import { getDiamonds } from "../../api/getDiamonds";

const DiamondStep = ({ filters }) => {
  const { step, setStep, setDiamond } = useRingBuilder();
  const [diamonds, setDiamonds] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestFilters = useMemo(
    () => ({
      shape: filters?.shape || "",
      minCarat: filters?.minCarat || "",
      maxCarat: filters?.maxCarat || "",
      priceMin: filters?.priceMin || "",
      priceMax: filters?.priceMax || "",
      color: filters?.color || "",
      clarity: filters?.clarity || "",
      cut: filters?.cut || "",
      labgrown: filters?.labgrown ?? false,
    }),
    [filters]
  );

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadDiamonds = async () => {
      try {
        setLoading(true);
        const response = await getDiamonds({
          limit: 12,
          offset: 0,
          ...requestFilters,
        });
        if (isMounted) {
          setDiamonds(response.items || []);
          setTotalCount(response.totalCount || 0);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load diamonds right now.");
          setDiamonds([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(loadDiamonds, 300);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [requestFilters]);

  if (step !== 1) return null;

  return (
    <>
      <h2>Select a Diamond</h2>

      {!loading && !error && (
        <p className="rb-results-count">{totalCount} diamonds found</p>
      )}

      {loading && <p>Loading diamonds...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && diamonds.length === 0 && (
        <p>No diamonds found.</p>
      )}

      <div className="rb-diamond-grid">
        {diamonds.map((item) => {
          const shape =
            item?.diamond?.shape ||
            item?.diamond?.certificate?.shape ||
            "Diamond";
          const cert = item?.diamond?.certificate;
          const carats = cert?.carats ? `${cert.carats} ct` : null;
          const color = cert?.color || null;
          const clarity = cert?.clarity || null;
          const cut = cert?.cut || null;
          const lab = cert?.lab || null;
          const isLabgrown = cert?.labgrown === true;
          const priceValue = Number(item?.price);
          const price = Number.isFinite(priceValue)
            ? `$${priceValue.toLocaleString()}`
            : "Price on request";

          return (
            <div
              key={item.id}
              onClick={() => {
                setDiamond(item);
                setStep(2);
              }}
              className="rb-card"
            >
              {item?.diamond?.video ? (
                <video
                  className="rb-card-image"
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="metadata"
                  poster={item?.diamond?.image || undefined}
                >
                  <source src={item.diamond.video} type="video/mp4" />
                </video>
              ) : item?.diamond?.image ? (
                <img
                  src={item.diamond.image}
                  alt={shape}
                  className="rb-card-image"
                />
              ) : null}
              <div className="rb-card-body">
                <h3>{shape}</h3>
                <p>{price}</p>
                <div className="rb-meta-row">
                  {carats && <span>{carats}</span>}
                  {color && <span>{color}</span>}
                  {clarity && <span>{clarity}</span>}
                  {cut && <span>{cut}</span>}
                </div>
                <div className="rb-meta-row">
                  {lab && <span className="rb-badge">{lab}</span>}
                  {isLabgrown && <span className="rb-badge">Lab Grown</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DiamondStep;
