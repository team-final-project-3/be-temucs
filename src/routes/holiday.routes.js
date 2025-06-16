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

module.exports = router;
