'use strict';
const models = require('../models');

const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({  where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const payorId = agreementRoles.find(ele => ele.name === 'Payor').id

  return [{
    id: 29,
    formRecipientRoleId: 142,
    agreementRoleId: purchaserId
  },
  {
    id: 30,
    formRecipientRoleId: 145,
    agreementRoleId: purchaserId
  },{
    id: 31,
    formRecipientRoleId: 146,
    agreementRoleId: payorId
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