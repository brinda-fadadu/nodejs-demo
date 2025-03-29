'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.addColumn('SomeOnePassed', 'familyArrangerId', {
            type: Sequelize.INTEGER,
            references: {
                model: 'FamilyArranger',
                key: 'id'
            }
        })
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.removeColumn('SomeOnePassed', 'familyArrangerId')
    }
};

