const express = require("express");
const router = express.Router();
const loketController = require("../controllers/loket.controller");

/**
 * @swagger
 * /api/loket/add:
 *   post:
 *     summary: Add new Loket (admin only)
 *     tags: [Loket]
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
 *               - status
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
 *               status:
 *                 type: string
 *               createdBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Loket created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/loket/add", loketController.addLoket);

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
 *                 loket:
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
router.post("/loket/login", loketController.login);

module.exports = router;
