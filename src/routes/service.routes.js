const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * /api/service:
 *   post:
 *     summary: Add new service
 *     tags: [Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *               - documentIds
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: "Customer Onboarding"
 *               estimatedTime:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of document IDs to relate with this service
 *                 example: [1, 2, 3]
 *     responses:
 *       201:
 *         description: Service created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 service:
 *                   type: object
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/service",
  allowRoles("admin"),
  verifyUserToken,
  serviceController.addService
);

/**
 * @swagger
 * /api/service:
 *   get:
 *     summary: Get all services
 *     tags: [Service]
 *     responses:
 *       200:
 *         description: A list of all services
 */
router.get(
  "/service",
  allowRoles("nasabah", "admin", "loket"),
  serviceController.getAllService
);

/**
 * @swagger
 * /api/service/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Service]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service data
 *       404:
 *         description: Service not found
 */
router.get(
  "/service/:id",
  allowRoles("nasabah", "admin", "loket", "cs"),
  serviceController.getService
);

/**
 * @swagger
 * /api/service/{id}:
 *   put:
 *     summary: Edit a service by ID
 *     tags: [Service]
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
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: "Pengajuan KPR"
 *               estimatedTime:
 *                 type: integer
 *                 example: 20
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put(
  "/service/:id",
  allowRoles("admin"),
  verifyUserToken,
  serviceController.editService
);

/**
 * @swagger
 * /api/service/{id}/status:
 *   put:
 *     summary: Update Service Status (activate or deactivate)
 *     tags: [Service]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID layanan
 *     responses:
 *       200:
 *         description: Status layanan berhasil diperbarui
 *       404:
 *         description: Layanan tidak ditemukan
 *       400:
 *         description: Status tidak valid
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/service/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  serviceController.updateServiceStatus
);

module.exports = router;
