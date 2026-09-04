const mongose = require("mongoose");

const transactionSchema = new mongose.Schema(
  {
    reference: { 
        type: String,
         required: true,
          unique: true },

    nibssReference: { 
        type: String,
         default: null 
        },

    type: {
         type: String,
         enum: ['intra-bank', 'inter-bank'],
          required: true
         },

    senderAccount: {
         type: mongose.Schema.Types.ObjectId, 
        ref: 'Account',
         required: true
         },

    senderCustomer: {
         type: mongose.Schema.Types.ObjectId,
         ref: 'Customer',
          required: true
         },

         receiverAccount: {
          type: mongose.Schema.Types.ObjectId,
          ref: 'Account',
          default: null
        },

    receiverAccountNumber: { 
        type: String, 
        required: true
     },

    receiverBankCode: { 
        type: String,
         required: true 
        },

    receiverName: {
         type: String,
         required: true
         },


    amount: {
         type: Number, 
        required: true,
         min: 1 
        },

    narration: { 
        type: String,
         default: '' 
        },

    status: {
         type: String, 
         enum: ['pending', 'successful', 'failed'], 
         default: 'pending'
         },
  },
  { timestamps: true }
);

transactionSchema.index({ senderCustomer: 1, createdAt: -1 });


const Transaction = mongose.model("Transaction", transactionSchema);
module.exports = Transaction;
