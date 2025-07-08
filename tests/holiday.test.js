const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");

const {
  holidayBlock,
  updateHolidayCache,
} = require("../src/middlewares/holidayCron");

const unique = Date.now() + Math.floor(Math.random() * 10000);
const adminUsername = "holidayadminjest" + unique;
const plainPassword = "Password123!";
let adminToken;

describe("Holiday Controller (Integration)", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { username: adminUsername } });

    const hashed = require("bcryptjs").hashSync(plainPassword, 10);
    await prisma.user.create({
      data: {
        fullname: "Admin Holiday Jest",
        username: adminUsername,
        email: adminUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081234" + unique,
        role: "admin",
        isVerified: true,
      },
    });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ username: adminUsername, password: plainPassword });
    adminToken = "Bearer " + loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.holiday.deleteMany({
      where: { holidayName: { contains: "Jest" } },
    });
    await prisma.user.deleteMany({ where: { username: adminUsername } });
    await prisma.$disconnect();
  });

  it("should add a new holiday", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/holiday")
      .set("Authorization", adminToken)
      .send({
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
      });
    expect(res.status).toBe(201);
    expect(res.body.holiday).toHaveProperty("id");

    await prisma.holiday.deleteMany({ where: { id: res.body.holiday.id } });
  });

  it("should get all holidays", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const holiday = await prisma.holiday.create({
      data: {
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get("/api/holiday")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.holidays)).toBe(true);
    expect(res.body.holidays.some((h) => h.id === holiday.id)).toBe(true);

    await prisma.holiday.deleteMany({ where: { id: holiday.id } });
  });

  it("should get holiday by id", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const holiday = await prisma.holiday.create({
      data: {
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get(`/api/holiday/${holiday.id}`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.holiday).toHaveProperty("id");
    expect(res.body.holiday.id).toBe(holiday.id);

    await prisma.holiday.deleteMany({ where: { id: holiday.id } });
  });

  it("should edit holiday", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const holiday = await prisma.holiday.create({
      data: {
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/holiday/${holiday.id}`)
      .set("Authorization", adminToken)
      .send({
        holidayName: "Holiday Jest Edited " + unique,
        date: "2099-12-30",
      });
    expect(res.status).toBe(200);
    expect(res.body.holiday.holidayName).toBe("Holiday Jest Edited " + unique);

    await prisma.holiday.deleteMany({ where: { id: holiday.id } });
  });

  it("should update holiday status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const holiday = await prisma.holiday.create({
      data: {
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
        createdBy: "admin",
        updatedBy: "admin",
        status: true,
      },
    });
    const res = await request(app)
      .put(`/api/holiday/${holiday.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.holiday).toHaveProperty("status");

    await prisma.holiday.deleteMany({ where: { id: holiday.id } });
  });

  it("should return 404 if holiday not found", async () => {
    const res = await request(app)
      .get("/api/holiday/99999999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should return 400 if holidayName or date is missing when adding", async () => {
    const res = await request(app)
      .post("/api/holiday")
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/wajib diisi/i);
  });

  it("should return 400 if id is not a number when getting holiday", async () => {
    const res = await request(app)
      .get("/api/holiday/abc")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tidak valid/i);
  });

  it("should return 400 if id is not a number when editing holiday", async () => {
    const res = await request(app)
      .put("/api/holiday/abc")
      .set("Authorization", adminToken)
      .send({ holidayName: "Test", date: "2099-12-31" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tidak valid/i);
  });

  it("should return 400 if both holidayName and date are missing when editing holiday", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const holiday = await prisma.holiday.create({
      data: {
        holidayName: "Holiday Jest " + unique,
        date: new Date("2099-12-31"),
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/holiday/${holiday.id}`)
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/wajib diisi/i);

    await prisma.holiday.deleteMany({ where: { id: holiday.id } });
  });

  it("should return 404 if holiday not found when editing", async () => {
    const res = await request(app)
      .put("/api/holiday/99999999")
      .set("Authorization", adminToken)
      .send({ holidayName: "Doesn't Matter", date: "2099-12-31" });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should return 404 if holiday not found when updating status", async () => {
    const res = await request(app)
      .put("/api/holiday/99999999/status")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });
});

describe("holidayCron middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { role: "nasabah" } };
    res = {};
    next = jest.fn();
  });

  it("should call next() if not holiday", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.holiday.deleteMany({ where: { date: today } });
    if (updateHolidayCache) await updateHolidayCache();
    await holidayBlock(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should block non-admin if today is holiday", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.holiday.create({
      data: {
        holidayName: "Libur Test",
        date: today,
        createdBy: "admin",
        updatedBy: "admin",
        status: true,
      },
    });
    if (updateHolidayCache) await updateHolidayCache();
    await new Promise((resolve) => {
      holidayBlock(req, res, (err) => {
        expect(err).toBeDefined();
        expect(err.status).toBe(503);
        resolve();
      });
    });
    await prisma.holiday.deleteMany({ where: { date: today } });
  });

  it("should allow admin even if today is holiday", async () => {
    req.user.role = "admin";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.holiday.create({
      data: {
        holidayName: "Libur Test",
        date: today,
        createdBy: "admin",
        updatedBy: "admin",
        status: true,
      },
    });
    if (updateHolidayCache) await updateHolidayCache();
    await holidayBlock(req, res, next);
    expect(next).toHaveBeenCalled();
    await prisma.holiday.deleteMany({ where: { date: today } });
  });
});
