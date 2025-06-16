const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service.controller");
const { allowRoles } = require("../middlewares/auth");

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
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: "Customer Onboarding"
 *               estimatedTime:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *               createdBy:
 *                 type: string
 *                 example: "admin"
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
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
 *       500:
 *         description: Internal server error
 */
router.post("/service", allowRoles("admin"), serviceController.addService);

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
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put("/service/:id", allowRoles("admin"), serviceController.editService);

/**
 * @swagger
 * /api/service/{id}:
 *   delete:
 *     summary: Delete service by ID
 *     tags: [Service]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service deleted
 */
router.delete(
  "/service/:id",
  allowRoles("admin"),
  serviceController.deleteService
);

module.exports = router;
