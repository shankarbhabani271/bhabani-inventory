import express from "express";
import { createEmployee } from "../controllers/employeeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { verifyEmployeeOtp } from "../controllers/verifyOtp.controller.js";
import { sendInvite, setPassword, verifyToken } from "../controllers/inviteController.js";

const router = express.Router();

// Legacy routes
router.post("/register", createEmployee);
router.post("/verify-otp", verifyEmployeeOtp);

// New Token-based Employee Registration Flow
router.post("/send-invite", sendInvite); // Admin sends invite
router.get("/verify-token", verifyToken); // Frontend verifies token
router.post("/set-password", setPassword); // Employee sets password
router.post("/set-password/:token", setPassword); // Employee sets password via route param

export default router;