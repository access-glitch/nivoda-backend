const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ROOT CHECK
app.get("/", (req, res) => {
  res.send("Nivoda Backend is LIVE 🚀");
});

// AUTH → TOKEN
app.post("/auth", async (req, res) => {
  try {
    const response = await axios.post(
      process.env.NIVODA_API,
      {
        query: `
          mutation {
            authenticate {
              username_and_password(
                username: "${process.env.NIVODA_EMAIL}",
                password: "${process.env.NIVODA_PASSWORD}"
              ) {
                token
              }
            }
          }
        `
      },
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({
      token: response.data.data.authenticate.username_and_password.token
    });
  } catch (err) {
    res.status(500).json({ error: "Nivoda auth failed" });
  }
});

// DIAMONDS
app.post("/diamonds", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  try {
    const response = await axios.post(
      process.env.NIVODA_API,
      {
        query: `
        query ($token: String!) {
          as(token: $token) {
            diamonds_by_query(
              query: {
                labgrown: true
                has_image: true
                sizes: { from: 0.5, to: 5 }
              }
              limit: 20
            ) {
              items {
                id
                price
                diamond {
                  shape
                  color
                  clarity
                  image
                  video
                }
              }
            }
          }
        }`,
        variables: { token }
      },
      { headers: { "Content-Type": "application/json" } }
    );

    res.json(response.data.data.as.diamonds_by_query.items);
  } catch (err) {
    res.status(500).json({ error: "Diamonds fetch failed" });
  }
});

// SERVER START (Render safe)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
