export function successResponse(message: string, data?: any) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message: string, code = 'ERROR', details?: any) {
  return {
    success: false,
    message,
    error: { code, details },
    timestamp: new Date().toISOString(),
  };
}