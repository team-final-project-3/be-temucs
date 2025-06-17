const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addDocument = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { documentName } = req.body;

    if (documentName == null) {
      throw Object.assign(new Error(), { status: 400 });
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
      throw Object.assign(new Error(), { status: 404 });
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
      throw Object.assign(new Error(), { status: 400 });
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
