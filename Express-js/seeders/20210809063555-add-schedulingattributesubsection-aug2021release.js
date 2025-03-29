'use strict';
const models = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('SchedulingAttributeSubSection', [
      {
        "id": 414,
        "schedulingAttributeSectionId": 1,
        "subSection": "noGraveSideReason",
        "subSectionLabel": "No Graveside Reason"
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('SchedulingAttributeSubSection', null, { truncate: true });
  }
};
