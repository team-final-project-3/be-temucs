const express = require("express");
const router = express.Router();
const queueController = require("../controllers/queue.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyCSToken } = require("../auth/cs.auth");
const { verifyLoketToken } = require("../auth/loket.auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * /api/queue/book-online:
 *   post:
 *     summary: Book queue online (user)
 *     tags: [Queue]
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
 *               - serviceIds
 *             properties:
 *               branchId:
 *                 type: integer
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of service IDs to book
 *     responses:
 *       201:
 *         description: Queue booked (online)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 queue:
 *                   type: object
 *       400:
 *         description: Validation error
 */
router.post(
  "/queue/book-online",
  allowRoles("nasabah"),
  verifyUserToken,
  queueController.bookQueueOnline
);

/**
 * @swagger
 * /api/queue/book-offline:
 *   post:
 *     summary: Book queue offline (loket)
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phoneNumber
 *               - serviceIds
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of service IDs to book
 *     responses:
 *       201:
 *         description: Queue booked (offline)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 queue:
 *                   type: object
 *       400:
 *         description: Validation error
 */
router.post(
  "/queue/book-offline",
  allowRoles("loket"),
  verifyLoketToken,
  queueController.bookQueueOffline
);

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
router.patch(
  "/queue/:id/cancel",
  allowRoles("nasabah"),
  verifyUserToken,
  queueController.cancelQueue
);

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
router.patch(
  "/queue/:id/skip",
  allowRoles("cs"),
  verifyCSToken,
  queueController.skipQueue
);

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
 *     responses:
 *       200:
 *         description: Queue taken (in progress)
 */
router.patch(
  "/queue/:id/take",
  allowRoles("cs"),
  verifyCSToken,
  queueController.takeQueue
);

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
router.patch(
  "/queue/:id/done",
  allowRoles("cs"),
  verifyCSToken,
  queueController.doneQueue
);
//////////////////////////////////////


/**
 * @swagger
 * /api/queue/count:
 *   get:
 *     summary: Get total active queues for CS's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by CS role. Automatically gets branch from CS's login data.
 *     responses:
 *       200:
 *         description: Total active queue count for CS's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branchId:
 *                   type: integer
 *                 totalQueue:
 *                   type: integer
 *       403:
 *         description: CS not found or unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/count",
  allowRoles("cs"),
  verifyCSToken,
  queueController.getQueueCountByBranchIdCS
);


/**
 * @swagger
 * /api/queue/count:
 *   get:
 *     summary: Get total active queues for Loket's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by Loket role. Automatically gets branch from Loket's login data.
 *     responses:
 *       200:
 *         description: Total active queue count for Loket's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branchId:
 *                   type: integer
 *                 totalQueue:
 *                   type: integer
 *       403:
 *         description: Loket not found or unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/count",
  allowRoles("loket"),
  verifyLoketToken,
  queueController.getQueueCountByBranchIdLoket
);


/**
 * @swagger
 * /api/queue/count:
 *   get:
 *     summary: Get total active queues for user's latest visited branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by Nasabah. Gets branch based on user's last queue.
 *     responses:
 *       200:
 *         description: Total active queue count for the user's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branchId:
 *                   type: integer
 *                 totalQueue:
 *                   type: integer
 *       404:
 *         description: No recent queue found for user
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/count",
  allowRoles("nasabah"),
  verifyUserToken,
  queueController.getQueueCountByBranchIdUser
);


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
router.get(
  "/queue/remaining/:queueId",
  allowRoles("nasabah", "cs", "loket"),
  queueController.getRemainingQueue
);

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
  allowRoles("nasabah"),
  verifyUserToken,
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
  allowRoles("nasabah", "cs", "loket"),
  queueController.getWaitingQueuesByBranchId
);

/**
 * @swagger
 * /api/queue/waiting-oldest/{branchId}:
 *   get:
 *     summary: Get the next customer queue to be served for CS
 *     tags: [Queue]
 *     description: Returns the earliest queue entry with status 'waiting'. Used by CS to call the next customer.
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the branch
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
router.get(
  "/queue/waiting-oldest/:branchId",
  allowRoles("nasabah", "cs", "loket"),
  queueController.getOldestWaitingQueue
);

/**
 * @swagger
 * /api/queue:
 *   get:
 *     summary: Get all queue data
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: get all queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       userId:
 *                         type: integer
 *                       branchId:
 *                         type: integer
 *                       csId:
 *                         type: integer
 *                         nullable: true
 *                       loketId:
 *                         type: integer
 *                         nullable: true
 *                       bookingDate:
 *                         type: string
 *                         format: date-time
 *                       ticketNumber:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       estimatedTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       calledAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       status:
 *                         type: string
 *                       notification:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       createdBy:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       updatedBy:
 *                         type: string
 *                       user:
 *                         type: object
 *                       branch:
 *                         type: object
 *                       cs:
 *                         type: object
 *                         nullable: true
 *                       loket:
 *                         type: object
 *                         nullable: true
 *                       queueLogs:
 *                         type: array
 *                         items:
 *                           type: object
 *                       services:
 *                         type: array
 *                         items:
 *                           type: object
 *       500:
 *         description: Internal server error
 */
router.get("/queue", queueController.getAllQueues);

/**
 * @swagger
 * /api/queue/ticket/{id}:
 *   get:
 *     summary: Get ticket detail by queue ID
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Ticket detail found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 branch:
 *                   type: object
 *                 bookingDate:
 *                   type: string
 *                   format: date-time
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                 estimatedTime:
 *                   type: string
 *                   format: date-time
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 cs:
 *                   type: object
 *                 user:
 *                   type: object
 *       400:
 *         description: queueId is required
 *       404:
 *         description: Queue not found
 */
router.get("/queue/ticket/:id", verifyUserToken, queueController.getTicketById);

/**
 * @swagger
 * /api/queue/loket-ticket/{id}:
 *   get:
 *     summary: Get loket ticket detail by queue ID
 *     tags: [Queue]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Ticket detail found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 branch:
 *                   type: object
 *                 bookingDate:
 *                   type: string
 *                   format: date-time
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                 estimatedTime:
 *                   type: string
 *                   format: date-time
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 cs:
 *                   type: object
 *                 loket:
 *                   type: object
 *       400:
 *         description: queueId is required
 *       404:
 *         description: Queue not found
 */
router.get(
  "/queue/loket-ticket/:id",
  verifyLoketToken,
  queueController.getLoketTicketById
);

/**
 * @swagger
 * /api/queue/history:
 *   get:
 *     summary: Get all queue tickets (history) for the current user
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all queue tickets for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: User not found in token
 */
router.get(
  "/queue/history",
  allowRoles("nasabah"),
  verifyUserToken,
  queueController.getUserQueueHistory
);

/**
 * @swagger
 * /api/queue/active-cs-customer:
 *   get:
 *     summary: Get list of CS who are currently serving which customer in their branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active CS-customer pairs in the branch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   queueId:
 *                     type: integer
 *                     example: 12
 *                   ticketNumber:
 *                     type: string
 *                     example: "A-001"
 *                   cs:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 3
 *                       name:
 *                         type: string
 *                         example: "CS Budi"
 *                       username:
 *                         type: string
 *                         example: "csbudi"
 *                   nasabah:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 7
 *                       fullname:
 *                         type: string
 *                         example: "Andi"
 *                       username:
 *                         type: string
 *                         example: "andi123"
 *                       email:
 *                         type: string
 *                         example: "andi@email.com"
 *                       phoneNumber:
 *                         type: string
 *                         example: "08123456789"
 *                   status:
 *                     type: string
 *                     example: "in progress"
 *                   calledAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-06-17T10:00:00.000Z"
 *       400:
 *         description: branchId is required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/active-cs-customer",
  verifyCSToken,
  queueController.getActiveCSCustomer
);

module.exports = router;
