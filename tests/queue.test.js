const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

global.io = { emit: () => {} };

const unique = Date.now();
let branch, service, nasabahToken, loketToken;

const loketUsername = "lokettest" + unique;
const loketEmail = `lokettest${unique}@mail.com`;
const loketPhone = "0812345678" + (unique + 1);

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
  await prisma.cS.create({
    data: {
      name: "CS Test " + unique,
      username: "cstest" + unique,
      passwordHash: "dummyhash",
      branchId: branch.id,
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
      estimatedTime: 10,
      status: true,
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
  // Login as nasabah
  const loginRes = await request(app)
    .post("/api/users/login")
    .send({
      username: "nasabahtest" + unique,
      password: "dummyhash",
    });
  nasabahToken = "Bearer " + loginRes.body.token;

  // Buat dan login loket
  await prisma.loket.create({
    data: {
      name: "Loket Test " + unique,
      username: loketUsername,
      passwordHash: bcrypt.hashSync("dummyhash", 10),
      branchId: branch.id,
      status: true,
      createdBy: "admin",
      updatedBy: "admin",
    },
  });
  const loketLoginRes = await request(app).post("/api/loket/login").send({
    username: loketUsername,
    password: "dummyhash",
  });
  loketToken = "Bearer " + loketLoginRes.body.token;
});

beforeEach(async () => {
  const queues = await prisma.queue.findMany({
    where: { branchId: branch.id },
    select: { id: true },
  });
  const queueIds = queues.map((q) => q.id);

  await prisma.queueLog.deleteMany({
    where: { queueId: { in: queueIds } },
  });
  await prisma.queueService.deleteMany({
    where: { queueId: { in: queueIds } },
  });
  await prisma.queue.deleteMany({
    where: { branchId: branch.id },
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
  await prisma.service.deleteMany({ where: { id: service.id } });
  await prisma.user.deleteMany({
    where: { username: "nasabahtest" + unique },
  });
});

describe("bookQueueOnline", () => {
  it("should book queue online successfully", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("queue");
    expect(res.body.queue).toHaveProperty("ticketNumber");
    expect(res.body.queue).toHaveProperty("status", "waiting");
  });

  it("should fail if not authenticated", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(401);
  });

  it("should fail if data is incomplete (missing serviceIds)", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("data tidak lengkap");
  });

  it("should fail if data is incomplete (missing branchId)", async () => {
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("data tidak lengkap");
  });

  it("should fail if already has active queue", async () => {
    // Book first queue
    await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    const res = await request(app)
      .post("/api/queue/book-online")
      .set("Authorization", nasabahToken)
      .send({
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("sudah ada antrian aktif");
  });
});

describe("bookQueueOffline", () => {
  it("should book queue offline successfully", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: loketEmail,
        phoneNumber: loketPhone,
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("queue");
    expect(res.body.queue).toHaveProperty("ticketNumber");
    expect(res.body.queue).toHaveProperty("status", "waiting");
  });

  it("should fail if not authenticated", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .send({
        name: "Offline Customer",
        email: loketEmail,
        phoneNumber: loketPhone,
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(401);
  });

  it("should fail if data is incomplete (missing serviceIds)", async () => {
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: loketEmail,
        phoneNumber: loketPhone,
        branchId: branch.id,
        serviceIds: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("data tidak lengkap");
  });

  it("should fail if already has active queue", async () => {
    await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: loketEmail,
        phoneNumber: loketPhone,
        branchId: branch.id,
        serviceIds: [service.id],
      });
    const res = await request(app)
      .post("/api/queue/book-offline")
      .set("Authorization", loketToken)
      .send({
        name: "Offline Customer",
        email: loketEmail,
        phoneNumber: loketPhone,
        branchId: branch.id,
        serviceIds: [service.id],
      });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("sudah ada antrian aktif");
  });
});

