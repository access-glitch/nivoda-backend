const Stepper = ({ step }) => {
  return (
    <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
      <span style={{ fontWeight: step === 1 ? "bold" : "normal" }}>
        1. Setting
      </span>
      <span style={{ fontWeight: step === 2 ? "bold" : "normal" }}>
        2. Diamond
      </span>
      <span style={{ fontWeight: step === 3 ? "bold" : "normal" }}>
        3. Summary
      </span>
    </div>
  );
};

export default Stepper;
