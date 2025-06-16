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
 * /api/queue/count/{branchId}:
 *   get:
 *     summary: Get total active queues (not done, skipped, or canceled) in a specific branch
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
 *         description: Total active queue count in the specified branch
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
 *         description: branchId is missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get("/queue/count/:branchId", queueController.getQueueCountByBranchId);

/**
 * @swagger
 * /api/queue/remaining/{queueId}:
 *   get:
 *     summary: Get number of active queues in front of specific queue
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the current queue
 *     responses:
 *       200:
 *         description: Number of active queues before this queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queueId:
 *                   type: integer
 *                 branchId:
 *                   type: integer
 *                 remainingInFront:
 *                   type: integer
 *       400:
 *         description: queueId is missing or invalid
 *       404:
 *         description: Queue not found
 *       500:
 *         description: Internal server error
 */
router.get("/queue/remaining/:queueId", queueController.getRemainingQueue);

/**
 * @swagger
 * /api/queue/latest-inprogress:
 *   get:
 *     summary: Get the latest queue that is currently in progress
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Latest in-progress queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: No in-progress queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/latest-inprogress",
  queueController.getLatestInProgressQueue
);

/**
 * @swagger
 * /api/queue/waiting/{branchId}:
 *   get:
 *     summary: Get all waiting queues in a specific branch For CS
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
 *         description: List of waiting queues
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: branchId is required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/waiting/:branchId",
  queueController.getWaitingQueuesByBranchId
);

/**
 * @swagger
 * /api/queue/next-to-serve:
 *   get:
 *     summary: Get the next customer queue to be served for CS
 *     tags: [Queue]
 *     description: Returns the earliest queue entry with status 'waiting'. Used by CS to call the next customer.
 *     responses:
 *       200:
 *         description: The next waiting queue found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 name:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *       404:
 *         description: No waiting queue available
 *       500:
 *         description: Internal server error
 */
router.get("/queue/waiting-oldest", queueController.getOldestWaitingQueue);

module.exports = router;
