const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');

const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Get all wallets
router.get('/', async (req, res) => {
  try {
    const wallets = await Wallet.findAll({ where: { user_id: req.user.id } });
    res.status(200).json({ status:200, message: "Wallets fetched successfully", wallets });
  } catch (error) {
    res.status(500).json({ status:500, message: error.message });
  }
});

// Create a wallet
router.post('/', async (req, res) => {
  try {
    req.body.user_id = req.user.id;
    const wallet = await Wallet.create(req.body);
    console.log("wallet wallt", wallet)
    return res.status(201).json({ status:200, message: "Wallet created successfully", wallet });
  } catch (error) {
    console.log("error", error)
    res.status(400).json({ status:400, message: error.message });
  }
});

// Update wallet balance
router.put('/:id', async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (wallet) {
      await wallet.update(req.body);
      res.status(200).json({ status:200, message: "Wallet updated successfully", wallet });
    } else {
      res.status(404).json({status:400, message: 'Wallet not found' });
    }
  } catch (error) {
    res.status(400).json({ status:400, message: error.message });
  }
});

module.exports = router;
