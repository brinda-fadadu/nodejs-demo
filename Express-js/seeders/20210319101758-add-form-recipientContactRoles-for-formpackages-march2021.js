'use strict';
const models = require('../models');

const getFormRecipientContactRoles = async () => {
  let roles = await models.ContactRole.findAll({ where: {} })
  roles = JSON.parse(JSON.stringify(roles))
  const funeralAuthorizerId = roles.find(ele => ele.name === 'Funeral Authorizer').id
  const nokId = roles.find(ele => ele.name === 'Next of Kin').id
  const powerOfattorneyId = roles.find(ele => ele.name === 'Power of Attorney').id

  return [
    {
      id: 82,
      formRecipientRoleId: 178,
      contactRoleId: funeralAuthorizerId
    },
    {
      id:83,
      formRecipientRoleId: 182,
      contactRoleId: funeralAuthorizerId
    },
    {
      id:84,
      formRecipientRoleId: 183,
      contactRoleId: nokId
    },
    {
      id:85,
      formRecipientRoleId: 184,
      contactRoleId: nokId
    },
    {
      id:86,
      formRecipientRoleId: 185,
      contactRoleId: nokId
    },
    {
      id:87,
      formRecipientRoleId: 186,
      contactRoleId: nokId
    },
    {
      id:88,
      formRecipientRoleId: 187,
      contactRoleId: nokId
    },
    {
      id:89,
      formRecipientRoleId: 188,
      contactRoleId: nokId
    },
    {
      id:90,
      formRecipientRoleId: 189,
      contactRoleId: nokId
    },
    {
      id:91,
      formRecipientRoleId: 190,
      contactRoleId: nokId
    },
    {
      id: 92,
      formRecipientRoleId: 197,
      contactRoleId: nokId
    },
    {
      id: 93,
      formRecipientRoleId: 197,
      contactRoleId: powerOfattorneyId
    },{
      id: 94,
      formRecipientRoleId: 197,
      contactRoleId: funeralAuthorizerId
    },{
      id: 95,
      formRecipientRoleId: 178,
      contactRoleId: nokId
    },{
      id: 96,
      formRecipientRoleId: 178,
      contactRoleId: powerOfattorneyId
    },{
      id: 97,
      formRecipientRoleId: 182,
      contactRoleId: nokId
    },{
      id: 98,
      formRecipientRoleId: 182,
      contactRoleId: powerOfattorneyId
    }
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
