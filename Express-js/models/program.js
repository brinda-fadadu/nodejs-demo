'use strict';
module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    personId: DataTypes.INTEGER,
    mainPageURL: DataTypes.STRING,
    leftPageURL: DataTypes.STRING,
    rightPageURL: DataTypes.STRING,
    backPageURL: DataTypes.STRING,
    isLocked: DataTypes.BOOLEAN,
    lastSubmittedAt: DataTypes.DATE
  }, {
      timestamps: true,
      tableName: 'Program',
  });
  Program.associate = function (models) {
    // associations can be defined here
    Program.belongsTo(models.Person, { foreignKey: 'personId' });
  };
  return Program;
};