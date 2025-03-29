'use strict';
module.exports = (sequelize, DataTypes) => {
  const NoteCategory = sequelize.define('NoteCategory', {
    name: DataTypes.STRING
  }, {
    tableName:'NoteCategory',
    timestamps: false
  });
  NoteCategory.associate = function(models) {
    // associations can be defined here
    
  };
  return NoteCategory;
};