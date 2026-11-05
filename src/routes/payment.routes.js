import express from "express";
import {
  // createOrder,       // ── DISABLED: Razorpay paid enrollment commented out ──
  enrollInFreeSeries,
  verifyPayment,       // kept but route disabled below
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

// ── DISABLED: Razorpay paid order creation ──
// router.post(
//   "/create-order",
//   protect,
//   authorizeRole("student"),
//   createOrder
// );

router.post(
  "/free-enroll",
  protect,
  authorizeRole("student"),
  enrollInFreeSeries
);

// ── DISABLED: Razorpay payment verification ──
// router.post(
//   "/verify",
//   protect,
//   authorizeRole("student"),
//   verifyPayment
// );

router.get(
  "/receipt/:paymentId",
  protect,
  authorizeRole("student"),
  downloadReceipt
);


export default router;
