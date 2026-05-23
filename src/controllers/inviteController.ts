import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Invitation from "../models/invitation.model.js";
import Employee from "../models/employee.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Assuming you have nodemailer set up. Fallback provided if not configured in ENV.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "test@example.com",
    pass: process.env.EMAIL_PASS || "password",
  },
});

export const sendInvite = async (req: Request, res: Response) => {
  try {
    const { email, department, role } = req.body;

    if (!email || !department || !role) {
      return res.status(400).json({ success: false, message: "Email, department, and role are required." });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: "Employee already exists with this email." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Remove any existing invitation for this email to prevent spam issues
    await Invitation.findOneAndDelete({ email });

    const newInvitation = new Invitation({
      email,
      token,
      department,
      role,
      expiresAt,
    });

    await newInvitation.save();

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/set-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || "test@example.com",
      to: email,
      subject: "You've been invited to join the Company",
      html: `
        <h2>Welcome aboard! Your account is ready.</h2>
        <p>Click the button below to set your password and get started. This link expires in 24 hours.</p>
        <a href="${inviteLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Set My Password &rarr;</a>
        <br><br>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${inviteLink}</p>
        <p>If you didn't expect this email, you can safely ignore it.</p>
      `,
    };

    // If using a dummy setup, this might fail, so we catch the error but still return success for the sake of development
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.warn("Failed to send email (check NodeMailer config):", mailError);
    }

    // Since you don't have a working email set up yet, we will print the link to the console
    console.log("\n=======================================================");
    console.log("INVITATION LINK GENERATED (Copy and paste into browser):");
    console.log(inviteLink);
    console.log("=======================================================\n");

    res.status(200).json({
      success: true,
      message: `Invite sent to ${email}`,
      // Always returning the token and link so you can easily test it on the frontend!
      token,
      link: inviteLink
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invalid token." });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Token has expired. Please request a new link." });
    }

    res.status(200).json({ success: true, message: "Token is valid.", email: invitation.email });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, name, mobile, blood } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Token has expired." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the employee record
    // Generating a dummy employeeId if not provided
    const employeeId = "EMP-" + Date.now().toString().slice(-6);

    const newEmployee = new Employee({
      employeeId,
      email: invitation.email,
      department: invitation.department,
      role: invitation.role,
      password: hashedPassword,
      name: name || "Unknown",
      mobile: mobile || "0000000000",
      blood: blood || "O+",
      isVerified: true,
    });

    await newEmployee.save();

    // Delete the invitation
    await Invitation.findByIdAndDelete(invitation._id);

    res.status(200).json({ success: true, message: "Password set successfully. You can now login." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
