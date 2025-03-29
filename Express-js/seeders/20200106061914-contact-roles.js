'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      'ContactRole',
      [{ "id": 1, "name": "Informant", "contactType": 3 },
      { "id": 2, "name": "Honorary Pallbearer", "contactType": 2 },
      { "id": 3, "name": "Unspecified", "contactType": 3 },
      { "id": 4, "name": "Informant", "contactType": 1 },
      { "id": 5, "name": "Other Participants", "contactType": 3 },
      { "id": 6, "name": "Musician", "contactType": 3 },
      { "id": 7, "name": "Honorary Pallbearer", "contactType": 1 },
      { "id": 8, "name": "Officiant", "contactType": 3 },
      { "id": 9, "name": "Death Announcement Recipient", "contactType": 1 },
      { "id": 10, "name": "Power of Attorney", "contactType": 1 },
      { "id": 11, "name": "Funeral Authorizer", "contactType": 1 },
      { "id": 12, "name": "Email Recipient", "contactType": 1 },
      { "id": 13, "name": "Pallbearer", "contactType": 2 },
      { "id": 14, "name": "Next of Kin", "contactType": 1 },
      { "id": 15, "name": "Usher", "contactType": 3 },
      { "id": 16, "name": "Notifier", "contactType": 1 }],
      {}, {
      id: {
        autoIncrement: true
      }
    }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ContactRole', null, {})
  }
}