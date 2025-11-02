import http from "http";

const server = http.createServer();


server.listen(4000,() => {
    console.log("server is runing on PORT: 4000")
})