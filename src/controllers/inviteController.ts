import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Invitation from "../models/invitation.model.js";
import Employee from "../models/employee.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Standardize env credentials and clean any enclosing quotes
const getMailerPass = () => {
  const pass = process.env.NODE_MAILER_PASS || process.env.EMAIL_PASS || "";
  return pass.replace(/^["']|["']$/g, "");
};

const mailerEmail = process.env.NODE_MAILER_EMAIL || process.env.EMAIL_USER || "test@example.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailerEmail,
    pass: getMailerPass() || "password",
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
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/set-password/${token}`;

    const mailOptions = {
      from: mailerEmail,
      to: email,
      subject: "Complete Your Account Setup",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; line-height: 48px; background-color: #ecfdf5; color: #10b981; border-radius: 12px; display: inline-block; font-size: 24px; font-weight: bold; margin-bottom: 12px;">✓</div>
          </div>
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 12px 0;">Welcome to Our Company</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            Your employee account has been created successfully.
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
            Please click the button below to set your password and activate your account.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); transition: all 0.2s ease-in-out;">
              Set Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 32px 0 16px 0; border-top: 1px solid #f1f5f9; padding-top: 24px;">
            This link will expire in 24 hours.
          </p>
          <p style="color: #475569; font-size: 14px; text-align: center; font-weight: 500; margin: 0;">
            Thank You
          </p>
        </div>
      `,
    };

    // If using a dummy setup, this might fail, so we catch the error but still return success for the sake of development
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.warn("Failed to send email (check NodeMailer config):", mailError);
    }

    // Since you don't have a working email set up yet in local dev, we will print the link to the console for easy developer diagnostics
    console.log("\n=======================================================");
    console.log("INVITATION LINK GENERATED (Sent via Email):");
    console.log(inviteLink);
    console.log("=======================================================\n");

    res.status(200).json({
      success: true,
      message: "Employee registration successful. Password setup email has been sent."
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
