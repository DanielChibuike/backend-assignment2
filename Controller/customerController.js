
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Customer = require("../Models/customer");

// POST /api/customers/register
// Registers a new customer.
// Password is hashed before it is stored in MongoDB.
exports.registerCustomer = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            dob
        } = req.body;

        // Check required fields
        if (
            !firstName ||
            !lastName ||
            !email ||
            !password ||
            !phone ||
            !dob
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "firstName, lastName, email, password, phone and dob are required"
            });
        }

        // Check if customer already exists
        const existingCustomer = await Customer.findOne({
            email: email.toLowerCase()
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Customer already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create customer
        const customer = await Customer.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone,
            dob
        });

        return res.status(201).json({
            success: true,
            message: "Customer registered successfully",
            data: {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                dob: customer.dob,
                isVerified: customer.isVerified
            }
        });

    } catch (error) {
        console.error("Customer registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        });
    }
};


// POST /api/customers/login
// Logs in a customer and returns a JWT.
exports.loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find customer
        const customer = await Customer.findOne({
            email: email.toLowerCase()
        });

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            customer.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                customerId: customer._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "6h"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            customer: {
                id: customer._id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                isVerified: customer.isVerified
            }
        });

    } catch (error) {
        console.error("Customer login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
};


// GET /api/customers/me
// Returns the currently authenticated customer's information.
exports.getMyProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.customer.id)
            .select("-password");

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: customer
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer",
            error: error.message
        });
    }
};
