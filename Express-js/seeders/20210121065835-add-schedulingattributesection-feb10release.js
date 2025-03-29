'use strict';
const models = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let attributeValues = await models.AttributeValue.findAll({ where: {} })
    attributeValues = JSON.parse(JSON.stringify(attributeValues))
    const funeralCremationId = attributeValues.find(ele => ele.name === 'Funeral Cremation Service').id
    const funeralWitnessCremationId = attributeValues.find(ele => ele.name === 'Funeral Witness Cremation Service').id
    const cemeteryCremationId = attributeValues.find(ele => ele.name === 'Cemetery Cremation Service').id
    const cemeteryWitnessCremationId = attributeValues.find(ele => ele.name === 'Cemetery Witness Cremation Services').id

    return queryInterface.bulkInsert('SchedulingAttributeSection', [
      {
        "id": 96,
        "agreementType": 1,
        "attributeValueId": funeralCremationId,
        "type": "Funeral",
        "section": "Supporting document"
      }, {
        "id": 97,
        "agreementType": 1,
        "attributeValueId": funeralWitnessCremationId,
        "type": "Funeral",
        "section": "Supporting document"
      }, {
        "id": 98,
        "agreementType": 2,
        "attributeValueId": cemeteryCremationId,
        "type": "Cemetery",
        "section": "Supporting document"
      }, {
        "id": 99,
        "agreementType": 2,
        "attributeValueId": cemeteryWitnessCremationId,
        "type": "Cemetery",
        "section": "Supporting document"
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('SchedulingAttributeSection', null, { truncate: true });
  }
};
