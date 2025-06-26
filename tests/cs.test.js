const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");

const adminToken =
  "Bearer " +
  jwt.sign(
    { id: 1, username: "admin", role: "admin" },
    process.env.JWT_SECRET || "secret"
  );

const hashPassword = require("../src/auth/cs.auth").hashPassword;

describe("CS Controller (Integration)", () => {
  let branch;

  beforeAll(async () => {
    // Buat branch dummy untuk relasi CS
    branch = await prisma.branch.create({
      data: {
        name: "Branch CS Jest " + Date.now(),
        branchCode: "CSJEST" + Date.now(),
        address: "Jl. CS Jest",
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
    await prisma.cS.deleteMany({ where: { branchId: branch.id } });
    await prisma.branch.deleteMany({ where: { id: branch.id } });
    await prisma.$disconnect();
  });

  it("should add a new CS", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/cs/add")
      .set("Authorization", adminToken)
      .send({
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjest" + unique,
        password: "Password123!",
      });
    expect(res.status).toBe(201);
    expect(res.body.cs).toHaveProperty("id");

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: res.body.cs.id } });
  });

  it("should not add CS with duplicate username", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjest" + unique,
        passwordHash: await hashPassword("Password123!"),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/cs/add")
      .set("Authorization", adminToken)
      .send({
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjest" + unique,
        password: "Password123!",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/CS sudah terdaftar/i);

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should login CS", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const password = "Password123!";
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjestlogin" + unique,
        passwordHash: await hashPassword(password),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csjestlogin" + unique,
        password,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should fail login with wrong password", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjestfail" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csjestfail" + unique,
        password: "wrongpassword",
      });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Password salah/i);

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should edit CS", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjestedit" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/cs/${cs.id}`)
      .set("Authorization", adminToken)
      .send({
        name: "CS Jest Edited " + unique,
        password: "PasswordBaru123!",
      });
    expect(res.status).toBe(200);
    expect(res.body.cs.name).toBe("CS Jest Edited " + unique);

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should update CS status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjeststatus" + unique,
        passwordHash: await hashPassword("Password123!"),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/cs/${cs.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.cs).toHaveProperty("status");

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should get CS profile", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const password = "Password123!";
    const cs = await prisma.cS.create({
      data: {
        branchId: branch.id,
        name: "CS Jest " + unique,
        username: "csjestprofile" + unique,
        passwordHash: await hashPassword(password),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    // Login untuk dapatkan token
    const loginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csjestprofile" + unique,
        password,
      });
    const token = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/cs/profile")
      .set("Authorization", token)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.cs).toHaveProperty("id");
    expect(res.body.cs).toHaveProperty("name");
    expect(res.body.cs).toHaveProperty("username");
    expect(res.body.cs).toHaveProperty("branchId");
    expect(res.body.cs).toHaveProperty("branch");

    // Cleanup
    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should return 404 if CS not found on edit", async () => {
    const res = await request(app)
      .put("/api/cs/999999")
      .set("Authorization", adminToken)
      .send({ name: "Not Exist" });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/CS tidak ditemukan/i);
  });

  it("should return 404 if CS not found on status update", async () => {
    const res = await request(app)
      .put("/api/cs/999999/status")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/CS tidak ditemukan/i);
  });
});
