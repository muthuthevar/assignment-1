import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectMongoDB } from "./config/mongo.config";
import { Redis } from "./config/redis.config";
import appRouter from "./routes/app.routes";
import registerRouter from "./routes/register.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectMongoDB();

// Connect to Redis
Redis();

// Middleware
app.use(express.json());

// Routes
app.use("/", appRouter);

app.use("/", registerRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
