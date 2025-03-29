'use strict';
const {
  getSheetData
} = require('../seed-scripts')
const models = require('../../models/index')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('Vendor')
    const vendorData = await Promise.all(jsonData.map(async (ele) => {
      let addressData =  {
        line1: ele.Address,
        state: ele.State,
        city: ele.City,
        zipcode: ele.Zip,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      let address = await models.Address.create(addressData)

      console.log('Address id: ', address.id)

      let addressId = address.id

      let vendorData = {
        id: ele.id, 
        code: ele.code,
        name: ele.name,
        email: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'UAT' ? ele.email : 'a@gmail.com',
        addressId
      }

      return vendorData
    }))
    console.log(vendorData)
    return queryInterface.bulkInsert('Vendor', vendorData, {},{
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([      
      queryInterface.bulkDelete('Vendor', {}, {
        truncate: true
      })
    ])
  }
};
