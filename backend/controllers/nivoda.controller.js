const nivodaService = require("../services/nivoda.service");

async function getDiamonds(req, res) {
  const data = await nivodaService.getDiamonds(req.query);
  res.status(200).json(data);
}

async function getDiamondById(req, res) {
  const data = await nivodaService.getDiamondById(req.params.id);
  res.status(200).json(data);
}

module.exports = {
  getDiamonds,
  getDiamondById,
};
