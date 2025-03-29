'use strict';
const models = require('../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let propertyDiscountQuery = `
    SELECT Property.id, hmisLotSellUnit.Prpty_Price_4 AS pnPropertyDiscount
    FROM Property
    INNER JOIN [HQS-SQL02].h_000.dbo.Lot_Sell_Unit AS hmisLotSellUnit ON hmisLotSellUnit.Lot_Sell_Unit_ID = Property.lotSellUnitId
    WHERE hmisLotSellUnit.Prpty_Price_4 IS NOT NULL`
    let propertyDiscounts = await models.sequelize.query(propertyDiscountQuery, { type: models.sequelize.QueryTypes.SELECT })
    return await Promise.all(propertyDiscounts.map(async(discount) => {
      await models.Property.update({
        pnPropertyDiscount: discount.pnPropertyDiscount
    }, {
        where: {
            id: discount.id
        }
    })
    }))
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Property', 'pnPropertyDiscount')
  }
};
