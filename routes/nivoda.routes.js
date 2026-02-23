const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const nivodaController = require("../controllers/nivoda.controller");

const router = express.Router();

router.get("/diamonds", asyncHandler(nivodaController.getDiamonds));
router.get("/diamond/:id", asyncHandler(nivodaController.getDiamondById));

module.exports = router;
