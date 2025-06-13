const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addService = async (req, res) => {
  try {
    const { serviceName, estimatedTime, createdBy, updatedBy } = req.body;

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
    console.error("Add Service Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
    });

    if (!service) return res.status(404).json({ message: "Service not found" });

    res.status(200).json(service);
  } catch (error) {
    console.error("Get Service Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllService = async (req, res) => {
  try {
    const services = await prisma.service.findMany();
    res.status(200).json(services);
  } catch (error) {
    console.error("Get All Services Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { serviceName, estimatedTime, updatedBy } = req.body;

    const updatedService = await prisma.service.update({
      where: { id: Number(id) },
      data: { serviceName, estimatedTime, updatedBy },
    });

    res.status(200).json({ message: "Service updated", updatedService });
  } catch (error) {
    console.error("Edit Service Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.service.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    console.error("Delete Service Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addService,
  getService,
  getAllService,
  editService,
  deleteService,
};
