'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementPartner = sequelize.define('AgreementPartner', {
    agreementId: DataTypes.INTEGER,
    partnerId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementPartner',
    timestamps: true
  });
  AgreementPartner.associate = function(models) {
    // associations can be defined here
    AgreementPartner.belongsTo(models.Partners, { foreignKey: 'partnerId', as: 'partner'})
    AgreementPartner.belongsTo(models.Agreement, { foreignKey: 'agreementId'})

    //scopes can be defined here
    AgreementPartner.addScope('withPartnerDetails', {
      include: [
        {
          model: models.Partners,
          as: 'partner',
          include: [
            {
              model: models.Payment,
              as: 'payment'
            },
            {
              model: models.Place,
              as: 'addressPlace',
              attributes: ['id', 'addressId'],
              include: [
                {
                  model: models.Address,
                  as: 'address'
                }
              ]
            },
            {
              model: models.Person,
              as: 'contact',
              attributes: ['id', 'email', 'firstName', 'lastName', 'middleName']
            }
          ]
        }
      ]
    })

  };
  return AgreementPartner;
};