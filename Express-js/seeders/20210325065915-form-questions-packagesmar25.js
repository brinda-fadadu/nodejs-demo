'use strict';
const models = require('../models');

const getFormQuestions = async () => {
  let forms = await models.Form.findAll({ where: {} })
  forms = JSON.parse(JSON.stringify(forms))
  const anCremationPackageId = forms.find(ele => ele.title === 'AN Cremation Package').id
  const anCemeteryPackageId = forms.find(ele => ele.title === 'AN Cemetery Package').id

  return [
 
  {
    id: 3,
    formId: anCemeteryPackageId,
    question: 'Site verified by family prior to placement',
    options: 'Verified,Waived',
    isMandatory: true
  },
  {
    id: 4,
    formId: anCremationPackageId,
    question: 'Disposition options',
    options: 'Release to Funeral Home,Send by US priority mail,Other lawful disposition,Placement at Project ,Placement at Olivet,Release to other',
    isMandatory: true
  },
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