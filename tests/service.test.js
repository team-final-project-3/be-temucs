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
const userToken =
  "Bearer " +
  jwt.sign(
    { id: 2, username: "nasabahjest", role: "nasabah" },
    process.env.JWT_SECRET || "secret"
  );
const loketToken =
  "Bearer " +
  jwt.sign(
    { loketId: 3, username: "loketjest", role: "loket" },
    process.env.JWT_SECRET || "secret"
  );

describe("Service Controller (Integration)", () => {
  let document;

  beforeAll(async () => {
    // Buat document dummy untuk relasi service
    document = await prisma.document.create({
      data: {
        documentName: "Dokumen Service Jest " + Date.now(),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    // Buat user loket dummy agar endpoint /service/loket tidak error
    let branch = await prisma.branch.findFirst();
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: "Branch Loket Jest",
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
    }
    await prisma.loket.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        username: "loketjest",
        passwordHash: "dummyhash",
        name: "Loket Jest",
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        branchId: branch.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({
      where: { serviceName: { contains: "Jest" } },
    });
    await prisma.document.deleteMany({ where: { id: document.id } });
    await prisma.loket.deleteMany({ where: { username: "loketjest" } });
    await prisma.$disconnect();
  });

  it("should add a new service", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/service")
      .set("Authorization", adminToken)
      .send({
        serviceName: "Service Jest " + unique,
        estimatedTime: 15,
        documents: [{ documentId: document.id, quantity: 2 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.service).toHaveProperty("id");

    // Cleanup
    await prisma.service.deleteMany({ where: { id: res.body.service.id } });
  });

  it("should get all active services for user", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const service = await prisma.service.create({
      data: {
        serviceName: "Service Jest " + unique,
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 1,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    const res = await request(app)
      .get("/api/service/user")
      .set("Authorization", userToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s) => s.id === service.id)).toBe(true);

    // Cleanup
    await prisma.service.deleteMany({ where: { id: service.id } });
  });

  it("should get all active services for loket", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const service = await prisma.service.create({
      data: {
        serviceName: "Service Jest " + unique,
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 1,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    const res = await request(app)
      .get("/api/service/loket")
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s) => s.id === service.id)).toBe(true);

    // Cleanup
    await prisma.service.deleteMany({ where: { id: service.id } });
  });

  it("should get service by id for admin", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const service = await prisma.service.create({
      data: {
        serviceName: "Service Jest " + unique,
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 1,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    const res = await request(app)
      .get(`/api/service/${service.id}`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.id).toBe(service.id);

    // Cleanup
    await prisma.service.deleteMany({ where: { id: service.id } });
  });

  it("should edit service", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const service = await prisma.service.create({
      data: {
        serviceName: "Service Jest " + unique,
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 1,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    const res = await request(app)
      .put(`/api/service/${service.id}`)
      .set("Authorization", adminToken)
      .send({
        serviceName: "Service Jest Edited " + unique,
        estimatedTime: 20,
        documents: [{ documentId: document.id, quantity: 2 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.updatedService.serviceName).toBe(
      "Service Jest Edited " + unique
    );

    // Cleanup
    await prisma.service.deleteMany({ where: { id: service.id } });
  });

  it("should update service status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const service = await prisma.service.create({
      data: {
        serviceName: "Service Jest " + unique,
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 1,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    const res = await request(app)
      .put(`/api/service/${service.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.service).toHaveProperty("status");

    // Cleanup
    await prisma.service.deleteMany({ where: { id: service.id } });
  });

  it("should return 404 if service not found", async () => {
    const res = await request(app)
      .get("/api/service/99999999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });
});
