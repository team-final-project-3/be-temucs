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
    await prisma.service.deleteMany({ where: { id: service.id } });
    await prisma.loket.deleteMany({
      where: { username: "lokettest" + unique },
    });
    await prisma.cS.deleteMany({ where: { username: "cstest" + unique } });
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

  it("Get all waiting queues for Loket's branch", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/loket")
      .set("Authorization", loketToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("Get all waiting queues for CS's branch", async () => {
    const res = await request(app)
      .get("/api/queue/waiting/cs")
      .set("Authorization", csToken)
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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
});
