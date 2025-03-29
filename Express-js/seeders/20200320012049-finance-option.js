'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FinanceOption', [{
      id: 1,
      downPaymentPercent: 20,
      interestRate: 0,
      tenureMonths: 24
    },
    {
      id: 2,
      downPaymentPercent: 10,
      interestRate: 0,
      tenureMonths: 12
    },{
      id: 3,
      downPaymentPercent: 5,
      interestRate: 4,
      tenureMonths: 60
    }],{logging: console.log},{
      id:{
        autoIncrement:true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.bulkDelete('FinancingOption', null, {});

  }
};