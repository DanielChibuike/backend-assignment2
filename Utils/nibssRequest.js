
const nibssApi = require("../Utils/nibssApi");
const getNibssToken = require("../Utils/nibssAuth");

const nibssRequest = async ({ method = "get", url, data, params }) => {
    const token = await getNibssToken();

    const config = {
        method,
        url,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    // Only add data when it actually exists
    if (data) {
        config.data = data;
    }

    // Only add params when they actually exist
    if (params) {
        config.params = params;
    }

    const response = await nibssApi.request(config);

    return response.data;
};

module.exports = nibssRequest;