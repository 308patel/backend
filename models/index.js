const User = require('./User');
const Group = require('./Group');
const Invitation = require('./Invitation');
const UserGroup = require('./UserGroup');
const Transaction = require('./Transaction');
const Wallet = require('./Wallet');
const GroupTransaction = require('./GroupTransaction');
const GroupTransactionMember = require('./GroupTransactionMember');
const Notification = require('./Notification');

const models = { User, Group, Invitation, UserGroup, Transaction, Wallet, GroupTransaction, GroupTransactionMember, Notification };

// Run all association hooks
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = models;
