import Employee from "../models/employee.model.js";
import sendOtpEmail from "../utils/sendOtp.js";
export const createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      name,
      mobile,
      blood,
      email,
      department,
      role
    } = req.body;

    

    // check existing employee
    const existingEmployee = await Employee.findOne({ email });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists"
      });
    }

    
const otp = String(
  Math.floor(100000 + Math.random() * 900000)
);
    // create employee
   const newEmployee = new Employee({
  employeeId,
  name,
  mobile,
  blood,
  email,
  department,
  role,
  otp,
  password:"admin@123",  //same password
  isVerified: false
});

    await newEmployee.save();
  await sendOtpEmail(email, otp);
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: newEmployee
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyEmployeeOtp = async (req: any, res: any) => {
  try {
    const { email, otp } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    // We set isVerified to true upon verification
    employee.isVerified = true;
    await employee.save();
    
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};