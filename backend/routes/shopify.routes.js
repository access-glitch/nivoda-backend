const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const shopifyController = require("../controllers/shopify.controller");

const router = express.Router();

router.post("/storefront", asyncHandler(shopifyController.storefrontProxy));
router.get("/products", asyncHandler(shopifyController.getProducts));
router.get("/top-sellers", asyncHandler(shopifyController.getTopSellers));
router.post("/cart", asyncHandler(shopifyController.createCart));
router.post("/checkout", asyncHandler(shopifyController.createCheckout));

module.exports = router;
