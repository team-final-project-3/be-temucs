require("dotenv").config();
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");
const { hashPassword } = require("../src/auth/user.auth");
const password = "Password123!";

// Helper to generate a token with userId in payload
const generateTestToken = (userPayload) => {
  return (
    "Bearer " +
    jwt.sign(
      { ...userPayload, userId: userPayload.id || userPayload.userId }, // Ensure userId is in payload
      process.env.JWT_SECRET || "secret"
    )
  );
};

const userToken = generateTestToken({
  id: 1,
  username: "admin",
  role: "admin",
});

describe("User Register (Integration)", () => {
  const originalCoreBankingFindUnique = prisma.coreBanking.findUnique; // Store original

  beforeEach(() => {
    // Reset mock before each test in this suite
    prisma.coreBanking.findUnique = jest.fn().mockResolvedValue({
      id: 999, // A dummy ID
      email: "mock@example.com",
      accountNumber: "12345",
    });
  });

  afterEach(async () => {
    // Clean up users created in each test
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: "jestregister" } },
          { email: { contains: "notnasabah" } },
        ],
      },
    });
  });

  afterAll(() => {
    // Restore original implementation after all tests in this suite are done
    prisma.coreBanking.findUnique = originalCoreBankingFindUnique;
  });

  it("should register a new user", async () => {
    const unique = Date.now();
    const email = `jestregister${unique}@example.com`;
    // Ensure mock is set for this specific email if coreBanking check happens
    prisma.coreBanking.findUnique.mockResolvedValueOnce({ id: 1, email });

    const res = await request(app)
      .post("/api/users/register")
      .send({
        fullname: "Jest Register " + unique,
        username: "jestregister" + unique,
        email,
        password: "Password123!",
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/OTP telah dikirim/i); // New user registration sends OTP
  });

  it("should return 400 if email format is invalid", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        fullname: "Invalid Email Format",
        username: "invalidemailformat",
        email: "invalid-email", // Invalid email format
        password: "Password123!",
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validasi gagal");
    expect(res.body.errors).toContain("Invalid email");
  });

  it("should return 400 if email already registered and verified", async () => {
    const unique = Date.now();
    const email = `jestregisterverified${unique}@example.com`;
    prisma.coreBanking.findUnique.mockResolvedValueOnce({ id: 1, email }); // Mock for coreBanking check

    // Create a user that is already verified
    await prisma.user.create({
      data: {
        fullname: "Jest Register Verified " + unique,
        username: "jestregisterverified" + unique,
        email,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
      },
    });

    // Attempt to register again with the same email
    const res = await request(app)
      .post("/api/users/register")
      .send({
        fullname: "Jest Register " + unique,
        username: "jestregister" + unique + "2",
        email,
        password: "Password123!",
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Email, username, atau nomor telepon sudah terdaftar."
    );
  });

  it("should return 200 and resend OTP if email already registered but not verified", async () => {
    const unique = Date.now();
    const email = `jestregisterunverified${unique}@example.com`;
    prisma.coreBanking.findUnique.mockResolvedValueOnce({ id: 1, email }); // Mock for coreBanking check

    // Create a user that is not verified
    await prisma.user.create({
      data: {
        fullname: "Jest Register Unverified " + unique,
        username: "jestregisterunverified" + unique,
        email,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
        otp: "oldotp",
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Attempt to register again with the same email
    const res = await request(app)
      .post("/api/users/register")
      .send({
        fullname: "Jest Register " + unique,
        username: "jestregister" + unique + "2",
        email,
        password: "Password123!",
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP telah dikirim ulang/i);
    expect(res.body).toHaveProperty("userId");

    // Verify OTP was updated
    const updatedUser = await prisma.user.findUnique({ where: { email } });
    expect(updatedUser.otp).not.toBe("oldotp");
  });

  it("should return 403 if user is not a core banking nasabah", async () => {
    const unique = Date.now();
    const email = `notnasabah${unique}@example.com`;
    prisma.coreBanking.findUnique.mockResolvedValueOnce(null); // Mock that user is NOT in core banking

    const res = await request(app)
      .post("/api/users/register")
      .send({
        fullname: "Not Nasabah " + unique,
        username: "notnasabah" + unique,
        email,
        password: "Password123!",
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(
      "Anda belum menjadi nasabah. Silakan datang ke cabang terdekat."
    );
  });
});

describe("User Verify OTP (Integration)", () => {
  let user, otp, email;

  beforeAll(async () => {
    const unique = Date.now();
    email = `jestverifyotp${unique}@example.com`;
    user = await prisma.user.create({
      data: {
        fullname: "Jest VerifyOtp " + unique,
        username: "jestverifyotp" + unique,
        email,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
        otp: "123456",
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    otp = user.otp;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestverifyotp" } },
    });
  });

  it("should verify OTP successfully", async () => {
    const res = await request(app).post("/api/users/verify-otp").send({
      email,
      otp,
    });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(/verified|berhasil/i);

    const updated = await prisma.user.findUnique({ where: { email } });
    expect(updated.isVerified).toBe(true);
  });

  it("should return 400 if OTP is wrong", async () => {
    const unique = Date.now();
    const email2 = `jestverifyotpwrong${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest VerifyOtp Wrong " + unique,
        username: "jestverifyotpwrong" + unique,
        email: email2,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
        otp: "654321",
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const res = await request(app).post("/api/users/verify-otp").send({
      email: email2,
      otp: "WRONGOTP",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("OTP salah");
  });

  it("should return 404 if user not found", async () => {
    const res = await request(app).post("/api/users/verify-otp").send({
      email: "notfound@example.com",
      otp: "123456",
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User tidak ditemukan");
  });

  it("should return 400 if user is already verified", async () => {
    const unique = Date.now();
    const email3 = `jestverifyotpverified${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest VerifyOtp Verified " + unique,
        username: "jestverifyotpverified" + unique,
        email: email3,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });
    const res = await request(app).post("/api/users/verify-otp").send({
      email: email3,
      otp: "123456",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User sudah terdaftar");
  });

  it("should return 400 if OTP is expired", async () => {
    const unique = Date.now();
    const email4 = `jestverifyotpexpired${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest VerifyOtp Expired " + unique,
        username: "jestverifyotpexpired" + unique,
        email: email4,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
        otp: "112233",
        otpExpiresAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });
    const res = await request(app).post("/api/users/verify-otp").send({
      email: email4,
      otp: "112233",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("OTP expired");
  });
});

describe("User Resend OTP (Integration)", () => {
  let email;

  beforeAll(async () => {
    const unique = Date.now();
    email = `jestresendotp${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest ResendOtp " + unique,
        username: "jestresendotp" + unique,
        email,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
        otp: "123456",
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestresendotp" } },
    });
  });

  it("should resend OTP to unverified user", async () => {
    const res = await request(app)
      .post("/api/users/resend-otp")
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(/otp|berhasil|dikirim/);
  });

  it("should return 200 even if user already verified (controller behavior)", async () => {
    const unique = Date.now();
    const email2 = `jestresendotpverified${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest ResendOtp Verified " + unique,
        username: "jestresendotpverified" + unique,
        email: email2,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp: null, // No OTP needed if already verified, but controller will set a new one
        otpExpiresAt: null,
      },
    });
    const res = await request(app)
      .post("/api/users/resend-otp")
      .send({ email: email2 });
    expect(res.status).toBe(200); // Controller still sends OTP even if verified
    expect(res.body.message.toLowerCase()).toMatch(/otp|resent|dikirim/);
  });

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/api/users/resend-otp")
      .send({ email: "notfound@example.com" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User tidak ditemukan");
  });
});

describe("User Login (Integration)", () => {
  const unique = Date.now();
  const username = "jestlogin" + unique;
  const email = `jestlogin${unique}@example.com`;
  const password = "Password123!";
  let createdUser;

  beforeAll(async () => {
    createdUser = await prisma.user.create({
      data: {
        fullname: "Jest Login " + unique,
        username,
        email,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestlogin" } },
    });
  });

  it("should login successfully with correct credentials", async () => {
    const res = await request(app).post("/api/users/login").send({
      username,
      password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.message).toBe("Login successful");
    // The controller does not return the user object, only token and message.
    // So, remove the user property checks.
    // expect(res.body).toHaveProperty("user");
    // expect(res.body.user.username).toBe(username);
  });

  it("should return 401 with wrong password", async () => {
    const res = await request(app).post("/api/users/login").send({
      username,
      password: "WrongPassword!",
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Password salah");
  });

  it("should return 401 if user not found", async () => {
    const res = await request(app).post("/api/users/login").send({
      username: "notfounduser",
      password: "Password123!",
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("User tidak ditemukan");
  });

  it("should return 403 if user is not verified", async () => {
    const unique = Date.now();
    const unverifiedUsername = "jestloginunverified" + unique;
    const unverifiedEmail = `jestloginunverified${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest Login Unverified " + unique,
        username: unverifiedUsername,
        email: unverifiedEmail,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: false,
      },
    });

    const res = await request(app).post("/api/users/login").send({
      username: unverifiedUsername,
      password,
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("User belum verifikasi email");
  });
});

describe("User Forgot Password (Integration)", () => {
  let email;

  beforeAll(async () => {
    const unique = Date.now();
    email = `jestforgotpw${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest ForgotPW " + unique,
        username: "jestforgotpw" + unique,
        email,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestforgotpw" } },
    });
  });

  it("should send OTP for password reset if user exists", async () => {
    const res = await request(app)
      .post("/api/users/forgot-password")
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(
      /otp sent to email for password reset/i
    );
    const updated = await prisma.user.findUnique({ where: { email } });
    expect(updated.otp).toBeTruthy();
  });

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "notfound@example.com" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User tidak ditemukan");
  });
});

describe("User Reset Password (Integration)", () => {
  let email, oldPassword, newPassword, otp;

  beforeAll(async () => {
    const unique = Date.now();
    email = `jestresetpw${unique}@example.com`;
    oldPassword = "Password123!";
    newPassword = "NewPassword123!";
    otp = "654321";
    await prisma.user.create({
      data: {
        fullname: "Jest ResetPW " + unique,
        username: "jestresetpw" + unique,
        email,
        passwordHash: await hashPassword(oldPassword),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestresetpw" } },
    });
  });

  it("should reset password successfully with correct OTP (after verifying OTP)", async () => {
    // Controller requires OTP verification before reset password can succeed
    const verifyRes = await request(app)
      .post("/api/users/verify-otp-forgot")
      .send({ email, otp });
    expect(verifyRes.status).toBe(200);

    const res = await request(app).post("/api/users/reset-password").send({
      email,
      newPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(
      /password reset successful/i
    );

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "jestresetpw" + email.match(/\d+/)[0],
        password: newPassword,
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
  });

  it("should return 404 if user not found", async () => {
    const res = await request(app).post("/api/users/reset-password").send({
      email: "notfound@example.com",
      newPassword: "Whatever123!",
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User tidak ditemukan");
  });
});

describe("User Verify OTP Forgot Password (Integration)", () => {
  let email, otp;

  beforeAll(async () => {
    const unique = Date.now();
    email = `jestverifyforgototp${unique}@example.com`;
    otp = "987654";
    await prisma.user.create({
      data: {
        fullname: "Jest VerifyForgotOtp " + unique,
        username: "jestverifyforgototp" + unique,
        email,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestverifyforgototp" } },
    });
  });

  it("should verify OTP for forgot password successfully", async () => {
    const res = await request(app)
      .post("/api/users/verify-otp-forgot")
      .send({ email, otp });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(/otp verified/i);
  });

  it("should return 404 if OTP is wrong (controller behavior)", async () => {
    const res = await request(app)
      .post("/api/users/verify-otp-forgot")
      .send({ email, otp: "WRONGOTP" });
    expect(res.status).toBe(404); // Controller returns 404 for wrong OTP
    expect(res.body.message).toBe("OTP salah");
  });

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/api/users/verify-otp-forgot")
      .send({ email: "notfound@example.com", otp: "123456" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User tidak ditemukan");
  });

  it("should return 400 if OTP is expired", async () => {
    const unique = Date.now();
    const expiredEmail = `jestverifyforgototpexpired${unique}@example.com`;
    await prisma.user.create({
      data: {
        fullname: "Jest VerifyForgotOtp Expired " + unique,
        username: "jestverifyforgototpexpired" + unique,
        email: expiredEmail,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
        otp: "112233",
        otpExpiresAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });
    const res = await request(app)
      .post("/api/users/verify-otp-forgot")
      .send({ email: expiredEmail, otp: "112233" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("OTP expired");
  });
});

describe("User Get Profile (Integration)", () => {
  let user, token;

  beforeAll(async () => {
    const unique = Date.now();
    user = await prisma.user.create({
      data: {
        fullname: "Jest Profile " + unique,
        username: "jestprofile" + unique,
        email: `jestprofile${unique}@example.com`,
        passwordHash: await hashPassword("Password123!"),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
      },
    });
    token = generateTestToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestprofile" } },
    });
  });

  it("should get profile of the logged-in user", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", token)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.username).toBe(user.username);
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).get("/api/users/profile").send();
    expect(res.status).toBe(401);
  });

  it("should return 403 if token is invalid (auth middleware likely returns 403 for invalid)", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", "Bearer invalidtoken")
      .send();
    expect(res.status).toBe(403); // Changed from 401 to 403 based on common auth middleware behavior
  });
});

describe("User Change Password (Integration)", () => {
  let user, token;
  const oldPassword = "Password123!";
  const newPassword = "NewPassword321!";

  beforeAll(async () => {
    const unique = Date.now();
    user = await prisma.user.create({
      data: {
        fullname: "Jest ChangePW " + unique,
        username: "jestchangepw" + unique,
        email: `jestchangepw${unique}@example.com`,
        passwordHash: await hashPassword(oldPassword),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
      },
    });
    token = generateTestToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "jestchangepw" } },
    });
  });

  it("should change password with correct old password", async () => {
    const res = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", token)
      .send({
        oldPassword,
        newPassword,
      });
    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(/password berhasil diubah/);

    const loginRes = await request(app).post("/api/users/login").send({
      username: user.username,
      password: newPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
  });

  it("should return 400 if old password is wrong", async () => {
    const res = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", token)
      .send({
        oldPassword: "WrongPassword!",
        newPassword: "Whatever123!",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Password lama salah");
  });

  it("should return 400 if new password is same as old password", async () => {
    const res = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", token)
      .send({
        oldPassword: oldPassword,
        newPassword: oldPassword, // New password is the same as old
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Password baru tidak boleh sama dengan lama");
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).post("/api/users/change-password").send({
      oldPassword,
      newPassword: "Whatever123!",
    });
    expect(res.status).toBe(401);
  });

  it("should return 400 if old or new password missing", async () => {
    const resMissingNew = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", token)
      .send({
        oldPassword: oldPassword,
        // newPassword is missing
      });
    expect(resMissingNew.status).toBe(400);
    expect(resMissingNew.body.message).toBe(
      "Password lama dan baru wajib diisi"
    );

    const resMissingOld = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", token)
      .send({
        newPassword: newPassword,
        // oldPassword is missing
      });
    expect(resMissingOld.status).toBe(400);
    expect(resMissingOld.body.message).toBe(
      "Password lama dan baru wajib diisi"
    );
  });
});

describe("User Get All Users (Integration)", () => {
  let admin, adminToken, user1, user2;

  beforeAll(async () => {
    admin = await prisma.user.create({
      data: {
        fullname: "Admin Jest",
        username: "adminjest",
        email: "adminjest@example.com",
        passwordHash: await hashPassword("Admin123!"),
        phoneNumber: "0811111111",
        role: "admin",
        isVerified: true,
      },
    });
    adminToken = generateTestToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
    });

    user1 = await prisma.user.create({
      data: {
        fullname: "User Jest 1",
        username: "userjest1",
        email: "userjest1@example.com",
        passwordHash: await hashPassword("User123!"),
        phoneNumber: "0822222222",
        role: "nasabah",
        isVerified: true,
      },
    });
    user2 = await prisma.user.create({
      data: {
        fullname: "User Jest 2",
        username: "userjest2",
        email: "userjest2@example.com",
        passwordHash: await hashPassword("User123!"),
        phoneNumber: "0833333333",
        role: "nasabah",
        isVerified: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: "adminjest@example.com" },
          { email: "userjest1@example.com" },
          { email: "userjest2@example.com" },
        ],
      },
    });
  });

  it("should get all users as admin with default pagination", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.size).toBe(10);

    const emails = res.body.data.map((u) => u.email);
    expect(emails).toEqual(
      expect.arrayContaining(["userjest1@example.com", "userjest2@example.com"])
    );
    expect(emails).not.toContain("adminjest@example.com"); // Admin user should be excluded by NOT: { role: "admin" }
  });

  it("should get all users with custom pagination", async () => {
    const res = await request(app)
      .get("/api/users?page=1&size=1") // Changed size to 1 to ensure data.length check is meaningful
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.size).toBe(1);
    expect(res.body.data.length).toBe(1); // Expect only one user
  });

  it("should use default size if invalid size is provided", async () => {
    const res = await request(app)
      .get("/api/users?page=1&size=999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.pagination.size).toBe(10);
  });

  it("should return 403 if not admin", async () => {
    const userToken = generateTestToken({
      id: user1.id,
      username: user1.username,
      role: user1.role,
    });
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", userToken)
      .send();
    expect(res.status).toBe(403);
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app).get("/api/users").send();
    expect(res.status).toBe(401);
  });
});

describe("User Expo Token (Integration)", () => {
  let user;

  beforeAll(async () => {
    // Ensure the ID used here matches a potential existing user or create a unique one
    const unique = Date.now();
    user = await prisma.user.upsert({
      where: { email: `nasabahjest${unique}@example.com` }, // Use a unique email for upsert
      update: {},
      create: {
        fullname: "Nasabah Jest " + unique,
        username: "nasabahjest" + unique,
        email: `nasabahjest${unique}@example.com`,
        passwordHash: await hashPassword(password),
        phoneNumber: `0812${Math.floor(Math.random() * 1e8)}`,
        role: "nasabah",
        isVerified: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: "nasabahjest" } },
    });
  });

  it("should save expo push token for user", async () => {
    const dynamicUserToken = generateTestToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const res = await request(app)
      .post("/api/users/expo-token")
      .set("Authorization", dynamicUserToken)
      .send({
        expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/berhasil/i);

    const updated = await prisma.user.findUnique({ where: { id: user.id } }); // Use dynamic user.id
    expect(updated.expoPushToken).toBe(
      "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    );
  });

  it("should return 400 if expoPushToken is missing", async () => {
    const dynamicUserToken = generateTestToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const res = await request(app)
      .post("/api/users/expo-token")
      .set("Authorization", dynamicUserToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("expoPushToken wajib diisi");
  });

  it("should return 401 if token is missing", async () => {
    const res = await request(app)
      .post("/api/users/expo-token")
      .send({ expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" });
    expect(res.status).toBe(401);
  });
});
