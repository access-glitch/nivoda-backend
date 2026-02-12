const shopifyService = require("../services/shopify.service");

async function createOrder(req, res) {
  const draftOrder = await shopifyService.createOrder(req.body || {});
  res.status(201).json(draftOrder);
}

module.exports = {
  createOrder,
};
