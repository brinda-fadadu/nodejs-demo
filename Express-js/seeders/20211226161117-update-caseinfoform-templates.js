'use strict';
const models = require('../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Fetching the formId existing caseinfoform records
      let fetchFormIdExistingRecordsFromCaseInfoForm = `SELECT * FROM CaseInfoForm WHERE formId is not null`

      let caseInfoFormsWithFormIds = await models.sequelize.query(fetchFormIdExistingRecordsFromCaseInfoForm, {
        type: models.sequelize.QueryTypes.SELECT
      })
      console.log("formId not null records:", fetchFormIdExistingRecordsFromCaseInfoForm.length)
      let newCaseInfoFormTemplates = []
      await Promise.all(caseInfoFormsWithFormIds.map(async cif => {
        newCaseInfoFormTemplates.push({
          caseInfoFormId: cif.id,
          formId: cif.formId,
          addendumId: cif.addendumId,
          agreementId: cif.agreementId
        })
      }))
      console.log("new template records:", newCaseInfoFormTemplates.length)
      const result = await models.CaseInfoFormTemplate.bulkCreate(newCaseInfoFormTemplates)
      console.log(result)
      console.log(result.length)
      return result
    } catch (error) {
      console.log(error)
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No actions to be done in the down 
  }
};
