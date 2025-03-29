'use strict';
module.exports = (sequelize, DataTypes) => {
  const Docusignbrand = sequelize.define('Docusignbrand', {
    brandId: DataTypes.STRING,
    brandName: DataTypes.STRING,
    brandCompany: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'Docusignbrand'
  });
  Docusignbrand.associate = function (models) {
    // associations can be defined here
  };
  return Docusignbrand;
};
