'use strict';
const csv = require('csvtojson');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const result = await csv().fromFile(process.cwd()+'/seeders/zipcodes.csv')
    console.log(result)
    return queryInterface.bulkInsert('Zipcode', result, {
      logging: console.log
    }, {
      id: {
        autoIncrement:true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Zipcode', null, {})
  }
};
