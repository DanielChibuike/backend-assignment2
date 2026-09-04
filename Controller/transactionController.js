
const mongoose = require("mongoose");
const crypto = require("crypto");
const Account = require("../Models/account");
const Customer = require("../Models/customer");
const Transaction = require("../Models/transaction");
const nibssRequest = require("../Utils/nibssRequest");

// NIBSS by Phoenix endpoints
// NIBSS_BASE_URL already contains /api
const NAME_ENQUIRY_URL = "/account/name-enquiry";
const TRANSFER_URL = "/transfer";
const TSQ_URL = "/transaction";

// Generate our own transaction reference
function generateReference() {
    return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}


// NAME ENQUIRY
// GET /api/transactions/name-enquiry/:accountNumber

exports.doNameEnquiry = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        if (!accountNumber) {
            return res.status(400).json({
                success: false,
                message: "accountNumber is required"
            });
        }

        // Check our own database first
        const localAccount = await Account.findOne({
            accountNumber
        });

        if (localAccount) {
            return res.status(200).json({
                success: true,
                data: {
                    accountNumber: localAccount.accountNumber,
                    accountName: localAccount.accountName,
                    bankCode: localAccount.bankCode
                }
            });
        }

        // If the account is not ours, ask Phoenix
        const result = await nibssRequest({
            method: "get",
            url: `${NAME_ENQUIRY_URL}/${accountNumber}`
        });

        return res.status(200).json({
            success: true,
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
// INITIATE TRANSFER
// ========================================
// POST /api/transactions/transfer
//
// Body:
// {
//     "senderAccountNumber": "8824709125",
//     "receiverAccountNumber": "882xxxxxxxx",
//     "receiverBankCode": "882",
//     "amount": 5000,
//     "narration": "Transfer"
// }

exports.initiateTransfer = async (req, res) => {

    const session = await mongoose.startSession();

    try {

        const {
            senderAccountNumber,
            receiverAccountNumber,
            receiverBankCode,
            amount,
            narration
        } = req.body;


        // ========================================
        // VALIDATE INPUT
        // ========================================

        if (
            !senderAccountNumber ||
            !receiverAccountNumber ||
            !receiverBankCode ||
            !amount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "senderAccountNumber, receiverAccountNumber, receiverBankCode and amount are required"
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid amount is required"
            });
        }

        const transferAmount = Number(amount);


        // ========================================
        // FIND SENDER
        // ========================================

        const senderAccount = await Account.findOne({
            accountNumber: senderAccountNumber
        });

        if (!senderAccount) {
            return res.status(404).json({
                success: false,
                message: "Sender account not found"
            });
        }


        // ========================================
        // SECURITY CHECK
        // ========================================

        if (
            req.customer &&
            String(senderAccount.customer) !== String(req.customer.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }
       // CHECK CUSTOMER VERIFICATION

       const customer = await Customer.findById(req.customer.id);

      if (!customer) {
    return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
      }

    if (!customer.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Customer must complete BVN or NIN verification before transferring"
       });
     }


        // ========================================
        // CHECK ACCOUNT STATUS
        // ========================================

        if (senderAccount.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Sender account is not active"
            });
        }


        // ========================================
        // CHECK BALANCE
        // ========================================

        if (senderAccount.balance < transferAmount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient funds"
            });
        }


        // ========================================
        // FIND RECEIVER
        // ========================================

        const receiverAccount = await Account.findOne({
            accountNumber: receiverAccountNumber,
            bankCode: receiverBankCode
        });

        const isIntraBank = Boolean(receiverAccount);

        let receiverName;


        // ========================================
        // INTRA-BANK RECEIVER
        // ========================================

        if (isIntraBank) {

            if (receiverAccount.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: "Receiver account is not active"
                });
            }

            receiverName = receiverAccount.accountName;

        }

        // ========================================
        // INTER-BANK RECEIVER
        // ========================================

        else {

            const enquiry = await nibssRequest({
                method: "get",
                url: `${NAME_ENQUIRY_URL}/${receiverAccountNumber}`
            });

            if (!enquiry) {
                return res.status(404).json({
                    success: false,
                    message: "Receiver account could not be verified"
                });
            }

            receiverName =
                enquiry.accountName ||
                enquiry.name;

            if (!receiverName) {
                return res.status(404).json({
                    success: false,
                    message: "Receiver account name could not be retrieved"
                });
            }
        }


        // ========================================
        // GENERATE TRANSACTION REFERENCE
        // ========================================

        const reference = generateReference();


        // ========================================
        // CREATE PENDING TRANSACTION
        // ========================================

        let txn = await Transaction.create({
         reference,
          type: isIntraBank ? "intra-bank" : "inter-bank",

            senderAccount: senderAccount._id,
            senderCustomer: senderAccount.customer,

         // Save receiver's MongoDB Account ID for intra-bank transfers
        receiverAccount: isIntraBank
          ? receiverAccount._id
          : null,

        receiverAccountNumber,
        receiverBankCode,
         receiverName,
         amount: transferAmount,
          narration,
          status: "pending"
        });



        // ========================================
        // START DATABASE TRANSACTION
        // ========================================

        session.startTransaction();

        try {

            // ========================================
            // INTRA-BANK TRANSFER
            // ========================================

            if (isIntraBank) {

                // Deduct sender
                senderAccount.balance -= transferAmount;

                await senderAccount.save({
                    session
                });


                // Credit receiver
                receiverAccount.balance += transferAmount;

                await receiverAccount.save({
                    session
                });


                // Mark successful
                txn.status = "successful";

            }


            // ========================================
            // INTER-BANK TRANSFER
            // ========================================

            else {

                /*
                 * Phoenix expects:
                 *
                 * {
                 *     from: sender account number,
                 *     to: receiver account number,
                 *     amount: "5000"
                 * }
                 */

                const nibssResult = await nibssRequest({
                    method: "post",

                    url: TRANSFER_URL,

                    data: {
                        from: senderAccountNumber,
                        to: receiverAccountNumber,
                        amount: String(transferAmount)
                    }
                });


                // ========================================
                // CHECK PHOENIX RESPONSE
                // ========================================

                const phoenixStatus =
                    String(nibssResult?.status || "").toUpperCase();


                // Phoenix transfer failed
                if (phoenixStatus === "FAILED") {

                    txn.status = "failed";

                    await txn.save({
                        session
                    });

                    await session.commitTransaction();

                    return res.status(400).json({
                        success: false,
                        message: "Transfer failed",
                        data: txn
                    });
                }


                // Phoenix returned an unexpected response
                if (
                    !nibssResult ||
                    !["SUCCESS", "PENDING"].includes(phoenixStatus)
                ) {

                    throw new Error(
                        "Invalid response received from NIBSS/Phoenix"
                    );
                }


                // Save Phoenix transaction reference
                txn.nibssReference =
                    nibssResult.transactionId ||
                    nibssResult.reference ||
                    null;


                // If Phoenix says successful,
                // deduct the local balance.
                if (phoenixStatus === "SUCCESS") {

                    senderAccount.balance -= transferAmount;

                    await senderAccount.save({
                        session
                    });

                    txn.status = "successful";
                }


                // If Phoenix says pending,
                // don't deduct local balance yet.
                if (phoenixStatus === "PENDING") {

                    txn.status = "pending";
                }
            }


            // ========================================
            // SAVE TRANSACTION
            // ========================================

            await txn.save({
                session
            });


            // ========================================
            // COMMIT
            // ========================================

            await session.commitTransaction();


        } catch (innerError) {

            // Roll back local balance changes
            await session.abortTransaction();


            // Mark transaction as failed
            txn.status = "failed";

            await txn.save();


            throw innerError;
        }


        // ========================================
        // SUCCESS RESPONSE
        // ========================================

        return res.status(200).json({
            success: true,
            message: "Transfer processed successfully",
            data: txn
        });


    } catch (error) {

        console.error(
            "Transfer error:",
            error.response?.data || error.message
        );

        return res.status(
            error.response?.status || 500
        ).json({
            success: false,
            message: "Transfer failed",
            error:
                error.response?.data ||
                error.message
        });

    } finally {

        await session.endSession();
    }
};



