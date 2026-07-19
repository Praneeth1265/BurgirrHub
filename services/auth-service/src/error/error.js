class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;

  if (err.name === "CastError") {
    err = new ErrorHandler(`Invalid ${err.path}`, 400);
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    err = new ErrorHandler(messages.join(", "), 400);
  }
  if (err.code === 11000) {
    err = new ErrorHandler("A user with these details already exists", 409);
  }

  res.status(err.statusCode).json({ success: false, message: err.message });
};

export { ErrorHandler, errorMiddleware };
