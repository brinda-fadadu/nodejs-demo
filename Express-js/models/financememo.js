'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FinanceMemo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  FinanceMemo.init({
    years: DataTypes.INTEGER, // No.of Years
    minDownPayment: DataTypes.DECIMAL(10, 2), // Min Down Payment in percentage
    maxDownPayment: DataTypes.DECIMAL(10, 2), // Max Down Payment in percentage
    financingDiscount: DataTypes.DECIMAL(10, 2),
    achDiscount: DataTypes.DECIMAL(10, 2)
  }, {
    sequelize,
    modelName: 'FinanceMemo',
    tableName: 'FinanceMemo',
    timestamps: false
  });
  return FinanceMemo;
};