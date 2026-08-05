import prisma from '../config/database.js';

const VALID_TASK_STATUS = ['A Fazer', 'Em Andamento', 'Concluído'];
const VALID_TASK_PRIORITIES = ['Baixa', 'Média', 'Alta'];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseId(id) {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, 'id invalido.');
  }

  return parsed;
}

function parseOptionalDate(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} deve ser uma data valida.`);
  }

  return date;
}

function parseRequiredDate(value, fieldName) {
  const date = parseOptionalDate(value, fieldName);

  if (!date) {
    throw createHttpError(400, `${fieldName} e obrigatorio.`);
  }

  return date;
}

function assertAllowed(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, `${fieldName} invalido. Valores aceitos: ${allowedValues.join(', ')}.`);
  }
}

export async function listTasks(filters = {}) {
  const where = {};

  if (filters.status) {
    assertAllowed(filters.status, VALID_TASK_STATUS, 'status');
    where.status = filters.status;
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createTask(data) {
  const title = data.title?.trim();
  const status = data.status || 'A Fazer';
  const priority = data.priority || 'Média';

  if (!title) {
    throw createHttpError(400, 'title e obrigatorio.');
  }

  assertAllowed(status, VALID_TASK_STATUS, 'status');
  assertAllowed(priority, VALID_TASK_PRIORITIES, 'priority');

  return prisma.task.create({
    data: {
      title,
      description: data.description?.trim() || null,
      status,
      priority,
      dueDate: parseOptionalDate(data.dueDate, 'dueDate'),
    },
  });
}

export async function updateTask(id, data) {
  const taskId = parseId(id);
  const updateData = {};

  if (data.title !== undefined) {
    const title = data.title?.trim();

    if (!title) {
      throw createHttpError(400, 'title nao pode ser vazio.');
    }

    updateData.title = title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }

  if (data.status !== undefined) {
    assertAllowed(data.status, VALID_TASK_STATUS, 'status');
    updateData.status = data.status;
  }

  if (data.priority !== undefined) {
    assertAllowed(data.priority, VALID_TASK_PRIORITIES, 'priority');
    updateData.priority = data.priority;
  }

  if (data.dueDate !== undefined) {
    updateData.dueDate = parseOptionalDate(data.dueDate, 'dueDate');
  }

  try {
    return await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw createHttpError(404, 'Tarefa nao encontrada.');
    }

    throw error;
  }
}

export async function deleteTask(id) {
  const taskId = parseId(id);

  try {
    await prisma.task.delete({ where: { id: taskId } });
    return { message: 'Tarefa deletada com sucesso.' };
  } catch (error) {
    if (error.code === 'P2025') {
      throw createHttpError(404, 'Tarefa nao encontrada.');
    }

    throw error;
  }
}

export async function listEvents(filters = {}) {
  const where = {};

  if (filters.startDate || filters.endDate) {
    where.startDate = {};

    if (filters.startDate) {
      where.startDate.gte = parseRequiredDate(filters.startDate, 'startDate');
    }

    if (filters.endDate) {
      where.startDate.lte = parseRequiredDate(filters.endDate, 'endDate');
    }
  }

  return prisma.event.findMany({
    where,
    orderBy: { startDate: 'asc' },
  });
}

export async function createEvent(data) {
  const title = data.title?.trim();
  const startDate = parseRequiredDate(data.startDate, 'startDate');
  const endDate = parseRequiredDate(data.endDate, 'endDate');

  if (!title) {
    throw createHttpError(400, 'title e obrigatorio.');
  }

  if (endDate < startDate) {
    throw createHttpError(400, 'endDate deve ser maior ou igual a startDate.');
  }

  return prisma.event.create({
    data: {
      title,
      description: data.description?.trim() || null,
      startDate,
      endDate,
    },
  });
}

export async function deleteEvent(id) {
  const eventId = parseId(id);

  try {
    await prisma.event.delete({ where: { id: eventId } });
    return { message: 'Evento deletado com sucesso.' };
  } catch (error) {
    if (error.code === 'P2025') {
      throw createHttpError(404, 'Evento nao encontrado.');
    }

    throw error;
  }
}
