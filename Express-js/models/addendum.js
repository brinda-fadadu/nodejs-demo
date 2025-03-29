'use strict';
module.exports = (sequelize, DataTypes) => {
  const Addendum = sequelize.define('Addendum', {
    agreementId: DataTypes.INTEGER,
    addendumNumber: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    isValidated: DataTypes.BOOLEAN,
    status: {
      type: DataTypes.STRING,
      defaultValue: 'In progress'
    }
  }, {
    tableName: 'Addendum',
    timestamps: true
  });
  Addendum.associate = function(models) {
    // associations can be defined here
    Addendum.belongsTo(models.Agreement, { foreignKey: 'agreementId' })
    Addendum.hasOne(models.HMISAddendumDataSync, {
      foreignKey: 'addendumId',
      as: 'hmisAddendumSyncDetails'
    })
  };
  return Addendum;
};