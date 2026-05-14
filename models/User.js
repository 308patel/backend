const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_email_receive: {
    type:DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  }

    
}, {
  timestamps: true,
});

User.associate = (models) => {
  User.hasMany(models.GroupTransaction, { foreignKey: 'paid_by', as: 'groupTransactions' });
  User.belongsToMany(models.Group, { through: models.UserGroup, as: 'groups', foreignKey: 'user_id', otherKey: 'group_id' });
  User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
};

module.exports = User;
