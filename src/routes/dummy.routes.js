const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /api/dummy:
 *   get:
 *     summary: Dummy GET endpoint
 *     tags: [Dummy]
 *     responses:
 *       200:
 *         description: Dummy response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello from dummy API!
 */
router.get("/dummy", (req, res) => {
  res.json({ message: "Hello from dummy API!" });
});

module.exports = router;
