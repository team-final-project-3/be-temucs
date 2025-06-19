const prisma = require("../../prisma/client");

const getDocumentsByServiceIdForUser = async (req, res, next) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw Object.assign(new Error(), { status: 400 });
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
      if (!uniqueDocsMap.has(sd.document.id)) {
        uniqueDocsMap.set(sd.document.id, {
          id: sd.document.id,
          name: sd.document.documentName,
        });
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
      throw Object.assign(new Error(), { status: 400 });
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
      if (!uniqueDocsMap.has(sd.document.id)) {
        uniqueDocsMap.set(sd.document.id, {
          id: sd.document.id,
          name: sd.document.documentName,
        });
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
