import rateLimit from "express-rate-limit";

// Limit repeated attempts on sensitive routes like login and register.
const rateLimitMiddleware = rateLimit({
  windowMs: 50 * 60 * 1000, // 50 minutes
  max: 100, // max 100 requests per IP in that 50-minute window
  message: {
    message: "Too many requests. Please try again later.",
  },
});

export default rateLimitMiddleware;
