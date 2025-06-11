const express = require("express");
const router = express.Router();
const csController = require("../controllers/cs.controller");

/**
 * @swagger
 * /api/cs/login:
 *   post:
 *     summary: Login CS
 *     tags: [CS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
router.post("/cs/login", csController.login);

module.exports = router;
