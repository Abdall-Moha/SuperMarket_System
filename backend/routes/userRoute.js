import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import rateLimitMiddleware from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Register the first admin. Closed after one user exists.
// Access: Public, only when the database has zero users
router.post("/register", rateLimitMiddleware, async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    // Close registration if an admin already exists
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      return res.status(403).json({
        message: "Registration is closed. Please ask an admin to create your account.",
      });
    }

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name,
      email: email,
      phone: phone,
      password: hashedPassword,
      role: "admin",
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Login and return a JWT token
// Access: Admin, Cashier, Storekeeper
router.post("/login", rateLimitMiddleware, async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message: "This account is inactive",
      });
    }

    // Check the password against the hashed password in the database
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create a JWT token for the logged-in user
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Create a new user
// Access: Admin
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;
    const role = req.body.role;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    if (role) {
      if (role !== "admin" && role !== "cashier" && role !== "storekeeper") {
        return res.status(400).json({
          message: "Role must be admin, cashier, or storekeeper",
        });
      }
    }

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name,
      email: email,
      phone: phone,
      password: hashedPassword,
      role: role || "cashier",
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Get the logged-in user's profile
// Access: All authenticated users
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Load the logged-in user without the password
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Get all users
// Access: Admin
router.get("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");

    return res.status(200).json({
      users: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Change the logged-in user's password
// Access: All authenticated users
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Hash the new password before saving it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Admin resets another user's password. Does not require the current password.
// Access: Admin
router.put("/:id/reset-password", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const password = req.body.password;

    if (!password) {
      return res.status(400).json({
        message: "Please enter a new password",
      });
    }

    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({
        message: "Use Change Password on your profile to update your own password",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Get one user by ID
// Access: Admin
router.get("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// Update a user, including role and isActive
// Access: Admin
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const role = req.body.role;
    const isActive = req.body.isActive;
    const password = req.body.password;

    if (name) {
      user.name = name;
    }

    if (phone) {
      user.phone = phone;
    }

    if (email) {
      const emailExists = await User.findOne({ email: email });

      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      user.email = email;
    }

    if (role) {
      if (role !== "admin" && role !== "cashier" && role !== "storekeeper") {
        return res.status(400).json({
          message: "Role must be admin, cashier, or storekeeper",
        });
      }

      user.role = role;
    }

    if (isActive === true || isActive === false) {
      user.isActive = isActive;
    }

    if (password) {
      if (user._id.toString() === req.user.id.toString()) {
        return res.status(400).json({
          message: "Use Change Password on your profile to update your own password",
        });
      }

      user.password = await bcrypt.hash(password, 10);
    }

    // Save the updated user information
    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

export default router;
