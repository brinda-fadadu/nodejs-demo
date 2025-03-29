'use strict';
const { sequelize } = require('../../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Visitors register') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Register') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Acknowledgement cards') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Acknowledgement cards') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Memorial folders/ Prayer cards') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Folders') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Crematory charges') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Funeral Cremation Service') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Crematory charges') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Cemetery Cremation Service') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Crematory charges') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Cemetery Witness Cremation Services') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemAttributeValueMapper(agreementItemMapperId,attributeValueId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Crematory charges') AS AgreementItemMapperId,(SELECT ID FROM AttributeValue WHERE name = 'Funeral Witness Cremation Service') AS AttributeValueId`,
      { type: sequelize.QueryTypes.SELECT })
    return true
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementItemAttributeValueMapper', null, {});
  }
};
