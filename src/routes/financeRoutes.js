import { Router } from 'express';
import {
  createCategory,
  createTransaction,
  createWallet,
  deleteTransaction,
  deleteWallet,
  getDashboard,
  listCategories,
  listTransactions,
  listWallets,
  payTransaction,
  updateWallet,
} from '../controllers/financeController.js';

const router = Router();

router.get('/wallets', listWallets);
router.post('/wallets', createWallet);
router.patch('/wallets/:id', updateWallet);
router.delete('/wallets/:id', deleteWallet);

router.get('/categories', listCategories);
router.post('/categories', createCategory);

router.get('/transactions/dashboard', getDashboard);
router.get('/transactions', listTransactions);
router.post('/transactions', createTransaction);
router.patch('/transactions/:id/baixa', payTransaction);
router.delete('/transactions/:id', deleteTransaction);

export default router;
