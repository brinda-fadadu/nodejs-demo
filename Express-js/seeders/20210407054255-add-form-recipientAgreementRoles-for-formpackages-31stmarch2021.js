'use strict';
const models = require('../models');
const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({ where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const co_purchaserId = agreementRoles.find(ele => ele.name === 'Co-purchaser').id
  const payorId = agreementRoles.find(ele => ele.name === 'Payor').id
  const beneficiaryId = agreementRoles.find(ele => ele.name === 'Beneficiary').id
  return [
    {
      id: 55,
      formRecipientRoleId: 211,
      agreementRoleId: purchaserId
    },
    {
      id: 56,
      formRecipientRoleId: 212,
      agreementRoleId: co_purchaserId
    },
    {
      id: 57,
      formRecipientRoleId: 216,
      agreementRoleId: payorId
    },
    {
      id: 58,
      formRecipientRoleId: 217,
      agreementRoleId: payorId
    },
    {
      id: 59,
      formRecipientRoleId: 221,
      agreementRoleId: purchaserId
    },
    {
      id: 60,
      formRecipientRoleId: 222,
      agreementRoleId: co_purchaserId
    },
    {
      id: 61,
      formRecipientRoleId: 224,
      agreementRoleId: payorId
    },
    // {
    //   id: 62,
    //   formRecipientRoleId: 225,
    //   agreementRoleId: payorId
    // }
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
