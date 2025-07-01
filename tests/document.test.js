const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../prisma/client");

const unique = Date.now() + Math.floor(Math.random() * 10000);
const loketUsername = "docloketjest" + unique;
const adminUsername = "docadminjest" + unique;
const userUsername = "docnasabahjest" + unique;
const branchCode = "DOCLBRANCH" + unique;
const plainPassword = "Password123!";
let loketToken, adminToken, userToken, branch;

describe("Document Controller (Integration)", () => {
  beforeAll(async () => {
    branch = await prisma.branch.create({
      data: {
        name: "Branch Loket Jest " + unique,
        branchCode,
        address: "Jl. Loket Jest",
        longitude: 106.8,
        latitude: -6.1,
        holiday: false,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });

    const bcrypt = require("bcryptjs");
    const hashed = bcrypt.hashSync(plainPassword, 10);
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

    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });

    await prisma.user.create({
      data: {
        fullname: "Admin Jest",
        username: adminUsername,
        email: adminUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "0812345619" + unique,
        role: "admin",
        isVerified: true,
      },
    });

    await prisma.user.create({
      data: {
        fullname: "Nasabah Jest",
        username: userUsername,
        email: userUsername + "@mail.com",
        passwordHash: hashed,
        phoneNumber: "08123512419" + unique,
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
  });

  afterAll(async () => {
    await prisma.loket.deleteMany({ where: { id: 3 } });
    await prisma.user.deleteMany({
      where: { username: { in: [adminUsername, userUsername] } },
    });
    await prisma.$disconnect();
  });

  it("should add a new document", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post("/api/document")
      .set("Authorization", adminToken)
      .send({
        documentName: "Dokumen Jest " + unique,
      });
    expect(res.status).toBe(201);
    expect(res.body.document).toHaveProperty("id");

    await prisma.document.deleteMany({ where: { id: res.body.document.id } });
  });

  it("should get all active documents for user", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const doc = await prisma.document.create({
      data: {
        documentName: "Dokumen Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get("/api/document/user")
      .set("Authorization", userToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d) => d.id === doc.id)).toBe(true);

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should get all active documents for loket", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const doc = await prisma.document.create({
      data: {
        documentName: "Dokumen Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get("/api/document/loket")
      .set("Authorization", loketToken)
      .send();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d) => d.id === doc.id)).toBe(true);

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should get document by id for admin", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const doc = await prisma.document.create({
      data: {
        documentName: "Dokumen Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .get(`/api/document/${doc.id}`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body.id).toBe(doc.id);

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should return 404 if document not found", async () => {
    const res = await request(app)
      .get("/api/document/99999999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should edit document", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const doc = await prisma.document.create({
      data: {
        documentName: "Dokumen Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/document/${doc.id}`)
      .set("Authorization", adminToken)
      .send({
        documentName: "Dokumen Jest Edited " + unique,
      });
    expect(res.status).toBe(200);
    expect(res.body.updatedDocument.documentName).toBe(
      "Dokumen Jest Edited " + unique
    );

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should update document status", async () => {
    const unique = Date.now() + Math.floor(Math.random() * 10000);
    const doc = await prisma.document.create({
      data: {
        documentName: "Dokumen Jest " + unique,
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/document/${doc.id}/status`)
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.document).toHaveProperty("status");

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should return 400 if documentName is null when adding document", async () => {
    const res = await request(app)
      .post("/api/document")
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/wajib diisi/i);
  });

  it("should return 400 if documentName is null when editing document", async () => {
    const doc = await prisma.document.create({
      data: {
        documentName: "Dummy Edit Null",
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
      },
    });
    const res = await request(app)
      .put(`/api/document/${doc.id}`)
      .set("Authorization", adminToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/wajib diisi/i);

    await prisma.document.deleteMany({ where: { id: doc.id } });
  });

  it("should return 404 if document not found for user", async () => {
    const res = await request(app)
      .get("/api/document/99999999")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should return 404 if document not found when editing", async () => {
    const res = await request(app)
      .put("/api/document/99999999")
      .set("Authorization", adminToken)
      .send({ documentName: "Doesn't Matter" });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });

  it("should return 404 if document not found when updating status", async () => {
    const res = await request(app)
      .put("/api/document/99999999/status")
      .set("Authorization", adminToken)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/tidak ditemukan/i);
  });
});
