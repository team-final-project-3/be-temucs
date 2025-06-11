const express = require("express");
const router = express.Router();
const loketController = require("../controllers/loket.controller");

/**
 * @swagger
 * /api/loket/login:
 *   post:
 *     summary: Login Loket
 *     tags: [Loket]
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
router.post("/loket/login", loketController.login);

module.exports = router;
