const mongose = require("mongoose");


const accountSchema = new mongose.Schema(
  {
    customer: {
      type: mongose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true, // enforces max 1 account per customer at the DB level
    },
    accountNumber: { 
        type: String,
         required: true,
          unique: true },

    accountName: {
         type: String,
         required: true
         },

    bankCode: {
         type: String,
         required: true 
        },

    balance: { 
        type: Number,
         required: true,
          default: 15000
         },

    currency: { 
        type: String, 
        default: 'NGN' 
    },

    status: {
         type: String,
         enum: ["active", "frozen", "closed"], 
         default: "active"
        },
  },
  { timestamps: true }
);


const Account = mongose.model("Account", accountSchema);
module.exports = Account;
