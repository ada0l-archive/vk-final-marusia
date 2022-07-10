const express = require("express");
const cors = require("cors");

const server = express()
    .use(express.json())
    .use(express.urlencoded({extended: true}))
    .use(cors());

const http = require("http").createServer(server);

const handlers = require('./handlers.js');

server.post("/webhook10", (req, res) => res.json(handlers.blackJack(req.body)));

const port = process.env.PORT || 3000
http.listen(port, () => { console.log("Слушаю очень внимательно на порту", port); });
