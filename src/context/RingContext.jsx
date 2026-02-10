import { createContext, useContext, useState } from "react";

const RingBuilderContext = createContext();

export const RingBuilderProvider = ({ children }) => {
  const [step, setStep] = useState(1);
  const [diamond, setDiamond] = useState(null);
  const [setting, setSetting] = useState(null);

  return (
    <RingBuilderContext.Provider
      value={{
        step,
        setStep,
        diamond,
        setDiamond,
        setting,
        setSetting,
      }}
    >
      {children}
    </RingBuilderContext.Provider>
  );
};

export const useRingBuilder = () => useContext(RingBuilderContext);
