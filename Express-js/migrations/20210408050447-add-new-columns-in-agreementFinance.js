'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('AgreementFinance', 'isRecent', {
                type: Sequelize.BOOLEAN
            }),
            queryInterface.addColumn('AgreementFinance', 'remainingInterest', {
                type: Sequelize.DECIMAL(10, 2)
            }),
            queryInterface.addColumn('AgreementFinance', 'deletedAt', {
                type: Sequelize.DATE
            }),
            queryInterface.addColumn('AgreementFinance', 'deletedBy', {
                type: Sequelize.INTEGER
            })
        ])
    },

    down: async (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('AgreementFinance', 'isRecent'),
            queryInterface.removeColumn('AgreementFinance', 'remainingInterest'),
            queryInterface.removeColumn('AgreementFinance', 'deletedAt'),
            queryInterface.removeColumn('AgreementFinance', 'deletedBy'),
        ])
    }
};
