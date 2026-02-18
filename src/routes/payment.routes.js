import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  downloadReceipt
} from "../controllers/payment.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";


const router = express.Router();

router.get(
  "/history",
  protect,
  authorizeRole("student"),
  getPaymentHistory
);

router.post(
  "/create-order",
  protect,
  authorizeRole("student"),
  createOrder
);

router.post(
  "/verify",
  protect,
  authorizeRole("student"),
  verifyPayment
);

router.get(
  "/receipt/:paymentId",
  protect,
  authorizeRole("student"),
  downloadReceipt
);


export default router;
