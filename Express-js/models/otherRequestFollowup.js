'use strict';
module.exports = (sequelize, DataTypes) => {
  const OtherRequestFollowUp = sequelize.define('OtherRequestFollowUp', {
    otherRequestId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OtherRequest',
        key: 'id'
      }
    },
    followUpTypeId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'FollowUpType',
        key: 'id'
      }
    },
  }, {
    tableName: 'OtherRequestFollowUp',
    timestamps: false
  });
  OtherRequestFollowUp.associate = function(models) {
    // associations can be defined here
    OtherRequestFollowUp.belongsTo(models.OtherRequest, { foreignKey: 'otherRequestId', targetKey: 'id' })
    OtherRequestFollowUp.belongsTo(models.FollowUpType, { foreignKey: 'followUpTypeId', targetKey: 'id' })
  };
  return OtherRequestFollowUp;
};