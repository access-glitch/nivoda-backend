const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  const response = await axios.get(
    "https://goldapi.io/api/XAU/INR",
    { headers: { "x-access-token": process.env.GOLD_API_KEY } }
  );

  res.json({
    gold18k: response.data.price * 0.75,
    gold22k: response.data.price * 0.916
  });
});

module.exports = router;
