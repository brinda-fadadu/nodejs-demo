'use strict';
const models = require('../models');

const getFormRecipientContactRoles = async () => {
  let roles = await models.ContactRole.findAll({ where: {} })
  roles = JSON.parse(JSON.stringify(roles))
  const nokId = roles.find(ele => ele.name === 'Next of Kin').id
  const powerOfattorneyId = roles.find(ele => ele.name === 'Power of Attorney').id

  return [{
    id: 80,
    formRecipientRoleId: 25,
    contactRoleId: powerOfattorneyId
  },
  {
    id: 81,
    formRecipientRoleId: 25,
    contactRoleId: nokId
  },
]
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const formRecipientContactRoles = await getFormRecipientContactRoles()
    return queryInterface.bulkInsert('FormRecipientContactRole', formRecipientContactRoles, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientContactRole', null, {})
  }
};