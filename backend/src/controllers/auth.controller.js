const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const memoryStore = require('../services/memoryStore');

// Helper to generate a unique readable User ID (e.g. USR_A9B2C4)
const generateUserId = () => {
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `USR_${randomChars}`;
};

// Check if MongoDB is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Register User
 * Requirements: unique username, unique userid automatically generated, save in DB
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
    }

    if (username.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Username must be at least 2 characters long.' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check uniqueness
    if (isMongoConnected()) {
      const existingUser = await User.findOne({
        $or: [{ username: trimmedUsername }, { email: trimmedEmail }]
      });
      if (existingUser) {
        if (existingUser.username.toLowerCase() === trimmedUsername.toLowerCase()) {
          return res.status(409).json({ success: false, message: 'Username is already taken. Please choose another.' });
        }
        return res.status(409).json({ success: false, message: 'Email is already registered. Please sign in.' });
      }
    } else {
      if (memoryStore.findUserByUsername(trimmedUsername)) {
        return res.status(409).json({ success: false, message: 'Username is already taken. Please choose another.' });
      }
      if (memoryStore.findUserByEmail(trimmedEmail)) {
        return res.status(409).json({ success: false, message: 'Email is already registered. Please sign in.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userid = generateUserId();

    const userData = {
      userid,
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword
    };

    if (isMongoConnected()) {
      const newUser = new User(userData);
      await newUser.save();
    } else {
      memoryStore.saveUser(userData);
    }

    // Generate JWT
    const token = jwt.sign(
      { userid, username: trimmedUsername, email: trimmedEmail },
      process.env.JWT_SECRET || 'cocanvas_jwt_fallback_secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        userid,
        username: trimmedUsername,
        email: trimmedEmail
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during account creation.' });
  }
};

/**
 * Sign In User
 */
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and password are required.' });
    }

    const identifier = emailOrUsername.trim();
    let user = null;

    if (isMongoConnected()) {
      user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });
    } else {
      user = memoryStore.findUserByEmail(identifier.toLowerCase()) || memoryStore.findUserByUsername(identifier);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const token = jwt.sign(
      { userid: user.userid, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'cocanvas_jwt_fallback_secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        userid: user.userid,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

/**
 * Get Profile of current authenticated user
 */
exports.getMe = async (req, res) => {
  try {
    const { userid } = req.user;
    let user = null;

    if (isMongoConnected()) {
      user = await User.findOne({ userid }).select('-password');
    } else {
      user = memoryStore.findUserById(userid);
      if (user) {
        const { password, ...safeUser } = user;
        user = safeUser;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};
