const fetch = require("node-fetch");

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

module.exports = sendExpoNotification;
