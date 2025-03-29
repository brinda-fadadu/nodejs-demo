// 'use strict';
const models = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const packagesData = require('./package_data.json')
    let packages= []
   await Promise.all(
     packagesData.map(async package => {
       let location, packageCategory
       location = await models.Location.findOne({
         where: { code: package.locationCode }
       })
       packageCategory = await models.PackageCategory.findOne({
         where: { name: package.packageCategoryName }
       })
       if (location) {
         packages.push({
           code: package.code,
           name: package.name,
           description: '',
           price: package.packagePrice,
           locationId: location.id,
           isActive: package.isActive,
           packageCategoryId: packageCategory.id,
           isTaxable: package.isTaxable
         })
       }
     })
   )

    return queryInterface.bulkInsert('Package', packages, {},{
      id: {
        autoIncrement: true
      }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Package', null, {});
  }
};
