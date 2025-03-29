'use strict'
const _ = require('lodash')
const { getSheetData } = require('../seed-scripts')
const models = require('../../models')
const { LocationItem } = require('../../models')
const { Item } = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('Sheet1', '202109_itemupdate02.xlsx')
    // let jsonData = await getSheetData('DEACTIVATE', '202109_itemupdate02.xlsx')
    jsonData = jsonData.map(ele => {
      const obj = {
        itemId: ele.id,
        itemCode: ele.code,
        itemName: ele.name,
        price1: Number(ele['1 - CCS']).toFixed(2),
        price2: Number(ele['2 - CFS']).toFixed(2),
        price3: Number(ele['3 - ACC']).toFixed(2),
        price4: Number(ele['4 - CNG']).toFixed(2),
        price5: Number(ele['5 - MDC']).toFixed(2),
        price6: Number(ele['6 - SSO']).toFixed(2)
      }
      return obj
    })

    return await Promise.all(
      jsonData.map(async item => {
        let itemData = await models.Item.findOne({
          where: {
            code: item.itemCode
          }
        })
        const itemId = _.get(itemData, 'id', null)
        if (itemId) {
          // updating price for location 1, 2, 3, 4, 5, 6
          for (const [i, price] of [
            item.price1,
            item.price2,
            item.price3,
            item.price4,
            item.price5,
            item.price6
          ].entries()) {
            await LocationItem.update(
              {
                price: price || 0
              },
              {
                where: {
                  itemId: itemId,
                  locationId: i + 1
                }
              }
            )
          }

          // Deactivate Items
          // await Item.update(
          //   {
          //     isActive: 0
          //   },
          //   {
          //     where: {
          //       id: itemId
          //     }
          //   }
          // )
        }
      })
    )
  },

  down: async (queryInterface, Sequelize) => {
    return true
  }
}
