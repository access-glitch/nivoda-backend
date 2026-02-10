import { useMemo, useState } from "react";
import "./ringBuilder.css";
import { RingBuilderProvider, useRingBuilder } from "../context/RingBuilderContext";
import StepTabs from "../components/ringBuilder/StepTabs";
import DiamondStep from "../components/ringBuilder/DiamondStep";
import SettingStep from "../components/ringBuilder/SettingStep";
import ReviewStep from "../components/ringBuilder/ReviewStep";

const shapes = [
  "Round",
  "Radiant",
  "Princess",
  "Pear",
  "Oval",
  "Marquise",
  "Heart",
  "Emerald",
  "Cushion",
  "Asscher",
];

const colors = ["D", "E", "F", "G", "H", "I", "J", "K"];
const clarities = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"];
const cuts = ["EX", "VG", "G", "F"];

const DiamondFilters = ({ filters, onChange }) => {
  const activeLab = filters.labgrown === true;

  return (
    <aside className="rb-filters-panel">
      <div className="rb-tabs">
        <button
          className={!activeLab ? "active" : ""}
          onClick={() => onChange({ labgrown: false })}
        >
          Mined
        </button>
        <button
          className={activeLab ? "active" : ""}
          onClick={() => onChange({ labgrown: true })}
        >
          Lab Grown
        </button>
      </div>

      <div className="filter-block">
        <h4>Shape</h4>
        <div className="shape-grid">
          {shapes.map((shape) => (
            <button
              key={shape}
              className={filters.shape === shape ? "selected" : ""}
              onClick={() => onChange({ shape })}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <h4>Carat</h4>
        <div className="range-row">
          <input
            type="number"
            min="0.2"
            step="0.1"
            placeholder="Min"
            value={filters.minCarat}
            onChange={(e) => onChange({ minCarat: e.target.value })}
          />
          <span>to</span>
          <input
            type="number"
            min="0.2"
            step="0.1"
            placeholder="Max"
            value={filters.maxCarat}
            onChange={(e) => onChange({ maxCarat: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-block">
        <h4>Color</h4>
        <div className="chip-row">
          {colors.map((color) => (
            <button
              key={color}
              className={filters.color === color ? "selected" : ""}
              onClick={() => onChange({ color })}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <h4>Clarity</h4>
        <div className="chip-row">
          {clarities.map((clarity) => (
            <button
              key={clarity}
              className={filters.clarity === clarity ? "selected" : ""}
              onClick={() => onChange({ clarity })}
            >
              {clarity}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <h4>Cut</h4>
        <div className="chip-row">
          {cuts.map((cut) => (
            <button
              key={cut}
              className={filters.cut === cut ? "selected" : ""}
              onClick={() => onChange({ cut })}
            >
              {cut}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <h4>Price (USD)</h4>
        <div className="range-row">
          <input
            type="number"
            min="0"
            step="100"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
          />
          <span>to</span>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
          />
        </div>
      </div>

      <button
        className="clear-filters"
        onClick={() =>
          onChange({
            shape: "",
            minCarat: "",
            maxCarat: "",
            priceMin: "",
            priceMax: "",
            color: "",
            clarity: "",
            cut: "",
          })
        }
      >
        Clear Filters
      </button>
    </aside>
  );
};

const RingBuilderContent = () => {
  const { step } = useRingBuilder();
  const [filters, setFilters] = useState({
    shape: "",
    minCarat: "",
    maxCarat: "",
    priceMin: "",
    priceMax: "",
    color: "",
    clarity: "",
    cut: "",
    labgrown: false,
  });

  const updateFilters = (updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const requestFilters = useMemo(() => ({
    shape: filters.shape,
    minCarat: filters.minCarat,
    maxCarat: filters.maxCarat,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    color: filters.color,
    clarity: filters.clarity,
    cut: filters.cut,
    labgrown: filters.labgrown,
  }), [filters]);

  return (
    <section className="ring-builder">
      <div className="rb-header">
        <h1>Build Your Ring</h1>
        <p>Select diamond & setting to create your perfect ring.</p>
      </div>

      <StepTabs />

      {step === 1 && (
        <div className="rb-layout">
          <DiamondFilters filters={filters} onChange={updateFilters} />
          <div className="rb-results">
            <DiamondStep filters={requestFilters} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rb-section">
          <SettingStep />
        </div>
      )}

      {step === 3 && (
        <div className="rb-section">
          <ReviewStep />
        </div>
      )}
    </section>
  );
};

const RingBuilder = () => (
  <RingBuilderProvider>
    <RingBuilderContent />
  </RingBuilderProvider>
);

export default RingBuilder;
