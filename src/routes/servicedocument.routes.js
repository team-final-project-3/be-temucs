const express = require("express");
const router = express.Router();
const serviceDocumentController = require("../controllers/servicedocument.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyLoketToken } = require("../auth/loket.auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * /api/documents/by-services/user:
 *   post:
 *     summary: Get documents by selected service ID for user (admin & nasabah)
 *     tags: [ServiceDocument]
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
  "/documents/by-services/user",
  verifyUserToken,
  allowRoles("admin", "nasabah"),
  serviceDocumentController.getDocumentsByServiceIdForUser
);

/**
 * @swagger
 * /api/documents/by-services/loket:
 *   post:
 *     summary: Get documents by selected service ID for loket
 *     tags: [ServiceDocument]
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
  "/documents/by-services/loket",
  verifyLoketToken,
  allowRoles("loket"),
  serviceDocumentController.getDocumentsByServiceIdForLoket
);

module.exports = router;
