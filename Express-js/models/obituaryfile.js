'use strict';
module.exports = (sequelize, DataTypes) => {
  const ObituaryFile = sequelize.define('ObituaryFile', {
    personId: DataTypes.INTEGER,
    fileUrl: DataTypes.STRING,
    fileType: DataTypes.STRING,
    createdBy: DataTypes.INTEGER
  }, {
    tableName: 'ObituaryFile',
    timestamps: true
  });
  ObituaryFile.associate = function(models) {
    // associations can be defined here
    ObituaryFile.belongsTo(models.Person, { foreignKey: 'personId', as: 'Person' })
    ObituaryFile.belongsTo(models.User, {foreignKey:'createdBy'})
    ObituaryFile.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'obituaryFileAudioUrl'
    })
  };
  return ObituaryFile;
};