const shopifyService = require("../services/shopify.service");

async function storefrontProxy(req, res) {
  const { query, variables = {} } = req.body || {};
  const data = await shopifyService.storefrontProxy(query, variables);
  res.status(200).json(data);
}

async function getProducts(req, res) {
  const limit = Number(req.query.limit) || 12;
  const products = await shopifyService.getProducts(limit);
  res.status(200).json(products);
}

async function getTopSellers(req, res) {
  const limit = Number(req.query.limit) || 4;
  const products = await shopifyService.getTopSellers(limit);
  res.status(200).json(products);
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
  storefrontProxy,
  getProducts,
  getTopSellers,
  createCart,
  createCheckout,
};
