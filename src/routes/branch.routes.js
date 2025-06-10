const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");

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
 *               regionCode: { type: string }
 *               longitude: { type: number }
 *               latitude: { type: number }
 *               holiday: { type: boolean }
 *               status: { type: boolean }
 *               createdBy: { type: string }
 *               updatedBy: { type: string }
 *     responses:
 *       201:
 *         description: Branch created
 */
router.post("/branch", branchController.addBranch);

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
 *               regionCode: { type: string }
 *               longitude: { type: number }
 *               latitude: { type: number }
 *               holiday: { type: boolean }
 *               status: { type: boolean }
 *               updatedBy: { type: string }
 *     responses:
 *       200:
 *         description: Branch updated
 */
router.put("/branch/:id", branchController.editBranch);

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
router.get("/branch", branchController.getAllBranch);

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
router.get("/branch/:id", branchController.getBranch);

module.exports = router;
