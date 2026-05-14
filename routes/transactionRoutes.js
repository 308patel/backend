const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { sequelize } = require('../config/db');
const { where, Op } = require('sequelize');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
console.log('--- Transaction Routes Loaded ---');

// Get transactions with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const { search, category, startDate, endDate } = req.query;
    
    let whereClause = { user_id: req.user.id };
    
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }
    
    if (category && category !== 'All') {
      whereClause.category = category;
    }
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'category', 'amount', 'date', 'type', 'createdAt'],
      limit: limit,
      offset: offset
    });

    const card = await Wallet.findAll({where: { user_id: req.user.id, balance: { [Op.gt]: 0}},attributes:['id','name','balance','type']});

    const totalIncome = await Transaction.sum('amount', { where: { type: 'income', user_id: req.user.id } }) || 0;
    const totalExpense = await Transaction.sum('amount', { where: { type: 'expense', user_id: req.user.id } }) || 0;
    const totalBalance = totalIncome + totalExpense;

    return res.json({ 
      status: 200, 
      data: transactions,
      totalIncome,
      totalExpense,
      totalBalance,
      card,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.log("error: ", error);
    return res.status(500).json({ status:500,message: error.message });
  }
});

// Create a transaction
router.post('/', async (req, res) => {
  try {
    req.body.user_id = req.user.id;
    const card = await Wallet.findByPk(req.body.cardId);
    if (!card) {
      return res.status(404).json({ status: 404,message: 'Card not found' });
    }
    if (card.balance < req.body.amount) {
      return res.status(400).json({ status: 400,message: 'Insufficient balance' });
    }

    console.log("body: ", req.body);
    if(req.body.type == 'expense'){
      card.balance = Number(card.balance) - Number(req.body.amount);
    }else{
      card.balance = Number(card.balance) + Number(req.body.amount);
    }
    await card.save();
    const transaction = await Transaction.create(req.body);

    // Send Transaction Email
    const user = await User.findByPk(req.user.id);
    if (user.is_email_receive) {
      await sendEmail({
        to_name: user.name,
        email: user.email,
        subject: `New ${transaction.type} recorded`,
        message: `Hi ${user.name}, \n\nA new ${transaction.type} has been recorded: \n\nName: ${transaction.name}\nAmount: ${transaction.amount}\nCategory: ${transaction.category}`,
      });
    }

    return res.status(201).json({status:201,message: 'Transaction created successfully', data:transaction});
  } catch (error) {
   return res.status(400).json({ status:400,message: error.message });
  }
});

// Get stats by category
router.get('/stats/categories', async (req, res) => {
  try {
    const stats = await Transaction.findAll({
      where: { user_id: req.user.id },
      attributes: [
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['category']
    });
    return res.json({status:200,data:stats});
  } catch (error) {
    return res.status(500).json({ status:500,message: error.message });
  }
});

// Get stats by month (Last 6 months)
router.get('/stats/monthly', async (req, res) => {
  try {
    const stats = await Transaction.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type = 'income' THEN amount ELSE 0 END")), 'income'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type = 'expense' THEN amount ELSE 0 END")), 'expense']
      ],
      group: ['month'],
      order: [[sequelize.col('month'), 'ASC']],
      limit: 6
    });
    return res.json({status:200,data:stats});
  } catch (error) {
    return res.status(500).json({ status:500,message: error.message });
  }
});

// Get a single transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      attributes: ['id', 'name', 'category', 'amount', 'date', 'type', 'createdAt']
    });

    if (!transaction) {
      return res.status(404).json({ status: 404, message: 'Transaction not found' });
    }

    return res.json({ status: 200, data: transaction });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!transaction) {
      return res.status(404).json({ status: 404, message: 'Transaction not found' });
    }

    await transaction.update(req.body);
    return res.json({ status: 200, message: 'Transaction updated successfully', data: transaction });
  } catch (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    res.json({ status: 200,message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
});

module.exports = router;
