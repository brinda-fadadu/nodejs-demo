'use strict'
const models = require('../models')
module.exports = {
  up: (queryInterface, Sequelize) => {
    return models.Language.bulkCreate([
      {
        id:1,
        name: 'English'
      },
      {
        id:2,
        name: 'Chinese - Cantonese'
      },
      {
        id:3,
        name: 'Chinese - Mandarin'
      },
      { 
        id:4,
        name: 'Spanish'
      },
      {
        id:5,
        name: 'Tagalog'
      }
    ], {logging: console.log},{
      id:{
        autoIncrement:true        //Enables identity insert true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Language', null, {})
  }
}
