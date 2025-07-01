const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

global.io = { emit: () => {} };

describe("Queue Booking Integration", () => {
  let nasabahToken, loketToken, branch, service, queueOnline, queueOffline;
  const unique = Date.now();

  let csToken;

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

    const csHashed = bcrypt.hashSync("dummyhash", 10);
    await prisma.cS.create({
      data: {
        name: "CS Test",
        username: "cstest" + unique,
        passwordHash: csHashed,
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    await prisma.user.create({
      data: {
        fullname: "Admin Test",
        username: "admintest" + unique,
        email: `admintest${unique}@mail.com`,
        passwordHash: hashed,
        phoneNumber: "0812345678" + (unique + 99),
        role: "admin",
        isVerified: true,
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
    await prisma.cS.deleteMany({ where: { branchId: branch.id } });
    await prisma.loket.deleteMany({ where: { branchId: branch.id } });
    await prisma.branch.deleteMany({ where: { id: branch.id } });
    await prisma.user.deleteMany({
      where: { username: "nasabahtest" + unique },
    });
  });

  it("Login as nasabah and book queue online", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    nasabahToken = "Bearer " + loginRes.body.token;

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

  it("should return 400 if branchId is missing", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if serviceIds is not array", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: "not-an-array",
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if serviceIds is empty array", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [],
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if user already has active queue", async () => {
    const user = await prisma.user.findFirst({
      where: { username: "nasabahtest" + unique },
    });
    await prisma.queue.create({
      data: {
        userId: user.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: user.email,
        phoneNumber: user.phoneNumber,
        ticketNumber: "A" + (unique + 500),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
  });

  it("Login as loket and book queue offline", async () => {
    const loginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "lokettest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    loketToken = "Bearer " + loginRes.body.token;

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

  it("should return 400 if name is missing in bookQueueOffline", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if both email and phoneNumber are missing in bookQueueOffline", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if serviceIds is not array in bookQueueOffline", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        serviceIds: "not-an-array",
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if serviceIds is empty array in bookQueueOffline", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        serviceIds: [],
      });
    expect(res.status).toBe(400);
  });

  it("should return 400 if there is already an active queue with same email/phoneNumber in bookQueueOffline", async () => {
    await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Offline Customer",
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        ticketNumber: "A" + (unique + 600),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: `offline${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 1),
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
  });

  it("Cancel queue by nasabah", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    nasabahToken = "Bearer " + loginRes.body.token;
    const res = await request(app)
      .patch(`/api/queue/${queueOnline.id}/cancel`)
      .set("Authorization", nasabahToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("Skip queue by CS", async () => {
    const csLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLogin.body.token;
    const newQueue = await prisma.queue.create({
      data: {
        userId: (
          await prisma.user.findFirst({
            where: { username: "nasabahtest" + unique },
          })
        ).id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: `skip${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 2),
        ticketNumber: "A" + (unique + 2),
        status: "called",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${newQueue.id}/skip`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("Call queue by CS", async () => {
    const csLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLogin.body.token;
    const callQueue = await prisma.queue.create({
      data: {
        userId: (
          await prisma.user.findFirst({
            where: { username: "nasabahtest" + unique },
          })
        ).id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: `call${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 3),
        ticketNumber: "A" + (unique + 3),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${callQueue.id}/call`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("Take queue by CS", async () => {
    const csLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLogin.body.token;
    const takeQueue = await prisma.queue.create({
      data: {
        userId: (
          await prisma.user.findFirst({
            where: { username: "nasabahtest" + unique },
          })
        ).id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: `take${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 4),
        ticketNumber: "A" + (unique + 4),
        status: "called",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${takeQueue.id}/take`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("Done queue by CS", async () => {
    const csLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLogin.body.token;
    const doneQueue = await prisma.queue.create({
      data: {
        userId: (
          await prisma.user.findFirst({
            where: { username: "nasabahtest" + unique },
          })
        ).id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: `done${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 5),
        ticketNumber: "A" + (unique + 5),
        status: "in progress",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${doneQueue.id}/done`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("should return 404 if queue not found when updating status", async () => {
    const res = await request(app)
      .patch(`/api/queue/99999999/done`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("should return 403 if CS token missing csId in callQueue", async () => {
    const jwt = require("jsonwebtoken");
    const fakeToken =
      "Bearer " +
      jwt.sign(
        { username: "cstest" + unique, branchId: branch.id, role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1000),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/call`)
      .set("Authorization", fakeToken)
      .send();
    expect([401, 403]).toContain(res.status);
  });

  it("should return 400 if queue already called by another CS", async () => {
    // Buat CS2 dan login
    const branch2 = await prisma.branch.create({
      data: {
        name: "Branch Test 2 " + unique,
        branchCode: "BR2" + unique,
        address: "Jl. Test 2",
        longitude: 106.9,
        latitude: -6.2,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const cs2 = await prisma.cS.create({
      data: {
        name: "CS Test 2",
        username: "cstest2" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id, // gunakan branch yang sama!
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLogin2 = await request(app)
      .post("/api/cs/login")
      .send({ username: "cstest2" + unique, password: "dummyhash" });
    const csToken2 = "Bearer " + csLogin2.body.token;

    // Buat queue status waiting
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1001),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    // CS1 panggil queue (ubah status ke "called")
    await request(app)
      .patch(`/api/queue/${queue.id}/call`)
      .set("Authorization", csToken)
      .send();

    // CS2 coba panggil queue yang sama (harus 409)
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/call`)
      .set("Authorization", csToken2)
      .send();

    expect([400, 409]).toContain(res.status);

    await prisma.cS.delete({ where: { id: cs2.id } });
    await prisma.branch.delete({ where: { id: branch2.id } });
  });

  it("should return 400 if queue status is not waiting in callQueue", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 3001),
        status: "done", // status bukan waiting
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/call`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 403 if CS token missing branchId in takeQueue", async () => {
    const jwt = require("jsonwebtoken");
    const fakeToken =
      "Bearer " +
      jwt.sign(
        { csId: 123456, username: "cstest" + unique, role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1002),
        status: "called",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/take`)
      .set("Authorization", fakeToken)
      .send();
    expect([401, 403]).toContain(res.status);
  });

  it("should return 403 if CS token missing csId in takeQueue", async () => {
    const jwt = require("jsonwebtoken");
    const fakeToken =
      "Bearer " +
      jwt.sign(
        { username: "cstest" + unique, branchId: branch.id, role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1003),
        status: "called",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/take`)
      .set("Authorization", fakeToken)
      .send();
    expect([401, 403]).toContain(res.status);
  });

  it("should return 400 if CS already has in progress queue in takeQueue", async () => {
    // Buat CS baru
    const cs2 = await prisma.cS.create({
      data: {
        name: "CS Test InProgress",
        username: "cstestinprogress" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLogin2 = await request(app)
      .post("/api/cs/login")
      .send({ username: "cstestinprogress" + unique, password: "dummyhash" });
    const csToken2 = "Bearer " + csLogin2.body.token;

    // Buat queue in progress untuk CS2
    await prisma.queue.create({
      data: {
        branchId: branch.id,
        csId: cs2.id,
        status: "in progress",
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 2000),
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    // Buat queue status called
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        status: "called",
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 2001),
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${queue.id}/take`)
      .set("Authorization", csToken2)
      .send();
    expect(res.status).toBe(400);

    await prisma.cS.delete({ where: { id: cs2.id } });
  });

  it("should return 404 if queue not found in takeQueue", async () => {
    const res = await request(app)
      .patch(`/api/queue/99999999/take`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("should return 403 if queue branchId not same as CS branchId in takeQueue", async () => {
    const branch2 = await prisma.branch.create({
      data: {
        name: "Branch Test 2 " + unique,
        branchCode: "BR2" + unique + "-" + Math.floor(Math.random() * 100000),
        address: "Jl. Test 2",
        longitude: 106.9,
        latitude: -6.2,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const queue = await prisma.queue.create({
      data: {
        branchId: branch2.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1004),
        status: "called",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/take`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(403);

    // Perbaikan: hapus queue dulu, baru branch
    await prisma.queue.deleteMany({ where: { branchId: branch2.id } });
    await prisma.branch.delete({ where: { id: branch2.id } });
  });

  it("should return 400 if queue status is not called in takeQueue", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 1005),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/take`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("Get total active queues for Loket's branch", async () => {
    const loginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "lokettest" + unique,
        password: "dummyhash",
      });
    expect(loginRes.status).toBe(200);
    loketToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/count/loket")
      .set("Authorization", loketToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("branchId", branch.id);
    expect(res.body).toHaveProperty("totalQueue");
    expect(typeof res.body.totalQueue).toBe("number");
  });

  it("should return 400 if branchId is missing in getQueueCountByBranchIdLoket", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/count/loket")
      .set("Authorization", fakeLoketToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("Get all waiting queues for Loket's branch", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", loketToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Get latest in-progress queue for CS branch", async () => {
    const res = await request(app)
      .get("/api/queue/inprogress/cs")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("status", "in progress");
    }
  });

  it("should return 400 if branchId is missing in getLatestInProgressQueueCS", async () => {
    const jwt = require("jsonwebtoken");
    const fakeCsToken =
      "Bearer " +
      jwt.sign(
        { csId: 123456, username: "cstest" + unique, role: "cs" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/inprogress/cs")
      .set("Authorization", fakeCsToken)
      .send();
    expect([400, 401]).toContain(res.status);
  });

  it("Get latest in-progress queue for Loket branch", async () => {
    const res = await request(app)
      .get("/api/queue/inprogress/loket")
      .set("Authorization", loketToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("status", "in progress");
    }
  });

  it("should return 400 if branchId is missing in getLatestInProgressQueueLoket", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/inprogress/loket")
      .set("Authorization", fakeLoketToken)
      .send();
    expect([400, 401]).toContain(res.status);
  });

  it("Get latest in-progress queue for User's branch", async () => {
    const res = await request(app)
      .get("/api/queue/inprogress/user")
      .set("Authorization", nasabahToken)
      .send();

    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("status", "in progress");
    }
  });

  it("should return 400 if branchId is missing in getLatestInProgressQueueUser", async () => {
    const jwt = require("jsonwebtoken");
    const fakeUserToken =
      "Bearer " +
      jwt.sign(
        { userId: 123456, username: "nasabahtest" + unique, role: "nasabah" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/inprogress/user")
      .set("Authorization", fakeUserToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 400 if branchId is missing in getLatestInProgressQueueLoket", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/inprogress/loket")
      .set("Authorization", fakeLoketToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("Get all waiting queues for Loket's branch", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", loketToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 400 if branchId is missing in getWaitingQueuesByBranchIdLoket", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", fakeLoketToken)
      .send();
    expect([400, 401]).toContain(res.status);
  });

  it("Get all waiting queues for CS's branch", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/cs")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 400 if branchId is missing in getWaitingQueuesByBranchIdCS", async () => {
    const jwt = require("jsonwebtoken");
    const fakeCsToken =
      "Bearer " +
      jwt.sign(
        { csId: 123456, username: "cstest" + unique, role: "cs" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/waiting/cs")
      .set("Authorization", fakeCsToken)
      .send();
    expect(res.status).toBe(401);
  });

  it("Get oldest waiting queue for Loket's branch", async () => {
    const res = await request(app)
      .get("/api/queue/oldest-waiting/loket")
      .set("Authorization", loketToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("status", "waiting");
    }
  });

  it("should return 400 if branchId is missing in getOldestWaitingQueueLoket", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/oldest-waiting/loket")
      .set("Authorization", fakeLoketToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("Get oldest waiting queue for CS's branch", async () => {
    const res = await request(app)
      .get("/api/queue/oldest-waiting/cs")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("status", "waiting");
    }
  });

  it("should return 400 if branchId is missing in getOldestWaitingQueueCS", async () => {
    const jwt = require("jsonwebtoken");
    const fakeCsToken =
      "Bearer " +
      jwt.sign(
        { csId: 123456, username: "cstest" + unique, role: "cs" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/oldest-waiting/cs")
      .set("Authorization", fakeCsToken)
      .send();
    expect(res.status).toBe(401);
  });

  it("Get oldest waiting queue for User's branch", async () => {
    const res = await request(app)
      .get("/api/queue/oldest-waiting/user")
      .set("Authorization", nasabahToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("status", "waiting");
    }
  });

  it("should return 404 if branchId is missing in getOldestWaitingQueueUser", async () => {
    const jwt = require("jsonwebtoken");
    const fakeUserToken =
      "Bearer " +
      jwt.sign(
        { userId: 123456, username: "nasabahtest" + unique, role: "nasabah" }, // tanpa branchId
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/oldest-waiting/user")
      .set("Authorization", fakeUserToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("Get active CS-customer pairs in branch", async () => {
    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Get nasabah yang sedang dilayani oleh CS login", async () => {
    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("queueId");
      expect(res.body).toHaveProperty("cs");
      expect(res.body).toHaveProperty("nasabah");
    }
  });

  it("Get detail antrean aktif yang sedang ditangani CS", async () => {
    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("name");
    }
  });

  it("Get data nasabah yang sedang dipanggil oleh CS", async () => {
    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isCalling");
    if (res.body.isCalling) {
      expect(res.body).toHaveProperty("queueId");
      expect(res.body).toHaveProperty("ticketNumber");
    }
  });

  it("Get the oldest called queue for TV display", async () => {
    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("status", "called");
    }
  });

  it("Get all queue data (paginated)", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "admintest" + unique,
        password: "dummyhash",
      });
    adminToken = "Bearer " + loginRes.body.token;
    const res = await request(app)
      .get("/api/queue?page=1&size=5")
      .set("Authorization", adminToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
  });

  it("should return 200 and use default pagination if no query param in getAllQueues", async () => {
    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("pagination");
  });

  it("should fallback to page=1 if page param is not a number in getAllQueues", async () => {
    const res = await request(app)
      .get("/api/queue?page=abc&size=5")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("should return 401 if no token in getAllQueues", async () => {
    const res = await request(app).get("/api/queue?page=1&size=5").send();
    expect(res.status).toBe(401);
  });

  it("Get ticket detail by queue ID (user)", async () => {
    const res = await request(app)
      .get(`/api/queue/ticket/${queueOnline.id}`)
      .set("Authorization", nasabahToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("branch");
    }
  });

  it("Get loket ticket detail by queue ID", async () => {
    const res = await request(app)
      .get(`/api/queue/loket-ticket/${queueOffline.id}`)
      .set("Authorization", loketToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("branch");
    }
  });

  it("Get all queue tickets (history) for current user", async () => {
    const res = await request(app)
      .get("/api/queue/history")
      .set("Authorization", nasabahToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("Get list of CS who are currently serving which customer in their branch", async () => {
    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Get nasabah yang sedang dilayani oleh CS login", async () => {
    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("queueId");
      expect(res.body).toHaveProperty("cs");
      expect(res.body).toHaveProperty("nasabah");
    }
  });

  it("Get detail antrean aktif yang sedang ditangani CS", async () => {
    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("name");
    }
  });

  it("Get data nasabah yang sedang dipanggil oleh CS", async () => {
    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isCalling");
    if (res.body.isCalling) {
      expect(res.body).toHaveProperty("queueId");
      expect(res.body).toHaveProperty("ticketNumber");
    }
  });

  it("Get the oldest called queue for TV display", async () => {
    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken)
      .send();

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body).toHaveProperty("status", "called");
    }
  });

  it("should return 401 if CS not found in getCalledCustomerTV", async () => {
    const jwt = require("jsonwebtoken");
    const fakeCsToken =
      "Bearer " +
      jwt.sign(
        { csId: 99999999, username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", fakeCsToken)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain("cs tidak ditemukan");
  });

  it("should return 404 if no called queue in getCalledCustomerTV", async () => {
    const cs = await prisma.cS.create({
      data: {
        name: "CS TV Test",
        username: "cstvtest" + unique,
        passwordHash: require("bcryptjs").hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const jwt = require("jsonwebtoken");
    const csToken =
      "Bearer " +
      jwt.sign(
        { csId: cs.id, username: cs.username, role: "cs" },
        process.env.JWT_SECRET || "secret"
      );

    const calledQueueIds = (
      await prisma.queue.findMany({
        where: { branchId: branch.id, status: "called" },
        select: { id: true },
      })
    ).map((q) => q.id);

    await prisma.queueLog.deleteMany({
      where: { queueId: { in: calledQueueIds } },
    });

    await prisma.queueService.deleteMany({
      where: { queueId: { in: calledQueueIds } },
    });
    await prisma.queue.deleteMany({
      where: { branchId: branch.id, status: "called" },
    });

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.message.toLowerCase()).toContain(
      "tidak ada antrian dengan status 'called'"
    );

    await prisma.cS.deleteMany({ where: { id: cs.id } });
  });

  it("should return 401 if CS exists in token but not in DB in getCalledCustomerTV", async () => {
    const cs = await prisma.cS.create({
      data: {
        name: "CS TV Test NotFound",
        username: "cstvtestnotfound" + unique,
        passwordHash: require("bcryptjs").hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const jwt = require("jsonwebtoken");
    const csToken =
      "Bearer " +
      jwt.sign(
        { csId: cs.id, username: cs.username, role: "cs" },
        process.env.JWT_SECRET || "secret"
      );

    await prisma.cS.deleteMany({ where: { id: cs.id } });

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.message.toLowerCase()).toContain("cs tidak ditemukan");
  });

  it("should default to size 10 if size param is invalid in getAllQueues", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: "admintest" + unique, password: "dummyhash" });
    adminToken = "Bearer " + loginRes.body.token;
    const res = await request(app)
      .get("/api/queue?page=1&size=999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("should return 400 if queueId is missing in getTicketById", async () => {
    const res = await request(app)
      .get("/api/queue/ticket/")
      .set("Authorization", nasabahToken)
      .send();
    expect([400, 404]).toContain(res.status);
  });

  it("should return 400 if userId is missing in getTicketById", async () => {
    const res = await request(app).get("/api/queue/ticket/999999").send();
    expect(res.status).toBe(401);
  });

  it("should return 404 if queue not found in getTicketById", async () => {
    const res = await request(app)
      .get("/api/queue/ticket/999999")
      .set("Authorization", nasabahToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("should return 403 if user not authorized to access ticket", async () => {
    const otherUser = await prisma.user.create({
      data: {
        fullname: "Other User",
        username: "otheruser" + unique,
        email: `otheruser${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 100),
        role: "nasabah",
        isVerified: true,
      },
    });
    const queue = await prisma.queue.create({
      data: {
        userId: otherUser.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Other User",
        email: `otheruser${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 100),
        ticketNumber: "A" + (unique + 100),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get(`/api/queue/ticket/${queue.id}`)
      .set("Authorization", nasabahToken)
      .send();
    expect(res.status).toBe(403);
  });

  it("should return 400 if queueId is missing in getLoketTicketById", async () => {
    const res = await request(app)
      .get("/api/queue/loket-ticket/")
      .set("Authorization", loketToken)
      .send();
    expect([400, 404]).toContain(res.status);
  });

  it("should return 400 if userId is missing in getUserQueueHistory", async () => {
    const res = await request(app).get("/api/queue/history").send();
    expect(res.status).toBe(401);
  });

  it("should return 400 if branchId is missing in getActiveCSCustomer", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { csId: 99999999, username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", fakeToken)
      .send();
    expect([400, 401, 404]).toContain(res.status);
  });

  it("should return 400 if csId is missing in getActiveCustomerByCS", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", fakeToken)
      .send();
    expect([400, 401]).toContain(res.status);
  });

  it("should return 401 if csId is missing in getQueueDetailByCSId", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", fakeToken)
      .send();
    expect(res.status).toBe(401);
  });

  it("should return 200 with null fields if no in-progress queue in getQueueDetailByCSId", async () => {
    await prisma.queue.updateMany({
      where: { csId: null, status: "in progress" },
      data: { status: "done" },
    });
    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", null);
  });

  it("should return 401 if csId is missing in getCalledCustomerByCS", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", fakeToken)
      .send();
    expect(res.status).toBe(401);
  });

  it("should return 200 with isCalling false if no called queue in getCalledCustomerByCS", async () => {
    await prisma.queue.updateMany({
      where: { csId: null, status: "called" },
      data: { status: "done" },
    });
    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isCalling", false);
  });

  it("should return 401 if csId is missing in getCalledCustomerTV", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/cs/tv-called")
      .set("Authorization", fakeToken)
      .send();
    expect([401, 404]).toContain(res.status);
    if (res.status === 401) {
      expect(res.body).toHaveProperty("message");
    }
  });

  it("should return 404 if csId not found in getCalledCustomerTV", async () => {
    const fakeToken =
      "Bearer " +
      require("jsonwebtoken").sign(
        { csId: 99999999, username: "notfound", role: "cs" },
        process.env.JWT_SECRET || "secret"
      );
    const res = await request(app)
      .get("/api/queue/cs/tv-called")
      .set("Authorization", fakeToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("should return 404 if no called queue in branch in getCalledCustomerTV", async () => {
    await prisma.queue.updateMany({
      where: { branchId: branch.id, status: "called" },
      data: { status: "done" },
    });
    const res = await request(app)
      .get("/api/queue/cs/tv-called")
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(404);
  });

  it("should return 200 and correct queue data if there is a called queue in getCalledCustomerTV", async () => {
    const csLogin = await request(app)
      .post("/api/cs/login")
      .send({ username: "cstest" + unique, password: "dummyhash" });
    const csTokenLocal = "Bearer " + csLogin.body.token;
    const jwt = require("jsonwebtoken");
    const decoded = jwt.decode(csLogin.body.token);
    const csId = decoded.csId;

    const csData = await prisma.cS.findUnique({ where: { id: csId } });
    const branchId = csData.branchId;

    await prisma.queue.deleteMany({
      where: { branchId, status: "called" },
    });

    const calledAt = new Date(Date.now() + 1000);
    const queue = await prisma.queue.create({
      data: {
        csId,
        branchId,
        bookingDate: new Date(),
        name: "TV Test Nasabah",
        ticketNumber: "TV" + unique,
        status: "called",
        calledAt,
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csTokenLocal)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(res.body).toHaveProperty("status", "called");
    expect(res.body).toHaveProperty("csId", csId);
    expect(res.body).toHaveProperty("calledAt");
  });

  it("should return 400 if queue already done", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 202),
        status: "done",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/done`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 400 if queue status already same as newStatus", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 203),
        status: "done",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/done`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 400 if status transition not allowed", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 204),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/done`)
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 403 if CS from different branch tries to update status", async () => {
    const branch2 = await prisma.branch.create({
      data: {
        name: "Branch Test 2 " + unique,
        branchCode: "BR2" + unique + "-" + Math.floor(Math.random() * 100000),
        address: "Jl. Test 2",
        longitude: 106.9,
        latitude: -6.2,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const cs2 = await prisma.cS.create({
      data: {
        name: "CS Test 2",
        username: "cstest2" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch2.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLogin2 = await request(app)
      .post("/api/cs/login")
      .send({ username: "cstest2" + unique, password: "dummyhash" });
    const csToken2 = "Bearer " + csLogin2.body.token;

    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 201),
        status: "in progress",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .patch(`/api/queue/${queue.id}/done`)
      .set("Authorization", csToken2)
      .send();
    expect(res.status).toBe(403);

    await prisma.cS.delete({ where: { id: cs2.id } });
    await prisma.branch.delete({ where: { id: branch2.id } });
  });

  it("should return 403 if CS token missing username in updateStatus", async () => {
    const jwt = require("jsonwebtoken");
    const fakeToken =
      "Bearer " +
      jwt.sign(
        { csId: 123456, branchId: branch.id, role: "cs" }, // tanpa username
        process.env.JWT_SECRET || "secret"
      );
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test",
        ticketNumber: "A" + (unique + 3000),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queue.id}/done`)
      .set("Authorization", fakeToken)
      .send();
    expect([401, 403]).toContain(res.status);
  });

  it("should return 401 if CS token missing when updating status", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 200),
        status: "in progress",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app).patch(`/api/queue/${queue.id}/done`).send();
    expect(res.status).toBe(401);
  });

  it("should return empty history for user with no queue", async () => {
    const uniqueUser = "nohistory" + unique;
    const hashed = bcrypt.hashSync("dummyhash", 10);
    await prisma.user.create({
      data: {
        fullname: "NoHistory User",
        username: uniqueUser,
        email: uniqueUser + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "0812345678" + (unique + 200),
        role: "nasabah",
        isVerified: true,
      },
    });
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: uniqueUser, password: "dummyhash" });
    const token = "Bearer " + loginRes.body.token;
    const res = await request(app)
      .get("/api/queue/history")
      .set("Authorization", token)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("should return empty array if no CS-customer pairs in branch", async () => {
    await prisma.queue.updateMany({
      where: { branchId: branch.id },
      data: { status: "done" },
    });
    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", csToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it("should handle queue with empty services in getUserQueueHistory", async () => {
    const user = await prisma.user.findFirst({
      where: { username: "nasabahtest" + unique },
    });
    const queue = await prisma.queue.create({
      data: {
        userId: user.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        email: `emptyservice${unique}@mail.com`,
        phoneNumber: "0812345678" + (unique + 300),
        ticketNumber: "A" + (unique + 300),
        status: "done",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    await prisma.queueService.deleteMany({ where: { queueId: queue.id } });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: "nasabahtest" + unique, password: "dummyhash" });
    const token = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/history")
      .set("Authorization", token)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should return 400 if queueId is missing in getLoketTicketById", async () => {
    const res = await request(app)
      .get("/api/queue/loket-ticket/")
      .set("Authorization", loketToken)
      .send();
    expect([400, 404]).toContain(res.status);
  });

  it("should return 400 if loketId is missing in getLoketTicketById", async () => {
    const jwt = require("jsonwebtoken");
    const fakeLoketToken =
      "Bearer " +
      jwt.sign(
        { username: "lokettest" + unique, role: "loket" },
        process.env.JWT_SECRET || "secret"
      );
    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 999),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get(`/api/queue/loket-ticket/${queue.id}`)
      .set("Authorization", fakeLoketToken)
      .send();
    expect(res.status).toBe(400);
  });

  it("should return 403 if loket not authorized to access ticket", async () => {
    const loket2 = await prisma.loket.create({
      data: {
        name: "Loket Test 2",
        username: "lokettest2" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const loketLogin2 = await request(app)
      .post("/api/loket/login")
      .send({ username: "lokettest2" + unique, password: "dummyhash" });
    const loketToken2 = "Bearer " + loketLogin2.body.token;

    const queue = await prisma.queue.create({
      data: {
        branchId: branch.id,
        loketId: null,
        bookingDate: new Date(),
        name: "Test Nasabah",
        ticketNumber: "A" + (unique + 888),
        status: "waiting",
        notification: false,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const res = await request(app)
      .get(`/api/queue/loket-ticket/${queue.id}`)
      .set("Authorization", loketToken2)
      .send();
    expect(res.status).toBe(403);

    await prisma.loket.delete({ where: { id: loket2.id } });
  });

  it("should return 401 if userId is missing in getUserQueueHistory", async () => {
    const res = await request(app).get("/api/queue/history").send();
    expect(res.status).toBe(401);
  });
});
