const prisma = require("../../prisma/client");

const addDocument = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { documentName } = req.body;

    if (documentName == null) {
      throw Object.assign(new Error("Nama dokumen wajib diisi"), {
        status: 400,
      });
    }

    const document = await prisma.document.create({
      data: {
        documentName,
        createdBy: username,
        updatedBy: username,
      },
    });

    res.status(201).json({ message: "Document created", document });
  } catch (error) {
    next(error);
  }
};

const getDocumentForUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id: Number(id) } });
    if (!doc) {
      throw Object.assign(new Error("Dokumen tidak ditemukan"), {
        status: 404,
      });
    }

    res.status(200).json(doc);
  } catch (error) {
    next(error);
  }
};

// const getDocumentForLoket = async (req, res, next) => {
//   try {
//     const id = parseInt(req.params.id, 10);
//     const document = await prisma.document.findFirst({
//       where: { id, status: true },
//     });

//     if (!document) {
//       throw Object.assign(new Error("Document not found or inactive"), {
//         status: 404,
//       });
//     }

//     res.status(200).json(document);
//   } catch (error) {
//     next(error);
//   }
// };

const getAllDocumentForUser = async (req, res, next) => {
  try {
    const role = req.user.role;
    let documents;

    if (role === "admin") {
      documents = await prisma.document.findMany();
    } else {
      documents = await prisma.document.findMany({
        where: { status: true },
      });
    }

    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

const getAllDocumentForLoket = async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { status: true },
    });
    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

const editDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;
    const { documentName } = req.body;

    if (!documentName) {
      throw Object.assign(new Error("Nama dokumen wajib diisi"), {
        status: 400,
      });
    }
    const doc = await prisma.document.findUnique({ where: { id: Number(id) } });
    if (!doc) {
      throw Object.assign(new Error("Dokumen tidak ditemukan"), {
        status: 404,
      });
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { documentName, updatedBy: username },
    });

    res.status(200).json({ message: "Document updated", updatedDocument });
  } catch (error) {
    next(error);
  }
};

const updateDocumentStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;

    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw Object.assign(new Error("Document tidak ditemukan"), {
        status: 404,
      });
    }

    const status = !document.status;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `Document ${status ? "activated" : "deactivated"} successfully`,
      document: updatedDocument,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDocument,
  getDocumentForUser,
  // getDocumentForLoket,
  getAllDocumentForUser,
  getAllDocumentForLoket,
  editDocument,
  updateDocumentStatus,
};
