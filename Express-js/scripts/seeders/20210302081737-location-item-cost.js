'use strict';
const { getSheetData } = require('../seed-scripts')
const models = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let locationItems = await getSheetData('LocationItem')
    let jsonData = []    
    let locations  = await models.Location.findAll({ where: {} })
    locations = JSON.parse(JSON.stringify(locations))
    for (let i = 0; i < locationItems.length; i++) {
      let itemId = await models.Item.findOne({ where: { code: locationItems[i].item_cd } })
      for(let j = 0; j < locations.length; j++) {
        if(locationItems[i][`${locations[j].code}Price`]) {
          let locationItem = {}
          locationItem.price = locationItems[i][`${locations[j].code}Price`]
          locationItem.locationId = [locations[j].id]
          locationItem.itemId = itemId.id
          jsonData.push(locationItem)
        }      
      }
    }

    await Promise.all(jsonData.map(async(locationItem) => {
      await models.LocationItem.update({ price: locationItem.price }, {
            where: {
              itemId: locationItem.itemId,
              locationId: locationItem.locationId
            }
        })
    }))

    return true
  },

  down: async (queryInterface, Sequelize) => {
    return true
  }
};
