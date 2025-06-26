// const request = require("supertest");
// const jwt = require("jsonwebtoken");
// const app = require("../src/app");
// const prisma = require("../prisma/client");
// const { hashPassword } = require("../src/auth/user.auth");

// const userToken =
//   "Bearer " +
//   jwt.sign(
//     { id: 2, username: "nasabahjest", role: "nasabah" },
//     process.env.JWT_SECRET || "secret"
//   );

// describe("User Register (Integration)", () => {
//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestregister" } },
//     });
//   });

//   it("should register a new user", async () => {
//     const unique = Date.now();
//     const res = await request(app)
//       .post("/api/users/register")
//       .send({
//         fullname: "Jest Register " + unique,
//         username: "jestregister" + unique,
//         email: `jestregister${unique}@example.com`,
//         password: "Password123!",
//         phoneNumber: "08123456789",
//       });
//     expect([200, 201]).toContain(res.status);
//     expect(res.body).toHaveProperty("message");
//   });

//   it("should return 400 if required fields are missing", async () => {
//     const res = await request(app).post("/api/users/register").send({
//       fullname: "No Email",
//       username: "noemail",
//       password: "Password123!",
//       phoneNumber: "08123456789",
//     });
//     expect(res.status).toBe(400);
//   });

//   it("should return 400 if email already registered", async () => {
//     const unique = Date.now();
//     const email = `jestregister${unique}@example.com`;
//     await request(app)
//       .post("/api/users/register")
//       .send({
//         fullname: "Jest Register " + unique,
//         username: "jestregister" + unique,
//         email,
//         password: "Password123!",
//         phoneNumber: "08123456789",
//       });
//     const res = await request(app)
//       .post("/api/users/register")
//       .send({
//         fullname: "Jest Register " + unique,
//         username: "jestregister" + unique + "2",
//         email,
//         password: "Password123!",
//         phoneNumber: "08123456789",
//       });
//     expect(res.status).toBe(400);
//   });
// });

// describe("User Verify OTP (Integration)", () => {
//   let user, otp, email;

//   beforeAll(async () => {
//     const unique = Date.now();
//     email = `jestverifyotp${unique}@example.com`;
//     user = await prisma.user.create({
//       data: {
//         fullname: "Jest VerifyOtp " + unique,
//         username: "jestverifyotp" + unique,
//         email,
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: false,
//         otp: "123456",
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     otp = user.otp;
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestverifyotp" } },
//     });
//   });

//   it("should verify OTP successfully", async () => {
//     const res = await request(app).post("/api/users/verify-otp").send({
//       email,
//       otp,
//     });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/verified|berhasil/i);

//     const updated = await prisma.user.findUnique({ where: { email } });
//     expect(updated.isVerified).toBe(true);
//   });

