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

describe("Branch Controller (Integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should add a new branch", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/branch")
      .set("Authorization", adminToken)
      .send({
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      });
    expect(res.status).toBe(201);
    expect(res.body.branch).toHaveProperty("id");

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: res.body.branch.id } });
  });

  it("should not add branch with duplicate name", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/branch")
      .set("Authorization", adminToken)
      .send({
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + (unique + 1),
        address: "Jl. Jest No.2",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Nama cabang sudah terdaftar/i);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should not add branch with duplicate code", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JESTCODE" + unique,
        address: "Jl. Jest No.2",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/branch")
      .set("Authorization", adminToken)
      .send({
        name: "Test Branch Jest " + (unique + 1),
        branchCode: "JESTCODE" + unique,
        address: "Jl. Jest No.3",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Kode cabang sudah terdaftar/i);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should edit branch", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/branch/${branch.id}`)
      .set("Authorization", adminToken)
      .send({
        name: "Test Branch Jest Edited " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.branch.name).toBe("Test Branch Jest Edited " + unique);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should update branch status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/branch/${branch.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.branch).toHaveProperty("status");

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should get all branches", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get("/api/branch")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.branches)).toBe(true);
    expect(res.body.branches.some((b) => b.id === branch.id)).toBe(true);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should get branch by id", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get(`/api/branch/${branch.id}`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.branch).toHaveProperty("id");
    expect(res.body.branch.id).toBe(branch.id);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });

  it("should return 404 if branch not found", async () => {
    const res = await request(app)
      .get("/api/branch/99999999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Branch tidak ditemukan/i);
  });

  it("should get all branches for loket", async () => {
    const loketToken =
      "Bearer " +
      jwt.sign(
        { id: 2, username: "loketjest", role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch Jest " + unique,
        branchCode: "JEST" + unique,
        address: "Jl. Jest No.1",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get("/api/branch/loket")
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.branches)).toBe(true);
    expect(res.body.branches.some((b) => b.id === branch.id)).toBe(true);

    // Cleanup
    await prisma.branch.deleteMany({ where: { id: branch.id } });
  });
});
