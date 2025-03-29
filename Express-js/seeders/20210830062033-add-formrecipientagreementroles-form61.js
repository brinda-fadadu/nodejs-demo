'use strict';
const models = require('../models');
const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({ where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  return [
    {
      id: 65,
      formRecipientRoleId: 240,
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

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientAgreementRole', null, {})
  }
};
