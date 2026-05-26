import User from "../models/User.js";
import Employee from "../models/employee.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const loginController = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // 1. Check in User collection (for Admin)
    let user = await User.findOne({ email });
    let role = "";
    let name = "";
    let hashedPassword = "";
    let userId = "";
    let department = "";

    // If the user exists in User collection and is explicitly an admin, log in as admin
    if (user && user.role === "admin") {
      role = "admin";
      name = "Admin User";
      hashedPassword = user.password;
      userId = user._id.toString();
      department = "Administration";
    } else {
      // 2. Check in Employee collection (for manager, procurement, inventory, employee)
      const employee = await Employee.findOne({ email });
      if (employee) {
        // Reject login if employee account is not activated/verified yet
        if (!employee.isVerified) {
          return res.status(400).json({
            message: "Employee account is not activated. Please set your password first."
          });
        }
        role = employee.role || "employee";
        name = employee.name || "Employee";
        hashedPassword = employee.password;
        userId = employee._id.toString();
        department = employee.department || "Operations";
      } else if (user) {
        // Fallback to User collection if no employee record is found
        role = user.role || "employee";
        name = "User";
        hashedPassword = user.password;
        userId = user._id.toString();
        department = "Operations";
      } else {
        return res.status(400).json({
          message: "User not found"
        });
      }
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid login credentials"
      });
    }

    // 4. Generate JWT Token
    const token = jwt.sign(
      {
        id: userId,
        role: role
      },
      process.env.JWT_SECRET || "mySuperSecretKey123",
      {
        expiresIn: "1d"
      }
    );

    // 5. Send login response
    res.status(200).json({
      message: "Login Success",
      token,
      user: {
        name,
        email,
        role,
        department
      }
    });

  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};