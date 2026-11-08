const express = require("express");
const authController = require("../controllers/authController");
const validateInput = require("../middlewares/validateInput");
const { usuarioSchema } = require("../middlewares/schemas");

const router = express.Router();

// ROTAS DE AUTENTICAÇÃO
router.post("/register", validateInput(usuarioSchema.register), authController.register);
router.post("/login", validateInput(usuarioSchema.login), authController.login);
router.post("/logout", authController.logout);
router.get("/verify", authController.verify);

module.exports = router;
