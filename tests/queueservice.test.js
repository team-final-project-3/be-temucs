const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const jwt = require("jsonwebtoken");

describe("QueueService Integration", () => {
  let nasabah, nasabahToken, queue, service1, service2;

  const unique = Date.now();

  beforeAll(async () => {
    nasabah = await prisma.user.create({
      data: {
        fullname: "Nasabah QueueService Jest",
        username: "nasabahqueueservicejest" + unique,
        email: `nasabahqueueservicejest${unique}@example.com`,
        passwordHash: "dummyhash",
        phoneNumber: "08123456799" + unique,
        role: "nasabah",
        isVerified: true,
      },
    });
    nasabahToken =
      "Bearer " +
      jwt.sign(
        { id: nasabah.id, username: nasabah.username, role: nasabah.role },
        process.env.JWT_SECRET || "secret"
      );

    service1 = await prisma.service.create({
      data: {
        serviceName: "Service Test 1 " + unique,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    service2 = await prisma.service.create({
      data: {
        serviceName: "Service Test 2 " + unique,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    branch = await prisma.branch.create({
      data: {
        name: "Test Branch " + unique,
        branchCode: "BR" + unique,
        address: "Jl. Test",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    queue = await prisma.queue.create({
      data: {
        userId: nasabah.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: nasabah.fullname,
        email: nasabah.email,
        phoneNumber: nasabah.phoneNumber,
        ticketNumber: "A" + unique, // pastikan unik
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
  });

  afterAll(async () => {
    await prisma.queueService.deleteMany({ where: { queueId: queue.id } });
    await prisma.queue.deleteMany({ where: { id: queue.id } });
    await prisma.branch.deleteMany({ where: { id: branch.id } });
    await prisma.service.deleteMany({
      where: { id: { in: [service1.id, service2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: nasabah.id },
    });
  });

  it("POST /api/queue-service - should create queue services", async () => {
    const res = await request(app)
      .post("/api/queue-service")
      .set("Authorization", nasabahToken)
      .send({
        queueId: queue.id,
        serviceIds: [service1.id, service2.id],
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("message");
  });

  it("GET /api/queue-service/:queueId - should get all services linked to a specific queue", async () => {
    const res = await request(app)
      .get(`/api/queue-service/${queue.id}`)
      .set("Authorization", nasabahToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const serviceNames = res.body.map((s) => s.service.serviceName);
    expect(serviceNames).toEqual(
      expect.arrayContaining([
        "Service Test 1 " + unique,
        "Service Test 2 " + unique,
      ])
    );
  });

  it("GET /api/documents-by-queue/:queueId - should get documents by queueId (may return 200 or 404)", async () => {
    const res = await request(app)
      .get(`/api/documents-by-queue/${queue.id}`)
      .set("Authorization", nasabahToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.documents)).toBe(true);
    }
  });

  it("GET /api/queue-service/:queueId - should return 400 if queueId is not valid", async () => {
    const res = await request(app)
      .get(`/api/queue-service/abc`)
      .set("Authorization", nasabahToken)
      .send();
    expect(res.status).toBe(400);
  });
});
