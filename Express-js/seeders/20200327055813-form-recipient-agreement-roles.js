'use strict';
const models = require('../models');

const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({  where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const co_purchaserId = agreementRoles.find(ele => ele.name === 'Co-purchaser').id
  const payorId = agreementRoles.find(ele => ele.name === 'Payor').id

  return [{
    id: 1,
    formRecipientRoleId: 57,
    agreementRoleId: purchaserId
  },
  {
    id: 2,
    formRecipientRoleId: 58,
    agreementRoleId: co_purchaserId
  },
  {
    id: 3,
    formRecipientRoleId: 63,
    agreementRoleId: purchaserId
  },
  {
    id: 4,
    formRecipientRoleId: 64,
    agreementRoleId: co_purchaserId
  },
  {
    id: 5,
    formRecipientRoleId: 67,
    agreementRoleId: purchaserId
  },
  {
    id: 6,
    formRecipientRoleId: 68,
    agreementRoleId: co_purchaserId
  },
  {
    id: 7,
    formRecipientRoleId: 36,
    agreementRoleId: purchaserId
  },
  {
    id: 8,
    formRecipientRoleId: 13,
    agreementRoleId: purchaserId
  },
  {
    id: 9,
    formRecipientRoleId: 14,
    agreementRoleId: co_purchaserId
  },
  {
    id: 10,
    formRecipientRoleId: 19,
    agreementRoleId: purchaserId
  },
  {
    id: 11,
    formRecipientRoleId: 87,
    agreementRoleId: purchaserId
  },
  {
    id: 12,
    formRecipientRoleId: 88,
    agreementRoleId: co_purchaserId
  },{
    id: 13,
    formRecipientRoleId: 98,
    agreementRoleId: purchaserId
  },
  {
    id: 14,
    formRecipientRoleId: 99,
    agreementRoleId: co_purchaserId
  },{
    id: 15,
    formRecipientRoleId: 102,
    agreementRoleId: purchaserId
  },
  {
    id: 16,
    formRecipientRoleId: 103,
    agreementRoleId: co_purchaserId
  },{
    id: 17,
    formRecipientRoleId: 106,
    agreementRoleId: payorId
  },
  {
    id: 18,
    formRecipientRoleId: 169,
    agreementRoleId: payorId
  },
  {
    id: 19,
    formRecipientRoleId: 125,
    agreementRoleId: purchaserId
  },
  {
    id: 20,
    formRecipientRoleId: 126,
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