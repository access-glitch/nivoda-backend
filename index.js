require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Nivoda Backend is LIVE !! 🚀');
});

app.post('/calculate-price', (req, res) => {
  const {
    diamond_price_usd,
    setting_type,
    setting_price
  } = req.body;

  const USD_TO_INR = 83;
  const diamond_base_inr = diamond_price_usd * USD_TO_INR;
  const import_tax = diamond_base_inr * 0.10;
  const margin_amount = diamond_base_inr * 0.25;
  const labour_cost = 5000;

  const final_price =
    diamond_base_inr +
    import_tax +
    margin_amount +
    labour_cost +
    setting_price;

  res.json({
    breakdown: {
      diamond_base_inr: Math.round(diamond_base_inr),
      import_tax: Math.round(import_tax),
      margin: Math.round(margin_amount),
      labour: labour_cost,
      setting: setting_price
    },
    final_price: Math.round(final_price)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
