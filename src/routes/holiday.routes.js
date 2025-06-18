const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holiday.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * tags:
 *   name: Holiday
 *   description: Holiday management
 */

/**
 * @swagger
 * /api/holiday:
 *   post:
 *     summary: Add a new holiday
 *     tags: [Holiday]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holidayName
 *               - date
 *             properties:
 *               holidayName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Holiday added
 */
router.post(
  "/holiday",
  allowRoles("admin"),
  verifyUserToken,
  holidayController.addHoliday
);

/**
 * @swagger
 * /api/holiday/{id}:
 *   put:
 *     summary: Edit a holiday
 *     tags: [Holiday]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Holiday ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               holidayName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Holiday updated
 */
router.put(
  "/holiday/:id",
  allowRoles("admin"),
  verifyUserToken,
  holidayController.editHoliday
);

/**
 * @swagger
 * /api/holiday/{id}/status:
 *   put:
 *     summary: Update Holiday Status (activate or deactivate)
 *     tags: [Holiday]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID hari libur
 *     responses:
 *       200:
 *         description: Status hari libur berhasil diperbarui
 *       400:
 *         description: Status tidak valid
 *       404:
 *         description: Hari libur tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/holiday/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  holidayController.updateHolidayStatus
);

/**
 * @swagger
 * /api/holiday/{id}:
 *   get:
 *     summary: Get a holiday by ID
 *     tags: [Holiday]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 holiday:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     holidayName: { type: string }
 *                     date: { type: string, format: date }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *       404:
 *         description: Holiday not found
 */
router.get(
  "/holiday/:id",
  allowRoles("admin"),
  verifyUserToken,
  holidayController.getHoliday
);

/**
 * @swagger
 * /api/holiday:
 *   get:
 *     summary: Get all holidays
 *     tags: [Holiday]
 *     responses:
 *       200:
 *         description: List of holidays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 holidays:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       holidayName: { type: string }
 *                       date: { type: string, format: date }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 */
router.get(
  "/holiday",
  allowRoles("admin"),
  verifyUserToken,
  holidayController.getAllHoliday
);

module.exports = router;
