require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET','POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Nivoda Backend is LIVE !!🚀');
});

/* ✅ DIAMONDS ROUTE */
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
