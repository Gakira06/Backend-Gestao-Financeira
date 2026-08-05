import * as productivityService from '../services/productivityService.js';

export async function listTasks(request, response, next) {
  try {
    const tasks = await productivityService.listTasks(request.query);
    return response.json(tasks);
  } catch (error) {
    return next(error);
  }
}

export async function createTask(request, response, next) {
  try {
    const task = await productivityService.createTask(request.body);
    return response.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

export async function updateTask(request, response, next) {
  try {
    const task = await productivityService.updateTask(request.params.id, request.body);
    return response.json(task);
  } catch (error) {
    return next(error);
  }
}

export async function deleteTask(request, response, next) {
  try {
    const result = await productivityService.deleteTask(request.params.id);
    return response.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listEvents(request, response, next) {
  try {
    const events = await productivityService.listEvents(request.query);
    return response.json(events);
  } catch (error) {
    return next(error);
  }
}

export async function createEvent(request, response, next) {
  try {
    const event = await productivityService.createEvent(request.body);
    return response.status(201).json(event);
  } catch (error) {
    return next(error);
  }
}

export async function deleteEvent(request, response, next) {
  try {
    const result = await productivityService.deleteEvent(request.params.id);
    return response.json(result);
  } catch (error) {
    return next(error);
  }
}
