const DiamondSelect = ({ onNext }) => {
  return (
    <div>
      <h2>Select Diamond</h2>
      <p>Carat: 1.0</p>
      <p>Color: D</p>

      <button onClick={onNext}>Next</button>
    </div>
  );
};

export default DiamondSelect;
