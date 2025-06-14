const express = require("express");
const router = express.Router();
const csController = require("../controllers/cs.controller");

/**
 * @swagger
 * /api/cs/add:
 *   post:
 *     summary: Add new CS (admin only)
 *     tags: [CS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - name
 *               - username
 *               - password
 *               - createdBy
 *             properties:
 *               branchId:
 *                 type: integer
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               createdBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: CS created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/cs/add", csController.addCS);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                 cs:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     branch:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         branchCode:
 *                           type: string
 *                         address:
 *                           type: string
 *                         longitude:
 *                           type: number
 *                         latitude:
 *                           type: number
 *                         holiday:
 *                           type: boolean
 *                         status:
 *                           type: boolean
 *       401:
 *         description: Invalid credentials
 */
router.post("/cs/login", csController.login);

module.exports = router;
