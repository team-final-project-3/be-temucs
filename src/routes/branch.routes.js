const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * /api/branch:
 *   post:
 *     summary: Add new branch
 *     tags: [Branch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               branchCode: { type: string }
 *               address: { type: string }
 *               longitude: { type: number }
 *               latitude: { type: number }
 *               holiday: { type: boolean }
 *               status: { type: boolean }
 *     responses:
 *       201:
 *         description: Branch created
 */
router.post(
  "/branch",
  allowRoles("admin"),
  verifyUserToken,
  branchController.addBranch
);

/**
 * @swagger
 * /api/branch/{id}:
 *   put:
 *     summary: Edit branch
 *     tags: [Branch]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               branchCode: { type: string }
 *               address: { type: string }
 *               longitude: { type: number }
 *               latitude: { type: number }
 *               holiday: { type: boolean }
 *     responses:
 *       200:
 *         description: Branch updated
 */
router.put(
  "/branch/:id",
  allowRoles("admin"),
  verifyUserToken,
  branchController.editBranch
);

/**
 * @swagger
 * /api/branch/{id}/status:
 *   put:
 *     summary: Update Branch Status (active or deactive)
 *     tags: [Branch]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID Cabang
 *     responses:
 *       200:
 *         description: Status cabang diperbarui
 *       404:
 *         description: Cabang tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/branch/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  branchController.updateBranchStatus
);

/**
 * @swagger
 * /api/branch:
 *   get:
 *     summary: Get all branches
 *     tags: [Branch]
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get(
  "/branch",
  allowRoles("admin", "nasabah"),
  branchController.getAllBranch
);

/**
 * @swagger
 * /api/branch/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branch]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Branch detail
 *       404:
 *         description: Branch not found
 */
router.get(
  "/branch/:id",
  allowRoles("admin", "nasabah"),
  verifyUserToken,
  branchController.getBranch
);

module.exports = router;
