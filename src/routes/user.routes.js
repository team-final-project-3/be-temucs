const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

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
 *         description: User not found
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
 *         description: User not found
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
 *         description: User not found
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
 *         description: User not found
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
 *         description: OTP verified. You can now reset your password.
 *       400:
 *         description: Invalid OTP or OTP expired
 *       404:
 *         description: User not found
 */
router.post("/users/verify-otp-forgot", userController.verifyOtpForgotPassword);

module.exports = router;
