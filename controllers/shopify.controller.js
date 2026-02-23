const shopifyService = require("../services/shopify.service");

async function storefrontProxy(req, res) {
  const { query, variables = {} } = req.body || {};
  const data = await shopifyService.storefrontProxy(query, variables);
  res.status(200).json(data);
}

async function getCollections(req, res) {
  const collections = await shopifyService.getCollections();
  res.status(200).json(collections);
}

async function getProducts(req, res) {
  const handle = String(req.query.handle || "").trim();
  if (handle) {
    const product = await shopifyService.getProductByHandle(handle);
    res.status(200).json(product);
    return;
  }

  const limit = Number(req.query.limit) || 24;
  const collection = String(req.query.collection || "rings");
  const strictCollection =
    String(req.query.strictCollection || "").trim().toLowerCase() === "true" ||
    String(req.query.strictCollection || "").trim() === "1";
  const products = await shopifyService.getProducts(limit, collection, { strictCollection });
  res.status(200).json(products);
}

async function getProductByHandle(req, res) {
  const handle = String(req.params.handle || "").trim();
  const product = await shopifyService.getProductByHandle(handle);
  res.status(200).json(product);
}

async function getTopSellers(req, res) {
  const limit = Number(req.query.limit) || 4;
  const products = await shopifyService.getTopSellers(limit);
  res.status(200).json(products);
}

async function getGoldRate(req, res) {
  const manualRate = req.query.manualRate;
  const data = await shopifyService.getGoldRate(manualRate);
  res.status(200).json(data);
}

async function getMetalRates(req, res) {
  const goldManualRate = req.query.goldManualRate;
  const platinumManualRate = req.query.platinumManualRate;
  const data = await shopifyService.getMetalRates({
    manualRates: {
      gold: goldManualRate,
      platinum: platinumManualRate,
    },
  });
  res.status(200).json(data);
}

async function createCart(req, res) {
  const { lineItems = [], attributes = [] } = req.body || {};
  const cart = await shopifyService.createCart(lineItems, attributes);
  res.status(201).json(cart);
}

async function createCheckout(req, res) {
  const { lineItems = [], attributes = [], buyerIdentity = null } = req.body || {};
  const checkout = await shopifyService.createCheckout(lineItems, attributes, buyerIdentity);
  res.status(201).json(checkout);
}

module.exports = {
  getCollections,
  storefrontProxy,
  getProducts,
  getProductByHandle,
  getTopSellers,
  getGoldRate,
  getMetalRates,
  createCart,
  createCheckout,
};
