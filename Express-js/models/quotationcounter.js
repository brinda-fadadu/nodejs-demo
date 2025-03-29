'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const QuotationCounter = sequelize.define(
    'QuotationCounter',
    {
      year: DataTypes.INTEGER,
      value: DataTypes.STRING
    },
    {
      tableName: 'QuotationCounter',
      timestamps: true
    }
  )
  return QuotationCounter;
};