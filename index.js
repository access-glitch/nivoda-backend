import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   NIVODA AUTH TOKEN API
================================ */
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
      }
    );

    res.json(response.data.data.authenticate.username_and_password);
  } catch (err) {
    res.status(500).json({ error: "Auth failed" });
  }
});

/* ===============================
   GET DIAMONDS LIST
================================ */
app.post("/diamonds", async (req, res) => {
  const { token } = req.body;

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
      }
    );

    res.json(response.data.data.as.diamonds_by_query.items);
  } catch (err) {
    res.status(500).json({ error: "Diamond fetch failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
