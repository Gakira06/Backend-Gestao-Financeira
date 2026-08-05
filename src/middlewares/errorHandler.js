export function errorHandler(error, request, response, next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  return response.status(statusCode).json({
    message: error.message || 'Erro interno do servidor.',
  });
}

export function notFoundHandler(request, response, next) {
  const error = new Error(`Rota nao encontrada: ${request.method} ${request.originalUrl}`);
  error.statusCode = 404;
  next(error);
}
