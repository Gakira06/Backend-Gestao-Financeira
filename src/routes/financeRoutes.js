import { Router } from 'express';
import {
  createCategory,
  createTransaction,
  createWallet,
  deleteTransaction,
  getDashboard,
  listCategories,
  listTransactions,
  listWallets,
  payTransaction,
} from '../controllers/financeController.js';

const router = Router();

router.get('/wallets', listWallets);
router.post('/wallets', createWallet);

router.get('/categories', listCategories);
router.post('/categories', createCategory);

router.get('/transactions/dashboard', getDashboard);
router.get('/transactions', listTransactions);
router.post('/transactions', createTransaction);
router.patch('/transactions/:id/baixa', payTransaction);
router.delete('/transactions/:id', deleteTransaction);

export default router;
