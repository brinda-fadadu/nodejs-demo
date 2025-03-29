'use strict';
module.exports = (sequelize, DataTypes) => {
  const ContactRole = sequelize.define('ContactRole', {
    name: DataTypes.STRING,
    contactType: DataTypes.INTEGER
  }, {
    tableName: 'ContactRole',
    timestamps: false
  });
  ContactRole.associate = function(models) {
  
  };
  return ContactRole;
};