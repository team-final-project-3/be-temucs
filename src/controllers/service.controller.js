const prisma = require("../../prisma/client");

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

const getAllServiceForUser = async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { status: true },
    });
    res.status(200).json(services);
  } catch (error) {
    throw Object.assign(new Error("Gagal mengambil service untuk user"), {
      status: 500,
    });
  }
};

const getAllServiceForLoket = async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { status: true },
    });
    res.status(200).json(services);
  } catch (error) {
    throw Object.assign(new Error("Gagal mengambil service untuk loket"), {
      status: 500,
    });
  }
};

const getServiceForUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const service = await prisma.service.findFirst({
      where: { id, status: true },
      include: {
        documents: { include: { document: true } },
      },
    });
    if (!service) {
      throw Object.assign(new Error("Service not found or inactive"), {
        status: 404,
      });
    }
    const documents = service.documents.map((sd) => sd.document);
    res.status(200).json({ ...service, documents });
  } catch (error) {
    next(error);
  }
};

// const getServiceForLoket = async (req, res, next) => {
//   try {
//     const id = parseInt(req.params.id, 10);
//     const service = await prisma.service.findFirst({
//       where: { id, status: true },
//       include: {
//         documents: { include: { document: true } },
//       },
//     });
//     if (!service) {
//       throw Object.assign(new Error("Service not found or inactive"), {
//         status: 404,
//       });
//     }
//     const documents = service.documents.map((sd) => sd.document);
//     res.status(200).json({ ...service, documents });
//   } catch (error) {
//     next(error);
//   }
// };

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

const updateServiceStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const username = req.user.username;

    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      throw Object.assign(new Error("Service not found"), { status: 404 });
    }

    const status = !service.status;

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: status,
        updatedBy: username,
      },
    });

    res.status(200).json({
      message: `Service ${status ? "activated" : "deactivated"} successfully`,
      service: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addService,
  getAllServiceForUser,
  getAllServiceForLoket,
  getServiceForUser,
  // getServiceForLoket,
  editService,
  updateServiceStatus,
};
