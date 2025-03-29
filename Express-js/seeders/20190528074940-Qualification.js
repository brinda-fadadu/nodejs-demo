'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Qualification',[
      {
        "id": 1,
        "name": "1st Grade"
      },
      {
        "id": 2,
        "name": "Some College but no Degree"
      },
      {
        "id": 3,
        "name": "Professional Degree"
      },
      {
        "id": 4,
        "name": "Master's Degree"
      },
      {
        "id": 5,
        "name": "High School Diploma"
      },
      {
        "id": 6,
        "name": "GED"
      },
      {
        "id": 7,
        "name": "Doctorate Degree"
      },
      {
        "id": 8,
        "name": "Bachelor's Degree"
      },
      {
        "id": 9,
        "name": "Associate's Degree"
      },
      {
        "id": 10,
        "name": "12th Grade with no Diploma"
      },
      {
        "id": 11,
        "name": "11th Grade"
      },
      {
        "id": 12,
        "name": "10th Grade"
      },
      {
        "id": 13,
        "name": "9th Grade"
      },
      {
        "id": 14,
        "name": "8th Grade"
      },
      {
        "id": 15,
        "name": "7th Grade"
      },
      {
        "id": 16,
        "name": "6th Grade"
      },
      {
        "id": 17,
        "name": "5th Grade"
      },
      {
        "id": 18,
        "name": "4th Grade"
      },
      {
        "id": 19,
        "name": "3rd Grade"
      },
      {
        "id": 20,
        "name": "2nd Grade"
      },
      {
        "id": 21,
        "name": "Unknown"
      },
      {
        "id": 22,
        "name": "0"
      }
    ],{logging: console.log},{
      id:{
        autoIncrement:true        //Enables identity insertion
      }
    })
  },

  down: (queryInterface, Sequelize) => {

    return queryInterface.bulkDelete('Qualification', null, {})
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};