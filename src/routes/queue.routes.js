const express = require("express");
const router = express.Router();
const queueController = require("../controllers/queue.controller");

/**
 * @swagger
 * /api/queue/book-online:
 *   post:
 *     summary: Book queue online (user)
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - branchId
 *               - bookingDate
 *               - name
 *               - email
 *               - phoneNumber
 *             properties:
 *               userId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Queue booked (online)
 */
router.post("/queue/book-online", queueController.bookQueueOnline);

/**
 * @swagger
 * /api/queue/book-offline:
 *   post:
 *     summary: Book queue offline (loket)
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loketId
 *               - branchId
 *               - bookingDate
 *               - name
 *               - email
 *               - phoneNumber
 *             properties:
 *               loketId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Queue booked (offline)
 */
router.post("/queue/book-offline", queueController.bookQueueOffline);

/**
 * @swagger
 * /api/queue/{id}/cancel:
 *   patch:
 *     summary: Cancel a queue change status to canceled
 *     tags:
 *       - Queue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Queue canceled
 */
router.patch("/queue/:id/cancel", queueController.cancelQueue);

/**
 * @swagger
 * /api/queue/{id}/skip:
 *   patch:
 *     summary: Skip a queue change status to skipped
 *     tags:
 *       - Queue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Queue skipped
 */
router.patch("/queue/:id/skip", queueController.skipQueue);

/**
 * @swagger
 * /api/queue/{id}/take:
 *   patch:
 *     summary: Take a queue (change status to in progress and assign csId)
 *     tags:
 *       - Queue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Queue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csId
 *             properties:
 *               csId:
 *                 type: integer
 *                 description: ID CS yang mengambil antrian
 *     responses:
 *       200:
 *         description: Queue taken (in progress)
 */
router.patch("/queue/:id/take", queueController.takeQueue);

/**
 * @swagger
 * /api/queue/{id}/done:
 *   patch:
 *     summary: Mark a queue as done change status to done
 *     tags:
 *       - Queue
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Queue done
 */
router.patch("/queue/:id/done", queueController.doneQueue);

/**
 * @swagger
 * /api/queue/update-estimated-time:
 *   post:
 *     summary: Update total estimated time pada antrean (Queue) berdasarkan layanan (Service) yang dipilih
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queueId
 *               - updatedBy
 *             properties:
 *               queueId:
 *                 type: integer
 *                 example: 5
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Estimated time berhasil dihitung dan disimpan ke antrean
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 queueId:
 *                   type: integer
 *                 estimatedTime:
 *                   type: integer
 *                 updatedQueue:
 *                   type: object
 *       400:
 *         description: Request tidak valid
 *       404:
 *         description: Tidak ditemukan layanan untuk antrean
 *       500:
 *         description: Internal server error
 */
router.post("/queue/update-estimated-time", queueController.updateQueueEstimatedTime);

/**
 * @swagger
 * /api/queue/count/{branchId}:
 *   get:
 *     summary: Get total number of queues in a specific branch
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the branch
 *     responses:
 *       200:
 *         description: Total number of queues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branchId:
 *                   type: integer
 *                 totalQueue:
 *                   type: integer
 *       400:
 *         description: Missing or invalid branchId
 *       500:
 *         description: Internal server error
 */
router.get("/queue/count/:branchId", queueController.getQueueCountByBranchId);



module.exports = router;
