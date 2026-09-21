export const sendResponse = (res, statusCode, data, message = null) => {
  const payload = { success: true };
  if (data !== undefined) payload.data = data;
  if (message) payload.message = message;
  return res.status(statusCode).json(payload);
};

export const sendError = (res, statusCode, message, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};
