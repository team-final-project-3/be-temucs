const prisma = require("../../prisma/client");

const AGGREGATE_DOCS = ["materai", "copy"];

function shouldAggregate(docName) {
  return AGGREGATE_DOCS.some((keyword) =>
    docName.toLowerCase().includes(keyword.toLowerCase())
  );
}

const getDocumentsByServiceIdForUser = async (req, res, next) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw Object.assign(
        new Error("serviceIds wajib diisi dan berupa array"),
        { status: 400 }
      );
    }

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, status: true },
      select: { id: true, serviceName: true },
    });

    if (services.length !== serviceIds.length) {
      throw Object.assign(
        new Error("Terdapat service yang tidak aktif atau tidak ditemukan"),
        { status: 400 }
      );
    }

    const serviceDocuments = await prisma.serviceDocument.findMany({
      where: { serviceId: { in: serviceIds } },
      include: { document: true },
    });

    const uniqueDocsMap = new Map();
    for (const sd of serviceDocuments) {
      const docName = sd.document.documentName;
      if (!uniqueDocsMap.has(docName)) {
        uniqueDocsMap.set(docName, {
          id: sd.document.id,
          name: docName,
          quantity: sd.quantity,
        });
      } else if (shouldAggregate(docName)) {
        uniqueDocsMap.get(docName).quantity += sd.quantity;
      }
    }

    const documents = Array.from(uniqueDocsMap.values());
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

const getDocumentsByServiceIdForLoket = async (req, res, next) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw Object.assign(
        new Error("serviceIds wajib diisi dan berupa array"),
        { status: 400 }
      );
    }

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, status: true },
      select: { id: true, serviceName: true },
    });

    if (services.length !== serviceIds.length) {
      throw Object.assign(
        new Error("Terdapat service yang tidak aktif atau tidak ditemukan"),
        { status: 400 }
      );
    }

    const serviceDocuments = await prisma.serviceDocument.findMany({
      where: { serviceId: { in: serviceIds } },
      include: { document: true },
    });

    const uniqueDocsMap = new Map();
    for (const sd of serviceDocuments) {
      const docName = sd.document.documentName;
      if (!uniqueDocsMap.has(docName)) {
        uniqueDocsMap.set(docName, {
          id: sd.document.id,
          name: docName,
          quantity: sd.quantity,
        });
      } else if (shouldAggregate(docName)) {
        uniqueDocsMap.get(docName).quantity += sd.quantity;
      }
    }

    const documents = Array.from(uniqueDocsMap.values());
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocumentsByServiceIdForUser,
  getDocumentsByServiceIdForLoket,
};
