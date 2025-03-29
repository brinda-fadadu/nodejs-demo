'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.bulkInsert('EthnicityHeader',[
    {
      "id": 1,
      "name": "White"
    },
    {
      "id": 2,
      "name": "Black or African American"
    },
    {
      "id": 3,
      "name": "Hispanic"
    },
    {
      "id": 4,
      "name": "Native American or Alaskan Native "
    },
    {
      "id": 5,
      "name": "Asian"
    },
    {
      "id": 6,
      "name": "Native Hawaiian or Other Pacific Islander"
    },
    {
      "id": 7,
      "name": "Other"
    }
  ],{
    logging:console.log
  },{
    id:{
      autoIncrement:true
    }
    
  });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('EthnicityHeader',null, {})
  }
};
