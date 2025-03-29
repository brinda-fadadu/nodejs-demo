'use strict';
const models = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const chapelData = [
      {
        "id": 18,
        "name": "Lawn - Reception Room"
      }, {
        "id": 19,
        "name": "Newall Chapel - Reception Tent"
      }, {
        "id": 20,
        "name": "Noble Chapel - Reception Tent"
      },
      {
        "id": 21,
        "name": "Sneider & Sullivan - Reception Room"
      }
    ]
    await Promise.all(
      chapelData.map(async(eachchapel) => {
        let inputdata = {
          id: eachchapel['id'],
          name: eachchapel['name']
        }
        await models.Chapel.create(inputdata)
      })
    )
    return true
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Chapel', null, { truncate: true });

  }
};
