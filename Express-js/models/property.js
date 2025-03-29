'use strict';
module.exports = (sequelize, DataTypes) => {
  const Property = sequelize.define('Property', {
    name: DataTypes.STRING,
    price: DataTypes.DOUBLE,
    ecfAmount: DataTypes.DOUBLE,
    total: DataTypes.DOUBLE,
    propertyItemCode: DataTypes.STRING,
    lotSellUnitId: DataTypes.STRING,
    propertyGardenId: DataTypes.INTEGER,
    propertyTypeCodeId: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    developedDt: DataTypes.STRING,
    preDeveloped: DataTypes.BOOLEAN,
    pnDiscountValue: DataTypes.DECIMAL(10, 2),
    preDevelopedDiscountValue: DataTypes.DECIMAL(10, 2),
    status: DataTypes.STRING,
    pnPropertyDiscount: DataTypes.DECIMAL(10,2)
  }, {
    "timestamps": true,
    tableName: 'Property'
  });
  Property.associate = function(models) {
    // associations can be defined here
    Property.belongsTo(models.PropertyTypeCode, { foreignKey: 'propertyTypeCodeId', as: 'propertyTypeCode'})
    // TODO: Remove this line once QA approval is done
    // Property.belongsTo(models.PropertyType, { foreignKey: 'propertyTypeId', targetKey: 'id', as: 'propertyTypes' })
    Property.belongsTo(models.PropertyGarden, { foreignKey: 'propertyGardenId', targetKey: 'id', as: 'propertyGardens' })
    Property.belongsTo(models.Employee,  { foreignKey: 'updatedBy', targetKey: 'id', as: 'propertyUpdatedBy' })
    Property.hasMany(models.GardenSpecException,  { foreignKey: 'propertyId', sourceKey: 'id' })
    Property.hasMany(models.AgreementProperty,  { foreignKey: 'propertyId', targetKey: 'id', as: 'agreementProperties' })
  };

  // common methods for property
  Property.getDataFromHmis = async function(lotSellUnitIds, lotSpaceIds = []) {
    try {
      const hmisDB = require('../services/hmis/hmisConnection')
      const whereCond = [`Lot_Sell_Unit_ID IN (${lotSellUnitIds.join(', ')})`]
      if (lotSpaceIds.length) {
        whereCond.push(`Lot_Space_ID IN (${lotSpaceIds.join(', ')})`)
      }
      const query = `
      SELECT
      [Lot_Space_ID] as lot_space,
      [Lot_Sell_Unit_ID],
      [Lot_Row_Nbr_Alpha] as lot_section_panel,
      [Lot_Lot_Nbr_Alpha] as row_tier_division,
      COALESCE(NULLIF([Lot_Space_Nbr_2], ''), CAST([Lot_Space_Nbr] AS VARCHAR(15))) as niche_grave_crypt,
      [Lot_Space_Nbr_2] as niche_grave_crypt_2,
      [Lot_Depth] as lot_depth,
      [Location]
      FROM Lot_Space
      WHERE ${whereCond.join(' AND ')}`

      const data = await hmisDB.sequelize.query(query, {
        type: hmisDB.sequelize.QueryTypes.SELECT
      })
      return data
  } catch (error) {
    console.log(error)
  }
  }
  return Property;
};