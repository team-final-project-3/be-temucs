const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addService = async (req, res, next) => {
  try {
    const { serviceName, estimatedTime, createdBy, updatedBy } = req.body;

    if (!serviceName || !estimatedTime || !createdBy || !updatedBy) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    const service = await prisma.service.create({
      data: {
        serviceName,
        estimatedTime,
        createdBy,
        updatedBy,
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
    });

    if (!service) {
      const error = new Error("Service not found");
      error.status = 404;
      throw error;
    }

    res.status(200).json(service);
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
    const id = parseInt(req.params.id, 10);
    const { serviceName, estimatedTime, updatedBy } = req.body;

    if (
      serviceName == null ||
      estimatedTime == null ||
      createdBy == null ||
      updatedBy == null
    ) {
      const error = new Error("All fields are required");
      error.status = 400;
      throw error;
    }

    const updatedService = await prisma.service.update({
      where: { id: Number(id) },
      data: { serviceName, estimatedTime, updatedBy },
    });

    res.status(200).json({ message: "Service updated", updatedService });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

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
