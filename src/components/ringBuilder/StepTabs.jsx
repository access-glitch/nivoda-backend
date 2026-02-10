import { useRingBuilder } from "../../context/RingBuilderContext";

const StepTabs = () => {
  const { step } = useRingBuilder();

  const steps = ["Diamond", "Setting", "Review"];

  return (
    <div className="rb-steps">
      {steps.map((label, i) => {
        const current = step === i + 1;
        const done = step > i + 1;

        return (
          <div
            key={label}
            className={`rb-step ${current ? "active" : ""} ${done ? "done" : ""}`}
          >
            <div className="rb-step-top">
              <span className="rb-step-number">{i + 1}</span>
              <span className="rb-step-label">{label}</span>
            </div>
            <div className="rb-step-line" />
          </div>
        );
      })}
    </div>
  );
};

export default StepTabs;