//   it("should return 400 if OTP is wrong", async () => {
//     const unique = Date.now();
//     const email2 = `jestverifyotp${unique}@example.com`;
//     await prisma.user.create({
//       data: {
//         fullname: "Jest VerifyOtp " + unique,
//         username: "jestverifyotp" + unique,
//         email: email2,
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: false,
//         otp: "654321",
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     const res = await request(app).post("/api/users/verify-otp").send({
//       email: email2,
//       otp: "WRONGOTP",
//     });
//     expect(res.status).toBe(400);
//   });

//   it("should return 404 if user not found", async () => {
//     const res = await request(app).post("/api/users/verify-otp").send({
//       email: "notfound@example.com",
//       otp: "123456",
//     });
//     expect(res.status).toBe(404);
//   });
// });

// describe("User Resend OTP (Integration)", () => {
//   let email;

//   beforeAll(async () => {
//     const unique = Date.now();
//     email = `jestresendotp${unique}@example.com`;
//     await prisma.user.create({
//       data: {
//         fullname: "Jest ResendOtp " + unique,
//         username: "jestresendotp" + unique,
//         email,
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: false,
//         otp: "123456",
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestresendotp" } },
//     });
//   });

//   it("should resend OTP to unverified user", async () => {
//     const res = await request(app)
//       .post("/api/users/resend-otp")
//       .send({ email });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/otp|berhasil|dikirim/);
//   });

//   it("should return 400 if user already verified", async () => {
//     const unique = Date.now();
//     const email2 = `jestresendotp${unique}@example.com`;
//     await prisma.user.create({
//       data: {
//         fullname: "Jest ResendOtp " + unique,
//         username: "jestresendotp" + unique,
//         email: email2,
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         otp: "123456",
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     const res = await request(app)
//       .post("/api/users/resend-otp")
//       .send({ email: email2 });
//     expect(res.status).toBe(400);
//   });

//   it("should return 404 if user not found", async () => {
//     const res = await request(app)
//       .post("/api/users/resend-otp")
//       .send({ email: "notfound@example.com" });
//     expect(res.status).toBe(404);
//   });
// });

// describe("User Login (Integration)", () => {
//   const unique = Date.now();
//   const username = "jestlogin" + unique;
//   const email = `jestlogin${unique}@example.com`;
//   const password = "Password123!";

//   beforeAll(async () => {
//     await prisma.user.create({
//       data: {
//         fullname: "Jest Login " + unique,
//         username,
//         email,
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestlogin" } },
//     });
//   });

//   it("should login successfully with correct credentials", async () => {
//     const res = await request(app).post("/api/users/login").send({
//       username,
//       password,
//     });
//     expect(res.status).toBe(200);
//     expect(res.body).toHaveProperty("token");
//     expect(res.body).toHaveProperty("user");
//     expect(res.body.user.username).toBe(username);
//   });

//   it("should return 401 with wrong password", async () => {
//     const res = await request(app).post("/api/users/login").send({
//       username,
//       password: "WrongPassword!",
//     });
//     expect(res.status).toBe(401);
//   });

//   it("should return 401 if user not found", async () => {
//     const res = await request(app).post("/api/users/login").send({
//       username: "notfounduser",
//       password: "Password123!",
//     });
//     expect(res.status).toBe(401);
//   });
// });

// describe("User Forgot Password (Integration)", () => {
//   let email;

//   beforeAll(async () => {
//     const unique = Date.now();
//     email = `jestforgotpw${unique}@example.com`;
//     await prisma.user.create({
//       data: {
//         fullname: "Jest ForgotPW " + unique,
//         username: "jestforgotpw" + unique,
//         email,
//         passwordHash: await hashPassword("Password123!"),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         otp: null,
//         otpExpired: null,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestforgotpw" } },
//     });
//   });

//   it("should send OTP for password reset if user exists", async () => {
//     const res = await request(app)
//       .post("/api/users/forgot-password")
//       .send({ email });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/otp|berhasil|dikirim/);
//     const updated = await prisma.user.findUnique({ where: { email } });
//     expect(updated.otp).toBeTruthy();
//   });

//   it("should return 404 if user not found", async () => {
//     const res = await request(app)
//       .post("/api/users/forgot-password")
//       .send({ email: "notfound@example.com" });
//     expect(res.status).toBe(404);
//   });
// });

// describe("User Reset Password (Integration)", () => {
//   let email, oldPassword, newPassword, otp;

//   beforeAll(async () => {
//     const unique = Date.now();
//     email = `jestresetpw${unique}@example.com`;
//     oldPassword = "Password123!";
//     newPassword = "NewPassword123!";
//     otp = "654321";
//     await prisma.user.create({
//       data: {
//         fullname: "Jest ResetPW " + unique,
//         username: "jestresetpw" + unique,
//         email,
//         passwordHash: await hashPassword(oldPassword),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         otp,
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestresetpw" } },
//     });
//   });

//   it("should reset password successfully with correct OTP", async () => {
//     const verifyRes = await request(app)
//       .post("/api/users/verify-otp-forgot")
//       .send({ email, otp });
//     expect(verifyRes.status).toBe(200);

//     const res = await request(app).post("/api/users/reset-password").send({
//       email,
//       newPassword,
//     });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/reset|berhasil/i);

//     const loginRes = await request(app)
//       .post("/api/users/login")
//       .send({
//         username: "jestresetpw" + email.match(/\d+/)[0],
//         password: newPassword,
//       });
//     expect(loginRes.status).toBe(200);
//     expect(loginRes.body).toHaveProperty("token");
//   });

//   it("should return 404 if user not found", async () => {
//     const res = await request(app).post("/api/users/reset-password").send({
//       email: "notfound@example.com",
//       newPassword: "Whatever123!",
//     });
//     expect(res.status).toBe(404);
//   });
// });

// describe("User Verify OTP Forgot Password (Integration)", () => {
//   let email, otp;

//   beforeAll(async () => {
//     const unique = Date.now();
//     email = `jestverifyforgototp${unique}@example.com`;
//     otp = "987654";
//     await prisma.user.create({
//       data: {
//         fullname: "Jest VerifyForgotOtp " + unique,
//         username: "jestverifyforgototp" + unique,
//         email,
//         passwordHash: await hashPassword("Password123!"),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         otp,
//         otpExpired: new Date(Date.now() + 10 * 60 * 1000),
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestverifyforgototp" } },
//     });
//   });

//   it("should verify OTP for forgot password successfully", async () => {
//     const res = await request(app)
//       .post("/api/users/verify-otp-forgot")
//       .send({ email, otp });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/verified|berhasil/i);
//   });

//   it("should return 400 if OTP is wrong", async () => {
//     const res = await request(app)
//       .post("/api/users/verify-otp-forgot")
//       .send({ email, otp: "WRONGOTP" });
//     expect(res.status).toBe(400);
//   });

//   it("should return 404 if user not found", async () => {
//     const res = await request(app)
//       .post("/api/users/verify-otp-forgot")
//       .send({ email: "notfound@example.com", otp: "123456" });
//     expect(res.status).toBe(404);
//   });
// });

// describe("User Get Profile (Integration)", () => {
//   let user, token;

//   beforeAll(async () => {
//     const unique = Date.now();
//     user = await prisma.user.create({
//       data: {
//         fullname: "Jest Profile " + unique,
//         username: "jestprofile" + unique,
//         email: `jestprofile${unique}@example.com`,
//         passwordHash: await hashPassword("Password123!"),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     token =
//       "Bearer " +
//       jwt.sign(
//         { id: user.id, username: user.username, role: user.role },
//         process.env.JWT_SECRET || "secret"
//       );
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestprofile" } },
//     });
//   });

//   it("should get profile of the logged-in user", async () => {
//     const res = await request(app)
//       .get("/api/users/profile")
//       .set("Authorization", token)
//       .send();
//     expect(res.status).toBe(200);
//     expect(res.body).toHaveProperty("user");
//     expect(res.body.user.email).toBe(user.email);
//     expect(res.body.user.username).toBe(user.username);
//   });

//   it("should return 401 if token is missing", async () => {
//     const res = await request(app).get("/api/users/profile").send();
//     expect(res.status).toBe(401);
//   });

//   it("should return 401 if token is invalid", async () => {
//     const res = await request(app)
//       .get("/api/users/profile")
//       .set("Authorization", "Bearer invalidtoken")
//       .send();
//     expect(res.status).toBe(401);
//   });
// });

// describe("User Change Password (Integration)", () => {
//   let user, token;
//   const oldPassword = "Password123!";
//   const newPassword = "NewPassword321!";

//   beforeAll(async () => {
//     const unique = Date.now();
//     user = await prisma.user.create({
//       data: {
//         fullname: "Jest ChangePW " + unique,
//         username: "jestchangepw" + unique,
//         email: `jestchangepw${unique}@example.com`,
//         passwordHash: await hashPassword(oldPassword),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     token =
//       "Bearer " +
//       jwt.sign(
//         { id: user.id, username: user.username, role: user.role },
//         process.env.JWT_SECRET || "secret"
//       );
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: { email: { contains: "jestchangepw" } },
//     });
//   });

//   it("should change password with correct old password", async () => {
//     const res = await request(app)
//       .post("/api/users/change-password")
//       .set("Authorization", token)
//       .send({
//         oldPassword,
//         newPassword,
//       });
//     expect(res.status).toBe(200);
//     expect(res.body.message.toLowerCase()).toMatch(/berhasil|success/);

//     const loginRes = await request(app).post("/api/users/login").send({
//       username: user.username,
//       password: newPassword,
//     });
//     expect(loginRes.status).toBe(200);
//     expect(loginRes.body).toHaveProperty("token");
//   });

//   it("should return 400 if old password is wrong", async () => {
//     const res = await request(app)
//       .post("/api/users/change-password")
//       .set("Authorization", token)
//       .send({
//         oldPassword: "WrongPassword!",
//         newPassword: "Whatever123!",
//       });
//     expect(res.status).toBe(400);
//   });

//   it("should return 401 if token is missing", async () => {
//     const res = await request(app).post("/api/users/change-password").send({
//       oldPassword,
//       newPassword: "Whatever123!",
//     });
//     expect(res.status).toBe(401);
//   });
// });

// describe("User Get All Users (Integration)", () => {
//   let admin, adminToken, user1, user2;

//   beforeAll(async () => {
//     admin = await prisma.user.create({
//       data: {
//         fullname: "Admin Jest",
//         username: "adminjest",
//         email: "adminjest@example.com",
//         passwordHash: await hashPassword("Admin123!"),
//         phoneNumber: "0811111111",
//         role: "admin",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     adminToken =
//       "Bearer " +
//       jwt.sign(
//         { id: admin.id, username: admin.username, role: admin.role },
//         process.env.JWT_SECRET || "secret"
//       );
//     user1 = await prisma.user.create({
//       data: {
//         fullname: "User Jest 1",
//         username: "userjest1",
//         email: "userjest1@example.com",
//         passwordHash: await hashPassword("User123!"),
//         phoneNumber: "0822222222",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//     user2 = await prisma.user.create({
//       data: {
//         fullname: "User Jest 2",
//         username: "userjest2",
//         email: "userjest2@example.com",
//         passwordHash: await hashPassword("User123!"),
//         phoneNumber: "0833333333",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.deleteMany({
//       where: {
//         OR: [
//           { email: "adminjest@example.com" },
//           { email: "userjest1@example.com" },
//           { email: "userjest2@example.com" },
//         ],
//       },
//     });
//   });

//   it("should get all users as admin", async () => {
//     const res = await request(app)
//       .get("/api/users")
//       .set("Authorization", adminToken)
//       .send();
//     expect(res.status).toBe(200);
//     expect(Array.isArray(res.body)).toBe(true);
//     const emails = res.body.map((u) => u.email);
//     expect(emails).toEqual(
//       expect.arrayContaining([
//         "adminjest@example.com",
//         "userjest1@example.com",
//         "userjest2@example.com",
//       ])
//     );
//   });

//   it("should return 403 if not admin", async () => {
//     const userToken =
//       "Bearer " +
//       jwt.sign(
//         { id: user1.id, username: user1.username, role: user1.role },
//         process.env.JWT_SECRET || "secret"
//       );
//     const res = await request(app)
//       .get("/api/users")
//       .set("Authorization", userToken)
//       .send();
//     expect(res.status).toBe(403);
//   });

//   it("should return 401 if token is missing", async () => {
//     const res = await request(app).get("/api/users").send();
//     expect(res.status).toBe(401);
//   });
// });

// describe("User Expo Token (Integration)", () => {
//   let user;

//   beforeAll(async () => {
//     user = await prisma.user.upsert({
//       where: { id: 2 },
//       update: {},
//       create: {
//         id: 2,
//         fullname: "Nasabah Jest",
//         username: "nasabahjest",
//         email: "nasabahjest@example.com",
//         passwordHash: await hashPassword(password),
//         phoneNumber: "08123456789",
//         role: "nasabah",
//         isVerified: true,
//         createdBy: "admin",
//         updatedBy: "admin",
//       },
//     });
//   });

//   afterAll(async () => {
//     await prisma.user.update({
//       where: { id: 2 },
//       data: { expoPushToken: null },
//     });
//   });

//   it("should save expo push token for user", async () => {
//     const res = await request(app)
//       .post("/api/users/expo-token")
//       .set("Authorization", userToken)
//       .send({
//         expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
//       });
//     expect(res.status).toBe(200);
//     expect(res.body.message).toMatch(/berhasil/i);

//     const updated = await prisma.user.findUnique({ where: { id: 2 } });
//     expect(updated.expoPushToken).toBe(
//       "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
//     );
//   });

//   it("should return 400 if expoPushToken is missing", async () => {
//     const res = await request(app)
//       .post("/api/users/expo-token")
//       .set("Authorization", userToken)
//       .send({});
//     expect(res.status).toBe(400);
//   });

//   it("should return 401 if token is missing", async () => {
//     const res = await request(app)
//       .post("/api/users/expo-token")
//       .send({ expoPushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" });
//     expect(res.status).toBe(401);
//   });
// });
