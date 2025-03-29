'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('SchedulingAttributeSubSection', [
      {
        "id": 372,
        "schedulingAttributeSectionId": 100,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 373,
        "schedulingAttributeSectionId": 100,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 374,
        "schedulingAttributeSectionId": 100,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 375,
        "schedulingAttributeSectionId": 100,
        "subSection": "Facilities",
        "subSectionLabel": "Facilities"
      }, {
        "id": 376,
        "schedulingAttributeSectionId": 100,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Facilities Location"
      }, {
        "id": 377,
        "schedulingAttributeSectionId": 100,
        "subSection": "reception",
        "subSectionLabel": "Reception"
      }, {
        "id": 378,
        "schedulingAttributeSectionId": 100,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      },{
        "id": 379,
        "schedulingAttributeSectionId": 101,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 380,
        "schedulingAttributeSectionId": 102,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      },
      {
        "id": 381,
        "schedulingAttributeSectionId": 103,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 382,
        "schedulingAttributeSectionId": 103,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 383,
        "schedulingAttributeSectionId": 103,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 384,
        "schedulingAttributeSectionId": 103,
        "subSection": "Facilities",
        "subSectionLabel": "Facilities"
      }, {
        "id": 385,
        "schedulingAttributeSectionId": 103,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Facilities Location"
      }, {
        "id": 386,
        "schedulingAttributeSectionId": 103,
        "subSection": "chapel",
        "subSectionLabel": "Chapel"
      }, {
        "id": 387,
        "schedulingAttributeSectionId": 103,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      },{
        "id": 388,
        "schedulingAttributeSectionId": 104,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 389,
        "schedulingAttributeSectionId": 104,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 390,
        "schedulingAttributeSectionId": 105,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 391,
        "schedulingAttributeSectionId": 106,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 392,
        "schedulingAttributeSectionId": 107,
        "subSection": "vigil",
        "subSectionLabel": "Vigil service"
      }, {
        "id": 393,
        "schedulingAttributeSectionId": 107,
        "subSection": "trisagion",
        "subSectionLabel": "Trisagion service"
      }, {
        "id": 394,
        "schedulingAttributeSectionId": 107,
        "subSection": "panihida",
        "subSectionLabel": "Panihida service"
      }, {
        "id": 395,
        "schedulingAttributeSectionId": 107,
        "subSection": "rosary",
        "subSectionLabel": "Rosary service"
      }, {
        "id": 396,
        "schedulingAttributeSectionId": 107,
        "subSection": "prayer",
        "subSectionLabel": "Prayer service"
      }, {
        "id": 397,
        "schedulingAttributeSectionId": 107,
        "subSection": "memorial",
        "subSectionLabel": "Memorial Service"
      }, {
        "id": 398,
        "schedulingAttributeSectionId": 107,
        "subSection": "viewlogies",
        "subSectionLabel": "Viewlogies Service"
      }, {
        "id": 399,
        "schedulingAttributeSectionId": 107,
        "subSection": "other",
        "subSectionLabel": "Other Service"
      }, {
        "id": 400,
        "schedulingAttributeSectionId": 107,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 401,
        "schedulingAttributeSectionId": 107,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      },{
        "id": 402,
        "schedulingAttributeSectionId": 108,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 403,
        "schedulingAttributeSectionId": 108,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 404,
        "schedulingAttributeSectionId": 108,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 405,
        "schedulingAttributeSectionId": 109,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 406,
        "schedulingAttributeSectionId": 109,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 407,
        "schedulingAttributeSectionId": 109,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 408,
        "schedulingAttributeSectionId": 109,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 409,
        "schedulingAttributeSectionId": 109,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 410,
        "schedulingAttributeSectionId": 109,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 411,
        "schedulingAttributeSectionId": 109,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 412,
        "schedulingAttributeSectionId": 109,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 413,
        "schedulingAttributeSectionId": 109,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
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
