'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('AgreementItem', 'resourceType',{ }),
      queryInterface.removeColumn('AgreementItem', 'quantity',{ }),
      queryInterface.removeColumn('AgreementItem', 'tax',{ }),
      queryInterface.removeColumn('AgreementItem', 'price',{ }),      
      queryInterface.removeColumn('AgreementItem', 'parentId',{ }),
      queryInterface.removeColumn('AgreementItem', 'reservationStatus',{ }),
      queryInterface.renameColumn('AgreementItem', 'resourceId', 'locationItemId', {}),
      queryInterface.addColumn('AgreementItem', 'agreementItemPriceId', Sequelize.INTEGER, {
        after: ''
      }),      
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([ 
    queryInterface.addColumn('AgreementItem', 'resourceType',Sequelize.STRING, {}),
    queryInterface.addColumn('AgreementItem', 'quantity', Sequelize.INTEGER, { }),
    queryInterface.addColumn('AgreementItem', 'tax', Sequelize.DECIMAL, { }),
    queryInterface.addColumn('AgreementItem', 'price',  Sequelize.DECIMAL(10,2), { }),
    queryInterface.addColumn('AgreementItem', 'parentId',  Sequelize.DECIMAL(10,2), { }),
    queryInterface.addColumn('AgreementItem', 'reservationStatus', Sequelize.DECIMAL(10,2), { }),
    queryInterface.renameColumn('AgreementItem', 'locationItemId', 'resourceId', {}),
    queryInterface.removeColumn('AgreementLocationItem', 'agreementItemPriceId', {
    })    
    ])
  }
};
