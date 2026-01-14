require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());

/* =====================
   ROOT
===================== */
app.get('/', (req, res) => {
  res.send('Nivoda Backend is LIVE 🚀');
});

/* =====================
   DIAMONDS (DEMO - USD)
===================== */
app.get('/diamonds', (req, res) => {
  res.json([
    {
      id: "NV001",
      shape: "Round",
      carat: 1.01,
      color: "D",
      clarity: "VS1",
      certificate: "GIA",
      price_usd: 4200
    },
    {
      id: "NV002",
      shape: "Round",
      carat: 0.9,
      color: "E",
      clarity: "VS2",
      certificate: "IGI",
      price_usd: 3600
    }
  ]);
});

/* =====================
   ✅ LIVE GOLD PRICE (USD)
===================== */
app.get('/gold-price', async (req, res) => {
  try {
    const response = await axios.get(
      'https://www.goldapi.io/api/XAU/USD',
      {
        headers: {
          'x-access-token': process.env.GOLD_API_KEY
        }
      }
    );

    const usdPerOunce = response.data.price;

    // 1 Troy Ounce = 31.1035 grams
    const usdPerGram24K = usdPerOunce / 31.1035;

    res.json({
      source: 'goldapi.io',
      currency: 'USD',
      per_gram_24k: Number(usdPerGram24K.toFixed(2)),
      per_gram_22k: Number((usdPerGram24K * 0.916).toFixed(2)),
      per_gram_18k: Number((usdPerGram24K * 0.75).toFixed(2)),
      timestamp: response.data.timestamp
    });

  } catch (error) {
    console.error('Gold API Error:', error.message);
    res.status(500).json({ error: 'Gold price fetch failed' });
  }
});

/* =====================
   ✅ FINAL PRICE CALCULATOR (USD)
   Diamond + Gold + Labour + Margin
===================== */
app.post('/calculate-price', async (req, res) => {
  try {
    const {
      diamond_price_usd,
      gold_weight_grams,
      gold_purity,      // 24 | 22 | 18
      labour_cost_usd = 85,
      margin_percent = 15
    } = req.body;

    /* ---- Gold Price ---- */
    const goldRes = await axios.get(
      'https://www.goldapi.io/api/XAU/USD',
      {
        headers: {
          'x-access-token': process.env.GOLD_API_KEY
        }
      }
    );

    const goldPerGram24K =
      goldRes.data.price / 31.1035;

    let purityFactor = 1;
    if (gold_purity === 22) purityFactor = 0.916;
    if (gold_purity === 18) purityFactor = 0.75;

    const goldCost =
      gold_weight_grams * goldPerGram24K * purityFactor;

    /* ---- Margin ---- */
    const margin =
      ((diamond_price_usd + goldCost) * margin_percent) / 100;

    /* ---- Final ---- */
    const finalPrice =
      diamond_price_usd + goldCost + labour_cost_usd + margin;

    res.json({
      currency: 'USD',
      breakdown: {
        diamond_usd: Number(diamond_price_usd.toFixed(2)),
        gold_cost_usd: Number(goldCost.toFixed(2)),
        labour_usd: labour_cost_usd,
        margin_usd: Number(margin.toFixed(2))
      },
      final_price_usd: Number(finalPrice.toFixed(2))
    });

  } catch (error) {
    console.error('Price Calc Error:', error.message);
    res.status(500).json({ error: 'Price calculation failed' });
  }
});

/* =====================
   START SERVER
===================== */
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
