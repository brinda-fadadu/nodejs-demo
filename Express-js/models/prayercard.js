'use strict';
module.exports = (sequelize, DataTypes) => {
  const PrayerCard = sequelize.define('PrayerCard', {
    personId: DataTypes.INTEGER,
    frontPageURL: DataTypes.STRING,
    backPageURL: DataTypes.STRING,
    isLocked: DataTypes.BOOLEAN,
    lastSubmittedAt: DataTypes.DATE,
    isCustom: DataTypes.BOOLEAN
  }, {
      timestamps: true,
      tableName: 'PrayerCard',
  });

  PrayerCard.associate = function (models) {
    // associations can be defined here
    PrayerCard.belongsTo(models.Person, { foreignKey: 'personId' });
  };
  return PrayerCard;
};