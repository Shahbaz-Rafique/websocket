const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { createWebSocketServer } = require('./websocket'); 

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// Initialize WebSocket server
createWebSocketServer(server);

// Start the HTTP server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
