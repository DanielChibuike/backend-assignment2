
const express = require("express");
const router = express.Router();

const transactionRoute = require("../Controller/transactionController");

const customerAuth = require("../Middleware/customerAuth");

// Name enquiry
router.get("/name-enquiry/:accountNumber", customerAuth, transactionRoute.doNameEnquiry);

// Transfer
router.post( "/transfer", customerAuth, transactionRoute.initiateTransfer );

// Transaction status
router.get( "/:reference/status", customerAuth, transactionRoute.checkTransactionStatus);

// Transaction history
router.get( "/history", customerAuth,  transactionRoute.getTransactionHistory);

module.exports = router;

