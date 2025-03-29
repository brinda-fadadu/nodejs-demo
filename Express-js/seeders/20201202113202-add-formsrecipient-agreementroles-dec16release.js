'use strict';
const models = require('../models');

const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({  where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const co_purchaserId = agreementRoles.find(ele => ele.name === 'Co-purchaser').id

  return [{
    id: 32,
    formRecipientRoleId: 151,
    agreementRoleId: purchaserId
  },
  {
    id: 33,
    formRecipientRoleId: 152,
    agreementRoleId: co_purchaserId
  },{
    id: 34,
    formRecipientRoleId: 153,
    agreementRoleId: co_purchaserId
  },{
    id: 35,
    formRecipientRoleId: 154,
    agreementRoleId: co_purchaserId
  },{
    id: 36,
    formRecipientRoleId: 159,
    agreementRoleId: purchaserId
  },{
    id: 37,
    formRecipientRoleId: 162,
    agreementRoleId: purchaserId
  }
  ]
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const formRecipientAgreementRoles = await getFormRecipientAgreementRoles()
    return queryInterface.bulkInsert('FormRecipientAgreementRole', formRecipientAgreementRoles, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientAgreementRole', null, {})
  }
};