
const Customer = require("../Models/customer");
const nibssRequest = require("../Utils/nibssRequest");


// ===============================
// INSERT BVN
// ===============================
// POST /api/verification/bvn/insert

exports.insertBVN = async (req, res) => {
    try {
        const { bvn, firstName, lastName, dob, phone } = req.body;

        if (!bvn || !firstName || !lastName || !dob || !phone) {
            return res.status(400).json({
                success: false,
                message: "bvn, firstName, lastName, dob and phone are required"
            });
        }

        const result = await nibssRequest({
            method: "post",
            url: "/insertBvn",
            data: {
                bvn,
                firstName,
                lastName,
                dob,
                phone
            }
        });

        return res.status(201).json({
            success: true,
            message: "BVN inserted successfully",
            data: result
        });

    } catch (error) {
        console.error(
            "BVN insert error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "BVN insertion failed",
            error: error.response?.data || error.message
        });
    }
};


// ===============================
// VALIDATE BVN
// ===============================
// POST /api/verification/bvn/validate

exports.validateBVN = async (req, res) => {
    try {
        const { bvn } = req.body;

        if (!bvn) {
            return res.status(400).json({
                success: false,
                message: "bvn is required"
            });
        }

        const customer = await Customer.findById(req.customer.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        if (customer.isVerified) {
            return res.status(409).json({
                success: false,
                message: "Customer is already verified"
            });
        }

        const result = await nibssRequest({
            method: "post",
            url: "/validateBvn",
            data: {
                bvn
            }
        });

        if (!result || result.valid === false || result.status === "failed") {
            return res.status(422).json({
                success: false,
                message: "BVN validation failed",
                details: result
            });
        }

        customer.bvn = bvn;

        //save the Dob returned by phoenix to the customer record
        if(result.data && result.data.dob) {
            customer.dob = result.data.dob;
        }
        
        customer.isVerified = true;
        customer.verifiedVia = "bvn";
        customer.verifiedAt = new Date();

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "BVN validation successful",
            data: {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                isVerified: customer.isVerified,
                verifiedVia: customer.verifiedVia,
                verifiedAt: customer.verifiedAt
            }
        });

    } catch (error) {
        console.error(
            "BVN validation error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "BVN validation failed",
            error: error.response?.data || error.message
        });
    }
};


// ===============================
// INSERT NIN
// ===============================
// POST /api/verification/nin/insert

exports.insertNIN = async (req, res) => {
    try {
        const { nin, firstName, lastName, dob } = req.body;

        if (!nin || !firstName || !lastName || !dob) {
            return res.status(400).json({
                success: false,
                message: "nin, firstName, lastName and dob are required"
            });
        }

        const result = await nibssRequest({
            method: "post",
            url: "/insertNin",
            data: {
                nin,
                firstName,
                lastName,
                dob
            }
        });

        return res.status(201).json({
            success: true,
            message: "NIN inserted successfully",
            data: result
        });

    } catch (error) {
        console.error(
            "NIN insert error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "NIN insertion failed",
            error: error.response?.data || error.message
        });
    }
};


// ===============================
// VALIDATE NIN
// ===============================
// POST /api/verification/nin/validate

exports.validateNIN = async (req, res) => {
    try {
        const { nin } = req.body;

        if (!nin) {
            return res.status(400).json({
                success: false,
                message: "nin is required"
            });
        }

        const customer = await Customer.findById(req.customer.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        if (customer.isVerified) {
            return res.status(409).json({
                success: false,
                message: "Customer is already verified"
            });
        }

        const result = await nibssRequest({
            method: "post",
            url: "/validateNin",
            data: {
                nin
            }
        });

        if (!result || result.valid === false || result.status === "failed") {
            return res.status(422).json({
                success: false,
                message: "NIN validation failed",
                details: result
            });
        }

        customer.nin = nin;
        customer.isVerified = true;
        customer.verifiedVia = "nin";
        customer.verifiedAt = new Date();

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "NIN validation successful",
            data: {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                isVerified: customer.isVerified,
                verifiedVia: customer.verifiedVia,
                verifiedAt: customer.verifiedAt
            }
        });

    } catch (error) {
        console.error(
            "NIN validation error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "NIN validation failed",
            error: error.response?.data || error.message
        });
    }
};
