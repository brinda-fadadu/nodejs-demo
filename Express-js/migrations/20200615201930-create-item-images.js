'use strict'

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.createTable('ItemImages', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            resourceType: {
                type: Sequelize.STRING
            },
            resourceId: {
                type: Sequelize.INTEGER
            },
            imageUrl: {
                type: Sequelize.STRING
            },
            isPrimary: {
                type: Sequelize.BOOLEAN
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            createdBy: {
                type: Sequelize.INTEGER
            },
            deletedAt: {
                type: Sequelize.DATE
            },
            deletedBy: {
                type: Sequelize.INTEGER
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedBy: {
                type: Sequelize.INTEGER
            }
        }, {
            tableName: 'ItemImages'
        })
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('ItemImages')
    }
}
