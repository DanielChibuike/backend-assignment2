
const express = require("express");

const router = express.Router();

const accountRoute = require("../Controller/accountController");

const customerAuth = require("../Middleware/customerAuth");


// Create account
router.post("/createaccount", customerAuth,accountRoute.createAccount);



// get all accounts
router.get("/accounts", customerAuth,accountRoute.getAllAccounts);


// name enquiry
router.get("/name-enquiry/:accountNumber", customerAuth, accountRoute.nameEnquiry);


// Check balance
router.get("/:accountNumber/balance", customerAuth, accountRoute.checkBalance);

//update account
router.put("/:accountNumber",customerAuth,accountRoute.updateAccount);

//close account
router.delete("/:accountNumber",customerAuth,accountRoute.deleteAccount);


module.exports = router;
