const express = require("express");
const router = express.Router();
const queueServiceController = require("../controllers/queueservice.controller");

/**
 * @swagger
 * /api/queue-service:
 *   post:
 *     summary: Simpan layanan (services) yang dipilih untuk sebuah antrean (queue)
 *     tags: [QueueService]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queueId
 *               - serviceIds
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               queueId:
 *                 type: integer
 *                 example: 1
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 3, 5]
 *               createdBy:
 *                 type: string
 *                 example: "admin"
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: Data layanan untuk antrean berhasil disimpan
 *       400:
 *         description: Request tidak valid
 *       500:
 *         description: Internal server error
 */
router.post("/queue-service", queueServiceController.createQueueService);

/**
 * @swagger
 * /api/documents-by-queue/{queueId}:
 *   get:
 *     summary: Ambil dokumen yang dibutuhkan berdasarkan antrean (queueId)
 *     tags: [QueueService]
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: List dokumen yang relevan berdasarkan layanan di antrean tersebut
 *       404:
 *         description: Tidak ada layanan ditemukan
 *       500:
 *         description: Internal server error
 */
router.get(
  "/documents-by-queue/:queueId",
  queueServiceController.getDocumentsByQueueId
);

/**
 * @swagger
 * /api/queue-service/{queueId}:
 *   get:
 *     summary: Get all services linked to a specific queue
 *     tags: [QueueService]
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the queue
 *     responses:
 *       200:
 *         description: List of services for the given queue
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: queueId is required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue-service/:queueId",
  queueServiceController.getQueueServicesByQueueId
);

module.exports = router;
