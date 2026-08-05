import { Router } from 'express';
import {
  createEvent,
  createTask,
  deleteEvent,
  deleteTask,
  listEvents,
  listTasks,
  updateTask,
} from '../controllers/productivityController.js';

const router = Router();

router.get('/tasks', listTasks);
router.post('/tasks', createTask);
router.patch('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

router.get('/events', listEvents);
router.post('/events', createEvent);
router.delete('/events/:id', deleteEvent);

export default router;
