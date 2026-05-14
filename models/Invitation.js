const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Groups',
      key: 'id'
    }
  },
  invited_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
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
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  }
}, {
  timestamps: true,
});

Invitation.associate = (models) => {
    Invitation.belongsTo(models.User, { foreignKey: 'invited_by', as: 'inviter' });
    Invitation.belongsTo(models.User, { foreignKey: 'user_id', as: 'invitee' });
    Invitation.belongsTo(models.Group, { foreignKey: 'group_id', as: 'group' });
};
module.exports = Invitation;
