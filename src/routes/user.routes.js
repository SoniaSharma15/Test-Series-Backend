import express from "express";
import {
  getStudentByEmail,
  assignTestSeries,
  changeStudentPassword,
  createUserByAdmin,
  getAllUsers ,
} from "../controllers/user.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/role.middleware.js";

const router = express.Router();

/* Admin actions inside user routes */
router.get(
  "/student-by-email",
  protect,
  authorizeRole("admin"),
  getStudentByEmail
);

router.get(
  "/all-users",
  protect,
  authorizeRole("admin"),
  getAllUsers
);

router.post(
  "/assign-test-series",
  protect,
  authorizeRole("admin"),
  assignTestSeries
);

router.put(
  "/change-password",
  protect,
  authorizeRole("admin"),
  changeStudentPassword
);

router.post(
  "/create-user",
  protect,
  authorizeRole("admin"),
  createUserByAdmin
);


export default router;
