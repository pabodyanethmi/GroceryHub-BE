import express from "express";
import { authenticate } from "../middleware/auth";
import {
  cancelUserOrder,
  getAllOrders,
  getSellerDashboardStats,
  getUserOrders,
  placeOrderCOD,
  updateOrderStatus,
  updateUserOrder,
} from "../controllers/order.controller";

const orderRouter = express.Router();

orderRouter.post("/cod", authenticate, placeOrderCOD);
orderRouter.get("/user", authenticate, getUserOrders);
orderRouter.get("/seller", authenticate, getAllOrders);
orderRouter.get("/dashboard-stats", authenticate, getSellerDashboardStats);
orderRouter.put("/update/:id", authenticate, updateUserOrder);
orderRouter.delete("/cancel/:id", authenticate, cancelUserOrder);
orderRouter.put("/status/:id", authenticate, updateOrderStatus);

export default orderRouter;