'use strict';

module.exports = (sequelize, DataTypes) => {
    const FamilyArranger = sequelize.define('FamilyArranger', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        email: DataTypes.STRING,
        secondaryEmail: DataTypes.STRING,
        isFaaInvitationSent: DataTypes.BOOLEAN,
        isFaaLocked: DataTypes.BOOLEAN,
        decedentId: DataTypes.INTEGER,
        onePortalId: DataTypes.STRING,
        isObituaryLocked: DataTypes.BOOLEAN
    }, {
        tableName: 'FamilyArranger',
        timestamps: true
    });
    FamilyArranger.associate = function (models) {
        // associations can be defined here
        FamilyArranger.belongsTo(models.Person, {foreignKey: 'decedentId', as: 'decedent'} )
    };
    return FamilyArranger;
};