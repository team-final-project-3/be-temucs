const express = require("express");
const router = express.Router();
const serviceDocumentController = require("../controllers/servicedocument.controller");
const { allowRoles } = require("../middlewares/auth");

/**
 * @swagger
 * /api/documents/by-services:
 *   post:
 *     summary: Get documents by selected service ID when book
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Success, returns list of unique documents
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post(
    "/documents/by-services",
    allowRoles("nasabah", "admin", "loket"),
    serviceDocumentController.getDocumentsByServiceId
);