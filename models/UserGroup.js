const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserGroup = sequelize.define('UserGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Groups',
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
  }
}, {
  timestamps: true,
});

UserGroup.associate = (models) => {
  UserGroup.belongsTo(models.User, { foreignKey: 'user_id' });
  UserGroup.belongsTo(models.Group, { foreignKey: 'group_id' });
};

module.exports = UserGroup;
