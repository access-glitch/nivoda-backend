const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const shopifyController = require("../controllers/shopify.controller");

const router = express.Router();

router.post("/storefront", asyncHandler(shopifyController.storefrontProxy));
router.get("/collections", asyncHandler(shopifyController.getCollections));
router.get("/products", asyncHandler(shopifyController.getProducts));
router.get("/products/:handle", asyncHandler(shopifyController.getProductByHandle));
router.get("/top-sellers", asyncHandler(shopifyController.getTopSellers));
router.get("/gold-rate", asyncHandler(shopifyController.getGoldRate));
router.get("/metal-rates", asyncHandler(shopifyController.getMetalRates));
router.post("/cart", asyncHandler(shopifyController.createCart));
router.post("/checkout", asyncHandler(shopifyController.createCheckout));

module.exports = router;
