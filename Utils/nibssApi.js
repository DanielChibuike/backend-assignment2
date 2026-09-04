const axios = require("axios");

const BASE_URL = process.env.NIBSS_BASE_URL;

const nibssApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

module.exports = nibssApi;