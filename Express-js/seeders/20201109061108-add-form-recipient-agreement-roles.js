'use strict';
const models = require('../models');

const getFormRecipientAgreementRoles = async () => {
  let agreementRoles = await models.AgreementRole.findAll({  where: {} })
  agreementRoles = JSON.parse(JSON.stringify(agreementRoles))
  const purchaserId = agreementRoles.find(ele => ele.name === 'Purchaser').id
  const co_purchaserId = agreementRoles.find(ele => ele.name === 'Co-purchaser').id
  const payorId = agreementRoles.find(ele => ele.name === 'Payor').id

  return [{
    id: 21,
    formRecipientRoleId: 129,
    agreementRoleId: purchaserId
  },
  {
    id: 22,
    formRecipientRoleId: 130,
    agreementRoleId: co_purchaserId
  },{
    id: 23,
    formRecipientRoleId: 132,
    agreementRoleId: purchaserId
  },
  {
    id: 24,
    formRecipientRoleId: 133,
    agreementRoleId: co_purchaserId
  },
  {
    id: 25,
    formRecipientRoleId: 135,
    agreementRoleId: purchaserId
  },
  {
    id: 26,
    formRecipientRoleId: 136,
    agreementRoleId: co_purchaserId
  },
  {
    id: 27,
    formRecipientRoleId: 138,
    agreementRoleId: purchaserId
  },
  {
    id: 28,
    formRecipientRoleId: 139,
    agreementRoleId: co_purchaserId
  },
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