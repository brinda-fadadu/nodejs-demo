'use strict';
const { sequelize } = require('../../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`INSERT INTO AgreementItemCategoryMapper(agreementItemMapperId,itemCategoryId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Flowers') AS MAPPERID,(SELECT ID FROM ItemCategory WHERE name = 'Floral') AS ITEMCATEGORYID`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemCategoryMapper(agreementItemMapperId,itemCategoryId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Cremation container') AS MAPPERID,(SELECT ID FROM ItemCategory WHERE name = 'minimal container') AS ITEMCATEGORYID`,
      { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemCategoryMapper(agreementItemMapperId,itemCategoryId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'casket') AS MAPPERID,(SELECT ID FROM ItemCategory WHERE name = 'casket') AS ITEMCATEGORYID`,
    { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemCategoryMapper(agreementItemMapperId,itemCategoryId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Cremation urn') AS MAPPERID,(SELECT ID FROM ItemCategory WHERE name = 'Keepsake') AS ITEMCATEGORYID`,
    { type: sequelize.QueryTypes.SELECT })
    await sequelize.query(`INSERT INTO AgreementItemCategoryMapper(agreementItemMapperId,itemCategoryId)
    SELECT (SELECT Id FROM AgreementItemMapper WHERE name = 'Cremation urn') AS MAPPERID,(SELECT ID FROM ItemCategory WHERE name = 'Urn') AS ITEMCATEGORYID`,
    { type: sequelize.QueryTypes.SELECT })
    
    return true
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementItemCategoryMapper', null, {});
  }
};
