const express = require("express");
const usuarioController = require("../controllers/usuariosController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");

const router = express.Router();

// Rotas protegidas
router.get("/perfil", authMiddleware, usuarioController.getProfile);
router.put("/perfil", authMiddleware, usuarioController.updateProfile);
router.put("/senha", authMiddleware, usuarioController.updatePassword);
router.delete("/conta", authMiddleware, usuarioController.deleteAccount);

// Admin only
router.get("/", authMiddleware, requireAdmin, usuarioController.getAll);

module.exports = router;
