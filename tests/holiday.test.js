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

describe("Holiday Controller (Integration)", () => {
  afterAll(async () => {
    await prisma.holiday.deleteMany({
      where: { holidayName: { contains: "Jest" } },
    });
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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
});
