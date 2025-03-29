'use strict';
module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    resourceId: DataTypes.INTEGER,
    resourceName: DataTypes.STRING,
    folderName: DataTypes.STRING,
    originalFileName: DataTypes.STRING
  }, {
    tableName: 'File',
    timestamps: true
  });
  File.associate = function (models) {
  };
  return File;
};