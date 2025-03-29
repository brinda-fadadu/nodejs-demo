'use strict';
const models = require('../models');

const getFormQuestions = async () => {
  let forms = await models.Form.findAll({ where: {} })
  forms = JSON.parse(JSON.stringify(forms))
  const insuranceFormId = forms.find(ele => ele.title === 'Claim and Assignment of Insurance Policy').id

  return [
    {
      id: 5,
      formId: insuranceFormId,
      question: 'Check payable to',
      options: 'Product Name Cremation Society,All County Cremation Service,Crosby-N. Gray & Co. Funeral Home,Miller-Dutra Coastside Chapel & Funeral Home,Sneider & Sullivan & O’Connell’s Funeral Home',
      isMandatory: true
    }
  ]
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const formQuestions = await getFormQuestions()
    return queryInterface.bulkInsert('FormQuestion', formQuestions, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormQuestion', null, {})
  }
};
