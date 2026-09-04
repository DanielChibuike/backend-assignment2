const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dns.promises
    .resolveSrv("_mongodb._tcp.complex-app.emj2z6q.mongodb.net")
    .then((result) => {
        console.log("SRV lookup successful:");
        console.log(result);
    })
    .catch((error) => {
        console.error("SRV lookup failed:");
        console.error(error);
    });