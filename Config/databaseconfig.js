const mongose = require("mongoose");
const dns = require("dns");

//use reliable Dns server for momgoDb ATlas SRV resolution

dns.setServers(["8.8.8.8","1.1.1.1"]);
//connect database
const connectDB = async () => {
    try {
        const conn = await mongose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;