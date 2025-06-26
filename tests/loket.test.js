const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");
const { hashPassword } = require("../src/auth/loket.auth");

const adminToken =
  "Bearer " +
  jwt.sign(
    { id: 1, username: "admin", role: "admin" },
    process.env.JWT_SECRET || "secret"
  );

describe("Loket Controller (Integration)", () => {
  let branch;

  beforeAll(async () => {
    branch = await prisma.branch.create({
      data: {
        name: "Branch Loket Jest " + Date.now(),
        branchCode: "LOKETJEST" + Date.now(),
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

    // Cleanup
    await prisma.loket.deleteMany({ where: { id: res.body.loket.id } });
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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
    // Buat token sesuai id
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

    // Cleanup
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
});
