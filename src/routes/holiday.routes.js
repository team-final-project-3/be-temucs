const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holiday.controller");

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
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               holidayName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               createdBy:
 *                 type: string
 *               updatedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Holiday added
 */
router.post("/holiday", holidayController.addHoliday);

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
 *               updatedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Holiday updated
 */
router.put("/holiday/:id", holidayController.editHoliday);

/**
 * @swagger
 * /api/holiday/{id}:
 *   delete:
 *     summary: Delete a holiday
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
 *         description: Holiday deleted
 */
router.delete("/holiday/:id", holidayController.deleteHoliday);

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
 *                     createdBy: { type: string }
 *                     updatedBy: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *       404:
 *         description: Holiday not found
 */
router.get("/holiday/:id", holidayController.getHoliday);

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
 *                       createdBy: { type: string }
 *                       updatedBy: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 */
router.get("/holiday", holidayController.getAllHoliday);

module.exports = router;
