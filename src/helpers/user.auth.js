const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "secret_key";

const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, secret);

    if (decoded.role !== "user") {
      return res.status(403).json({ message: "Forbidden: Not a user" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { verifyUserToken };