// ========================================
// CHECK TRANSACTION STATUS
// ========================================
// GET /api/transactions/:reference/status

exports.checkTransactionStatus = async (req, res) => {

    try {

        const { reference } = req.params;


        // ========================================
        // FIND TRANSACTION
        // ========================================

        const txn = await Transaction.findOne({
            reference
        });

        if (!txn) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }


        // ========================================
        // SECURITY CHECK
        // ========================================

         

        const customerAccounts = await Account.find({
        customer: req.customer.id
        }).select("_id");

       const customerAccountIds = customerAccounts.map(account =>
    String(account._id)
     );

    const isSender =
    String(txn.senderCustomer) === String(req.customer.id);

    const isReceiver =
    txn.receiverAccount &&
    customerAccountIds.includes(String(txn.receiverAccount));

     if (!isSender && !isReceiver) {
    return res.status(403).json({
        success: false,
        message: "Access denied"
    });
    }


        // ========================================
        // INTRA-BANK
        // ========================================

        if (txn.type === "intra-bank") {

            return res.status(200).json({
                success: true,
                data: {
                    reference: txn.reference,
                    status: txn.status
                }
            });
        }


        // ========================================
        // INTER-BANK WITHOUT PHOENIX REFERENCE
        // ========================================

        if (!txn.nibssReference) {

            return res.status(200).json({
                success: true,
                data: {
                    reference: txn.reference,
                    status: txn.status
                }
            });
        }


        // ========================================
        // QUERY PHOENIX TSQ
        // ========================================

        const nibssResult = await nibssRequest({
            method: "get",
            url: `${TSQ_URL}/${txn.nibssReference}`
        });


        // ========================================
        // MAP PHOENIX STATUS
        // ========================================

        const statusMap = {
            SUCCESS: "successful",
            FAILED: "failed",
            PENDING: "pending"
        };


        const phoenixStatus =
            String(nibssResult?.status || "").toUpperCase();


        const liveStatus =
            statusMap[phoenixStatus] ||
            txn.status;


        // ========================================
        // UPDATE LOCAL STATUS
        // ========================================

        if (liveStatus !== txn.status) {

            txn.status = liveStatus;

            await txn.save();
        }


        return res.status(200).json({
            success: true,
            data: {
                reference: txn.reference,
                nibssReference: txn.nibssReference,
                status: liveStatus
            }
        });


    } catch (error) {

        console.error(
            "Error checking transaction status:",
            error.response?.data ||
            error.message
        );

        return res.status(
            error.response?.status || 500
        ).json({
            success: false,
            message: "Status check failed",
            error:
                error.response?.data ||
                error.message
        });
    }
};



// TRANSACTION HISTORY

// GET /api/transactions/history

exports.getTransactionHistory = async (req, res) => {
    try {
        if (!req.customer) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Find the customer's account(s)
        const accounts = await Account.find({
            customer: req.customer.id
        }).select("_id");

        const accountIds = accounts.map(account => account._id);

        // Get transactions where the customer either:
        // 1. Sent the money
        // 2. Received the money
        const transactions = await Transaction.find({
            $or: [
                { senderCustomer: req.customer.id },
                { receiverAccount: { $in: accountIds } }
            ]
        })
        .sort({ createdAt: -1 })
        .lean();

        // Add a direction field for the frontend
        const history = transactions.map(transaction => {
            const isReceived = transaction.receiverAccount &&
                accountIds.some(
                    accountId =>
                        String(accountId) === String(transaction.receiverAccount)
                );

            return {
                ...transaction,
                direction: isReceived ? "received" : "sent"
            };
        });

        return res.status(200).json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error(
            "Transaction history error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch transaction history",
            error: error.message
        });
    }
};



