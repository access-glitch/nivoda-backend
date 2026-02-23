const axios = require("axios");

const httpClient = axios.create({
  timeout: 20000,
});

module.exports = httpClient;
