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
  verifyUserToken,
  allowRoles("nasabah"),
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
  verifyLoketToken,
  allowRoles("loket"),
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
  verifyUserToken,
  allowRoles("nasabah"),
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
  verifyCSToken,
  allowRoles("cs"),
  queueController.skipQueue
);

/**
 * @swagger
 * /api/queue/{id}/call:
 *   patch:
 *     summary: Call a queue (change status to "called" and set calledAt)
 *     tags:
 *       - Queue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Queue ID
 *     responses:
 *       200:
 *         description: Queue status updated to called
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Queue status updated to called
 *                 queue:
 *                   type: object
 *       400:
 *         description: Queue hanya bisa dipanggil jika statusnya masih waiting
 *       403:
 *         description: CS tidak berhak memanggil antrian ini
 *       404:
 *         description: Queue tidak ditemukan
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/queue/:id/call",
  verifyCSToken,
  allowRoles("cs"),
  queueController.callQueue
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
  verifyCSToken,
  allowRoles("cs"),
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
  verifyCSToken,
  allowRoles("cs"),
  queueController.doneQueue
);

// /**
//  * @swagger
//  * /api/queue/count/cs:
//  *   get:
//  *     summary: Get total active queues for CS's branch
//  *     tags: [Queue]
//  *     security:
//  *       - bearerAuth: []
//  *     description: Only accessible by CS role. Automatically gets branch from CS's login data.
//  *     responses:
//  *       200:
//  *         description: Total active queue count for CS's branch
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 branchId:
//  *                   type: integer
//  *                 totalQueue:
//  *                   type: integer
//  *       403:
//  *         description: CS tidak ditemukan atau unauthorized
//  *       500:
//  *         description: Internal server error
//  */
// router.get(
//   "/queue/count/cs",
//   verifyCSToken,
//   allowRoles("cs"),
//   queueController.getQueueCountByBranchIdCS
// );

/**
 * @swagger
 * /api/queue/count/loket:
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
 *         description: Loket tidak ditemukan atau unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/count/loket",
  verifyLoketToken,
  allowRoles("loket"),
  queueController.getQueueCountByBranchIdLoket
);

// /**
//  * @swagger
//  * /api/queue/count/user:
//  *   get:
//  *     summary: Get total active queues for user's latest visited branch
//  *     tags: [Queue]
//  *     security:
//  *       - bearerAuth: []
//  *     description: Only accessible by Nasabah. Gets branch based on user's last queue.
//  *     responses:
//  *       200:
//  *         description: Total active queue count for the user's branch
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 branchId:
//  *                   type: integer
//  *                 totalQueue:
//  *                   type: integer
//  *       404:
//  *         description: No recent queue found for user
//  *       500:
//  *         description: Internal server error
//  */
// router.get(
//   "/queue/count/user",
//   verifyUserToken,
//   allowRoles("nasabah"),
//   queueController.getQueueCountByBranchIdUser
// );

// /**
//  * @swagger
//  * /api/queue/remaining/cs/{id}:
//  *   get:
//  *     summary: Get remaining queues before the CS's current queue
//  *     tags: [Queue]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Queue ID
//  *     responses:
//  *       200:
//  *         description: Remaining queue count returned successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 queueId:
//  *                   type: integer
//  *                 branchId:
//  *                   type: integer
//  *                 remainingInFront:
//  *                   type: integer
//  *       400:
//  *         description: Data tidak valid dalam session cs
//  *       500:
//  *         description: Internal server error
//  */
// router.get(
//   "/queue/remaining/cs/:id",
//   verifyCSToken,
//   allowRoles("cs"),
//   queueController.getRemainingQueueCS
// );

// /**
//  * @swagger
//  * /api/queue/remaining/loket/{id}:
//  *   get:
//  *     summary: Get remaining queues before the loket's current queue
//  *     tags: [Queue]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Queue ID
//  *     responses:
//  *       200:
//  *         description: Remaining queue count returned successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 queueId:
//  *                   type: integer
//  *                 branchId:
//  *                   type: integer
//  *                 remainingInFront:
//  *                   type: integer
//  *       400:
//  *         description: Data tidak valid dalam session loket
//  *       500:
//  *         description: Internal server error
//  */
// router.get(
//   "/queue/remaining/loket/:id",
//   verifyLoketToken,
//   allowRoles("loket"),
//   queueController.getRemainingQueueLoket
// );

