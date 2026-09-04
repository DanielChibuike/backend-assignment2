
const express = require("express");

const router = express.Router();

const customerRoute = require("../Controller/customerController")
const customerAuth = require("../Middleware/customerAuth");


// Register customer
router.post("/register",customerRoute.registerCustomer);


// Customer login
router.post("/login", customerRoute.loginCustomer);


// Get logged-in customer's profile
router.get("/me", customerAuth,customerRoute.getMyProfile);


module.exports = router;
