'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    return queryInterface.bulkInsert('FinanceMemo', [
      {
        "id": 1,
        "years": 1,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 2,
        "years": 1,
        "minDownPayment": 10,
        "maxDownPayment": 100,
        "financingDiscount": 3.5,
        "achDiscount": 1,
      },
      {
        "id": 3,
        "years": 2,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 4,
        "years": 2,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 5,
        "years": 2,
        "minDownPayment": 15,
        "maxDownPayment": 20,
        "financingDiscount": 3,
        "achDiscount": 1,
      },
      {
        "id": 6,
        "years": 2,
        "minDownPayment": 20,
        "maxDownPayment": 100,
        "financingDiscount": 3,
        "achDiscount": 1,
      },
      {
        "id": 7,
        "years": 3,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 8,
        "years": 3,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 9,
        "years": 3,
        "minDownPayment": 15,
        "maxDownPayment": 30,
        "financingDiscount": 3,
        "achDiscount": 1,
      },
      {
        "id": 10,
        "years": 3,
        "minDownPayment": 30,
        "maxDownPayment": 100,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 11,
        "years": 4,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 12,
        "years": 4,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 13,
        "years": 4,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 3,
        "achDiscount": 1,
      },
      {
        "id": 14,
        "years": 5,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      },
      {
        "id": 15,
        "years": 5,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 16,
        "years": 5,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 17,
        "years": 6,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      },
      {
        "id": 18,
        "years": 6,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 19,
        "years": 6,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 2.5,
        "achDiscount": 1,
      },
      {
        "id": 20,
        "years": 7,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 1,
        "achDiscount": 1,
      },
      {
        "id": 21,
        "years": 7,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      },
      {
        "id": 22,
        "years": 7,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 23,
        "years": 8,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 1,
        "achDiscount": 1,
      },
      {
        "id": 24,
        "years": 8,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      },
      {
        "id": 25,
        "years": 8,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 2,
        "achDiscount": 1,
      },
      {
        "id": 26,
        "years": 9,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 0.5,
        "achDiscount": 1,
      },
      {
        "id": 27,
        "years": 9,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 1,
        "achDiscount": 1,
      },
      {
        "id": 28,
        "years": 9,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      },
      {
        "id": 29,
        "years": 10,
        "minDownPayment": 5,
        "maxDownPayment": 10,
        "financingDiscount": 0.5,
        "achDiscount": 1,
      },
      {
        "id": 30,
        "years": 10,
        "minDownPayment": 10,
        "maxDownPayment": 15,
        "financingDiscount": 1,
        "achDiscount": 1,
      },
      {
        "id": 31,
        "years": 10,
        "minDownPayment": 15,
        "maxDownPayment": 100,
        "financingDiscount": 1.5,
        "achDiscount": 1,
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete('FinanceMemo', null, {});
  }
};