// /**
//  * @swagger
//  * /api/queue/remaining/user/{id}:
//  *   get:
//  *     summary: Get remaining queues before the user's current queue
//  *     tags: [Queue]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Queue ID
//  *     responses:
//  *       200:
//  *         description: Remaining queue count returned successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 queueId:
//  *                   type: integer
//  *                 branchId:
//  *                   type: integer
//  *                 remainingInFront:
//  *                   type: integer
//  *       400:
//  *         description: Data tidak valid dalam session user
//  *       500:
//  *         description: Internal server error
//  */
// router.get(
//   "/queue/remaining/user/:id",
//   verifyUserToken,
//   allowRoles("nasabah"),
//   queueController.getRemainingQueueUser
// );

/**
 * @swagger
 * /api/queue/inprogress/cs:
 *   get:
 *     summary: Get the latest "in progress" queue for CS branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Only accessible by CS. Automatically gets the branch from CS's login data.
 *       Returns the most recent queue with status "in progress", ordered by the latest call time (`calledAt`).
 *     responses:
 *       200:
 *         description: Latest in-progress queue in the CS's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Branch ID missing from CS's session
 *       404:
 *         description: No in-progress queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/inprogress/cs",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getLatestInProgressQueueCS
);

/**
 * @swagger
 * /api/queue/inprogress/loket:
 *   get:
 *     summary: Get the latest "in progress" queue for Loket's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Only accessible by Loket. Automatically gets the branch from Loket's login data.
 *       Returns the most recent queue with status "in progress", ordered by the latest call time (`calledAt`).
 *     responses:
 *       200:
 *         description: Latest in-progress queue in the Loket's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Branch ID missing from Loket's session
 *       404:
 *         description: No in-progress queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/inprogress/loket",
  verifyLoketToken,
  allowRoles("loket"),
  queueController.getLatestInProgressQueueLoket
);

/**
 * @swagger
 * /api/queue/inprogress/user:
 *   get:
 *     summary: Get the latest "in progress" queue for the user's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Only accessible by Nasabah. Automatically gets the branch from the user's login session.
 *       Returns the most recent queue with status "in progress", ordered by the latest call time (`calledAt`).
 *     responses:
 *       200:
 *         description: Latest in-progress queue in the user's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Branch ID missing from user's session
 *       404:
 *         description: No in-progress queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/inprogress/user",
  verifyUserToken,
  allowRoles("nasabah"),
  queueController.getLatestInProgressQueueUser
);

/**
 * @swagger
 * /api/queue/waiting/loket:
 *   get:
 *     summary: Get all waiting queues for Loket's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by Loket. Automatically gets branch from Loket's login data. Returns list of waiting queues ordered by creation time.
 *     responses:
 *       200:
 *         description: List of waiting queues in the Loket's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   ticketNumber:
 *                     type: string
 *                   status:
 *                     type: string
 *                   services:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         serviceName:
 *                           type: string
 *       403:
 *         description: Loket tidak ditemukan atau unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/waiting/loket",
  verifyLoketToken,
  allowRoles("loket"),
  queueController.getWaitingQueuesByBranchIdLoket
);

/**
 * @swagger
 * /api/queue/waiting/cs:
 *   get:
 *     summary: Get all waiting queues for CS's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by CS. Automatically gets branch from CS's login data. Returns list of waiting queues ordered by creation time.
 *     responses:
 *       200:
 *         description: List of waiting queues in the CS's branch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   ticketNumber:
 *                     type: string
 *                   status:
 *                     type: string
 *                   services:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         serviceName:
 *                           type: string
 *       403:
 *         description: CS tidak ditemukan atau unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/waiting/cs",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getWaitingQueuesByBranchIdCS
);

/**
 * @swagger
 * /api/queue/oldest-waiting/loket:
 *   get:
 *     summary: Get the oldest waiting queue in the Loket's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by Loket. Automatically determines branch from Loket login session.
 *     responses:
 *       200:
 *         description: The oldest waiting queue in the branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       serviceName:
 *                         type: string
 *       400:
 *         description: Branch ID missing
 *       404:
 *         description: No waiting queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/oldest-waiting/loket",
  verifyLoketToken,
  allowRoles("loket"),
  queueController.getOldestWaitingQueueLoket
);

/**
 * @swagger
 * /api/queue/oldest-waiting/cs:
 *   get:
 *     summary: Get the oldest waiting queue in the CS's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by CS. Automatically determines branch from CS login session.
 *     responses:
 *       200:
 *         description: The oldest waiting queue in the branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       serviceName:
 *                         type: string
 *       400:
 *         description: Branch ID missing
 *       404:
 *         description: No waiting queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/oldest-waiting/cs",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getOldestWaitingQueueCS
);

/**
 * @swagger
 * /api/queue/oldest-waiting/user:
 *   get:
 *     summary: Get the oldest waiting queue in the CS's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: Only accessible by CS. Automatically determines branch from CS login session.
 *     responses:
 *       200:
 *         description: The oldest waiting queue in the branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       serviceName:
 *                         type: string
 *       400:
 *         description: Branch ID missing
 *       404:
 *         description: No waiting queue found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/oldest-waiting/user",
  verifyUserToken,
  allowRoles("nasabah"),
  queueController.getOldestWaitingQueueUser
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
 *         description: queueId dibutuhkan
 *       404:
 *         description: Queue tidak ditemukan
 */
