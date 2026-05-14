const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  groupname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
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

Group.associate = (models) => {
    Group.belongsToMany(models.User, { through: models.UserGroup, as: 'members', foreignKey: 'group_id', otherKey: 'user_id' });
    Group.hasMany(models.Invitation, { foreignKey: 'group_id', as: 'invitations' });
    Group.hasMany(models.GroupTransaction, { foreignKey: 'group_id', as: 'transactions' });
};
module.exports = Group;
