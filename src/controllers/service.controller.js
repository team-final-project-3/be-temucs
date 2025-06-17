const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addService = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { serviceName, estimatedTime, documentIds } = req.body;

    if (!serviceName || !estimatedTime) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        serviceName,
        estimatedTime,
        createdBy: username,
        updatedBy: username,
        status: true,
        documents: {
          create: documentIds.map((documentId) => ({
            documentId,
            createdBy: username,
            updatedBy: username,
          })),
        },
      },
    });

    res.status(201).json({ message: "Service created", service });
  } catch (error) {
    next(error);
  }
};

const getService = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
      include: {
        documents: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!service) {
      throw Object.assign(new Error(), { status: 404 });
    }

    const documents = service.documents.map((sd) => sd.document);

    res.status(200).json({
      ...service,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

const getAllService = async (req, res, next) => {
  try {
    const services = await prisma.service.findMany();
    res.status(200).json(services);
  } catch (error) {
    next(error);
  }
};

const editService = async (req, res, next) => {
  try {
    const username = req.user.username;
    const id = parseInt(req.params.id, 10);
    const { serviceName, status, estimatedTime } = req.body;

    if (serviceName == null || estimatedTime == null) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const updatedService = await prisma.service.update({
      where: { id: Number(id) },
      data: { serviceName, status, estimatedTime, updatedBy: username },
    });

    res.status(200).json({ message: "Service updated", updatedService });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw Object.assign(new Error(), { status: 400 });
    }

    await prisma.service.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addService,
  getService,
  getAllService,
  editService,
  deleteService,
};