router.get(
  "/queue/ticket/:id",
  verifyUserToken,
  allowRoles("nasabah"),
  queueController.getTicketById
);

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
 *         description: Queue tidak ditemukan
 */
router.get(
  "/queue/loket-ticket/:id",
  verifyLoketToken,
  allowRoles("loket"),
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
 *         description: User tidak ditemukan dalam token
 */
router.get(
  "/queue/history",
  verifyUserToken,
  allowRoles("nasabah"),
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
  allowRoles("cs"),
  queueController.getActiveCSCustomer
);

/**
 * @swagger
 * /api/queue/active-customer/cs:
 *   get:
 *     summary: Get nasabah yang sedang dilayani oleh CS login
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data nasabah yang sedang dilayani oleh CS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queueId:
 *                   type: integer
 *                 ticketNumber:
 *                   type: string
 *                 cs:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                 nasabah:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       nullable: true
 *                     fullname:
 *                       type: string
 *                     username:
 *                       type: string
 *                       nullable: true
 *                     email:
 *                       type: string
 *                       nullable: true
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                 status:
 *                   type: string
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: CS tidak sedang melayani nasabah manapun
 *       400:
 *         description: CS ID tidak ditemukan pada akun CS
 */

router.get(
  "/queue/active-customer/cs",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getActiveCustomerByCS
);

/**
 * @swagger
 * /api/queue/cs/handling:
 *   get:
 *     summary: Ambil detail antrean berdasarkan token CS yang login
 *     tags:
 *       - Queue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detail antrean aktif yang sedang ditangani CS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Irene Simatupang
 *                 ticketNumber:
 *                   type: string
 *                   example: AM-01-001
 *                 services:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["servicedocument", "servicedocument"]
 *       401:
 *         description: Unauthorized – Token tidak valid atau bukan CS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: CS ID tidak ditemukan dalam token."
 *       404:
 *         description: Tidak ada antrian dengan status in progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tidak ada antrian yang sedang diproses.
 *       500:
 *         description: Server error
 */
router.get(
  "/queue/cs/handling",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getQueueDetailByCSId
);

/**
 * @swagger
 * /api/queue/cs/called-customer:
 *   get:
 *     summary: Ambil data nasabah yang sedang dipanggil (called) oleh CS login
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data nasabah yang sedang dipanggil oleh CS, atau isCalling false jika tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isCalling:
 *                   type: boolean
 *                   example: false
 *                 queueId:
 *                   type: integer
 *                   nullable: true
 *                   example: null
 *                 ticketNumber:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: null
 *                 nasabah:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 status:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Unauthorized – Token tidak valid atau bukan CS
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/cs/called-customer",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getCalledCustomerByCS
);

/**
 * @swagger
 * /api/queue/called-customer-tv:
 *   get:
 *     summary: Get the oldest "called" queue in CS's branch
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Hanya bisa diakses oleh CS.
 *       Endpoint ini akan otomatis mengambil branch dari CS yang sedang login.
 *       Mengembalikan 1 data antrian dengan status "called" paling lama (berdasarkan `calledAt` ascending).
 *     responses:
 *       200:
 *         description: The oldest called queue found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketNumber:
 *                   type: string
 *                   example: KT-01-003
 *                 status:
 *                   type: string
 *                   example: called
 *                 calledAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-06-25T03:27:08.425Z
 *       401:
 *         description: CS ID missing from token or unauthorized
 *       404:
 *         description: No queue with status "called" found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/queue/called-customer-tv",
  verifyCSToken,
  allowRoles("cs"),
  queueController.getCalledCustomerTV
);

module.exports = router;
