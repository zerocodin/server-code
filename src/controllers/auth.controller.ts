import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

// Generate JWT token - FIXED: proper typing for jwt.sign
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || "fallback_secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  // FIXED: Properly typed jwt.sign call
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phoneNumber } = req.body;

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        message: "Please provide email, password, and name",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
      return;
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name,
      phoneNumber: phoneNumber || '',
    });

    // FIXED: Convert ObjectId to string properly
    const userId = user._id.toString();
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error: any) {
    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (val: any) => val.message,
      );
      res.status(400).json({
        success: false,
        message: messages.join(". "),
      });
      return;
    }

    console.error("[Register Error]:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
      return;
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Update online status
    user.status = "online";
    await user.save();

    // FIXED: Convert ObjectId to string properly
    const userId = user._id.toString();
    const token = generateToken(userId);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error: any) {
    console.error("[Login Error]:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error: any) {
    console.error("[GetMe Error]:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};