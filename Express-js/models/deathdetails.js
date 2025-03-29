'use strict';
const {placeIncludes} = require('../controllers/refactorControllers/commonIncludes')


module.exports = (sequelize, DataTypes) => {
    const DeathDetails = sequelize.define('DeathDetails', {
        personId: DataTypes.INTEGER,
        dateOfDeath: DataTypes.DATE,
        deathPlaceId: {
            type: DataTypes.INTEGER
        },
        deceasedStatus: DataTypes.BOOLEAN,
        locationOfRemainId: {
            type: DataTypes.INTEGER
        },
        certifierId: DataTypes.INTEGER,
        hospitalDeathStatus: DataTypes.STRING,
        partnerRefNumber: DataTypes.STRING,
        placeOfDeath: DataTypes.STRING
    }, {
        tableName: 'DeathDetails',
        timestamps: false
    })
    DeathDetails.associate = function (models) {
        DeathDetails.belongsTo(models.Certifier, {foreignKey: 'certifierId', as: 'certifier'})
        DeathDetails.belongsTo(models.Place, {foreignKey: 'deathPlaceId', as: 'deathPlace'})
        DeathDetails.belongsTo(models.Place, {foreignKey: 'locationOfRemainId', as: 'lor'})

        DeathDetails.addScope('commonIncludes', {
            include: [
                {
                    model: models.Place,
                    as: 'deathPlace',
                    include: [
                        {
                            model: models.Organization,
                            as: 'organization',
                            include: [
                                {
                                  model: models.OrganizationType,
                                  as: 'organizationType'
                                }
                              ]
                        },
                        {
                            model: models.Address,
                            as: 'address'
                        }
                    ]
                },
                {
                    model: models.Place,
                    as: 'lor',
                    include: [
                        {
                            model: models.Organization,
                            as: 'organization',
                            include: [
                                {
                                  model: models.OrganizationType,
                                  as: 'organizationType'
                                }
                              ]
                        },
                        {
                            model: models.Address,
                            as: 'address'
                        }
                    ]
                }
            ]
        })
    }
    return DeathDetails
}