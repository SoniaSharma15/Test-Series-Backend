export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        const err = new Error("Not authorized");
        err.statusCode = 401;
        throw err;
      }

      if (!roles.includes(req.user.role)) {
        const err = new Error("Access denied");
        err.statusCode = 403;
        throw err;
      }

      next();
    } catch (error) {
      error.statusCode = error.statusCode || 403;
      next(error);
    }
  };
};