const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

describe("Queue Booking Integration", () => {
  let nasabahToken, loketToken, branch, service, queueOnline, queueOffline;
  const unique = Date.now();

  beforeAll(async () => {
    branch = await prisma.branch.create({
      data: {
        name: "Branch Test " + unique,
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
    service = await prisma.service.create({
      data: {
        serviceName: "Service Test " + unique,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const hashed = bcrypt.hashSync("dummyhash", 10);

    await prisma.user.create({
      data: {
        fullname: "Nasabah Test",
        username: "nasabahtest" + unique,
        email: `nasabahtest${unique}@mail.com`,
        passwordHash: hashed,
        phoneNumber: "0812345678" + unique,
        role: "nasabah",
        isVerified: true,
      },
    });

    await prisma.loket.create({
      data: {
        name: "Loket Test",
        username: "lokettest" + unique,
        passwordHash: hashed,
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
  });

  afterAll(async () => {
    await prisma.queueLog.deleteMany({
      where: {
        queue: {
          branchId: branch.id,
        },
      },
    });
    await prisma.queueService.deleteMany({
      where: {
        queueId: {
          in: (
            await prisma.queue.findMany({
              where: { branchId: branch.id },
              select: { id: true },
            })
          ).map((q) => q.id),
        },
      },
    });
    await prisma.queue.deleteMany({ where: { branchId: branch.id } });
    await prisma.service.deleteMany({ where: { id: service.id } });
    await prisma.loket.deleteMany({
      where: { username: "lokettest" + unique },
    });
    await prisma.branch.deleteMany({ where: { id: branch.id } });
    await prisma.user.deleteMany({
      where: { username: "nasabahtest" + unique },
    });
  });

  it("Login as nasabah and book queue online", async () => {
    // Login nasabah
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    nasabahToken = "Bearer " + loginRes.body.token;

    // Booking online
    const bookRes = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body).toHaveProperty("queue");
    queueOnline = bookRes.body.queue;
  });

  it("Login as loket and book queue offline", async () => {
    // Login loket
    const loginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "lokettest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    loketToken = "Bearer " + loginRes.body.token;

    // Booking offline
    const bookRes = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        serviceIds: [service.id],
      });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body).toHaveProperty("queue");
    queueOffline = bookRes.body.queue;
  });
});
