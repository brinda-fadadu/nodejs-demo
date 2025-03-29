'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`SET IDENTITY_INSERT FollowUpType ON`)
    await queryInterface.bulkInsert('FollowUpType', [
      {
        id:1,
        name: 'Heritage Foundation Questions'
      },
      {
        id:2,
        name: 'Upcoming Tour Informations'
      },
      {
        id:3,
        name: 'Upcoming Events Informations'
      },
      {
        id:4,
        name: 'Cemetery Related'
      },
      {
        id:5,
        name: 'Funeral Home Related'
      },
      {
        id:6,
        name: 'Technical Assistance for Product Technologies'
      },
      {
        id:7,
        name: 'Existing Account Inquiry'
      },
      {
        id:8,
        name: 'Career'
      }
    ], {},{
      id:{
        autoIncrement:true
      }
    })
    await queryInterface.sequelize.query(`SET IDENTITY_INSERT FollowUpType OFF`)
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FollowUpType', null, {})
  }
}
