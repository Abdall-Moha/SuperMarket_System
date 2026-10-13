import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoute from "./routes/userRoute.js";
import productRoutes from "./routes/productRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import debtRoutes from "./routes/debtRoutes.js";
import debtPaymentRoutes from "./routes/debtPaymentRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/users", userRoute);
app.use("/api/products", productRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/debt-payments", debtPaymentRoutes);
app.use("/api/reports", reportRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("DB Connected Successfully");
    })
    .catch((err) => {
        console.log("DB Connection Failed", err);
    });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
