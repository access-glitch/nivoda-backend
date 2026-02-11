const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  const {
    diamondPrice,
    goldPrice,
    goldWeight,
    makingCharge
  } = req.body;

  const goldTotal = goldPrice * goldWeight;
  const subtotal =
    diamondPrice + goldTotal + makingCharge;

  const gst = subtotal * 0.03;

  res.json({
    finalPrice: Math.round(subtotal + gst)
  });
});

module.exports = router;