describe("updateStatus", () => {
  let csToken, queueId;

  beforeAll(async () => {
    await prisma.cS.create({
      data: {
        name: "CS Status Test " + unique,
        username: "csstatustest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csstatustest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    const queue = await prisma.queue.create({
      data: {
        userId: null,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Status Test Customer",
        email: "statustest" + unique + "@mail.com",
        phoneNumber: "0812345678" + unique,
        ticketNumber: "B-TEST-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    queueId = queue.id;
  });

  it("should update status from waiting to called", async () => {
    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(200);
    expect(res.body.queue.status).toBe("called");
  });

  it("should not update status if transition is not allowed", async () => {
    const res = await request(app)
      .patch(`/api/queue/${queueId}/done`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain("tidak diperbolehkan");
  });

  it("should not update status if already done", async () => {
    await prisma.queue.update({
      where: { id: queueId },
      data: { status: "done" },
    });
    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain(
      "antrian hanya bisa dipanggil jika statusnya masih waiting"
    );
  });

  it("should return 404 if queue not found", async () => {
    const res = await request(app)
      .patch(`/api/queue/999999/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(404);
  });

  it("should return 403 if CS tries to update queue from branch lain", async () => {
    const otherBranch = await prisma.branch.create({
      data: {
        name: "Other Branch " + unique,
        branchCode: "OB" + unique,
        address: "Jl. Lain",
        longitude: 0,
        latitude: 0,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    await prisma.cS.create({
      data: {
        name: "CS Lain " + unique,
        username: "cslain" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: otherBranch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLainLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cslain" + unique,
        password: "dummyhash",
      });
    const csLainToken = "Bearer " + csLainLogin.body.token;

    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csLainToken);
    expect(res.status).toBe(403);
  });
});

describe("callQueue", () => {
  let csToken, csId, queueId;

  beforeAll(async () => {
    const cs = await prisma.cS.create({
      data: {
        name: "CS Call Test " + unique,
        username: "cscalltest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cscalltest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    // Buat queue status waiting
    const queue = await prisma.queue.create({
      data: {
        userId: null,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Call Test Customer",
        email: "calltest" + unique + "@mail.com",
        phoneNumber: "0812345678" + unique,
        ticketNumber: "B-CALL-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    queueId = queue.id;
  });

  it("should call queue successfully (waiting → called)", async () => {
    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(200);
    expect(res.body.queue.status).toBe("called");
    expect(res.body.queue.calledAt).toBeTruthy();
  });

  it("should fail if queue is not in waiting status", async () => {
    await prisma.queue.update({
      where: { id: queueId },
      data: { status: "done" },
    });
    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain(
      "hanya bisa dipanggil jika statusnya masih waiting"
    );
  });

  it("should return 404 if queue not found", async () => {
    const res = await request(app)
      .patch(`/api/queue/999999/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(404);
  });

  it("should return 403 if CS tries to call queue from another branch", async () => {
    const otherBranch = await prisma.branch.create({
      data: {
        name: "Other Branch Call " + unique,
        branchCode: "OBCALL" + unique,
        address: "Jl. Lain",
        longitude: 0,
        latitude: 0,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    await prisma.cS.create({
      data: {
        name: "CS Lain Call " + unique,
        username: "cslaincall" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: otherBranch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLainLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cslaincall" + unique,
        password: "dummyhash",
      });
    const csLainToken = "Bearer " + csLainLogin.body.token;

    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csLainToken);
    expect(res.status).toBe(403);
  });

  it("should return 400 if queue already called by another CS", async () => {
    const otherCS = await prisma.cS.create({
      data: {
        name: "CS Lain Call " + unique,
        username: "cslaincall409" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    await prisma.queue.update({
      where: { id: queueId },
      data: { status: "called", csId: otherCS.id, calledAt: new Date() },
    });
    const res = await request(app)
      .patch(`/api/queue/${queueId}/call`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain(
      "antrian hanya bisa dipanggil jika statusnya masih waiting."
    );
  });

  it("should return 401 if CS token is missing or invalid", async () => {
    const res = await request(app).patch(`/api/queue/${queueId}/call`);
    expect(res.status).toBe(401);
  });
});

describe("takeQueue", () => {
  let csToken, csId, queueId;

  beforeAll(async () => {
    // Buat CS dan login
    const cs = await prisma.cS.create({
      data: {
        name: "CS Take Test " + unique,
        username: "cstaketest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstaketest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    // Buat queue status "called"
    const queue = await prisma.queue.create({
      data: {
        userId: null,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Take Test Customer",
        email: "taketest" + unique + "@mail.com",
        phoneNumber: "0812345678" + unique,
        ticketNumber: "B-TAKE-" + Date.now(),
        status: "called",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    queueId = queue.id;
  });

  it("should take queue successfully (called → in progress)", async () => {
    const res = await request(app)
      .patch(`/api/queue/${queueId}/take`)
      .set("Authorization", csToken);
    expect(res.status).toBe(200);
    expect(res.body.queue.status).toBe("in progress");
  });

  it("should fail if queue is not in called status", async () => {
    await prisma.queue.update({
      where: { id: queueId },
      data: { status: "waiting" },
    });
    const res = await request(app)
      .patch(`/api/queue/${queueId}/take`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain(
      "hanya bisa diambil jika statusnya 'called'"
    );
  });

  it("should return 404 if queue not found", async () => {
    const res = await request(app)
      .patch(`/api/queue/999999/take`)
      .set("Authorization", csToken);
    expect(res.status).toBe(404);
  });

  it("should return 403 if CS tries to take queue from another branch", async () => {
    const otherBranch = await prisma.branch.create({
      data: {
        name: "Other Branch Take " + unique,
        branchCode: "OBTAKE" + unique,
        address: "Jl. Lain",
        longitude: 0,
        latitude: 0,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    await prisma.cS.create({
      data: {
        name: "CS Lain Take " + unique,
        username: "cslainTake" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: otherBranch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const csLainLogin = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cslainTake" + unique,
        password: "dummyhash",
      });
    const csLainToken = "Bearer " + csLainLogin.body.token;

    const res = await request(app)
      .patch(`/api/queue/${queueId}/take`)
      .set("Authorization", csLainToken);
    expect(res.status).toBe(403);
  });

  it("should fail if CS already has in progress queue", async () => {
    // Buat queue lain status in progress untuk CS ini
    await prisma.queue.create({
      data: {
        userId: null,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "In Progress Test",
        email: "inprogresstest" + unique + "@mail.com",
        phoneNumber: "0812345678" + (unique + 1),
        ticketNumber: "B-INPROG-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .patch(`/api/queue/${queueId}/take`)
      .set("Authorization", csToken);
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain(
      "masih memiliki antrian yang sedang berjalan"
    );
  });

  it("should return 401 if CS token is missing or invalid", async () => {
    const res = await request(app).patch(`/api/queue/${queueId}/take`);
    expect(res.status).toBe(401);
  });
});

describe("getQueueCountByBranchIdLoket", () => {
  let loketTokenLocal, loketBranchId;

  beforeAll(async () => {
    const loket = await prisma.loket.create({
      data: {
        name: "Loket Count Test " + unique,
        username: "loketcount" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    loketBranchId = loket.branchId;
    const loketLoginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketcount" + unique,
        password: "dummyhash",
      });
    loketTokenLocal = "Bearer " + loketLoginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queue.deleteMany({ where: { branchId: loketBranchId } });
  });

  it("should return 0 if there is no active queue", async () => {
    const res = await request(app)
      .get("/api/queue/count/loket")
      .set("Authorization", loketTokenLocal);
    expect(res.status).toBe(200);
    expect(res.body.branchId).toBe(loketBranchId);
    expect(res.body.totalQueue).toBe(0);
  });

  it("should count only active queues (not done/skipped/canceled)", async () => {
    await prisma.queue.createMany({
      data: [
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q1",
          status: "waiting",
          ticketNumber: "A1" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q2",
          status: "waiting",
          ticketNumber: "A2" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q3",
          status: "in progress",
          ticketNumber: "A3" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q4",
          status: "done",
          ticketNumber: "A4" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q5",
          status: "skipped",
          ticketNumber: "A5" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
        {
          branchId: loketBranchId,
          bookingDate: new Date(),
          name: "Q6",
          status: "canceled",
          ticketNumber: "A6" + unique,
          createdBy: "admin",
          updatedBy: "admin",
        },
      ],
    });

    const res = await request(app)
      .get("/api/queue/count/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(200);
    expect(res.body.branchId).toBe(loketBranchId);
    expect(res.body.totalQueue).toBe(3);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/count/loket");
    expect(res.status).toBe(401);
  });
});

describe("getQueueCountAdmin", () => {
  let adminToken;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        fullname: "Admin Test " + unique,
        username: "admintest" + unique,
        email: `admintest${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 2),
        role: "admin",
        isVerified: true,
      },
    });
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "admintest" + unique,
        password: "dummyhash",
      });
    adminToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queueService.deleteMany({});
    await prisma.queue.deleteMany({});
  });

  it("should return queue count grouped by day (default)", async () => {
    const now = new Date();
    const user = await prisma.user.findFirst({ where: { role: "nasabah" } });
    await prisma.queue.createMany({
      data: [
        {
          userId: user.id,
          branchId: branch.id,
          bookingDate: now,
          name: "Q1",
          email: "q1@mail.com",
          phoneNumber: "0811111111",
          ticketNumber: "T1" + unique,
          status: "waiting",
          createdBy: "admin",
          updatedBy: "admin",
          createdAt: now,
        },
        {
          userId: user.id,
          branchId: branch.id,
          bookingDate: now,
          name: "Q2",
          email: "q2@mail.com",
          phoneNumber: "0811111112",
          ticketNumber: "T2" + unique,
          status: "waiting",
          createdBy: "admin",
          updatedBy: "admin",
          createdAt: now,
        },
        {
          userId: null,
          branchId: branch.id,
          bookingDate: now,
          name: "Q3",
          email: "q3@mail.com",
          phoneNumber: "0811111113",
          ticketNumber: "T3" + unique,
          status: "waiting",
          createdBy: "admin",
          updatedBy: "admin",
          createdAt: now,
        },
      ],
    });

    const res = await request(app)
      .get("/api/queue/count/admin")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("groups");
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body).toHaveProperty("totalQueue");
    expect(res.body).toHaveProperty("statusCounts");
    expect(res.body).toHaveProperty("csCounts");
    expect(res.body).toHaveProperty("top5Antrian");
    expect(res.body).toHaveProperty("top5Layanan");
    const today = new Date().toISOString().slice(0, 10);
    const todayGroup = res.body.groups.find((g) => g.label === today);
    expect(todayGroup).toBeDefined();
    expect(todayGroup.totalQueueInRange).toBeGreaterThanOrEqual(3);
    expect(todayGroup.totalQueueOnline).toBeGreaterThanOrEqual(2);
    expect(todayGroup.totalQueueOffline).toBeGreaterThanOrEqual(1);
  });

  it("should return queue count grouped by week", async () => {
    const res = await request(app)
      .get("/api/queue/count/admin?range=week")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.range).toBe("week");
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("totalQueue");
    expect(res.body).toHaveProperty("statusCounts");
    expect(res.body).toHaveProperty("csCounts");
    expect(res.body).toHaveProperty("top5Antrian");
    expect(res.body).toHaveProperty("top5Layanan");
  });

  it("should return queue count grouped by month", async () => {
    const res = await request(app)
      .get("/api/queue/count/admin?range=month")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.range).toBe("month");
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBe(12);
    expect(res.body).toHaveProperty("totalQueue");
    expect(res.body).toHaveProperty("statusCounts");
    expect(res.body).toHaveProperty("csCounts");
    expect(res.body).toHaveProperty("top5Antrian");
    expect(res.body).toHaveProperty("top5Layanan");
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/count/admin");
    expect(res.status).toBe(401);
  });
});

describe("getLatestInProgressQueueCS", () => {
  let csToken, csId, branchId, serviceId, queueId;

  beforeAll(async () => {
    branchId = branch.id;
    serviceId = service.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS InProgress Test " + unique,
        username: "csinprogtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csinprogtest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return the latest in progress queue for CS branch", async () => {
    const now = new Date();
    const queue = await prisma.queue.create({
      data: {
        branchId,
        bookingDate: now,
        name: "In Progress Customer",
        email: "inprog@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "INPROG-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: now,
        notification: true,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: true },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/inprogress/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", queueId);
    expect(res.body.status).toBe("in progress");
    expect(res.body.branchId).toBe(branchId);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services.length).toBeGreaterThan(0);
    expect(res.body.services[0]).toHaveProperty("service");
  });

  it("should return 404 if there is no in progress queue", async () => {
    const res = await request(app)
      .get("/api/queue/inprogress/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tidak ada antrian yang sedang dilayani/i);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/inprogress/cs");
    expect(res.status).toBe(401);
  });
});

describe("getLatestInProgressQueueLoket", () => {
  let loketTokenLocal, loketId, loketBranchId, serviceId, queueId;

  beforeAll(async () => {
    loketBranchId = branch.id;
    serviceId = service.id;

    const loket = await prisma.loket.create({
      data: {
        name: "Loket InProgress Test " + unique,
        username: "loketinprogtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: loketBranchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    loketId = loket.id;
    const loketLoginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketinprogtest" + unique,
        password: "dummyhash",
      });
    loketTokenLocal = "Bearer " + loketLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId: loketBranchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId: loketBranchId } });
  });

  it("should return the latest in progress queue for Loket branch", async () => {
    const now = new Date();
    const queue = await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "In Progress Customer Loket",
        email: "inprogloket@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "INPROG-LOKET-" + Date.now(),
        status: "in progress",
        loketId: loketId,
        calledAt: now,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: true },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/inprogress/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", queueId);
    expect(res.body.status).toBe("in progress");
    expect(res.body.branchId).toBe(loketBranchId);
  });

  it("should return 404 if there is no in progress queue", async () => {
    const res = await request(app)
      .get("/api/queue/inprogress/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/tidak ada antrian yang sedang dilayani/i);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/inprogress/loket");
    expect(res.status).toBe(401);
  });
});

describe("getWaitingQueuesByBranchIdLoket", () => {
  let loketTokenLocal, loketId, loketBranchId, serviceId;

  beforeAll(async () => {
    loketBranchId = branch.id;
    serviceId = service.id;

    // Buat loket khusus test ini dan login
    const loket = await prisma.loket.create({
      data: {
        name: "Loket Waiting Test " + unique,
        username: "loketwaitingtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: loketBranchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    loketId = loket.id;
    const loketLoginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketwaitingtest" + unique,
        password: "dummyhash",
      });
    loketTokenLocal = "Bearer " + loketLoginRes.body.token;
  });

  beforeEach(async () => {
    // Bersihkan queue di branch
    const queues = await prisma.queue.findMany({
      where: { branchId: loketBranchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId: loketBranchId } });
  });

  it("should return all waiting queues for Loket's branch", async () => {
    const now = new Date();
    const queue1 = await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "Waiting Customer 1",
        email: "waiting1@mail.com",
        phoneNumber: "08123456781",
        ticketNumber: "WAIT-1-" + Date.now(),
        status: "waiting",
        loketId: loketId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    const queue2 = await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "Waiting Customer 2",
        email: "waiting2@mail.com",
        phoneNumber: "08123456782",
        ticketNumber: "WAIT-2-" + Date.now(),
        status: "waiting",
        loketId: loketId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "In Progress Customer",
        email: "inprog@mail.com",
        phoneNumber: "08123456783",
        ticketNumber: "INPROG-" + Date.now(),
        status: "in progress",
        loketId: loketId,
        calledAt: now,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });

    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("status", "waiting");
    expect(res.body[0]).toHaveProperty("services");
    expect(Array.isArray(res.body[0].services)).toBe(true);
    expect(res.body[0].services[0]).toHaveProperty("serviceName");
  });

  it("should return empty array if there is no waiting queue", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/waiting/loket");
    expect(res.status).toBe(401);
  });
});

describe("getWaitingQueuesByBranchIdCS", () => {
  let csToken, csId, csBranchId, serviceId;

  beforeAll(async () => {
    csBranchId = branch.id;
    serviceId = service.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS Waiting Test " + unique,
        username: "cswaitingtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: csBranchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cswaitingtest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId: csBranchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId: csBranchId } });
  });

  it("should return all waiting queues for CS's branch", async () => {
    const now = new Date();
    const queue1 = await prisma.queue.create({
      data: {
        branchId: csBranchId,
        bookingDate: now,
        name: "Waiting Customer 1",
        email: "waiting1@mail.com",
        phoneNumber: "08123456781",
        ticketNumber: "WAIT-1-" + Date.now(),
        status: "waiting",
        csId: csId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    const queue2 = await prisma.queue.create({
      data: {
        branchId: csBranchId,
        bookingDate: now,
        name: "Waiting Customer 2",
        email: "waiting2@mail.com",
        phoneNumber: "08123456782",
        ticketNumber: "WAIT-2-" + Date.now(),
        status: "waiting",
        csId: csId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    await prisma.queue.create({
      data: {
        branchId: csBranchId,
        bookingDate: now,
        name: "In Progress Customer",
        email: "inprog@mail.com",
        phoneNumber: "08123456783",
        ticketNumber: "INPROG-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: now,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });

    const res = await request(app)
      .get("/api/queue/waiting/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("status", "waiting");
    expect(res.body[0]).toHaveProperty("services");
    expect(Array.isArray(res.body[0].services)).toBe(true);
    expect(res.body[0].services[0]).toHaveProperty("serviceName");
  });

  it("should return empty array if there is no waiting queue", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/waiting/cs");
    expect(res.status).toBe(401);
  });
});

describe("getOldestWaitingQueueLoket", () => {
  let loketTokenLocal, loketId, loketBranchId, serviceId;

  beforeAll(async () => {
    loketBranchId = branch.id;
    serviceId = service.id;

    const loket = await prisma.loket.create({
      data: {
        name: "Loket Oldest Waiting Test " + unique,
        username: "loketoldestwaiting" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: loketBranchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    loketId = loket.id;
    const loketLoginRes = await request(app)
      .post("/api/loket/login")
      .send({
        username: "loketoldestwaiting" + unique,
        password: "dummyhash",
      });
    loketTokenLocal = "Bearer " + loketLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId: loketBranchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId: loketBranchId } });
  });

  it("should return the oldest waiting queue for Loket's branch", async () => {
    const now = new Date();
    const queue1 = await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: new Date(now.getTime() - 10000),
        name: "Oldest Waiting Customer",
        email: "oldestwaiting@mail.com",
        phoneNumber: "08123456781",
        ticketNumber: "WAIT-OLDEST-" + Date.now(),
        status: "waiting",
        loketId: loketId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "Waiting Customer 2",
        email: "waiting2@mail.com",
        phoneNumber: "08123456782",
        ticketNumber: "WAIT-2-" + Date.now(),
        status: "waiting",
        loketId: loketId,
        calledAt: null,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });
    await prisma.queue.create({
      data: {
        branchId: loketBranchId,
        bookingDate: now,
        name: "In Progress Customer",
        email: "inprog@mail.com",
        phoneNumber: "08123456783",
        ticketNumber: "INPROG-" + Date.now(),
        status: "in progress",
        loketId: loketId,
        calledAt: now,
        notification: false,
        estimatedTime: now,
        createdBy: "admin",
        updatedBy: "admin",
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "admin",
              updatedBy: "admin",
            },
          ],
        },
      },
    });

    const res = await request(app)
      .get("/api/queue/oldest-waiting/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", queue1.id);
    expect(res.body.status).toBe("waiting");
    expect(res.body).toHaveProperty("services");
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services[0]).toHaveProperty("service");
    expect(res.body.services[0].service).toHaveProperty("serviceName");
  });

  it("should return 404 if there is no waiting queue", async () => {
    const res = await request(app)
      .get("/api/queue/oldest-waiting/loket")
      .set("Authorization", loketTokenLocal);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toMatch(/tidak ada antrian/i);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/oldest-waiting/loket");
    expect(res.status).toBe(401);
  });
});

describe("getOldestWaitingQueueUser", () => {
  let userToken, userId, userBranchId, serviceId;

  beforeAll(async () => {
    userBranchId = branch.id;
    serviceId = service.id;

    const hashed = bcrypt.hashSync("dummyhash", 10);
    const user = await prisma.user.create({
      data: {
        fullname: "User Oldest Waiting " + unique,
        username: "useroldestwaiting" + unique,
        email: `useroldestwaiting${unique}@mail.com`,
        passwordHash: hashed,
        phoneNumber: "0812345678" + (unique + 3),
        role: "nasabah",
        isVerified: true,
      },
    });
    userId = user.id;
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "useroldestwaiting" + unique,
        password: "dummyhash",
      });
    userToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queueLog.deleteMany({
      where: { queue: { userId } },
    });
    await prisma.queueService.deleteMany({
      where: { queue: { userId } },
    });
    await prisma.queue.deleteMany({
      where: { userId },
    });
  });

  it("should return the oldest waiting queue in user's branch", async () => {
    const now = new Date();
    const queue1 = await prisma.queue.create({
      data: {
        userId,
        branchId: userBranchId,
        bookingDate: new Date(now.getTime() - 10000),
        name: "Oldest Waiting User",
        email: "oldestwaitinguser@mail.com",
        phoneNumber: "08123456781",
        ticketNumber: "WAIT-OLDEST-USER-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: now,
        createdBy: "useroldestwaiting" + unique,
        updatedBy: "useroldestwaiting" + unique,
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "useroldestwaiting" + unique,
              updatedBy: "useroldestwaiting" + unique,
            },
          ],
        },
      },
      include: { services: { include: { service: true } } },
    });
    await prisma.queue.create({
      data: {
        userId,
        branchId: userBranchId,
        bookingDate: now,
        name: "Waiting User 2",
        email: "waitinguser2@mail.com",
        phoneNumber: "08123456782",
        ticketNumber: "WAIT-2-USER-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: now,
        createdBy: "useroldestwaiting" + unique,
        updatedBy: "useroldestwaiting" + unique,
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "useroldestwaiting" + unique,
              updatedBy: "useroldestwaiting" + unique,
            },
          ],
        },
      },
    });
    await prisma.queue.create({
      data: {
        userId,
        branchId: userBranchId,
        bookingDate: now,
        name: "In Progress User",
        email: "inproguser@mail.com",
        phoneNumber: "08123456783",
        ticketNumber: "INPROG-USER-" + Date.now(),
        status: "in progress",
        notification: false,
        estimatedTime: now,
        createdBy: "useroldestwaiting" + unique,
        updatedBy: "useroldestwaiting" + unique,
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "useroldestwaiting" + unique,
              updatedBy: "useroldestwaiting" + unique,
            },
          ],
        },
      },
    });

    const res = await request(app)
      .get("/api/queue/oldest-waiting/user")
      .set("Authorization", userToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", queue1.id);
    expect(res.body.status).toBe("waiting");
    expect(res.body).toHaveProperty("services");
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services[0]).toHaveProperty("service");
    expect(res.body.services[0].service).toHaveProperty("serviceName");
  });

  it("should return 404 if user has no queue in branch", async () => {
    await prisma.queue.deleteMany({ where: { userId } });

    const res = await request(app)
      .get("/api/queue/oldest-waiting/user")
      .set("Authorization", userToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toMatch(/tidak ada antrian/i);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/oldest-waiting/user");
    expect(res.status).toBe(401);
  });
});

describe("getAllQueues", () => {
  let adminToken;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        fullname: "Admin Queue Test " + unique,
        username: "adminqueuetest" + unique,
        email: `adminqueuetest${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 4),
        role: "admin",
        isVerified: true,
      },
    });
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "adminqueuetest" + unique,
        password: "dummyhash",
      });
    adminToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId: branch.id },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId: branch.id } });
  });

  it("should return paginated queues with default size", async () => {
    for (let i = 0; i < 12; i++) {
      await prisma.queue.create({
        data: {
          branchId: branch.id,
          bookingDate: new Date(),
          name: "Customer " + i,
          email: `customer${i}@mail.com`,
          phoneNumber: "0812345678" + i,
          ticketNumber: "T-" + i + "-" + Date.now(),
          status: "waiting",
          notification: false,
          estimatedTime: new Date(),
          createdBy: "admin",
          updatedBy: "admin",
          userId: null,
          services: {
            create: [
              {
                serviceId: service.id,
                createdBy: "admin",
                updatedBy: "admin",
              },
            ],
          },
        },
      });
    }

    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("page", 1);
    expect(res.body.pagination).toHaveProperty("size", 10);
    expect(res.body.pagination).toHaveProperty("total", 12);
    expect(res.body.pagination).toHaveProperty("totalPages", 2);
    if (res.body.data[0].email) {
      expect(res.body.data[0].email).toMatch(/\*/);
    }
    if (res.body.data[0].phoneNumber) {
      expect(res.body.data[0].phoneNumber).toMatch(/\*/);
    }
    expect(Array.isArray(res.body.data[0].services)).toBe(true);
    expect(res.body.data[0].services[0]).toHaveProperty("serviceName");
  });

  it("should return paginated queues with custom size and page", async () => {
    for (let i = 0; i < 15; i++) {
      await prisma.queue.create({
        data: {
          branchId: branch.id,
          bookingDate: new Date(),
          name: "Customer " + i,
          email: `customer${i}@mail.com`,
          phoneNumber: "0812345678" + i,
          ticketNumber: "T-" + i + "-" + Date.now(),
          status: "waiting",
          notification: false,
          estimatedTime: new Date(),
          createdBy: "admin",
          updatedBy: "admin",
          userId: null,
          services: {
            create: [
              {
                serviceId: service.id,
                createdBy: "admin",
                updatedBy: "admin",
              },
            ],
          },
        },
      });
    }

    const res = await request(app)
      .get("/api/queue?page=2&size=5")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toHaveProperty("page", 2);
    expect(res.body.pagination).toHaveProperty("size", 5);
    expect(res.body.pagination).toHaveProperty("total", 15);
    expect(res.body.pagination).toHaveProperty("totalPages", 3);
    expect(res.body.data.length).toBe(5);
  });

  it("should fallback to default size if size is invalid", async () => {
    const res = await request(app)
      .get("/api/queue?size=999")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.pagination.size).toBe(10);
  });

  it("should fallback to page 1 if page is invalid", async () => {
    const res = await request(app)
      .get("/api/queue?page=-1")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it("should return empty data if no queue", async () => {
    await prisma.queue.deleteMany({ where: { branchId: branch.id } });
    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not admin", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});

describe("getTicketById", () => {
  let nasabahToken, userId, queueId, otherQueueId;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { username: "nasabahtest" + unique },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    nasabahToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queueLog.deleteMany({ where: { queue: { userId } } });
    await prisma.queueService.deleteMany({ where: { queue: { userId } } });
    await prisma.queue.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { username: "otheruser" + unique } });

    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Ticket Test Nasabah",
        email: "ticketnasabah@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "TICKET-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "nasabahtest" + unique,
        updatedBy: "nasabahtest" + unique,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: "nasabahtest" + unique,
              updatedBy: "nasabahtest" + unique,
            },
          ],
        },
      },
      include: { services: true },
    });
    queueId = queue.id;

    const otherUser = await prisma.user.create({
      data: {
        fullname: "Other User " + unique,
        username: "otheruser" + unique,
        email: `otheruser${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 5),
        role: "nasabah",
        isVerified: true,
      },
    });
    const otherQueue = await prisma.queue.create({
      data: {
        userId: otherUser.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Other User Queue",
        email: "otheruser@mail.com",
        phoneNumber: "08123456780",
        ticketNumber: "TICKET-OTHER-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "otheruser" + unique,
        updatedBy: "otheruser" + unique,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: "otheruser" + unique,
              updatedBy: "otheruser" + unique,
            },
          ],
        },
      },
      include: { services: true },
    });
    otherQueueId = otherQueue.id;
  });

  it("should return ticket detail for the owner nasabah", async () => {
    const res = await request(app)
      .get(`/api/queue/ticket/${queueId}`)
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("branch");
    expect(res.body).toHaveProperty("bookingDate");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("phoneNumber");
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services[0]).toHaveProperty("serviceName");
    expect(res.body).toHaveProperty("estimatedTime");
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).not.toBeNull();
  });

  it("should return 404 if ticket not found", async () => {
    const res = await request(app)
      .get(`/api/queue/ticket/99999999`)
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("antrian tidak ditemukan");
  });

  it("should return 403 if nasabah tries to access another user's ticket", async () => {
    const res = await request(app)
      .get(`/api/queue/ticket/${otherQueueId}`)
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("tidak berhak");
  });

  it("should return 400 if id is not valid", async () => {
    const res = await request(app)
      .get(`/api/queue/ticket/abc`)
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get(`/api/queue/ticket/${queueId}`);
    expect(res.status).toBe(401);
  });
});

describe("getLoketTicketById", () => {
  let loketToken, loketId, queueId, otherQueueId;

  beforeAll(async () => {
    const loket = await prisma.loket.findFirst({
      where: { username: loketUsername },
    });
    loketId = loket.id;

    const loginRes = await request(app).post("/api/loket/login").send({
      username: loketUsername,
      password: "dummyhash",
    });
    loketToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queueLog.deleteMany({ where: { queue: { loketId } } });
    await prisma.queueService.deleteMany({ where: { queue: { loketId } } });
    await prisma.queue.deleteMany({ where: { loketId } });
    await prisma.loket.deleteMany({
      where: { username: "otherloket" + unique },
    });

    const queue = await prisma.queue.create({
      data: {
        loketId,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Loket Ticket Test",
        email: "loketticket@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "LOKET-TICKET-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: loketUsername,
        updatedBy: loketUsername,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: loketUsername,
              updatedBy: loketUsername,
            },
          ],
        },
      },
      include: { services: true },
    });
    queueId = queue.id;

    const otherLoket = await prisma.loket.create({
      data: {
        name: "Other Loket " + unique,
        username: "otherloket" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branch.id,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const otherQueue = await prisma.queue.create({
      data: {
        loketId: otherLoket.id,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "Other Loket Queue",
        email: "otherloket@mail.com",
        phoneNumber: "08123456780",
        ticketNumber: "LOKET-TICKET-OTHER-" + Date.now(),
        status: "waiting",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "otherloket" + unique,
        updatedBy: "otherloket" + unique,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: "otherloket" + unique,
              updatedBy: "otherloket" + unique,
            },
          ],
        },
      },
      include: { services: true },
    });
    otherQueueId = otherQueue.id;
  });

  it("should return ticket detail for the owner loket", async () => {
    const res = await request(app)
      .get(`/api/queue/loket-ticket/${queueId}`)
      .set("Authorization", loketToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("branch");
    expect(res.body).toHaveProperty("bookingDate");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("phoneNumber");
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services[0]).toHaveProperty("serviceName");
    expect(res.body).toHaveProperty("estimatedTime");
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("loket");
    expect(res.body.loket).not.toBeNull();
  });

  it("should return 404 if ticket not found", async () => {
    const res = await request(app)
      .get(`/api/queue/loket-ticket/99999999`)
      .set("Authorization", loketToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("antrian tidak ditemukan");
  });

  it("should return 403 if loket tries to access another loket's ticket", async () => {
    const res = await request(app)
      .get(`/api/queue/loket-ticket/${otherQueueId}`)
      .set("Authorization", loketToken);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("tidak berhak");
  });

  it("should return 400 if id is not valid", async () => {
    const res = await request(app)
      .get(`/api/queue/loket-ticket/abc`)
      .set("Authorization", loketToken);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get(`/api/queue/loket-ticket/${queueId}`);
    expect(res.status).toBe(401);
  });
});

describe("getUserQueueHistory", () => {
  let nasabahToken, userId;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { username: "nasabahtest" + unique },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    nasabahToken = "Bearer " + loginRes.body.token;
  });

  beforeEach(async () => {
    await prisma.queueLog.deleteMany({ where: { queue: { userId } } });
    await prisma.queueService.deleteMany({ where: { queue: { userId } } });
    await prisma.queue.deleteMany({ where: { userId } });
  });

  it("should return all queue history for the nasabah", async () => {
    const queue1 = await prisma.queue.create({
      data: {
        userId,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "History Test 1",
        email: "history1@mail.com",
        phoneNumber: "08123456781",
        ticketNumber: "HIST-1-" + Date.now(),
        status: "done",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "nasabahtest" + unique,
        updatedBy: "nasabahtest" + unique,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: "nasabahtest" + unique,
              updatedBy: "nasabahtest" + unique,
            },
          ],
        },
      },
      include: {
        services: { include: { service: true } },
        branch: true,
        queueLogs: true,
      },
    });
    const queue2 = await prisma.queue.create({
      data: {
        userId,
        branchId: branch.id,
        bookingDate: new Date(),
        name: "History Test 2",
        email: "history2@mail.com",
        phoneNumber: "08123456782",
        ticketNumber: "HIST-2-" + Date.now(),
        status: "canceled",
        notification: false,
        estimatedTime: new Date(),
        createdBy: "nasabahtest" + unique,
        updatedBy: "nasabahtest" + unique,
        services: {
          create: [
            {
              serviceId: service.id,
              createdBy: "nasabahtest" + unique,
              updatedBy: "nasabahtest" + unique,
            },
          ],
        },
      },
      include: {
        services: { include: { service: true } },
        branch: true,
        queueLogs: true,
      },
    });

    const res = await request(app)
      .get("/api/queue/history")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const found1 = res.body.data.find((q) => q.id === queue1.id);
    const found2 = res.body.data.find((q) => q.id === queue2.id);
    expect(found1).toBeDefined();
    expect(found2).toBeDefined();
    expect(found1).toHaveProperty("services");
    expect(Array.isArray(found1.services)).toBe(true);
    expect(found1.services[0]).toHaveProperty("serviceName");
    expect(found1).toHaveProperty("branch");
    expect(found1).toHaveProperty("queueLogs");
  });

  it("should return empty array if user has no queue history", async () => {
    await prisma.queue.deleteMany({ where: { userId } });

    const res = await request(app)
      .get("/api/queue/history")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/history");
    expect(res.status).toBe(401);
  });
});

describe("getActiveCSCustomer", () => {
  let csToken, csId, branchId, userId, queueId;

  beforeAll(async () => {
    branchId = branch.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS Active Test " + unique,
        username: "csactivetest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csactivetest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;

    const user = await prisma.user.create({
      data: {
        fullname: "Active Nasabah " + unique,
        username: "activenasabah" + unique,
        email: `activenasabah${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 10),
        role: "nasabah",
        isVerified: true,
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return all active (in progress) CS customers in branch", async () => {
    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId,
        bookingDate: new Date(),
        name: "Active Nasabah",
        email: "activenasabah@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "INPROG-CS-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "csactivetest" + unique,
        updatedBy: "csactivetest" + unique,
      },
      include: {
        cs: true,
        user: true,
      },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const found = res.body.find((q) => q.queueId === queueId);
    expect(found).toBeDefined();
    expect(found).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(found).toHaveProperty("cs");
    expect(found.cs).toHaveProperty("id", csId);
    expect(found).toHaveProperty("nasabah");
    expect(found.nasabah).toHaveProperty(
      "fullname",
      "Active Nasabah " + unique
    );
    expect(found).toHaveProperty("status", "in progress");
    expect(found).toHaveProperty("calledAt");
  });

  it("should return empty array if there is no active CS customer", async () => {
    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/active-cs-customer");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not CS", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/active-cs-customer")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});

describe("getActiveCustomerByCS", () => {
  let csToken, csId, branchId, userId, queueId;

  beforeAll(async () => {
    branchId = branch.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS ActiveByCS Test " + unique,
        username: "csactivebycs" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "csactivebycs" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;

    const user = await prisma.user.create({
      data: {
        fullname: "ActiveByCS Nasabah " + unique,
        username: "activebycsnasabah" + unique,
        email: `activebycsnasabah${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 20),
        role: "nasabah",
        isVerified: true,
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return the active (in progress) customer for this CS", async () => {
    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId,
        bookingDate: new Date(),
        name: "ActiveByCS Nasabah",
        email: "activebycs@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "INPROG-CSBYCS-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "csactivebycs" + unique,
        updatedBy: "csactivebycs" + unique,
      },
      include: {
        cs: true,
        user: true,
      },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("queueId", queueId);
    expect(res.body).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(res.body).toHaveProperty("cs");
    expect(res.body.cs).toHaveProperty("id", csId);
    expect(res.body).toHaveProperty("nasabah");
    expect(res.body.nasabah).toHaveProperty(
      "fullname",
      "ActiveByCS Nasabah " + unique
    );
    expect(res.body).toHaveProperty("status", "in progress");
    expect(res.body).toHaveProperty("calledAt");
  });

  it("should return 404 if CS has no active customer", async () => {
    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", csToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("tidak sedang melayani");
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/active-customer/cs");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not CS", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/active-customer/cs")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});

describe("getQueueDetailByCSId", () => {
  let csToken, csId, branchId, queueId, serviceId;

  beforeAll(async () => {
    branchId = branch.id;
    serviceId = service.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS Handling Test " + unique,
        username: "cshandlingtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cshandlingtest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return queue detail if CS is handling a queue (in progress)", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId,
        bookingDate: new Date(),
        name: "Handling Customer",
        email: "handling@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "HANDLE-" + Date.now(),
        status: "in progress",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "cshandlingtest" + unique,
        updatedBy: "cshandlingtest" + unique,
        services: {
          create: [
            {
              serviceId: serviceId,
              createdBy: "cshandlingtest" + unique,
              updatedBy: "cshandlingtest" + unique,
            },
          ],
        },
      },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", queueId);
    expect(res.body).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(res.body).toHaveProperty("status", "in progress");
    expect(res.body).toHaveProperty("calledAt");
    expect(res.body).toHaveProperty("name", "Handling Customer");
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services[0]).toBe(service.serviceName);
  });

  it("should return all fields as null if CS is not handling any queue", async () => {
    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: null,
      ticketNumber: null,
      status: null,
      calledAt: null,
      name: null,
      services: null,
    });
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/cs/handling");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not CS", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/cs/handling")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});

describe("getCalledCustomerByCS", () => {
  let csToken, csId, branchId, userId, queueId;

  beforeAll(async () => {
    branchId = branch.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS CalledCustomer Test " + unique,
        username: "cscalledtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cscalledtest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;

    const user = await prisma.user.create({
      data: {
        fullname: "Called Nasabah " + unique,
        username: "callednasabah" + unique,
        email: `callednasabah${unique}@mail.com`,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        phoneNumber: "0812345678" + (unique + 30),
        role: "nasabah",
        isVerified: true,
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return called customer detail if CS has a called queue", async () => {
    const queue = await prisma.queue.create({
      data: {
        userId,
        branchId,
        bookingDate: new Date(),
        name: "Called Nasabah",
        email: "called@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "CALLED-" + Date.now(),
        status: "called",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "cscalledtest" + unique,
        updatedBy: "cscalledtest" + unique,
      },
      include: {
        user: true,
      },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isCalling", true);
    expect(res.body).toHaveProperty("queueId", queueId);
    expect(res.body).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(res.body).toHaveProperty("calledAt");
    expect(res.body).toHaveProperty("nasabah");
    expect(res.body.nasabah).toHaveProperty(
      "fullname",
      "Called Nasabah " + unique
    );
    expect(res.body.nasabah).toHaveProperty(
      "email",
      "callednasabah" + unique + "@mail.com"
    );
    expect(res.body).toHaveProperty("status", "called");
  });

  it("should return isCalling false and null fields if CS has no called queue", async () => {
    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      isCalling: false,
      queueId: null,
      ticketNumber: null,
      calledAt: null,
      nasabah: null,
      status: null,
    });
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/cs/called-customer");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not CS", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/cs/called-customer")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});

describe("getCalledCustomerTV", () => {
  let csToken, csId, branchId, queueId;

  beforeAll(async () => {
    branchId = branch.id;

    const cs = await prisma.cS.create({
      data: {
        name: "CS TV Test " + unique,
        username: "cstvtest" + unique,
        passwordHash: bcrypt.hashSync("dummyhash", 10),
        branchId: branchId,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    csId = cs.id;
    const csLoginRes = await request(app)
      .post("/api/cs/login")
      .send({
        username: "cstvtest" + unique,
        password: "dummyhash",
      });
    csToken = "Bearer " + csLoginRes.body.token;
  });

  beforeEach(async () => {
    const queues = await prisma.queue.findMany({
      where: { branchId },
      select: { id: true },
    });
    const queueIds = queues.map((q) => q.id);
    await prisma.queueLog.deleteMany({ where: { queueId: { in: queueIds } } });
    await prisma.queueService.deleteMany({
      where: { queueId: { in: queueIds } },
    });
    await prisma.queue.deleteMany({ where: { branchId } });
  });

  it("should return the latest called queue for CS branch with csName", async () => {
    const queue = await prisma.queue.create({
      data: {
        branchId,
        bookingDate: new Date(),
        name: "TV Called Customer",
        email: "tvcalled@mail.com",
        phoneNumber: "08123456789",
        ticketNumber: "TV-CALLED-" + Date.now(),
        status: "called",
        csId: csId,
        calledAt: new Date(),
        notification: false,
        estimatedTime: new Date(),
        createdBy: "cstvtest" + unique,
        updatedBy: "cstvtest" + unique,
      },
    });
    queueId = queue.id;

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("csId", csId);
    expect(res.body).toHaveProperty("csName", "CS TV Test " + unique);
    expect(res.body).toHaveProperty("ticketNumber", queue.ticketNumber);
    expect(res.body).toHaveProperty("status", "called");
    expect(res.body).toHaveProperty("calledAt");
  });

  it("should return 404 if there is no called queue in branch", async () => {
    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain(
      "tidak ada antrian dengan status 'called'"
    );
  });

  it("should return 404 if CS not found", async () => {
    await prisma.cS.delete({ where: { id: csId } });

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", csToken);

    expect([401, 404]).toContain(res.status);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("cs tidak ditemukan");
  });

  it("should return 401 if not authenticated", async () => {
    const res = await request(app).get("/api/queue/called-customer-tv");
    expect(res.status).toBe(401);
  });

  it("should return 403 if not CS", async () => {
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        username: "nasabahtest" + unique,
        password: "dummyhash",
      });
    const nasabahToken = "Bearer " + loginRes.body.token;

    const res = await request(app)
      .get("/api/queue/called-customer-tv")
      .set("Authorization", nasabahToken);

    expect(res.status).toBe(403);
  });
});
