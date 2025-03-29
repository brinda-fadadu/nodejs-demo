'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('SchedulingAttributeSubSection', [
      {
        "id": 1,
        "schedulingAttributeSectionId": 1,
        "subSection": "date",
        "subSectionLabel": "Placement Date"
      }, {
        "id": 2,
        "schedulingAttributeSectionId": 1,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 3,
        "schedulingAttributeSectionId": 1,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 4,
        "schedulingAttributeSectionId": 2,
        "subSection": "burialAt",
        "subSectionLabel": "Burial at Product Name"
      }, {
        "id": 5,
        "schedulingAttributeSectionId": 2,
        "subSection": "Cemetery",
        "subSectionLabel": "Product Name Cemetery"
      }, {
        "id": 6,
        "schedulingAttributeSectionId": 2,
        "subSection": "cemeteryLocationBlock",
        "subSectionLabel": "Cemetery Location Block"
      }, {
        "id": 7,
        "schedulingAttributeSectionId": 2,
        "subSection": "burialSite",
        "subSectionLabel": "Burial Site"
      }, {
        "id": 8,
        "schedulingAttributeSectionId": 3,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 9,
        "schedulingAttributeSectionId": 3,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 10,
        "schedulingAttributeSectionId": 3,
        "subSection": "pallbearer",
        "subSectionLabel": "Pallbearer"
      }, {
        "id": 11,
        "schedulingAttributeSectionId": 4,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 12,
        "schedulingAttributeSectionId": 4,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 13,
        "schedulingAttributeSectionId": 4,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 14,
        "schedulingAttributeSectionId": 5,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 15,
        "schedulingAttributeSectionId": 5,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 16,
        "schedulingAttributeSectionId": 5,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 17,
        "schedulingAttributeSectionId": 5,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 18,
        "schedulingAttributeSectionId": 5,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 19,
        "schedulingAttributeSectionId": 5,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 20,
        "schedulingAttributeSectionId": 5,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 21,
        "schedulingAttributeSectionId": 5,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 22,
        "schedulingAttributeSectionId": 5,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 23,
        "schedulingAttributeSectionId": 6,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 24,
        "schedulingAttributeSectionId": 7,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 25,
        "schedulingAttributeSectionId": 8,
        "subSection": "date",
        "subSectionLabel": "Cremation Date"
      }, {
        "id": 26,
        "schedulingAttributeSectionId": 8,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 27,
        "schedulingAttributeSectionId": 8,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 28,
        "schedulingAttributeSectionId": 8,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 29,
        "schedulingAttributeSectionId": 9,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 30,
        "schedulingAttributeSectionId": 9,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 31,
        "schedulingAttributeSectionId": 9,
        "subSection": "crematory",
        "subSectionLabel": "Crematory"
      }, {
        "id": 32,
        "schedulingAttributeSectionId": 9,
        "subSection": "pallbearer",
        "subSectionLabel": "Pallbearer"
      }, {
        "id": 33,
        "schedulingAttributeSectionId": 10,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 34,
        "schedulingAttributeSectionId": 10,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 35,
        "schedulingAttributeSectionId": 10,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 36,
        "schedulingAttributeSectionId": 11,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 37,
        "schedulingAttributeSectionId": 11,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 38,
        "schedulingAttributeSectionId": 11,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 39,
        "schedulingAttributeSectionId": 11,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 40,
        "schedulingAttributeSectionId": 11,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 41,
        "schedulingAttributeSectionId": 11,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 42,
        "schedulingAttributeSectionId": 11,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 43,
        "schedulingAttributeSectionId": 11,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 44,
        "schedulingAttributeSectionId": 11,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 45,
        "schedulingAttributeSectionId": 12,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 46,
        "schedulingAttributeSectionId": 13,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 47,
        "schedulingAttributeSectionId": 14,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 48,
        "schedulingAttributeSectionId": 14,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 49,
        "schedulingAttributeSectionId": 14,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 50,
        "schedulingAttributeSectionId": 14,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 51,
        "schedulingAttributeSectionId": 14,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 52,
        "schedulingAttributeSectionId": 14,
        "subSection": "receptionCenter",
        "subSectionLabel": "Reception Center"
      }, {
        "id": 53,
        "schedulingAttributeSectionId": 14,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 54,
        "schedulingAttributeSectionId": 15,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 55,
        "schedulingAttributeSectionId": 16,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 56,
        "schedulingAttributeSectionId": 17,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 57,
        "schedulingAttributeSectionId": 17,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 58,
        "schedulingAttributeSectionId": 17,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 59,
        "schedulingAttributeSectionId": 17,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 60,
        "schedulingAttributeSectionId": 17,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 61,
        "schedulingAttributeSectionId": 17,
        "subSection": "chapel",
        "subSectionLabel": "Chapel"
      }, {
        "id": 62,
        "schedulingAttributeSectionId": 17,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 63,
        "schedulingAttributeSectionId": 18,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 64,
        "schedulingAttributeSectionId": 18,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 65,
        "schedulingAttributeSectionId": 18,
        "subSection": "pallbearer",
        "subSectionLabel": "Pallbearer"
      }, {
        "id": 66,
        "schedulingAttributeSectionId": 19,
        "subSection": "vigil",
        "subSectionLabel": "Vigil service"
      }, {
        "id": 67,
        "schedulingAttributeSectionId": 19,
        "subSection": "trisagion",
        "subSectionLabel": "Trisagion service"
      }, {
        "id": 68,
        "schedulingAttributeSectionId": 19,
        "subSection": "panihida",
        "subSectionLabel": "Panihida service"
      }, {
        "id": 69,
        "schedulingAttributeSectionId": 19,
        "subSection": "rosary",
        "subSectionLabel": "Rosary service"
      }, {
        "id": 70,
        "schedulingAttributeSectionId": 19,
        "subSection": "prayer",
        "subSectionLabel": "Prayer service"
      }, {
        "id": 71,
        "schedulingAttributeSectionId": 19,
        "subSection": "memorial",
        "subSectionLabel": "Memorial Service"
      }, {
        "id": 72,
        "schedulingAttributeSectionId": 19,
        "subSection": "viewlogies",
        "subSectionLabel": "Viewlogies Service"
      }, {
        "id": 73,
        "schedulingAttributeSectionId": 19,
        "subSection": "other",
        "subSectionLabel": "Other Service"
      }, {
        "id": 74,
        "schedulingAttributeSectionId": 19,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 75,
        "schedulingAttributeSectionId": 19,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 76,
        "schedulingAttributeSectionId": 20,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 77,
        "schedulingAttributeSectionId": 20,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 78,
        "schedulingAttributeSectionId": 20,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 79,
        "schedulingAttributeSectionId": 21,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 80,
        "schedulingAttributeSectionId": 21,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 81,
        "schedulingAttributeSectionId": 21,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 82,
        "schedulingAttributeSectionId": 21,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 83,
        "schedulingAttributeSectionId": 21,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 84,
        "schedulingAttributeSectionId": 21,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 85,
        "schedulingAttributeSectionId": 21,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 86,
        "schedulingAttributeSectionId": 21,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 87,
        "schedulingAttributeSectionId": 21,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 88,
        "schedulingAttributeSectionId": 22,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 89,
        "schedulingAttributeSectionId": 23,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 90,
        "schedulingAttributeSectionId": 24,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 91,
        "schedulingAttributeSectionId": 24,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 92,
        "schedulingAttributeSectionId": 24,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 93,
        "schedulingAttributeSectionId": 24,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 94,
        "schedulingAttributeSectionId": 24,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 95,
        "schedulingAttributeSectionId": 24,
        "subSection": "chapel",
        "subSectionLabel": "Chapel"
      }, {
        "id": 96,
        "schedulingAttributeSectionId": 24,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 97,
        "schedulingAttributeSectionId": 25,
        "subSection": "burialAt",
        "subSectionLabel": "Burial at Product Name"
      }, {
        "id": 98,
        "schedulingAttributeSectionId": 25,
        "subSection": "Cemetery",
        "subSectionLabel": "Product Name Cemetery"
      }, {
        "id": 99,
        "schedulingAttributeSectionId": 25,
        "subSection": "cemeteryLocationBlock",
        "subSectionLabel": "Cemetery Location Block"
      }, {
        "id": 100,
        "schedulingAttributeSectionId": 25,
        "subSection": "burialSite",
        "subSectionLabel": "Burial Site"
      }, {
        "id": 101,
        "schedulingAttributeSectionId": 26,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 102,
        "schedulingAttributeSectionId": 26,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 103,
        "schedulingAttributeSectionId": 26,
        "subSection": "pallbearer",
        "subSectionLabel": "Pallbearer"
      }, {
        "id": 104,
        "schedulingAttributeSectionId": 27,
        "subSection": "vigil",
        "subSectionLabel": "Vigil service"
      }, {
        "id": 105,
        "schedulingAttributeSectionId": 27,
        "subSection": "trisagion",
        "subSectionLabel": "Trisagion service"
      }, {
        "id": 106,
        "schedulingAttributeSectionId": 27,
        "subSection": "panihida",
        "subSectionLabel": "Panihida service"
      }, {
        "id": 107,
        "schedulingAttributeSectionId": 27,
        "subSection": "rosary",
        "subSectionLabel": "Rosary service"
      }, {
        "id": 108,
        "schedulingAttributeSectionId": 27,
        "subSection": "prayer",
        "subSectionLabel": "Prayer service"
      }, {
        "id": 109,
        "schedulingAttributeSectionId": 27,
        "subSection": "memorial",
        "subSectionLabel": "Memorial Service"
      }, {
        "id": 110,
        "schedulingAttributeSectionId": 27,
        "subSection": "viewlogies",
        "subSectionLabel": "Viewlogies Service"
      }, {
        "id": 111,
        "schedulingAttributeSectionId": 27,
        "subSection": "other",
        "subSectionLabel": "Other Service"
      }, {
        "id": 112,
        "schedulingAttributeSectionId": 27,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 113,
        "schedulingAttributeSectionId": 27,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 114,
        "schedulingAttributeSectionId": 28,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 115,
        "schedulingAttributeSectionId": 28,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 116,
        "schedulingAttributeSectionId": 28,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 117,
        "schedulingAttributeSectionId": 29,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 118,
        "schedulingAttributeSectionId": 29,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 119,
        "schedulingAttributeSectionId": 29,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 120,
        "schedulingAttributeSectionId": 29,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 121,
        "schedulingAttributeSectionId": 29,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 122,
        "schedulingAttributeSectionId": 29,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 123,
        "schedulingAttributeSectionId": 29,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 124,
        "schedulingAttributeSectionId": 29,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 125,
        "schedulingAttributeSectionId": 29,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 126,
        "schedulingAttributeSectionId": 30,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 127,
        "schedulingAttributeSectionId": 31,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 128,
        "schedulingAttributeSectionId": 32,
        "subSection": "date",
        "subSectionLabel": "Service Date"
      }, {
        "id": 129,
        "schedulingAttributeSectionId": 32,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 130,
        "schedulingAttributeSectionId": 32,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 131,
        "schedulingAttributeSectionId": 32,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 132,
        "schedulingAttributeSectionId": 32,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 133,
        "schedulingAttributeSectionId": 32,
        "subSection": "chapel",
        "subSectionLabel": "Chapel"
      }, {
        "id": 134,
        "schedulingAttributeSectionId": 32,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 135,
        "schedulingAttributeSectionId": 33,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 136,
        "schedulingAttributeSectionId": 33,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 137,
        "schedulingAttributeSectionId": 34,
        "subSection": "vigil",
        "subSectionLabel": "Vigil service"
      }, {
        "id": 138,
        "schedulingAttributeSectionId": 34,
        "subSection": "trisagion",
        "subSectionLabel": "Trisagion service"
      }, {
        "id": 139,
        "schedulingAttributeSectionId": 34,
        "subSection": "panihida",
        "subSectionLabel": "Panihida service"
      }, {
        "id": 140,
        "schedulingAttributeSectionId": 34,
        "subSection": "rosary",
        "subSectionLabel": "Rosary service"
      }, {
        "id": 141,
        "schedulingAttributeSectionId": 34,
        "subSection": "prayer",
        "subSectionLabel": "Prayer service"
      }, {
        "id": 142,
        "schedulingAttributeSectionId": 34,
        "subSection": "memorial",
        "subSectionLabel": "Memorial Service"
      }, {
        "id": 143,
        "schedulingAttributeSectionId": 34,
        "subSection": "viewlogies",
        "subSectionLabel": "Viewlogies Service"
      }, {
        "id": 144,
        "schedulingAttributeSectionId": 34,
        "subSection": "other",
        "subSectionLabel": "Other Service"
      }, {
        "id": 145,
        "schedulingAttributeSectionId": 34,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 146,
        "schedulingAttributeSectionId": 34,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 147,
        "schedulingAttributeSectionId": 35,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 148,
        "schedulingAttributeSectionId": 35,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 149,
        "schedulingAttributeSectionId": 35,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 150,
        "schedulingAttributeSectionId": 36,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 151,
        "schedulingAttributeSectionId": 36,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 152,
        "schedulingAttributeSectionId": 36,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 153,
        "schedulingAttributeSectionId": 36,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 154,
        "schedulingAttributeSectionId": 36,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 155,
        "schedulingAttributeSectionId": 36,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 156,
        "schedulingAttributeSectionId": 36,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 157,
        "schedulingAttributeSectionId": 36,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 158,
        "schedulingAttributeSectionId": 36,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 159,
        "schedulingAttributeSectionId": 37,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 160,
        "schedulingAttributeSectionId": 38,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 161,
        "schedulingAttributeSectionId": 39,
        "subSection": "date",
        "subSectionLabel": "Cremation Date"
      }, {
        "id": 162,
        "schedulingAttributeSectionId":39,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 163,
        "schedulingAttributeSectionId": 39,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 164,
        "schedulingAttributeSectionId": 39,
        "subSection": "serviceLocationBlock",
        "subSectionLabel": "Service Location Block"
      }, {
        "id": 165,
        "schedulingAttributeSectionId": 40,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 166,
        "schedulingAttributeSectionId": 40,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 167,
        "schedulingAttributeSectionId": 40,
        "subSection": "crematory",
        "subSectionLabel": "Crematory"
      }, {
        "id": 168,
        "schedulingAttributeSectionId": 40,
        "subSection": "pallbearer",
        "subSectionLabel": "Pallbearer"
      }, {
        "id": 169,
        "schedulingAttributeSectionId": 41,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 170,
        "schedulingAttributeSectionId": 41,
        "subSection": "outsideCasket",
        "subSectionLabel": "Outside Casket"
      }, {
        "id": 171,
        "schedulingAttributeSectionId": 41,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 172,
        "schedulingAttributeSectionId": 42,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 173,
        "schedulingAttributeSectionId": 42,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 174,
        "schedulingAttributeSectionId": 42,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 175,
        "schedulingAttributeSectionId": 42,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 176,
        "schedulingAttributeSectionId": 42,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 177,
        "schedulingAttributeSectionId": 42,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 178,
        "schedulingAttributeSectionId": 42,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 179,
        "schedulingAttributeSectionId": 42,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 180,
        "schedulingAttributeSectionId": 42,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 181,
        "schedulingAttributeSectionId": 43,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 182,
        "schedulingAttributeSectionId": 44,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 183,
        "schedulingAttributeSectionId": 45,
        "subSection": "date",
        "subSectionLabel": "Disinterment Date"
      }, {
        "id": 184,
        "schedulingAttributeSectionId":45,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 185,
        "schedulingAttributeSectionId": 45,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 186,
        "schedulingAttributeSectionId": 46,
        "subSection": "burialAt",
        "subSectionLabel": "Burial at Product Name"
      }, {
        "id": 187,
        "schedulingAttributeSectionId": 46,
        "subSection": "Cemetery",
        "subSectionLabel": "Product Name Cemetery"
      }, {
        "id": 188,
        "schedulingAttributeSectionId": 46,
        "subSection": "cemeteryLocationBlock",
        "subSectionLabel": "Cemetery Location Block"
      }, {
        "id": 189,
        "schedulingAttributeSectionId": 46,
        "subSection": "burialSite",
        "subSectionLabel": "Burial Site"
      }, {
        "id": 190,
        "schedulingAttributeSectionId": 47,
        "subSection": "hearse",
        "subSectionLabel": "Hearse"
      }, {
        "id": 191,
        "schedulingAttributeSectionId": 47,
        "subSection": "utilityCar",
        "subSectionLabel": "Utility Car"
      }, {
        "id": 192,
        "schedulingAttributeSectionId": 48,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes from Family"
      }, {
        "id": 193,
        "schedulingAttributeSectionId": 49,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes from Staff"
      }, {
        "id": 194,
        "schedulingAttributeSectionId": 50,
        "subSection": "propertyLocation",
        "subSectionLabel": "Property Location"
      }, {
        "id": 195,
        "schedulingAttributeSectionId": 50,
        "subSection": "date",
        "subSectionLabel": "Interment Date"
      }, {
        "id": 196,
        "schedulingAttributeSectionId": 50,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 197,
        "schedulingAttributeSectionId": 50,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 198,
        "schedulingAttributeSectionId": 50,
        "subSection": "temporaryLocation",
        "subSectionLabel": "Temporary Location"
      }, {
        "id": 199,
        "schedulingAttributeSectionId": 50,
        "subSection": "burialTemporaryLocation",
        "subSectionLabel": "Temporary Location - Burial"
      }, {
        "id": 200,
        "schedulingAttributeSectionId": 50,
        "subSection": "memorialInformation",
        "subSectionLabel": "Memorial Information"
      }, {
        "id": 201,
        "schedulingAttributeSectionId": 50,
        "subSection": "preburied",
        "subSectionLabel": "Preburied"
      }, {
        "id": 202,
        "schedulingAttributeSectionId": 51,
        "subSection": "witnessLoweringOrEntombment",
        "subSectionLabel": "Witness Lowering/Entombment"
      }, {
        "id": 203,
        "schedulingAttributeSectionId": 51,
        "subSection": "witnessCoveringOrSealings",
        "subSectionLabel": "Witness Covering/Sealings"
      }, {
        "id": 204,
        "schedulingAttributeSectionId": 51,
        "subSection": "witnessFilling",
        "subSectionLabel": "Witness Filling"
      }, {
        "id": 205,
        "schedulingAttributeSectionId": 51,
        "subSection": "reopenBottom",
        "subSectionLabel": "Reopen Bottom"
      }, {
        "id": 206,
        "schedulingAttributeSectionId": 51,
        "subSection": "burningPot",
        "subSectionLabel": "Burning Pot"
      }, {
        "id": 207,
        "schedulingAttributeSectionId": 51,
        "subSection": "moundOfDirtByFootend",
        "subSectionLabel": "Mound of Dirt by Footend"
      }, {
        "id": 208,
        "schedulingAttributeSectionId": 51,
        "subSection": "useOfTent",
        "subSectionLabel": "Use of Tent"
      }, {
        "id": 209,
        "schedulingAttributeSectionId": 51,
        "subSection": "placeAndNotify",
        "subSectionLabel": "Place and Notify"
      }, {
        "id": 210,
        "schedulingAttributeSectionId": 51,
        "subSection": "reopenTop",
        "subSectionLabel": "Reopen Top"
      }, {
        "id": 211,
        "schedulingAttributeSectionId": 52,
        "subSection": "vault",
        "subSectionLabel": "Vault"
      }, {
        "id": 212,
        "schedulingAttributeSectionId": 52,
        "subSection": "vaultFromDisinterment",
        "subSectionLabel": "Vault from Disinterment"
      }, {
        "id": 213,
        "schedulingAttributeSectionId": 52,
        "subSection": "disinteredVaultDetail",
        "subSectionLabel": "Disintered Vault Detail"
      }, {
        "id": 214,
        "schedulingAttributeSectionId": 53,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 215,
        "schedulingAttributeSectionId": 53,
        "subSection": "outsideFuneralHomeCasket",
        "subSectionLabel": "Outside Funeral Home Casket"
      }, {
        "id": 216,
        "schedulingAttributeSectionId": 53,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 217,
        "schedulingAttributeSectionId": 54,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 218,
        "schedulingAttributeSectionId": 54,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 219,
        "schedulingAttributeSectionId": 54,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 220,
        "schedulingAttributeSectionId": 54,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 221,
        "schedulingAttributeSectionId": 54,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 222,
        "schedulingAttributeSectionId": 54,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 223,
        "schedulingAttributeSectionId": 54,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 224,
        "schedulingAttributeSectionId": 54,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 225,
        "schedulingAttributeSectionId": 54,
        "subSection": "transferRequired",
        "subSectionLabel": "Transfer Required"
      }, {
        "id": 226,
        "schedulingAttributeSectionId": 55,
        "subSection": "vases",
        "subSectionLabel": "Vases"
      }, {
        "id": 227,
        "schedulingAttributeSectionId": 55,
        "subSection": "noOfVases",
        "subSectionLabel": "Vases #"
      }, {
        "id": 228,
        "schedulingAttributeSectionId": 55,
        "subSection": "otherInstructions",
        "subSectionLabel": "Other Instructions"
      }, {
        "id": 229,
        "schedulingAttributeSectionId": 56,
        "subSection": "locationVerifyWithFamily",
        "subSectionLabel": "Location Verify with family"
      }, {
        "id": 230,
        "schedulingAttributeSectionId": 56,
        "subSection": "locationVerifyWithPlattedRecord",
        "subSectionLabel": "Location Verify with Platted record"
      }, {
        "id": 231,
        "schedulingAttributeSectionId": 56,
        "subSection": "electronicCIF",
        "subSectionLabel": "Electronic CIF"
      }, {
        "id": 232,
        "schedulingAttributeSectionId": 57,
        "subSection": "reviewTrustStatement",
        "subSectionLabel": "Review Trust Statement"
      }, {
        "id": 233,
        "schedulingAttributeSectionId": 57,
        "subSection": "confirmExpectedMerchandiseDelivery",
        "subSectionLabel": "Confirm Expected Merchandise Delivery"
      }, {
        "id": 234,
        "schedulingAttributeSectionId": 57,
        "subSection": "confirmPlacementScheduleWithFuneralDirector",
        "subSectionLabel": "Confirm Placement Schedule with Funeral Director"
      }, {
        "id": 235,
        "schedulingAttributeSectionId": 57,
        "subSection": "permit",
        "subSectionLabel": "Permit"
      }, {
        "id": 236,
        "schedulingAttributeSectionId": 58,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 237,
        "schedulingAttributeSectionId": 59,
        "subSection": "funeralLocationBlock",
        "subSectionLabel": "Funeral Location Block"
      }, {
        "id": 238,
        "schedulingAttributeSectionId": 59,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 239,
        "schedulingAttributeSectionId": 59,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 240,
        "schedulingAttributeSectionId": 59,
        "subSection": "funeralHomePhone",
        "subSectionLabel": "Funeral Home Phone"
      }, {
        "id": 241,
        "schedulingAttributeSectionId": 59,
        "subSection": "funeralDirector",
        "subSectionLabel": "Funeral Director"
      }, {
        "id": 242,
        "schedulingAttributeSectionId": 59,
        "subSection": "phone",
        "subSectionLabel": "Phone"
      }, {
        "id": 243,
        "schedulingAttributeSectionId": 59,
        "subSection": "viewingLocation",
        "subSectionLabel": "Viewing Location"
      }, {
        "id": 244,
        "schedulingAttributeSectionId": 59,
        "subSection": "viewingDate",
        "subSectionLabel": "Viewing Date"
      }, {
        "id": 245,
        "schedulingAttributeSectionId": 59,
        "subSection": "viewingStartTime",
        "subSectionLabel": "Start Time"
      }, {
        "id": 246,
        "schedulingAttributeSectionId": 59,
        "subSection": "viewingEndTime",
        "subSectionLabel": "End Time"
      }, {
        "id": 247,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationLocation",
        "subSectionLabel": "Visitation Location"
      }, {
        "id": 248,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationDate",
        "subSectionLabel": "Visitation Date"
      }, {
        "id": 249,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationStartTime",
        "subSectionLabel": "Start Time"
      }, {
        "id": 250,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationEndTime",
        "subSectionLabel": "End Time"
      }, {
        "id": 251,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationLocation2",
        "subSectionLabel": "Visitation Location 2"
      }, {
        "id": 252,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationDate2",
        "subSectionLabel": "Visitation Date 2"
      }, {
        "id": 253,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitation2StartTime",
        "subSectionLabel": "Start Time"
      }, {
        "id": 254,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitation2EndTime",
        "subSectionLabel": "End Time"
      }, {
        "id": 255,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationLocation3",
        "subSectionLabel": "Visitation Location 3"
      }, {
        "id": 256,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitationDate3",
        "subSectionLabel": "Visitation Date 3"
      }, {
        "id": 257,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitation3StartTime",
        "subSectionLabel": "Start Time"
      }, {
        "id": 258,
        "schedulingAttributeSectionId": 59,
        "subSection": "visitation3EndTime",
        "subSectionLabel": "End Time"
      }, {
        "id": 259,
        "schedulingAttributeSectionId": 59,
        "subSection": "receptionRoom",
        "subSectionLabel": "Reception Room"
      }, {
        "id": 260,
        "schedulingAttributeSectionId": 59,
        "subSection": "receptionDate",
        "subSectionLabel": "Reception Date"
      }, {
        "id": 261,
        "schedulingAttributeSectionId": 59,
        "subSection": "receptionStartTime",
        "subSectionLabel": "Start Time"
      }, {
        "id": 262,
        "schedulingAttributeSectionId": 59,
        "subSection": "receptionEndTime",
        "subSectionLabel": "End Time"
      }, {
        "id": 263,
        "schedulingAttributeSectionId": 59,
        "subSection": "specialInstructions",
        "subSectionLabel": "Special Instructions"
      }, {
        "id": 264,
        "schedulingAttributeSectionId": 60,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes From Family"
      }, {
        "id": 265,
        "schedulingAttributeSectionId": 61,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes From Staff"
      }, {
        "id": 266,
        "schedulingAttributeSectionId": 62,
        "subSection": "propertyLocation",
        "subSectionLabel": "Property Location"
      }, {
        "id": 267,
        "schedulingAttributeSectionId": 62,
        "subSection": "date",
        "subSectionLabel": "Cremation Date"
      }, {
        "id": 268,
        "schedulingAttributeSectionId": 62,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 269,
        "schedulingAttributeSectionId": 62,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 270,
        "schedulingAttributeSectionId": 63,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 271,
        "schedulingAttributeSectionId": 63,
        "subSection": "outsideFuneralHomeCasket",
        "subSectionLabel": "Outside Funeral Home Casket"
      }, {
        "id": 272,
        "schedulingAttributeSectionId": 63,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 273,
        "schedulingAttributeSectionId": 64,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 274,
        "schedulingAttributeSectionId": 64,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 275,
        "schedulingAttributeSectionId": 64,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 276,
        "schedulingAttributeSectionId": 64,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 277,
        "schedulingAttributeSectionId": 64,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 278,
        "schedulingAttributeSectionId": 64,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 279,
        "schedulingAttributeSectionId": 64,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 280,
        "schedulingAttributeSectionId": 64,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 281,
        "schedulingAttributeSectionId": 65,
        "subSection": "electronicCIF",
        "subSectionLabel": "Electronic CIF"
      }, {
        "id": 282,
        "schedulingAttributeSectionId": 66,
        "subSection": "reviewTrustStatement",
        "subSectionLabel": "Review Trust Statement"
      }, {
        "id": 283,
        "schedulingAttributeSectionId": 66,
        "subSection": "confirmExpectedMerchandiseDelivery",
        "subSectionLabel": "Confirm Expected Merchandise Delivery"
      }, {
        "id": 284,
        "schedulingAttributeSectionId": 66,
        "subSection": "permit",
        "subSectionLabel": "Permit"
      }, {
        "id": 285,
        "schedulingAttributeSectionId": 67,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 286,
        "schedulingAttributeSectionId": 68,
        "subSection": "funeralLocationBlock",
        "subSectionLabel": "Funeral Location Block"
      }, {
        "id": 287,
        "schedulingAttributeSectionId": 68,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 288,
        "schedulingAttributeSectionId": 68,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 289,
        "schedulingAttributeSectionId": 68,
        "subSection": "funeralHomePhone",
        "subSectionLabel": "Funeral Home Phone"
      }, {
        "id": 290,
        "schedulingAttributeSectionId": 68,
        "subSection": "funeralDirector",
        "subSectionLabel": "Funeral Director"
      }, {
        "id": 291,
        "schedulingAttributeSectionId": 68,
        "subSection": "phone",
        "subSectionLabel": "Phone"
      }, {
        "id": 292,
        "schedulingAttributeSectionId": 68,
        "subSection": "specialInstructions",
        "subSectionLabel": "Special Instructions"
      }, {
        "id": 293,
        "schedulingAttributeSectionId": 69,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes From Family"
      }, {
        "id": 294,
        "schedulingAttributeSectionId": 70,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes From Staff"
      }, {
        "id": 295,
        "schedulingAttributeSectionId": 71,
        "subSection": "propertyLocation",
        "subSectionLabel": "Property Location"
      }, {
        "id": 296,
        "schedulingAttributeSectionId": 71,
        "subSection": "date",
        "subSectionLabel": "Cremation Date"
      }, {
        "id": 297,
        "schedulingAttributeSectionId": 71,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 298,
        "schedulingAttributeSectionId": 71,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 299,
        "schedulingAttributeSectionId": 72,
        "subSection": "casket",
        "subSectionLabel": "Casket"
      }, {
        "id": 300,
        "schedulingAttributeSectionId": 72,
        "subSection": "outsideFuneralHomeCasket",
        "subSectionLabel": "Outside Funeral Home Casket"
      }, {
        "id": 301,
        "schedulingAttributeSectionId": 72,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 302,
        "schedulingAttributeSectionId": 73,
        "subSection": "urn",
        "subSectionLabel": "Urn"
      }, {
        "id": 303,
        "schedulingAttributeSectionId": 73,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 304,
        "schedulingAttributeSectionId": 73,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 305,
        "schedulingAttributeSectionId": 73,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 306,
        "schedulingAttributeSectionId": 73,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 307,
        "schedulingAttributeSectionId": 73,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 308,
        "schedulingAttributeSectionId": 73,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 309,
        "schedulingAttributeSectionId": 73,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 310,
        "schedulingAttributeSectionId": 74,
        "subSection": "electronicCIF",
        "subSectionLabel": "Electronic CIF"
      }, {
        "id": 311,
        "schedulingAttributeSectionId": 75,
        "subSection": "reviewTrustStatement",
        "subSectionLabel": "Review Trust Statement"
      }, {
        "id": 312,
        "schedulingAttributeSectionId": 75,
        "subSection": "confirmExpectedMerchandiseDelivery",
        "subSectionLabel": "Confirm Expected Merchandise Delivery"
      }, {
        "id": 313,
        "schedulingAttributeSectionId": 75,
        "subSection": "permit",
        "subSectionLabel": "Permit"
      }, {
        "id": 314,
        "schedulingAttributeSectionId": 76,
        "subSection": "witnessCremation",
        "subSectionLabel": "Witness Cremation"
      }, {
        "id": 315,
        "schedulingAttributeSectionId": 76,
        "subSection": "numberOfWitness",
        "subSectionLabel": "Number of Witness"
      }, {
        "id": 316,
        "schedulingAttributeSectionId": 77,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 317,
        "schedulingAttributeSectionId": 78,
        "subSection": "funeralLocationBlock",
        "subSectionLabel": "Funeral Location Block"
      }, {
        "id": 318,
        "schedulingAttributeSectionId": 78,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 319,
        "schedulingAttributeSectionId": 78,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 320,
        "schedulingAttributeSectionId": 78,
        "subSection": "funeralHomePhone",
        "subSectionLabel": "Funeral Home Phone"
      }, {
        "id": 321,
        "schedulingAttributeSectionId": 78,
        "subSection": "funeralDirector",
        "subSectionLabel": "Funeral Director"
      }, {
        "id": 322,
        "schedulingAttributeSectionId": 78,
        "subSection": "phone",
        "subSectionLabel": "Phone"
      }, {
        "id": 323,
        "schedulingAttributeSectionId": 78,
        "subSection": "specialInstructions",
        "subSectionLabel": "Special Instructions"
      }, {
        "id": 324,
        "schedulingAttributeSectionId": 79,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes From Family"
      }, {
        "id": 325,
        "schedulingAttributeSectionId": 80,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes From Staff"
      }, {
        "id": 326,
        "schedulingAttributeSectionId": 81,
        "subSection": "temporaryLocation",
        "subSectionLabel": "Temporary Location"
      }, {
        "id": 327,
        "schedulingAttributeSectionId": 81,
        "subSection": "disintermentTemporaryLocation",
        "subSectionLabel": "Temporary Location - Disinterment"
      }, {
        "id": 328,
        "schedulingAttributeSectionId": 82,
        "subSection": "locationVerifyWithFamily",
        "subSectionLabel": "Location Verify with family"
      }, {
        "id": 329,
        "schedulingAttributeSectionId": 82,
        "subSection": "locationVerifyWithPlattedRecord",
        "subSectionLabel": "Location Verify with Platted record"
      }, {
        "id": 330,
        "schedulingAttributeSectionId": 82,
        "subSection": "electronicCIF",
        "subSectionLabel": "Electronic CIF"
      }, {
        "id": 331,
        "schedulingAttributeSectionId": 83,
        "subSection": "reviewTrustStatement",
        "subSectionLabel": "Review Trust Statement"
      }, {
        "id": 332,
        "schedulingAttributeSectionId": 83,
        "subSection": "confirmExpectedMerchandiseDelivery",
        "subSectionLabel": "Confirm Expected Merchandise Delivery"
      }, {
        "id": 333,
        "schedulingAttributeSectionId": 83,
        "subSection": "confirmPlacementScheduleWithFuneralDirector",
        "subSectionLabel": "Confirm Placement Schedule with Funeral Director"
      }, {
        "id": 334,
        "schedulingAttributeSectionId": 83,
        "subSection": "permit",
        "subSectionLabel": "Permit"
      }, {
        "id": 335,
        "schedulingAttributeSectionId": 84,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 336,
        "schedulingAttributeSectionId": 85,
        "subSection": "disintermentReason",
        "subSectionLabel": "Disinterment Reason"
      }, {
        "id": 337,
        "schedulingAttributeSectionId": 85,
        "subSection": "disintermentType",
        "subSectionLabel": "Disinterment Type"
      }, {
        "id": 338,
        "schedulingAttributeSectionId": 85,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 339,
        "schedulingAttributeSectionId": 85,
        "subSection": "propertyLocation",
        "subSectionLabel": "Property Location"
      }, {
        "id": 340,
        "schedulingAttributeSectionId": 85,
        "subSection": "requestDate",
        "subSectionLabel": "Request Date"
      }, {
        "id": 341,
        "schedulingAttributeSectionId": 85,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 342,
        "schedulingAttributeSectionId": 85,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 343,
        "schedulingAttributeSectionId": 86,
        "subSection": "funeralLocationBlock",
        "subSectionLabel": "Funeral Location Block"
      }, {
        "id": 344,
        "schedulingAttributeSectionId": 86,
        "subSection": "Facilities",
        "subSectionLabel": "Product Name Facilities"
      }, {
        "id": 345,
        "schedulingAttributeSectionId": 86,
        "subSection": "FacilitiesLocation",
        "subSectionLabel": "Product Name Facilities Location"
      }, {
        "id": 346,
        "schedulingAttributeSectionId": 86,
        "subSection": "funeralHomePhone",
        "subSectionLabel": "Funeral Home Phone"
      }, {
        "id": 347,
        "schedulingAttributeSectionId": 86,
        "subSection": "funeralDirector",
        "subSectionLabel": "Funeral Director"
      }, {
        "id": 348,
        "schedulingAttributeSectionId": 86,
        "subSection": "phone",
        "subSectionLabel": "Phone"
      }, {
        "id": 349,
        "schedulingAttributeSectionId": 86,
        "subSection": "specialInstructions",
        "subSectionLabel": "Special Instructions"
      }, {
        "id": 350,
        "schedulingAttributeSectionId": 87,
        "subSection": "notesFromFamily",
        "subSectionLabel": "Notes From Family"
      }, {
        "id": 351,
        "schedulingAttributeSectionId": 88,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes From Staff"
      }, {
        "id": 352,
        "schedulingAttributeSectionId": 89,
        "subSection": "date",
        "subSectionLabel": "Cremation Date"
      }, {
        "id": 353,
        "schedulingAttributeSectionId": 89,
        "subSection": "beginningTime",
        "subSectionLabel": "Beginning Time"
      }, {
        "id": 354,
        "schedulingAttributeSectionId": 89,
        "subSection": "endingTime",
        "subSectionLabel": "Ending Time"
      }, {
        "id": 355,
        "schedulingAttributeSectionId": 90,
        "subSection": "outsideFuneralHomeCasket",
        "subSectionLabel": "Outside Funeral Home Casket"
      }, {
        "id": 356,
        "schedulingAttributeSectionId": 90,
        "subSection": "casketType",
        "subSectionLabel": "Casket Type"
      }, {
        "id": 357,
        "schedulingAttributeSectionId": 91,
        "subSection": "familyOwnedUrn",
        "subSectionLabel": "Family Owned Urn"
      }, {
        "id": 358,
        "schedulingAttributeSectionId": 91,
        "subSection": "height",
        "subSectionLabel": "Height"
      }, {
        "id": 359,
        "schedulingAttributeSectionId": 91,
        "subSection": "width",
        "subSectionLabel": "Width"
      }, {
        "id": 360,
        "schedulingAttributeSectionId": 91,
        "subSection": "depth",
        "subSectionLabel": "Depth"
      }, {
        "id": 361,
        "schedulingAttributeSectionId": 91,
        "subSection": "urnType",
        "subSectionLabel": "Urn Type"
      }, {
        "id": 362,
        "schedulingAttributeSectionId": 91,
        "subSection": "urnStatus",
        "subSectionLabel": "Urn Status"
      }, {
        "id": 363,
        "schedulingAttributeSectionId": 91,
        "subSection": "receivedDate",
        "subSectionLabel": "Received Date"
      }, {
        "id": 364,
        "schedulingAttributeSectionId": 93,
        "subSection": "witnessCremation",
        "subSectionLabel": "Witness Cremation"
      }, {
        "id": 365,
        "schedulingAttributeSectionId": 93,
        "subSection": "numberOfWitness",
        "subSectionLabel": "Number of Witness"
      }, {
        "id": 366,
        "schedulingAttributeSectionId": 94,
        "subSection": "otherSpecialInstruction",
        "subSectionLabel": "Other Special Instruction"
      }, {
        "id": 367,
        "schedulingAttributeSectionId": 95,
        "subSection": "notesFromStaff",
        "subSectionLabel": "Notes From Staff"
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
