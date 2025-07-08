const request = require("supertest");
const app = require("../src/app");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

const unique = Date.now() + Math.floor(Math.random() * 10000);
const adminUsername = "serdocadminjest" + unique;
const userUsername = "serdocuserjest" + unique;
const loketUsername = "serdocloketjest" + unique;
const plainPassword = "Password123!";
let adminToken, userToken, loketToken;
let document, service1, service2;

describe("ServiceDocument Controller (Integration)", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });
    await prisma.loket.deleteMany({ where: { username: loketUsername } });

    const hashed = bcrypt.hashSync(plainPassword, 10);
    await prisma.user.create({
      data: {
        fullname: "Admin Jest",
        username: adminUsername,
        email: adminUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081234" + unique,
        role: "admin",
        isVerified: true,
      },
    });
    await prisma.user.create({
      data: {
        fullname: "User Jest",
        username: userUsername,
        email: userUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "081235" + unique,
        role: "nasabah",
        isVerified: true,
      },
    });

    const adminLogin = await request(app)
      .post("/api/users/login")
      .send({ username: adminUsername, password: plainPassword });
    adminToken = "Bearer " + adminLogin.body.token;

    const userLogin = await request(app)
      .post("/api/users/login")
      .send({ username: userUsername, password: plainPassword });
    userToken = "Bearer " + userLogin.body.token;

    let branch = await prisma.branch.findFirst();
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: "Branch Loket Jest",
          branchCode: "LOKETJEST" + unique,
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

    const loketLogin = await request(app)
      .post("/api/loket/login")
      .send({ username: loketUsername, password: plainPassword });
    loketToken = "Bearer " + loketLogin.body.token;

    document = await prisma.document.create({
      data: {
        documentName: "Materai ServiceDocument Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    service1 = await prisma.service.create({
      data: {
        serviceName: "Service Jest 1 " + unique,
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
        serviceName: "Service Jest 2 " + unique,
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
  });

  afterAll(async () => {
    await prisma.service.deleteMany({
      where: { id: { in: [service1.id, service2.id] } },
    });
    await prisma.document.deleteMany({ where: { id: document.id } });
    await prisma.loket.deleteMany({ where: { username: loketUsername } });
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });
    await prisma.$disconnect();
  });

  it("should get documents by serviceIds for user", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/user")
      .set("Authorization", userToken)
      .send({
        serviceIds: [service1.id, service2.id],
      });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((d) => d.id === document.id)).toBe(true);
    const doc = res.body.data.find((d) => d.id === document.id);
    expect(doc.quantity).toBe(3);
  });

  it("should return 400 if one of the serviceIds is not active or not found (user)", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/user")
      .set("Authorization", userToken)
      .send({
        serviceIds: [service1.id, 99999999],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tidak aktif atau tidak ditemukan/i);
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

  it("should return 400 if serviceIds is missing or not array (loket)", async () => {
    // Tidak mengirim serviceIds
    let res = await request(app)
      .post("/api/documents/by-services/loket")
      .set("Authorization", loketToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(
      /serviceIds wajib diisi dan berupa array/i
    );

    // Mengirim serviceIds bukan array
    res = await request(app)
      .post("/api/documents/by-services/loket")
      .set("Authorization", loketToken)
      .send({ serviceIds: "bukan-array" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(
      /serviceIds wajib diisi dan berupa array/i
    );

    res = await request(app)
      .post("/api/documents/by-services/loket")
      .set("Authorization", loketToken)
      .send({ serviceIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(
      /serviceIds wajib diisi dan berupa array/i
    );
  });

  it("should return 400 if one of the serviceIds is not active or not found (loket)", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/loket")
      .set("Authorization", loketToken)
      .send({
        serviceIds: [service1.id, 99999999],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tidak aktif atau tidak ditemukan/i);
  });

  it("should return 400 if serviceIds is missing", async () => {
    const res = await request(app)
      .post("/api/documents/by-services/user")
      .set("Authorization", userToken)
      .send({});
    expect(res.status).toBe(400);
  });
});
