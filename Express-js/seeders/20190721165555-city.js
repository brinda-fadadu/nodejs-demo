'use strict';
const csv = require('csvtojson')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const result = await csv().fromFile(process.cwd()+'/seeders/cities.csv')
    return queryInterface.bulkInsert('City', result, {
      logging: console.log
    },{
      id: {
        autoIncrement: true
      }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('City', null, {})
  }
};
