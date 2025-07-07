const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");
const { hashPassword } = require("../src/auth/loket.auth");

const unique = Date.now() + Math.floor(Math.random() * 10000);
const adminUsername = "loketadminjest" + unique;
const plainPassword = "Password123!";
let adminToken, branch;

describe("Loket Controller (Integration)", () => {
  let branch;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { username: adminUsername } });
    const hashed = await require("bcryptjs").hash(plainPassword, 10);
    await prisma.user.create({
      data: {
        fullname: "Admin Loket Jest",
        username: adminUsername,
        email: adminUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081234" + unique,
        role: "admin",
        isVerified: true,
      },
    });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: adminUsername, password: plainPassword });
    adminToken = "Bearer " + loginRes.body.token;

    branch = await prisma.branch.create({
      data: {
        name: "Branch Loket Jest " + unique,
        branchCode: "LOKETJEST" + unique,
        address: "Jl. Loket Jest",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
  });

  afterAll(async () => {
    await prisma.loket.deleteMany({ where: { branchId: branch.id } });
    await prisma.branch.deleteMany({ where: { id: branch.id } });
    await prisma.user.deleteMany({ where: { username: adminUsername } });
    await prisma.$disconnect();
  });

  it("should add a new loket", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/loket/add")
      .set("Authorization", adminToken)
      .send({
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjest" + unique,
        password: "Password123!",
        status: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.loket).toHaveProperty("id");

    await prisma.loket.deleteMany({ where: { id: res.body.loket.id } });
  });

  it("should return 400 if addLoket with password less than 8 chars", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/loket/add")
      .set("Authorization", adminToken)
      .send({
        branchId: branch.id,
        name: "Loket Jest ShortPW " + unique,
        username: "loketjestshortpw" + unique,
        password: "short",
        status: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("minimal 8 karakter");
  });

  it("should not add loket with duplicate username", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjest" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/loket/add")
      .set("Authorization", adminToken)
      .send({
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjest" + unique,
        password: "Password123!",
        status: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("terdaftar");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should login loket", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const password = "Password123!";
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestlogin" + unique,
        passwordHash: await hashPassword(password),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketjestlogin" + unique,
        password,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should return 401 if loket not found saat login", async () => {
    const res = await request(app)
      .post("/api/loket/login")
      .send({
        username: "tidakadadikloket" + Date.now(),
        password: "Password123!",
      });
    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain("tidak ditemukan");
  });

  it("should return 403 if loket is not active saat login", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const password = "Password123!";
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest Nonaktif " + unique,
        username: "loketjestnonaktif" + unique,
        passwordHash: await hashPassword(password),
        status: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketjestnonaktif" + unique,
        password,
      });
    expect(res.status).toBe(403);
    expect(res.body.message.toLowerCase()).toContain("tidak aktif");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should return 401 if password salah saat login", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest SalahPW " + unique,
        username: "loketjestsalahpw" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketjestsalahpw" + unique,
        password: "PasswordSALAH!",
      });
    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain("password salah");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should edit loket", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestedit" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/loket/${loket.id}`)
      .set("Authorization", adminToken)
      .send({
        name: "Loket Jest Edited " + unique,
        password: "PasswordBaru123!",
      });
    expect(res.status).toBe(200);
    expect(res.body.loket.name).toBe("Loket Jest Edited " + unique);

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should update loket status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjeststatus" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/loket/${loket.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.loket).toHaveProperty("status");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should get loket profile by id", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestprofile" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const loketToken =
      "Bearer " +
      jwt.sign(
        { loketId: loket.id, username: loket.username, role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get(`/api/loket/${loket.id}/profile`)
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.loket).toHaveProperty("id");
    expect(res.body.loket.id).toBe(loket.id);

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should return 401 if loket not found", async () => {
    const loketToken =
      "Bearer " +
      jwt.sign(
        { loketId: 99999999, username: "notfound", role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/loket/99999999/profile")
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should return 400 if addLoket missing required fields", async () => {
    const res = await request(app)
      .post("/api/loket/add")
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("tidak lengkap");
  });

  it("should return 404 if editLoket not found", async () => {
    const res = await request(app)
      .put("/api/loket/99999999")
      .set("Authorization", adminToken)
      .send({ name: "Loket Jest Edited", password: "PasswordBaru123!" });
    expect(res.status).toBe(404);
    expect(res.body.message.toLowerCase()).toContain("tidak ditemukan");
  });

  it("should return 404 if updateLoketStatus not found", async () => {
    const res = await request(app)
      .put("/api/loket/99999999/status")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message.toLowerCase()).toContain("tidak ditemukan");
  });

  it("should return 400 if getLoket called without loketId", async () => {
    const loketToken =
      "Bearer " +
      jwt.sign(
        { username: "loketjestnotfound", role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/loket/99999999/profile")
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("tidak ditemukan");
  });

  it("should return 400 if loginLoket missing required fields", async () => {
    const res = await request(app).post("/api/loket/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("wajib diisi");
  });

  it("should return 400 if editLoket called with no fields", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestemptyedit" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/loket/${loket.id}`)
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("tidak boleh kosong");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should return 400 if editLoket with password less than 8 chars", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestshortpw" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/loket/${loket.id}`)
      .set("Authorization", adminToken)
      .send({ password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("minimal 8 karakter");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });

  it("should return 400 if editLoket called with all fields empty", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const loket = await prisma.loket.create({
      data: {
        branchId: branch.id,
        name: "Loket Jest " + unique,
        username: "loketjestemptyedit" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/loket/${loket.id}`)
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("tidak boleh kosong");

    await prisma.loket.deleteMany({ where: { id: loket.id } });
  });
});
