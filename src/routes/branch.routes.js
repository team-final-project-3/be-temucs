const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * /api/branch:
 *   post:
 *     summary: Add new branch
 *     tags: [Branch]
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
 *               - branchCode
 *               - address
 *               - longitude
 *               - latitude
 *             properties:
 *               name:
 *                 type: string
 *                 example: BNI Lada Kota
 *                 description: Nama cabang (tidak boleh kosong, unik)
 *               branchCode:
 *                 type: string
 *                 example: BNI1234
 *                 description: Kode unik cabang (tidak boleh kosong, unik)
 *               address:
 *                 type: string
 *                 example: Jl. Lada No.12, Jakarta
 *               longitude:
 *                 type: number
 *                 example: 106.8147
 *                 description: Nilai antara -180 hingga 180
 *               latitude:
 *                 type: number
 *                 example: -6.1383
 *                 description: Nilai antara -90 hingga 90
 *               holiday:
 *                 type: boolean
 *                 example: false
 *                 description: Apakah cabang libur (opsional)
 *               status:
 *                 type: boolean
 *                 example: true
 *                 description: Status aktif/tidak (opsional)
 *     responses:
 *       201:
 *         description: Branch created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Branch created
 *                 branch:
 *                   $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Bad request (field tidak lengkap atau invalid)
 *       409:
 *         description: Nama atau kode cabang sudah terdaftar
 */
router.post(
  "/branch",
  allowRoles("admin"),
  verifyUserToken,
  branchController.addBranch
);

/**
 * @swagger
 * /api/branch/{id}:
 *   put:
 *     summary: Edit branch
 *     tags: [Branch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID cabang yang ingin diupdate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - branchCode
 *               - address
 *               - longitude
 *               - latitude
 *             properties:
 *               name:
 *                 type: string
 *                 example: BNI Kota Lama
 *                 description: Nama cabang (unik dan tidak kosong)
 *               branchCode:
 *                 type: string
 *                 example: BNI5678
 *                 description: Kode unik cabang
 *               address:
 *                 type: string
 *                 example: Jl. Veteran No.7, Semarang
 *               longitude:
 *                 type: number
 *                 example: 110.4203
 *                 description: Nilai antara -180 hingga 180
 *               latitude:
 *                 type: number
 *                 example: -6.9667
 *                 description: Nilai antara -90 hingga 90
 *               holiday:
 *                 type: boolean
 *                 example: true
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Branch updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Branch updated
 *                 branch:
 *                   $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Data tidak lengkap atau format salah
 *       409:
 *         description: Nama atau kode cabang sudah digunakan
 */
router.put(
  "/branch/:id",
  allowRoles("admin"),
  verifyUserToken,
  branchController.editBranch
);

/**
 * @swagger
 * /api/branch/{id}/status:
 *   put:
 *     summary: Update Branch Status (active or deactive)
 *     tags: [Branch]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID Cabang
 *     responses:
 *       200:
 *         description: Status cabang diperbarui
 *       404:
 *         description: Cabang tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put(
  "/branch/:id/status",
  allowRoles("admin"),
  verifyUserToken,
  branchController.updateBranchStatus
);

/**
 * @swagger
 * /api/branch:
 *   get:
 *     summary: Get all branches
 *     tags: [Branch]
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get(
  "/branch",
  allowRoles("admin", "nasabah"),
  branchController.getAllBranch
);

/**
 * @swagger
 * /api/branch/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branch]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Branch detail
 *       404:
 *         description: Cabang tidak ditemukan
 */
router.get(
  "/branch/:id",
  allowRoles("admin", "nasabah"),
  verifyUserToken,
  branchController.getBranch
);

module.exports = router;
