import * as financeService from '../services/financeService.js';

export async function listWallets(request, response, next) {
  try {
    const wallets = await financeService.listWallets();
    return response.json(wallets);
  } catch (error) {
    return next(error);
  }
}

export async function createWallet(request, response, next) {
  try {
    const wallet = await financeService.createWallet(request.body);
    return response.status(201).json(wallet);
  } catch (error) {
    return next(error);
  }
}

export async function listCategories(request, response, next) {
  try {
    const categories = await financeService.listCategories();
    return response.json(categories);
  } catch (error) {
    return next(error);
  }
}

export async function createCategory(request, response, next) {
  try {
    const category = await financeService.createCategory(request.body);
    return response.status(201).json(category);
  } catch (error) {
    return next(error);
  }
}

export async function createTransaction(request, response, next) {
  try {
    const transaction = await financeService.createTransaction(request.body);
    return response.status(201).json(transaction);
  } catch (error) {
    return next(error);
  }
}

export async function payTransaction(request, response, next) {
  try {
    const transaction = await financeService.payTransaction(request.params.id);
    return response.json(transaction);
  } catch (error) {
    return next(error);
  }
}

export async function deleteTransaction(request, response, next) {
  try {
    const result = await financeService.deleteTransaction(request.params.id);
    return response.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getDashboard(request, response, next) {
  try {
    const dashboard = await financeService.getDashboard();
    return response.json(dashboard);
  } catch (error) {
    return next(error);
  }
}
