require("dotenv").config();

const express = require("express");
const connectDB = require("./Config/databaseconfig");

const index = express();

index.use(express.json());

connectDB();

//Routes
const customerRouter = require("./Routes/customerRoute")
const accountRouter= require("./Routes/accountRoute");
const verificationRouter = require("./Routes/verificationRoute");
const transactionRouter = require("./Routes/transactionRoute");


index.use("/api/customers",customerRouter)
index.use("/api/accounts",accountRouter)
index.use("/api/verifications",verificationRouter);
index.use("/api/transactions",transactionRouter);

const PORT = process.env.PORT || 3800;

index.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});