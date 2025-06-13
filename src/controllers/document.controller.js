const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addDocument = async (req, res) => {
  try {
    const { documentName, createdBy, updatedBy } = req.body;

    const document = await prisma.document.create({
      data: {
        documentName,
        createdBy,
        updatedBy,
      },
    });

    res.status(201).json({ message: "Document created", document });
  } catch (error) {
    console.error("Add Document Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const document = await prisma.document.findUnique({
      where: { id: Number(id) },
    });

    if (!document)
      return res.status(404).json({ message: "Document not found" });

    res.status(200).json(document);
  } catch (error) {
    console.error("Get Document Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllDocument = async (req, res) => {
  try {
    const document = await prisma.document.findMany();
    res.status(200).json(document);
  } catch (error) {
    console.error("Get All Document Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { documentName, updatedBy } = req.body;

    const updatedDocument = await prisma.document.update({
      where: { id: Number(id) },
      data: { documentName, updatedBy },
    });

    res.status(200).json({ message: "Document updated", updatedDocument });
  } catch (error) {
    console.error("Edit Document Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.document.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete Document Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addDocument,
  getDocument,
  getAllDocument,
  editDocument,
  deleteDocument,
};
