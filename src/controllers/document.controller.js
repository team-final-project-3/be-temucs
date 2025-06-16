const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addDocument = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { documentName } = req.body;

    if (documentName == null) {
      const error = new Error("All fields are required.");
      error.status = 400;
      throw error;
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

const getDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      const error = new Error("Document not found");
      error.status = 404;
      throw error;
    }

    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

const getAllDocument = async (req, res, next) => {
  try {
    const document = await prisma.document.findMany();
    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

const editDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { documentName, updatedBy } = req.body;

    if (documentName == null || updatedBy == null) {
      const error = new Error("All fields are required.");
      error.status = 400;
      throw error;
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { documentName, updatedBy },
    });

    res.status(200).json({ message: "Document updated", updatedDocument });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.document.delete({ where: { id } });

    res.status(200).json({ message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDocument,
  getDocument,
  getAllDocument,
  editDocument,
  deleteDocument,
};
