export const successResponse = (
  res,
  data = null,
  message = null,
  statusCode = 200
) => {
  const response = { success: true };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res,
  message,
  statusCode = 500,
  details = null
) => {
  const response = {
    success: false,
    error: getErrorType(statusCode),
    message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

export const validationError = (res, message, fields = null) => {
  const response = {
    success: false,
    error: 'VALIDATION_ERROR',
    message,
  };

  if (fields) {
    response.fields = fields;
  }

  return res.status(400).json(response);
};

export const notFoundError = (res, resource) => {
  return res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `${resource} not found`,
  });
};

export const unauthorizedError = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED',
    message,
  });
};

export const createdResponse = (
  res,
  data,
  message = 'Resource created successfully'
) => {
  return successResponse(res, data, message, 201);
};

export const noContentResponse = res => {
  return res.status(204).send();
};

const getErrorType = statusCode => {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'ERROR';
  }
};
