'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserTeam = sequelize.define('UserTeam', {
    userId: DataTypes.INTEGER,
    teamId: DataTypes.INTEGER,
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE
    },
    deletedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
  }, {
    tableName: 'UserTeam',
    timestamps: true
  });
  UserTeam.associate = function(models) {
    // associations can be defined here
    UserTeam.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'userTeams'
    })
    UserTeam.belongsTo(models.Team, {
      foreignKey: 'teamId',
      as:'team'
    })
  };
  return UserTeam;
}; 