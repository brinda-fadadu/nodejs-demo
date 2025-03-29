'use strict';
const models = require('../models');

const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({ where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const co_purchaserId = agreementRoles.find(ele => ele.name === 'Co-purchaser').id
  const payorId = agreementRoles.find(ele => ele.name === 'Payor').id


  return [
    {
      id: 38,
      formRecipientRoleId: 166,
      agreementRoleId: payorId
    },
    {
      id: 39,
      formRecipientRoleId: 167,
      agreementRoleId: payorId
    },
    {
      id: 40,
      formRecipientRoleId: 168,
      agreementRoleId: co_purchaserId
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
