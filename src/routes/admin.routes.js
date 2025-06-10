const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin, CS, and Loket Authentication
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Login for admin/cs/loket
 *     tags: [Admin]
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
 *         description: Login success
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", adminController.login);

module.exports = router;
