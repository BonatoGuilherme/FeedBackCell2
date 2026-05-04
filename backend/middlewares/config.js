const cors = require("cors");
const express = require("express");

const configMiddlewares = (app) => {
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

module.exports = configMiddlewares;
