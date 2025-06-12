const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true jika pakai port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"TemuCS" <${process.env.SMTP_USER}>`,
    to,
    subject: "Kode OTP Registrasi TemuCS",
    text: `Kode OTP Anda: ${otp}`,
    html: `<b>Kode OTP Anda: ${otp}</b>`,
  });
};

module.exports = { sendOtpEmail };
