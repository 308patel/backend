const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupTransactionMember = sequelize.define('GroupTransactionMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  group_transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'GroupTransactions',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  }
}, {
  timestamps: true,
});

GroupTransactionMember.associate = (models) => {
  GroupTransactionMember.belongsTo(models.GroupTransaction, { foreignKey: 'group_transaction_id' });
  GroupTransactionMember.belongsTo(models.User, { foreignKey: 'user_id' });
};

module.exports = GroupTransactionMember;
