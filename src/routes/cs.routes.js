const express = require("express");
const router = express.Router();
const csController = require("../controllers/cs.controller");
const { verifyCSToken } = require("../auth/cs.auth");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

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
 *             properties:
 *               branchId:
 *                 type: integer
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: CS created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/cs/add",
  allowRoles("admin"),
  verifyUserToken,
  csController.addCS
);

/**
 * @swagger
 * /api/cs/{id}:
 *   put:
 *     summary: Edit CS
 *     tags: [CS]
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
 *                 example: "CS John"
 *               password:
 *                 type: string
 *                 example: "newPassword123"  # Optional
 *     responses:
 *       200:
 *         description: CS updated
 *       404:
 *         description: CS tidak ditemukan
 *       500:
 *         description: Internal server error
 */
router.put(
  "/cs/:id",
  allowRoles("admin"),
  verifyUserToken,
  csController.editCS
);

/**
 * @swagger
 * /api/cs/{id}/status:
 *   put:
 *     summary: Update CS status (activate or deactivate)
 *     tags: [CS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID CS yang ingin diaktifkan/nonaktifkan
 *     responses:
 *       200:
 *         description: Status CS berhasil diperbarui
 *       404:
 *         description: CS tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/cs/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  csController.updateCSStatus
);

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
 *                 csId:
 *                   type: integer
 *       401:
 *         description: Invalid credentials
 */
router.post("/cs/login", csController.login);

/**
 * @swagger
 * /api/cs/profile:
 *   get:
 *     summary: Get CS profile
 *     tags: [CS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CS profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cs:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     name: { type: string }
 *                     username: { type: string }
 *                     branchId: { type: integer }
 *                     branch:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         name: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *       404:
 *         description: CS tidak ditemukan
 *       500:
 *         description: Internal server error
 */
router.get("/cs/profile", allowRoles("cs"), verifyCSToken, csController.getCS);

module.exports = router;
