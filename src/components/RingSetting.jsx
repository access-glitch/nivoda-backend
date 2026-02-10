import { useState } from "react";
import Stepper from "../components/Stepper";
import RingSetting from "../components/RingSetting";
import DiamondSelect from "../components/DiamondSelect";
import Summary from "../components/Summary";

const RingBuilder = () => {
  const [step, setStep] = useState(1);

  return (
    <div style={{ padding: "40px" }}>
      <Stepper step={step} />

      {step === 1 && <RingSetting onNext={() => setStep(2)} />}
      {step === 2 && <DiamondSelect onNext={() => setStep(3)} />}
      {step === 3 && <Summary />}
    </div>
  );
};

export default RingBuilder;
