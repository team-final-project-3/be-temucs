const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");

describe("Service Controller (Integration)", () => {
  const unique = Date.now() + Math.floor(Math.random() * 10000);
  const branchCode = "SERVICEBRANCH" + unique;
  const loketUsername = "serviceloket" + unique;
  const adminUsername = "serviceadmin" + unique;
  const userUsername = "servicenasa" + unique;
  const plainPassword = "Password123!";
  let adminToken, userToken, loketToken;
  let document;
  beforeAll(async () => {
    // Setup document
    document = await prisma.document.create({
      data: {
        documentName: "Dokumen Service Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    // Setup branch unik
    await prisma.branch.deleteMany({ where: { branchCode } });
    const branch = await prisma.branch.create({
      data: {
        name: "Branch Service Jest " + unique,
        branchCode,
        address: "Jl. Service Jest",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashed = bcrypt.hashSync(plainPassword, 10);

    // Upsert admin, user, loket unik
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });
    await prisma.loket.deleteMany({ where: { username: loketUsername } });

    await prisma.user.create({
      data: {
        fullname: "Admin Jest",
        username: adminUsername,
        email: adminUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081234567899",
        role: "admin",
        isVerified: true,
      },
    });
    await prisma.user.create({
      data: {
        fullname: "Nasabah Jest",
        username: userUsername,
        email: userUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081234567888",
        role: "nasabah",
        isVerified: true,
      },
    });
    await prisma.loket.create({
      data: {
        username: loketUsername,
        passwordHash: hashed,
        name: "Loket Jest",
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        branchId: branch.id,
      },
    });

    // Login admin
    const adminLogin = await request(app)
      .post("/api/users/login")
      .send({ username: adminUsername, password: plainPassword });
    adminToken = "Bearer " + adminLogin.body.token;

    // Login user
    const userLogin = await request(app)
      .post("/api/users/login")
      .send({ username: userUsername, password: plainPassword });
    userToken = "Bearer " + userLogin.body.token;

    // Login loket
    const loketLogin = await request(app)
      .post("/api/loket/login")
      .send({ username: loketUsername, password: plainPassword });
    loketToken = "Bearer " + loketLogin.body.token;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({
      where: { serviceName: { contains: "Jest" } },
    });
    await prisma.document.deleteMany({ where: { id: document.id } });
    await prisma.loket.deleteMany({ where: { username: loketUsername } });
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });
    await prisma.branch.deleteMany({ where: { branchCode } });
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
