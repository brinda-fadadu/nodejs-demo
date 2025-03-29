'use strict';
module.exports = (sequelize, DataTypes) => {
  const GenericSection = sequelize.define('GenericSection', {
    isLocationVerifiedWithFamily: DataTypes.BOOLEAN,
    isLocationVerifiedWithPlattedRecord: DataTypes.BOOLEAN,
    isElectronicCIF: DataTypes.BOOLEAN,
    reviewedTrustStatement: DataTypes.BOOLEAN,
    confirmedExpectedMerchandiseDelivery: DataTypes.BOOLEAN,
    confirmedPlacementScheduleWithFuneralDirector: DataTypes.BOOLEAN,
    isPermitted: DataTypes.BOOLEAN,
    isWitnessedCremation: DataTypes.BOOLEAN,
    noOfWitness: DataTypes.INTEGER,
    instruction: DataTypes.TEXT
  }, {
    tableName: 'GenericSection',
    timestamps: false
  });
  GenericSection.associate = function(models) {
    // associations can be defined here
  };
  return GenericSection;
};