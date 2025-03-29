'use strict';
module.exports = (sequelize, DataTypes) => {
    const CaseInfoFormRecipient = sequelize.define('CaseInfoFormRecipient', {
        caseInfoFormId: DataTypes.INTEGER,
        personContactId: DataTypes.INTEGER,
        employeeId: DataTypes.INTEGER,
        otherRecipientId: DataTypes.INTEGER,
        agreementPersonId: DataTypes.INTEGER,
        inPersonHostId: DataTypes.INTEGER,
        // availableInPerson: DataTypes.BOOLEAN,
        status: DataTypes.STRING,
        signedAt: DataTypes.DATE,
        formRecipientRoleId: DataTypes.INTEGER,
        createdBy: DataTypes.INTEGER,
        updatedBy: DataTypes.INTEGER,
        vendorId: DataTypes.INTEGER,
        agreementPropertyOwnerId: DataTypes.INTEGER,
        certifierId: DataTypes.INTEGER,
        personSigningOrder: DataTypes.INTEGER,
        formRecipientRoleCarbonCopyEmailId: DataTypes.INTEGER,
        isEmailSentForSigning: DataTypes.BOOLEAN,
        usedDefaultEmail: DataTypes.STRING,
        docusignClientUserId: DataTypes.STRING
    }, {
        tableName: 'CaseInfoFormRecipient',
        timestamps: true
    });

    CaseInfoFormRecipient.associate = function (models) {
        CaseInfoFormRecipient.belongsTo(models.Employee, { foreignKey: 'employeeId', as: 'employee' });
        CaseInfoFormRecipient.belongsTo(models.Vendor, { foreignKey: 'vendorId', as: 'vendor' });
        CaseInfoFormRecipient.belongsTo(models.PersonContact, { foreignKey: 'personContactId', as: 'personContact' });
        CaseInfoFormRecipient.belongsTo(models.CaseInfoForm, { foreignKey: 'caseInfoFormId', as: 'caseInfoForm' })
        CaseInfoFormRecipient.belongsTo(models.FormRecipientRole, { foreignKey: 'formRecipientRoleId', as: 'recipientRole'})
        CaseInfoFormRecipient.belongsTo(models.User, { foreignKey: 'createdBy', as: 'createdByUser' })
        CaseInfoFormRecipient.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updatedByUser'  })
        CaseInfoFormRecipient.belongsTo(models.OtherRecipient, { foreignKey: 'otherRecipientId', as: 'otherRecipient' });
        CaseInfoFormRecipient.belongsTo(models.AgreementPerson, { foreignKey: 'agreementPersonId', as: 'agreementPerson' });
        CaseInfoFormRecipient.belongsTo(models.AgreementPropertyOwner, { foreignKey: 'agreementPropertyOwnerId', as: 'agreementPropertyOwner' });
        CaseInfoFormRecipient.belongsTo(models.Certifier, { foreignKey: 'certifierId', as: 'certifier' });
        CaseInfoFormRecipient.belongsTo(models.FormRecipientRoleCarboncopyEmail, { foreignKey: 'formRecipientRoleCarbonCopyEmailId', as: 'formRecipientRoleCarboncopyEmail' });
        CaseInfoFormRecipient.belongsTo(models.FormInPersonHost, { foreignKey: 'inPersonHostId', as: 'inPersonHost' });
    };
    return CaseInfoFormRecipient;
};
