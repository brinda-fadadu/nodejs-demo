'use strict';
module.exports = (sequelize, DataTypes) => {
  const PersonContactRole = sequelize.define('PersonContactRole', {
    roleId: DataTypes.INTEGER,
    personContactId: DataTypes.INTEGER
  }, {
    tableName: 'PersonContactRole',
    timestamps: false
  });
  PersonContactRole.associate = function(models) {
    // associations can be defined here
    PersonContactRole.belongsTo(models.ContactRole, {
      foreignKey: 'roleId',
      as: 'role'
    })

  };
  return PersonContactRole;
};