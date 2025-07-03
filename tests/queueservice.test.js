const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

describe("QueueService Integration", () => {
  let nasabah, nasabahToken, queue, service1, service2, branch;

  const unique = Date.now();
  const nasabahUsername = "nasabahqueueservicejest" + unique;
  const plainPassword = "Password123!";

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { username: nasabahUsername } });

    const hashed = bcrypt.hashSync(plainPassword, 10);
    nasabah = await prisma.user.create({
      data: {
        fullname: "Nasabah QueueService Jest",
        username: nasabahUsername,
        email: `nasabahqueueservicejest${unique}@example.com`,
        passwordHash: hashed,
        phoneNumber: "08123456799" + unique,
        role: "nasabah",
        isVerified: true,
      },
    });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: nasabahUsername, password: plainPassword });
    nasabahToken = "Bearer " + loginRes.body.token;

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
        ticketNumber: "A" + unique,
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
    await prisma.$disconnect();
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

  it("POST /api/queue-service - should return 400 if queueId or serviceIds is missing", async () => {
    // Tanpa queueId
    let res = await request(app)
      .post("/api/queue-service")
      .set("Authorization", nasabahToken)
      .send({
        serviceIds: [service1.id],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/queueId dan serviceIds wajib diisi/i);

    // Tanpa serviceIds
    res = await request(app)
      .post("/api/queue-service")
      .set("Authorization", nasabahToken)
      .send({
        queueId: queue.id,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/queueId dan serviceIds wajib diisi/i);

    // serviceIds bukan array
    res = await request(app)
      .post("/api/queue-service")
      .set("Authorization", nasabahToken)
      .send({
        queueId: queue.id,
        serviceIds: null,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/queueId dan serviceIds wajib diisi/i);
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

  it("GET /api/documents-by-queue/:queueId - should return 404 if queue has no services", async () => {
    // Buat queue baru tanpa queueService
    const queueNoService = await prisma.queue.create({
      data: {
        userId: nasabah.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: nasabah.fullname,
        email: nasabah.email,
        phoneNumber: nasabah.phoneNumber,
        ticketNumber: "B" + unique,
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .get(`/api/documents-by-queue/${queueNoService.id}`)
      .set("Authorization", nasabahToken)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ada layanan pada antrian ini/i);

    await prisma.queue.deleteMany({ where: { id: queueNoService.id } });
  });
});
