require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/* ======================
   MIDDLEWARE
====================== */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

/* ======================
   HOME
====================== */
app.get('/', (req, res) => {
  res.send('Nivoda Backend is LIVE !! 🚀');
});

/* ======================
   DIAMONDS (DUMMY DATA)
====================== */
app.get('/diamonds', (req, res) => {
  res.json([
    {
      id: "NV001",
      shape: "Round",
      carat: 1.01,
      color: "D",
      clarity: "VS1",
      certificate: "GIA",
      price: 350000
    },
    {
      id: "NV002",
      shape: "Round",
      carat: 0.90,
      color: "E",
      clarity: "VS2",
      certificate: "IGI",
      price: 300000
    }
  ]);
});

/* ======================
   PRICE CALCULATION
====================== */
app.post('/calculate-price', (req, res) => {
  try {
    const { diamond_price_usd, setting_type, setting_price } = req.body;

    if (!diamond_price_usd || !setting_price) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // CONFIG
    const USD_TO_INR = 83;
    const IMPORT_TAX_PERCENT = 10;
    const MARGIN_PERCENT = 25;

    // CALCULATIONS
    const diamond_base_inr = diamond_price_usd * USD_TO_INR;
    const import_tax = diamond_base_inr * (IMPORT_TAX_PERCENT / 100);
    const margin = (diamond_base_inr + import_tax) * (MARGIN_PERCENT / 100);

    let labour_cost = 5000;
    if (setting_type && setting_type.toLowerCase().includes('solitaire')) {
      labour_cost = 7000;
    }

    const final_price =
      diamond_base_inr +
      import_tax +
      margin +
      labour_cost +
      Number(setting_price);

    res.json({
      breakdown: {
        diamond_base_inr: Math.round(diamond_base_inr),
        import_tax: Math.round(import_tax),
        margin: Math.round(margin),
        labour: labour_cost,
        setting: Number(setting_price)
      },
      final_price: Math.round(final_price)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Price calculation failed' });
  }
});

/* ======================
   SERVER START
====================== */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
