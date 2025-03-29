'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('WorkOrderDetail', 'serviceIssue', {
        type: Sequelize.STRING(1000)
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([queryInterface.changeColumn('WorkOrderDetail', 'serviceIssue')])
  }
}
