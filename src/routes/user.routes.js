const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { allowRoles } = require("../middlewares/auth");
const { verifyUserToken } = require("../auth/user.auth");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - username
 *               - email
 *               - password
 *               - phoneNumber
 *             properties:
 *               fullname:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
router.post("/users/register", userController.register);

/**
 * @swagger
 * /api/users/verify-otp:
 *   post:
 *     summary: Verifikasi OTP email saat registrasi user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 description: email yang didapat dari proses register
 *               otp:
 *                 type: string
 *                 description: Kode OTP yang dikirim ke email
 *     responses:
 *       200:
 *         description: Email verified, registration complete.
 *       400:
 *         description: Invalid OTP or already verified
 *       404:
 *         description: User tidak ditemukan
 */
router.post("/users/verify-otp", userController.verifyOtp);

/**
 * @swagger
 * /api/users/resend-otp:
 *   post:
 *     summary: Resend OTP to email for unverified user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent to email.
 *       400:
 *         description: User already verified
 *       404:
 *         description: User tidak ditemukan
 */
router.post("/users/resend-otp", userController.resendOtp);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
router.post("/users/login", userController.login);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Request OTP for password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email for password reset.
 *       404:
 *         description: User tidak ditemukan
 */
router.post("/users/forgot-password", userController.forgotPassword);

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful.
 *       404:
 *         description: User tidak ditemukan
 */
router.post("/users/reset-password", userController.resetPassword);

/**
 * @swagger
 * /api/users/verify-otp-forgot:
 *   post:
 *     summary: Verifikasi OTP untuk reset password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified. Sekarang bisa reset password.
 *       400:
 *         description: Invalid OTP atau OTP expired
 *       404:
 *         description: User tidak ditemukan
 */
router.post("/users/verify-otp-forgot", userController.verifyOtpForgotPassword);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get profile of the logged-in user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     fullname:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     role:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/users/profile", userController.getProfile);

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     summary: Change password for the logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Password lama user
 *               newPassword:
 *                 type: string
 *                 description: Password baru user
 *     responses:
 *       200:
 *         description: Password berhasil diubah.
 *       400:
 *         description: Validation error atau password lama salah
 *       401:
 *         description: Unauthorized
 */
router.post("/users/change-password", userController.changePassword);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (paginated, admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [5, 10, 15, 20]
 *           default: 10
 *     responses:
 *       200:
 *         description: A list of all user (paginated)
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
 *                       fullname:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     size:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       500:
 *         description: Internal server error
 */
router.get("/users", allowRoles("admin"), userController.getAllUsers);

/**
 * @swagger
 * /api/users/expo-token:
 *   post:
 *     summary: Simpan atau update Expo Push Token user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *                 description: Expo push token dari device user
 *     responses:
 *       200:
 *         description: Token berhasil disimpan
 *       400:
 *         description: Token tidak valid
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/users/expo-token",
  allowRoles("nasabah"),
  verifyUserToken,
  userController.saveExpoToken
);

module.exports = router;
