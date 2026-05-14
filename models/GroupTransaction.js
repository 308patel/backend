const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupTransaction = sequelize.define('GroupTransaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING, 
    defaultValue: DataTypes.NOW,
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false,
  },
  paid_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Groups',
      key: 'id'
    }
  },
  split_type: {
    type: DataTypes.ENUM('equal', 'unequal'),
    defaultValue: 'equal',
  }
}, {
  timestamps: true,
});

GroupTransaction.associate = (models) => {
  GroupTransaction.belongsTo(models.User, { foreignKey: 'paid_by', as: 'payer' });
  GroupTransaction.belongsTo(models.Group, { foreignKey: 'group_id', as: 'group' });
  GroupTransaction.belongsToMany(models.User, { 
    through: models.GroupTransactionMember, 
    as: 'involvedMembers',
    foreignKey: 'group_transaction_id',
    otherKey: 'user_id'
  });
};

module.exports = GroupTransaction;
