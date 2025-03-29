// 'use strict';
const models = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const packageItems = require('./package_location_item.json')
    
    let packageLocationItems=[], packagePrice={}
    await Promise.all(packageItems.map(async (packageItem) => {
    let packages, location, locationItem
     location = await models.Location.findOne({ where : { code: packageItem.locationCode}})
     packages = await models.Package.findOne({where : { code : packageItem.packageCode,locationId: location.id}})
     item = await models.Item.findOne({ where : {code : packageItem.itemCode } })
     locationItem = await models.LocationItem.findOne({ where: {locationId : location.id , itemId: item.id}})
     if (locationItem) {
        packageLocationItems.push({
          packageId: packages.id,
          quantity: packageItem.quantity,
          isActive: packageItem.isActive,
          locationItemId: locationItem.id
        })
      }
    }))
   
    return queryInterface.bulkInsert('PackageLocationItem', packageLocationItems, {},{
      id: {
        autoIncrement: true
      }
    });
  
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PackageLocationItem', null, {});
  }
};
