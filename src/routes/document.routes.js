const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/document.controller");


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
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               documentName:
 *                 type: string
 *                 example: "Form Identitas Nasabah"
 *               createdBy:
 *                 type: string
 *                 example: "admin"
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: Document created
 *       500:
 *         description: Internal server error
 */
router.post("/document", documentController.addDocument);

/**
 * @swagger
 * /api/document:
 *   get:
 *     summary: Get all documents
 *     tags: [Document]
 *     responses:
 *       200:
 *         description: A list of all documents
 *       500:
 *         description: Internal server error
 */
router.get("/document", documentController.getAllDocument);

/**
 * @swagger
 * /api/document/{id}:
 *   get:
 *     summary: Get document by ID
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
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get("/document/:id", documentController.getDocument);

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
 *               updatedBy:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Document updated
 *       500:
 *         description: Internal server error
 */
router.put("/document/:id", documentController.editDocument);

/**
 * @swagger
 * /api/document/{id}:
 *   delete:
 *     summary: Delete document by ID
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted
 *       500:
 *         description: Internal server error
 */
router.delete("/document/:id", documentController.deleteDocument);
