const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const orderController = require("../controllers/order.controller");

const router = express.Router();

router.post("/create", asyncHandler(orderController.createOrder));

module.exports = router;
