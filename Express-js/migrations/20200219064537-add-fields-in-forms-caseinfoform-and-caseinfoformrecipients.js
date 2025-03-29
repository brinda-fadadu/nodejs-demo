'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    try {
      return Promise.all([
        queryInterface.addColumn('Form', 'docusignTemplateId', { type: Sequelize.STRING }),
        queryInterface.addColumn('Form', 'isList', { type: Sequelize.BOOLEAN }),
        queryInterface.removeColumn( 'Form', 'docusignId'),
        queryInterface.addColumn('CaseInfoForm', 'agreementId', { 
          type: Sequelize.DataTypes.INTEGER,
          references: {
            model: 'Agreement',
            key: 'id'
          }
        }),
        queryInterface.addColumn('CaseInfoFormRecipient', 'otherRecipientId', { 
          type: Sequelize.DataTypes.INTEGER,
          references: {
            model: 'OtherRecipient',
            key: 'id'
          }
        }),
        queryInterface.addColumn('CaseInfoFormRecipient', 'agreementPersonId', { 
          type: Sequelize.DataTypes.INTEGER,
          references: {
            model: 'AgreementPerson',
            key: 'id'
          }
        }),
        queryInterface.addColumn('CaseInfoFormRecipient', 'availableInPerson', { type: Sequelize.DataTypes.BOOLEAN })
        
      ])
    } catch (error) {
      console.log(error)      
    }
  },

  down: (queryInterface, Sequelize) => {
   return Promise.all([
    queryInterface.removeColumn('Form', 'docusignTemplateId'),
    queryInterface.removeColumn('Form', 'isList'),
    queryInterface.addColumn('Form', 'docusignId', { type: Sequelize.DataTypes.STRING }),
    queryInterface.removeColumn('CaseInfoForm', 'agreementId'),
    queryInterface.removeColumn('CaseInfoFormRecipient', 'otherRecipientId'),
    queryInterface.removeColumn('CaseInfoFormRecipient', 'agreementPersonId'),
    queryInterface.removeColumn('CaseInfoFormRecipient', 'availableInPerson')
   ])
  }
};