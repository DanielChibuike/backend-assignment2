const mongose = require("mongoose");


const customerSchema = new mongose.Schema({

    firstName:{
        type:String,
        required:true
    },
    lastName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },

    password:{
        type:String,
        required:true
    }, 

    phone:{
        type:String,
        required:true
    },
    dob:{
        type:String,
        required:true
    },

    bvn:{
        type:String,
        default:null
    },
    nin:{
        type:String,
        default:null
    },
    
    isVerified:{
        type:Boolean,
        default:false
    },
    verifiedVia:{
        type:String,
        enum:["bvn","nin",null],default:null
    },
    verifiedAt:{
        type:Date,
        default:null
    }

},
{timestamps:true}
);


const Customer = mongose.model("Customer", customerSchema);
module.exports = Customer;