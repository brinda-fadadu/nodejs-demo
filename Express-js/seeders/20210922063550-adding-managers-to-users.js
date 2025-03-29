'use strict';
const csvtojson = require('csvtojson')
const models = require('../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let result
    if (process.env.NODE_ENV === 'production') {
      result = await csvtojson().fromFile(process.cwd()+'/seeders/prod-managers.csv')
      console.log("production", result)
    } else if (process.env.NODE_ENV === 'preproduction') {
      result = await csvtojson().fromFile(process.cwd()+'/seeders/preprod-managers.csv')
      console.log("preproduction", result)
  } else {
    result = await csvtojson().fromFile(process.cwd()+'/seeders/qa-managers.csv')
  }
await Promise.all(result.map(async res=> {
  if (res.Manager_ID !== 'NULL') {
    const employeeId = await models.Employee.findOne({
      where: {
        salesCounselorId: res.Manager_ID
      }
    })
    if (employeeId) {
      await models.sequelize.query(`UPDATE [User] SET reportingManagerId=${employeeId.id} WHERE name='${res.Name}'`, { type: models.sequelize.QueryTypes.UPDATE })
    }
  }
}))
return true 
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
