export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Not found.'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === 'VersionError') {
    return res.status(409).json({ error: 'Another update happened at the same time. Please retry.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: 'That record already exists.' });
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong.' });
}
