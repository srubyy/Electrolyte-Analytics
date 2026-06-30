import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretactivationkey2026!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'evenmoresecretrefreshkey2026!';

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Sign Access & Refresh tokens
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token in database
    await User.updateRefreshToken(user.id, refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server authentication error." });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Refresh token is invalid or expired." });
      }

      const user = await User.findByIdAndRefreshToken(decoded.id, refreshToken);
      if (!user) {
        return res.status(401).json({ error: "Session has been invalidated or rotated." });
      }

      // Rotate tokens
      const newAccessToken = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await User.updateRefreshToken(user.id, newRefreshToken);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: "Server session renewal error." });
  }
};

export const logout = async (req, res) => {
  try {
    await User.clearRefreshToken(req.user.id);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: "Server session termination error." });
  }
};
