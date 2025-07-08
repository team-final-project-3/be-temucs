const express = require("express");
const router = express.Router();
const loketController = require("../controllers/loket.controller");
const { verifyLoketToken } = require("../auth/loket.auth");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

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
 *     responses:
 *       201:
 *         description: Loket created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/loket/add",
  allowRoles("admin"),
  verifyUserToken,
  loketController.addLoket
);

/**
 * @swagger
 * /api/loket/{id}:
 *   put:
 *     summary: Edit Loket
 *     tags: [Loket]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Loket A"
 *               password:
 *                 type: string
 *                 example: "newPassword123"  # optional
 *     responses:
 *       200:
 *         description: Loket updated
 *       404:
 *         description: Loket tidak ditemukan
 *       500:
 *         description: Internal server error
 */
router.put(
  "/loket/:id",
  allowRoles("admin"),
  verifyUserToken,
  loketController.editLoket
);

/**
 * @swagger
 * /api/loket/{id}/status:
 *   put:
 *     summary: Update Loket Status (active or deactive)
 *     tags: [Loket]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID Loket
 *     responses:
 *       200:
 *         description: Status loket diperbarui
 *       404:
 *         description: Loket tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/loket/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  loketController.updateLoketStatus
);

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
 *                 loketId:
 *                   type: integer
 *       401:
 *         description: Invalid credentials
 */
router.post("/loket/login", loketController.login);

/**
 * @swagger
 * /api/loket/{id}/profile:
 *   get:
 *     summary: Get Loket profile by ID
 *     tags: [Loket]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loket profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loket:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     status:
 *                       type: boolean
 *                     branchId:
 *                       type: integer
 *                     branch:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Loket tidak ditemukan
 *       500:
 *         description: Internal server error
 */
router.get("/loket/:id/profile", verifyLoketToken, loketController.getLoket);

module.exports = router;
