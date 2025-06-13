const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp, name = "") => {
  await transporter.sendMail({
    from: `"TemuCS" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your One Time Password (OTP)",
    html: `
      <div style="max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;padding:32px;font-family:sans-serif;background:#fff;">
        <div style="margin-top:24px;">
          <p>Hi <b>${name || ""}</b>,<br>
          Please copy the One Time Password (OTP) below and paste it in the verification page on the TemuCS App.</p>
        </div>
        <hr style="margin:24px 0;">
        <div style="text-align:center;font-size:36px;letter-spacing:4px;font-weight:bold;color:#FF800A;">
          ${otp}
        </div>
        <hr style="margin:24px 0;">
        <div style="font-size:15px;">
          This code <b>expires in 10 minutes</b>. Please, <b>DO NOT SHARE OR SEND THIS CODE TO ANYONE!</b>
        </div>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
