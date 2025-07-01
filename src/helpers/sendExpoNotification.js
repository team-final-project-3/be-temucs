const fetch = require("node-fetch");
const prisma = require("../../prisma/client");

async function getExpoPushToken({ userId, email, phoneNumber }) {
  let where = {};
  if (userId) where.id = userId;
  else if (email) where.email = email;
  else if (phoneNumber) where.phoneNumber = phoneNumber;
  else return null;

  const user = await prisma.user.findUnique({ where });
  return user && user.expoPushToken ? user.expoPushToken : null;
}

async function sendExpoNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data,
    }),
  });
}

module.exports = {
  sendExpoNotification,
  getExpoPushToken,
};
