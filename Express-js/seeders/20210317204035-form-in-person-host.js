'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = [
      {
        firstName: 'CFS',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'cf@gmail.com' : 'a@gmail.com',
        displayName: 'CFS Colma FH'
      },
      {
        firstName: 'CLC',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'cl@gmail.com' : 'a@gmail.com',
        displayName: 'Family Service'
      },
      {
        firstName: 'MD',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'm@gmail.com' : 'a@gmail.com',
        displayName: 'Miller Dutra'
      },
      {
        firstName: 'CNG',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'cn@gmail.com' : 'a@gmail.com',
        displayName: 'Crosby N Gray'
      },
      {
        firstName: 'SSO',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'ss@gmail.com' : 'a@gmail.com',
        displayName: 'Sneider N Sullivan'
      },
      {
        firstName: 'AFF',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'a@gmail.com' : 'a@gmail.com',
        displayName: 'Asian Field Force'
      },
      {
        firstName: 'PNS',
        lastName: 'OnePortal',
        email: process.env.NODE_ENV === 'production' ? 'p@gmail.com' : 'a@gmail.com',
        displayName: 'Field Force'
      }
    ]
    return queryInterface.bulkInsert('FormInPersonHost', jsonData, {},{
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([      
      queryInterface.bulkDelete('FormInPersonHost', {}, {
        truncate: true
      })
    ])
  }
};
