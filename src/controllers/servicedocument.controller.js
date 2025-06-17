const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDocumentsByServiceId = async (req, res, next) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const serviceDocuments = await prisma.serviceDocument.findMany({
      where: {
        serviceId: { in: serviceIds },
      },
      include: {
        document: true,
      },
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
  getDocumentsByServiceId,
};
