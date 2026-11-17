import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { signAccessToken, signRefreshToken } from "../utils/tokens";
import { AUthRequest } from "../middleware/auth";
import { Role, User } from "../models/auth.model";

dotenv.config();

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashPassword,
      roles: [Role.USER],
    });

    const accessToken = signAccessToken(user);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
        name: user.name,
      },
      data: { email: user.email, Roles: user.roles, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const login = async (req: AUthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, existingUser.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(existingUser);
    const refreshToken = signRefreshToken(existingUser);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "success",
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        roles: existingUser.roles,
      },
      data: {
        userId: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        Roles: existingUser.roles,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const isAuth = async (req: AUthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = req.user.userId || req.user.sub || req.user._id || req.user.id;

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "success",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const logout = (req: Request, res: Response) => {
  try {
    res.clearCookie("accessToken");
    return res.status(200).json({ success: true, message: "success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
