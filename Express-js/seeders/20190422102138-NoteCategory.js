'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */

    return queryInterface.bulkInsert('NoteCategory',[{
      id: 1,
      name:'Call'
    },{
      id: 2,
      name:'Scheduling'
    },{
      id: 3,
      name:'Arrangement'
    },{
      id: 4,
      name:'Special Request'
    },{
      id: 5,
      name:'Purchase Order'
    },{
      id: 6,
      name:'Funeral Scheduling Resource Section'
    },{
      id: 7,
      name:'Work Order'
    },{
      id: 8,
      name:'Cemetery Scheduling'
    }],{

    },{
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
   return queryInterface.bulkDelete('NoteCategory', null, {})

  }
};
