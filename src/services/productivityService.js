import prisma from '../config/database.js';

const VALID_TASK_STATUS = ['A Fazer', 'Em Andamento', 'Concluído'];
const VALID_TASK_PRIORITIES = ['Baixa', 'Média', 'Alta'];
const VALID_TASK_COLORS = ['Verde', 'Amarelo', 'Vermelho'];
const PRIORITY_COLOR_MAP = { Baixa: 'Verde', Média: 'Amarelo', Alta: 'Vermelho' };
const PRIORITY_WEIGHT = { Alta: 0, Média: 1, Baixa: 2 };

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

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ order: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  return tasks.sort((a, b) => {
    const weightDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (weightDiff !== 0) return weightDiff;
    return a.order - b.order;
  });
}

export async function createTask(data) {
  const title = data.title?.trim();
  const status = data.status || 'A Fazer';
  const priority = data.priority || 'Média';
  const color = data.color || PRIORITY_COLOR_MAP[priority] || 'Amarelo';

  if (!title) {
    throw createHttpError(400, 'title e obrigatorio.');
  }

  assertAllowed(status, VALID_TASK_STATUS, 'status');
  assertAllowed(priority, VALID_TASK_PRIORITIES, 'priority');
  assertAllowed(color, VALID_TASK_COLORS, 'color');

  return prisma.task.create({
    data: {
      title,
      description: data.description?.trim() || null,
      status,
      priority,
      color,
      order: Number.isInteger(data.order) ? data.order : 0,
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

    if (data.color === undefined) {
      updateData.color = PRIORITY_COLOR_MAP[data.priority];
    }
  }

  if (data.color !== undefined) {
    assertAllowed(data.color, VALID_TASK_COLORS, 'color');
    updateData.color = data.color;
  }

  if (data.order !== undefined) {
    if (!Number.isInteger(data.order)) {
      throw createHttpError(400, 'order deve ser um numero inteiro.');
    }
    updateData.order = data.order;
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
