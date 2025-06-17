const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDocumentsByServiceId = async (req, res) => {
    try {
        const { serviceIds } = req.body;

        if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
            return res.status(400).json({ success: false, message: "Service ID are required" });
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
        console.error("Error fetching documents:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    getDocumentsByServiceId,
};
