const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const { sendEmail } = require('../utils/emailService');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (password.length < 8) {
      return res.status(400).json({ status: 400, message: 'Password must be at least 8 characters long' });
    }
    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 400, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    delete user.password;

    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Send Welcome Email (Usually always sent regardless of preference)
    await sendEmail({
      to_name: name,
      email: email,
      subject: 'Welcome to Expense Tracker!',
      message: `Hi ${name}, \n\nWelcome to Expense Tracker! We're glad to have you on board. Start tracking your expenses and manage your finances easily.`,
    });

    res.status(201).json({ status: 201, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Registration error: ", error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      attributes: ['id', 'email', 'password', 'name', 'is_email_receive',
        'avatar'], where: { email }
    });
    if (!user) {
      return res.status(400).json({ status: 400, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 400, message: 'Invalid credentials' });
    }

    // Remove password from user object after successful authentication                                          
    const { password: _, ...userWithoutPassword } = user.toJSON();
    const payload = { id: userWithoutPassword.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send Login Alert (Security alerts should always be sent)                                                  
    await sendEmail({
      to_name: userWithoutPassword.name,
      email: userWithoutPassword.email,
      subject: 'New Login Alert',
      message: `Hi ${userWithoutPassword.name}, \n\nA new login was detected on your Expense Tracker account. If this was you,  
you can ignore this email. Otherwise, please change your password immediately.`,
    });

    res.json({
      status: 200, token, user: { id: userWithoutPassword.id, name: userWithoutPassword.name, email: userWithoutPassword.email, avatar: userWithoutPassword.avatar }
    });

  } catch (error) {
    console.error("Login error: ", error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });

    // Calculate stats
    const totalTransactions = await Transaction.count({ where: { user_id: req.user.id } });
    const totalSpent = await Transaction.sum('amount', { where: { user_id: req.user.id, type: 'expense' } }) || 0;
    const totalWallet = await Wallet.count({ where: { user_id: req.user.id } });

    res.json({
      status: 200,
      user,
      totalTransactions,
      totalSpent,
      totalWallet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar, bio, phone, location } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    user.name = name || user.name;
    user.avatar = avatar || user.avatar;
    user.bio = bio || user.bio;
    user.phone = phone || user.phone;
    user.location = location || user.location;
    await user.save();

    res.json({ status: 200, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 400, message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ status: 200, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const updateEmailReceive = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }
    user.is_email_receive = !user.is_email_receive;
    await user.save();
    res.json({ status: 200, message: 'Email preference updated', is_email_receive: user.is_email_receive });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
}

const crypto = require('crypto');

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.reset_token = resetToken;
    user.reset_token_expiry = resetTokenExpiry;
    await user.save();

    // Send email via emailService
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    await sendEmail({
      to_name: user.name,
      email: email,
      subject: 'Password Reset Request',
      message: `You requested a password reset. Please click the link below to reset your password: \n\n ${resetUrl} \n\n If you did not request this, please ignore this email.`,
    });

    res.json({ status: 200, message: 'Password reset link sent to your email' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expiry: { [require('sequelize').Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ status: 400, message: 'Invalid or expired token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    res.json({ status: 200, message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  updateEmailReceive,
  forgotPassword,
  resetPassword,
};
