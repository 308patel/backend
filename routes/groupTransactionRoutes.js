const express = require('express');
const router = express.Router();
const { GroupTransaction, UserGroup, User, Group, GroupTransactionMember, Notification } = require('../models');
const { sendEmail } = require('../utils/emailService');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Helper function to check if user is in group
const checkGroupMembership = async (userId, groupId) => {
  const membership = await UserGroup.findOne({ where: { user_id: userId, group_id: groupId } });
  return !!membership;
};

// Create a group transaction
router.post('/', async (req, res) => {
  try {
    const { group_id } = req.body;
    
    // Check if user is in group
    const isMember = await checkGroupMembership(req.user.id, group_id);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'You are not a member of this group' });
    }

    req.body.paid_by = req.user.id;
    const { involved_members } = req.body;
    
    const transaction = await GroupTransaction.create(req.body);
    const group = await Group.findByPk(group_id);
    const payer = await User.findByPk(req.user.id);

    const notifyUser = async (userId) => {
      if (userId === req.user.id) return; // Don't notify the payer
      const user = await User.findByPk(userId);
      
      await Notification.create({
        user_id: userId,
        message: `${payer.name} added a new expense "${transaction.name}" in "${group.groupname}"`,
        type: 'expense',
        related_id: transaction.id
      });

      // Send Email Notification
      if (user.is_email_receive) {
        await sendEmail({
          to_name: user.name,
          email: user.email,
          subject: 'New Group Expense',
          message: `Hi ${user.name}, \n\n${payer.name} added a new expense "${transaction.name}" in the group "${group.groupname}". \n\nAmount: ${transaction.amount}\nCategory: ${transaction.category}`,
        });
      }
    };
    
    if (involved_members && Array.isArray(involved_members) && involved_members.length > 0) {
      await Promise.all(involved_members.map(async (memberData) => {
        const userId = typeof memberData === 'object' ? memberData.user_id : memberData;
        const memberAmount = typeof memberData === 'object' ? memberData.amount : null;
        
        await GroupTransactionMember.create({
          group_transaction_id: transaction.id,
          user_id: userId,
          amount: memberAmount
        });
        
        await notifyUser(userId);
      }));
    } else {
      // Default: Everyone in the group is involved
      const members = await UserGroup.findAll({ where: { group_id } });
      await Promise.all(members.map(async (m) => {
        await GroupTransactionMember.create({
          group_transaction_id: transaction.id,
          user_id: m.user_id
        });
        await notifyUser(m.user_id);
      }));
    }

    return res.status(201).json({ status: 201, message: 'Group transaction created successfully', data: transaction });
  } catch (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }
});

// Get all transactions for a specific group
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const isMember = await checkGroupMembership(req.user.id, groupId);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'You are not a member of this group' });
    }

    const transactions = await GroupTransaction.findAll({
      where: { group_id: groupId },
      include: [
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
        { 
          model: User, 
          as: 'involvedMembers', 
          attributes: ['id', 'name'],
          through: { attributes: ['amount'] }
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json({ status: 200, data: transactions });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }
});

// Get balances for all members in a group
router.get('/balances/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const isMember = await checkGroupMembership(req.user.id, groupId);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'You are not a member of this group' });
    }

    // 1. Get the group and its members
    const group = await Group.findByPk(groupId, {
      include: [{ model: User, as: 'members', attributes: ['id', 'name'] }]
    });

    if (!group || !group.members || group.members.length === 0) {
      return res.status(404).json({ status: 404, message: 'Group or members not found' });
    }

    // 2. Get all transactions for the group with involved members
    const transactions = await GroupTransaction.findAll({
      where: { group_id: groupId },
      include: [{ 
        model: User, 
        as: 'involvedMembers', 
        attributes: ['id'],
        through: { attributes: ['amount'] }
      }]
    });

    const totalSpent = transactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // 3. Calculate balances
    const memberBalances = {};
    group.members.forEach(m => {
      memberBalances[m.id] = {
        user_id: m.id,
        username: m.name,
        amountPaid: 0,
        totalShare: 0
      };
    });

    transactions.forEach(t => {
      const amount = parseFloat(t.amount);
      const payerId = t.paid_by;
      
      if (memberBalances[payerId]) {
        memberBalances[payerId].amountPaid += amount;
      }

      const involved = t.involvedMembers || [];
      if (involved.length > 0) {
        if (t.split_type === 'unequal') {
          involved.forEach(m => {
            const memberShare = parseFloat(m.GroupTransactionMember?.amount || 0);
            if (memberBalances[m.id]) {
              memberBalances[m.id].totalShare += memberShare;
            }
          });
        } else {
          const share = amount / involved.length;
          involved.forEach(m => {
            if (memberBalances[m.id]) {
              memberBalances[m.id].totalShare += share;
            }
          });
        }
      }
    });

    const balances = Object.values(memberBalances).map(b => ({
      ...b,
      amountPaid: parseFloat(b.amountPaid.toFixed(2)),
      balance: parseFloat((b.amountPaid - b.totalShare).toFixed(2))
    }));

    return res.json({ 
      status: 200, 
      data: {
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        balances 
      }
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    return res.status(500).json({ status: 500, message: error.message });
  }
});

// Get a single transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transaction = await GroupTransaction.findByPk(req.params.id, {
      include: [
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ status: 404, message: 'Transaction not found' });
    }

    const isMember = await checkGroupMembership(req.user.id, transaction.group_id);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'You do not have access to this transaction' });
    }

    return res.json({ status: 200, data: transaction });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await GroupTransaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ status: 404, message: 'Transaction not found' });
    }

    const isMember = await checkGroupMembership(req.user.id, transaction.group_id);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'Permission denied' });
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
    const transaction = await GroupTransaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ status: 404, message: 'Transaction not found' });
    }

    const isMember = await checkGroupMembership(req.user.id, transaction.group_id);
    if (!isMember) {
      return res.status(403).json({ status: 403, message: 'Permission denied' });
    }

    await transaction.destroy();
    return res.json({ status: 200, message: 'Transaction deleted successfully' });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }
});

module.exports = router;
