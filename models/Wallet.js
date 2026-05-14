const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  class: {
    type: DataTypes.STRING,
    allowNull: true, // CSS class for frontend styling
  },
  expires: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
});

Wallet.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Wallet, { foreignKey: 'user_id' });

module.exports = Wallet;
