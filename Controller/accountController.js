
const Account = require("../Models/account");
const Customer = require("../Models/customer");
const nibssRequest = require("../Utils/nibssRequest");

//const BANK_CODE = process.env.BANK_CODE;




// ========================================
// CREATE ACCOUNT
// ========================================
// POST /api/accounts

exports.createAccount = async (req, res) => {
    try {
        // Get authenticated customer from JWT
        const customerId = req.customer.id;

        // Find customer
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Customer must be verified
        if (!customer.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Customer must complete BVN/NIN verification before account creation"
            });
        }

        // Customer can only have one account
        const existingAccount = await Account.findOne({
            customer: customer._id
        });

        if (existingAccount) {
            return res.status(409).json({
                success: false,
                message: "Customer already has an account"
            });
        }

        // Determine which KYC was used
        let kycType;
        let kycID;

        if (customer.verifiedVia === "bvn" && customer.bvn) {
            kycType = "bvn";
            kycID = customer.bvn;
        } else if (customer.verifiedVia === "nin" && customer.nin) {
            kycType = "nin";
            kycID = customer.nin;
        } else {
            return res.status(400).json({
                success: false,
                message: "Verified BVN/NIN information not found"
            });
        }

        // Create account through NIBSS/Phoenix
        const result = await nibssRequest({
            method: "post",
            url: "/account/create",
            data: {
                kycType,
                kycID,
                dob: customer.dob
            }
        });

        // Make sure Phoenix returned an account
        if (!result || !result.account) {
            return res.status(502).json({
                success: false,
                message: "NIBSS account creation returned an invalid response",
                details: result
            });
        }

        const nibssAccount = result.account;

        // Save NIBSS account in our MongoDB
        const account = await Account.create({
            customer: customer._id,
            accountNumber: nibssAccount.accountNumber,
            accountName: nibssAccount.accountName,
            bankCode: nibssAccount.bankCode,
            balance: nibssAccount.balance,
            currency: "NGN",
            status: "active"
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: account
        });

    } catch (error) {
        console.error(
            "Account creation error:",
            error.response?.data || error.message
        );

        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Account creation failed",
            error: error.response?.data || error.message
        });
    }
};



// ========================================
// GET ALL ACCOUNTS
// ========================================
// GET /api/accounts

exports.getAllAccounts = async (req, res) => {
    try {
        const accounts = await Account.find()
            .populate("customer", "firstName lastName email phone");

        return res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts
        });

    } catch (error) {
        console.error("Get accounts error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve accounts",
            error: error.message
        });
    }
};


// ========================================
// NAME ENQUIRY
// ========================================
// GET /api/accounts/name-enquiry/:accountNumber

exports.nameEnquiry = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        if (!accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Account number is required"
            });
        }

        const result = await nibssRequest({
            method: "get",
            url: `/account/name-enquiry/${accountNumber}`
        });

        return res.status(200).json({
            success: true,
            message: "Name enquiry successful",
            data: result
        });

    } catch (error) {
        console.error(
            "Name enquiry error:",
            error.response?.data || error.message
        );

        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Name enquiry failed",
            error: error.response?.data || error.message
        });
    }
};




// ========================================
// CHECK BALANCE
// ========================================
// GET /api/accounts/:accountNumber/balance

exports.checkBalance = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        const account = await Account.findOne({
            accountNumber
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found"
            });
        }

        if (String(account.customer) !== String(req.customer.id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                accountNumber: account.accountNumber,
                balance: account.balance,
                currency: account.currency,
                status: account.status
            }
        });

    } catch (error) {
        console.error("Balance check error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Balance check failed",
            error: error.message
        });
    }
};


// ========================================
// UPDATE ACCOUNT
// ========================================
// PUT /api/accounts/:accountNumber

exports.updateAccount = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { accountName } = req.body;

        const account = await Account.findOne({
            accountNumber
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found"
            });
        }

        if (String(account.customer) !== String(req.customer.id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        if (account.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "Closed account cannot be updated"
            });
        }

        if (!accountName) {
            return res.status(400).json({
                success: false,
                message: "Account name is required"
            });
        }

        account.accountName = accountName;

        await account.save();

        return res.status(200).json({
            success: true,
            message: "Account updated successfully",
            data: account
        });

    } catch (error) {
        console.error("Account update error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Account update failed",
            error: error.message
        });
    }
};


// ========================================
// DELETE / CLOSE ACCOUNT
// ========================================
// DELETE /api/accounts/:accountNumber

exports.deleteAccount = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        const account = await Account.findOne({
            accountNumber
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found"
            });
        }

        if (String(account.customer) !== String(req.customer.id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        if (account.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "Account is already closed"
            });
        }

        if (account.balance > 0) {
            return res.status(400).json({
                success: false,
                message: "Account cannot be closed while it has a positive balance"
            });
        }

        account.status = "closed";

        await account.save();

        return res.status(200).json({
            success: true,
            message: "Account closed successfully",
            data: {
                accountNumber: account.accountNumber,
                status: account.status
            }
        });

    } catch (error) {
        console.error("Account closing error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Account closing failed",
            error: error.message
        });
    }
};
