'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('MaritalStatus',[{   
      id: 1,   
      name:'NeverMarried'
    },{
      id: 2,
      name:'Married'
    },{
      id: 3,
      name:'Divorced'
    },{
      id: 4,
      name:'Widowed'
    },{
      id: 5,
      name:'SRDP'
    },{
      id: 6,
      name:'Married/Widowed'
    },{
      id: 7,
      name:'SRDV Survivor'
    },{
      id: 8,
      name:'Unknown'
    }],{

    },{
       id: {
         autoIncrement: true
       }
    })
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */
  },

  down: (queryInterface, Sequelize) => {
   return queryInterface.bulkDelete('MaritalStatus', null, {})
  }
};
