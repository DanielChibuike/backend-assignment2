const nibssApi = require("./nibssApi");

const getNibssToken = async () => {
    try {
        const response = await nibssApi.post("/auth/token", {
            apiKey: process.env.NIBSS_API_KEY,
            apiSecret: process.env.NIBSS_API_SECRET
        });

        return response.data.token;

    } catch (error) {
        console.error(
            "NIBSS authentication failed:",
            error.response?.data || error.message
        );

        throw error;
    }
};

module.exports = getNibssToken;