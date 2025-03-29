'use strict';
const csvtojson = require('csvtojson')
const fs = require('fs')
const models = require('../models')
const _ = require('lodash');
module.exports = {
  up: async (queryInterface, Sequelize) => {

    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
       const result =  await csvtojson().fromFile(process.cwd()+'/seeders/properties.csv')
       return queryInterface.bulkInsert('Property', result)

    } else {
      try {        
        const lotSellUnitsJson = await csvtojson().fromFile(process.cwd()+'/seeders/hmis_lot_sell.csv')      
        const lotSellUnitsArray = _.map(lotSellUnitsJson,ele => ele.hmis_lot_sell)      
        // const query = fs.readFileSync(process.cwd()+'/seeders/properties-query.sql', 'utf-8')
        return  models.sequelize.query(`[dbo].[sp_insertProperties] `, {          
        })
      } catch(err) {        
        throw err
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Property',{
      where: {}
    }, {
      truncate: true
    })
  }
};
