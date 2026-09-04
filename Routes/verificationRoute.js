
const express = require("express");

const router = express.Router();

const verificationRoute = require("../Controller/verificationController");

const customerAuth = require("../Middleware/customerAuth");


// ===============================
// BVN
// ===============================

// Insert BVN
router.post("/bvn/insert", verificationRoute.insertBVN);

// Validate BVN
router.post("/bvn/validate", customerAuth, verificationRoute.validateBVN);


// ===============================
// NIN
// ===============================

// Insert NIN
router.post("/nin/insert", verificationRoute.insertNIN);

// Validate NIN
router.post("/nin/validate", customerAuth, verificationRoute.validateNIN);


module.exports = router;
