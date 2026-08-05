import prisma from '../config/database.js';

const VALID_WALLET_TYPES = ['Corrente', 'Poupança', 'Crédito'];
const VALID_TRANSACTION_TYPES = ['Receita', 'Despesa'];
const VALID_TRANSACTION_STATUS = ['Pendente', 'Efetivado'];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertAllowed(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, `${fieldName} invalido. Valores aceitos: ${allowedValues.join(', ')}.`);
  }
}

function parseId(id, fieldName = 'id') {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} invalido.`);
  }

  return parsed;
}

function parseAmount(amount) {
  const parsed = Number(amount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createHttpError(400, 'amount deve ser um numero maior que zero.');
  }

  return parsed;
}

function parseRequiredDate(value, fieldName) {
  if (!value) {
    throw createHttpError(400, `${fieldName} e obrigatorio.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} deve ser uma data valida.`);
  }

  return date;
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

function getBalanceDelta(type, amount) {
  return type === 'Receita' ? amount : -amount;
}

function getRollbackDelta(type, amount) {
  return type === 'Receita' ? -amount : amount;
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);

  return { start, end };
}

async function ensureWalletExists(walletId, tx = prisma) {
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });

  if (!wallet) {
    throw createHttpError(404, 'Wallet nao encontrada.');
  }

  return wallet;
}

async function ensureCategoryExists(categoryId, type, tx = prisma) {
  const category = await tx.category.findUnique({ where: { id: categoryId } });

  if (!category) {
    throw createHttpError(404, 'Category nao encontrada.');
  }

  if (category.type !== type) {
    throw createHttpError(400, 'A categoria deve ter o mesmo tipo da transacao.');
  }

  return category;
}

export async function listWallets() {
  return prisma.wallet.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createWallet(data) {
  const name = data.name?.trim();
  const type = data.type;
  const balance = Number(data.balance ?? 0);

  if (!name) {
    throw createHttpError(400, 'name e obrigatorio.');
  }

  assertAllowed(type, VALID_WALLET_TYPES, 'type');

  if (!Number.isFinite(balance)) {
    throw createHttpError(400, 'balance deve ser um numero valido.');
  }

  return prisma.wallet.create({
    data: { name, type, balance },
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}

export async function createCategory(data) {
  const name = data.name?.trim();
  const type = data.type;
  const colorHex = data.colorHex?.trim();

  if (!name) {
    throw createHttpError(400, 'name e obrigatorio.');
  }

  assertAllowed(type, VALID_TRANSACTION_TYPES, 'type');

  if (!colorHex) {
    throw createHttpError(400, 'colorHex e obrigatorio.');
  }

  return prisma.category.create({
    data: { name, type, colorHex },
  });
}

export async function createTransaction(data) {
  const walletId = parseId(data.walletId, 'walletId');
  const categoryId = parseId(data.categoryId, 'categoryId');
  const description = data.description?.trim();
  const amount = parseAmount(data.amount);
  const type = data.type;
  const status = data.status || 'Pendente';
  const dueDate = parseRequiredDate(data.dueDate, 'dueDate');

  if (!description) {
    throw createHttpError(400, 'description e obrigatorio.');
  }

  assertAllowed(type, VALID_TRANSACTION_TYPES, 'type');
  assertAllowed(status, VALID_TRANSACTION_STATUS, 'status');

  return prisma.$transaction(async (tx) => {
    await ensureWalletExists(walletId, tx);
    await ensureCategoryExists(categoryId, type, tx);

    const paymentDate = status === 'Efetivado' ? new Date() : parseOptionalDate(data.paymentDate, 'paymentDate');

    if (status === 'Efetivado') {
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: getBalanceDelta(type, amount),
          },
        },
      });
    }

    const transaction = await tx.transaction.create({
      data: {
        walletId,
        categoryId,
        description,
        amount,
        type,
        dueDate,
        paymentDate,
        status,
      },
      include: {
        wallet: true,
        category: true,
      },
    });

    return transaction;
  });
}

export async function payTransaction(id) {
  const transactionId = parseId(id);

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw createHttpError(404, 'Transacao nao encontrada.');
    }

    if (transaction.status === 'Efetivado') {
      throw createHttpError(400, 'Transacao ja esta efetivada.');
    }

    const amount = Number(transaction.amount);
    const paymentDate = new Date();

    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: {
        balance: {
          increment: getBalanceDelta(transaction.type, amount),
        },
      },
    });

    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'Efetivado',
        paymentDate,
      },
      include: {
        wallet: true,
        category: true,
      },
    });

    return updatedTransaction;
  });
}

export async function deleteTransaction(id) {
  const transactionId = parseId(id);

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw createHttpError(404, 'Transacao nao encontrada.');
    }

    if (transaction.status === 'Efetivado') {
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: {
            increment: getRollbackDelta(transaction.type, Number(transaction.amount)),
          },
        },
      });
    }

    await tx.transaction.delete({
      where: { id: transactionId },
    });

    return { message: 'Transacao deletada com sucesso.' };
  });
}

export async function getDashboard() {
  const { start, end } = getCurrentMonthRange();

  const [wallets, pendingExpenses, pendingIncomes, expensesByCategory] = await Promise.all([
    prisma.wallet.findMany({
      select: { balance: true },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        status: 'Pendente',
        type: 'Despesa',
        dueDate: { gte: start, lt: end },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        status: 'Pendente',
        type: 'Receita',
        dueDate: { gte: start, lt: end },
      },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: {
        status: 'Efetivado',
        type: 'Despesa',
        paymentDate: { gte: start, lt: end },
      },
    }),
  ]);

  const categoryIds = expensesByCategory.map((item) => item.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    : [];

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return {
    totalBalance: wallets.reduce((total, wallet) => total + Number(wallet.balance), 0),
    monthPendingPayable: Number(pendingExpenses._sum.amount ?? 0),
    monthPendingReceivable: Number(pendingIncomes._sum.amount ?? 0),
    paidExpensesByCategory: expensesByCategory.map((item) => {
      const category = categoryById.get(item.categoryId);

      return {
        categoryId: item.categoryId,
        categoryName: category?.name || 'Sem categoria',
        colorHex: category?.colorHex || '#999999',
        total: Number(item._sum.amount ?? 0),
      };
    }),
  };
}
