'use strict';

const models = require('../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
     const query = 'Update Certifier SET updatedBy = 2, createdBy = 2 where createdBy IS NULL'
     const orgQuery = 'Update Organization SET updatedBy = 2, createdBy = 2 where createdBy IS NULL'
    let certifierUpdate = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.UPDATE })
    let orgUpdate = await models.sequelize.query(orgQuery, { type: models.sequelize.QueryTypes.UPDATE })

  },

  down: (queryInterface, Sequelize) => {
    // No actions to be done in the down 
  }
};
