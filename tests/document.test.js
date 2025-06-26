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
const userToken =
  "Bearer " +
  jwt.sign(
    { id: 2, username: "nasabahjest", role: "nasabah" },
    process.env.JWT_SECRET || "secret"
  );
const loketToken =
  "Bearer " +
  jwt.sign(
    { loketId: 3, username: "loketjest", role: "loket" },
    process.env.JWT_SECRET || "secret"
  );

describe("Document Controller (Integration)", () => {
  beforeAll(async () => {
    // Pastikan ada branch dummy
    let branch = await prisma.branch.findFirst();
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: "Branch Loket Jest",
          branchCode: "LOKETJEST" + Date.now(),
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
    // Buat user loket dummy yang sesuai dengan token
    await prisma.loket.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        username: "loketjest",
        passwordHash: "dummyhash",
        name: "Loket Jest",
        status: true,
        createdBy: "admin",
        updatedBy: "admin",
        branchId: branch.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.loket.deleteMany({ where: { id: 3 } });
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
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

    // Cleanup
    await prisma.document.deleteMany({ where: { id: doc.id } });
  });
});
