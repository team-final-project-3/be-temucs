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

describe("ServiceDocument Controller (Integration)", () => {
  let document, service1, service2;

  beforeAll(async () => {
    // Buat document dummy
    document = await prisma.document.create({
      data: {
        documentName: "Materai ServiceDocument Jest " + Date.now(),
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    // Buat service dummy
    service1 = await prisma.service.create({
      data: {
        serviceName: "Service Jest 1 " + Date.now(),
        estimatedTime: 10,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        documents: {
          create: [
            {
              documentId: document.id,
              quantity: 2,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    service2 = await prisma.service.create({
      data: {
        serviceName: "Service Jest 2 " + Date.now(),
        estimatedTime: 15,
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
    // Buat user loket dummy agar endpoint /loket tidak error
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
      where: { id: { in: [service1.id, service2.id] } },
    });
    await prisma.document.deleteMany({ where: { id: document.id } });
    await prisma.loket.deleteMany({ where: { username: "loketjest" } });
    await prisma.$disconnect();
  });

  it("should get documents by serviceIds for user", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/user")
      .set("Authorization", adminToken)
      .send({
        serviceIds: [service1.id, service2.id],
      });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d) => d.id === document.id)).toBe(true);
    const doc = res.body.data.find((d) => d.id === document.id);
    expect(doc.quantity).toBe(3);
  });

  it("should get documents by serviceIds for loket", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/loket")
      .set("Authorization", loketToken)
      .send({
        serviceIds: [service1.id, service2.id],
      });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d) => d.id === document.id)).toBe(true);
    const doc = res.body.data.find((d) => d.id === document.id);
    expect(doc.quantity).toBe(3);
  });

  it("should return 400 if serviceIds is missing", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/user")
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
  });
});
