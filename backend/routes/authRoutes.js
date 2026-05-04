const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// ROTAS DE AUTENTICAÇÃO
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/verify", authController.verify);

module.exports = router;
