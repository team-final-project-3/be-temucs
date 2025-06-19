const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");
const { verifyLoketToken } = require("../auth/loket.auth");

/**
 * @swagger
 * /api/document:
 *   post:
 *     summary: Create a new document
 *     tags: [Document]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentName
 *             properties:
 *               documentName:
 *                 type: string
 *                 example: "Form Identitas Nasabah"
 *     responses:
 *       201:
 *         description: Document created
 *       500:
 *         description: Internal server error
 */
router.post(
  "/document",
  allowRoles("admin"),
  verifyUserToken,
  documentController.addDocument
);

/**
 * @swagger
 * /api/document/user:
 *   get:
 *     summary: Get all active documents for user (nasabah and admin)
 *     tags: [Document]
 *     responses:
 *       200:
 *         description: List of active documents for user
 *       500:
 *         description: Internal server error
 */
router.get(
  "/document/user",
  verifyUserToken,
  allowRoles("nasabah", "admin"),
  documentController.getAllDocumentForUser
);

/**
 * @swagger
 * /api/document/loket:
 *   get:
 *     summary: Get all active documents for loket
 *     tags: [Document]
 *     responses:
 *       200:
 *         description: List of active documents for loket
 *       500:
 *         description: Internal server error
 */
router.get(
  "/document/loket",
  verifyLoketToken,
  allowRoles("loket"),
  documentController.getAllDocumentForLoket
);

/**
 * @swagger
 * /api/document/{id}:
 *   get:
 *     summary: Get active document by ID for user (admin)
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document data
 *       404:
 *         description: Document not found or inactive
 *       500:
 *         description: Internal server error
 */
router.get(
  "/document/:id",
  verifyUserToken,
  allowRoles("admin"),
  documentController.getDocumentForUser
);

/**
 * @swagger
 * /api/document/{id}:
 *   put:
 *     summary: Update a document by ID
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentName:
 *                 type: string
 *                 example: "Form Pembukaan Rekening"
 *     responses:
 *       200:
 *         description: Document updated
 *       500:
 *         description: Internal server error
 */
router.put(
  "/document/:id",
  allowRoles("admin"),
  verifyUserToken,
  documentController.editDocument
);

/**
 * @swagger
 * /api/document/{id}/status:
 *   put:
 *     summary: Update Document Status (activate or deactivate)
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dokumen
 *     responses:
 *       200:
 *         description: Status dokumen diperbarui
 *       400:
 *         description: Input tidak valid
 *       404:
 *         description: Dokumen tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/document/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  documentController.updateDocumentStatus
);

module.exports = router;
