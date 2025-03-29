'use strict';
module.exports = (sequelize, DataTypes) => {
  const ResourceDocuments = sequelize.define('ResourceDocuments', {
    resourceId: DataTypes.INTEGER,
    resourceType: DataTypes.STRING,
    imageUrl: DataTypes.STRING
  }, {
    tableName: 'ResourceDocuments',
    timestamps: true
  });


  ResourceDocuments.associate = function(models) {
    // associations can be defined here

    //ResourceId will be associated to Call table for call related images
    ResourceDocuments.belongsTo(models.Call, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'callDocuments'
    })

    //As per the assumption we are associating with Ticket for ticket related images
    ResourceDocuments.belongsTo(models.Ticket, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'ticketDocuments'
    })
    ResourceDocuments.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'resourceDocumentImageUrl'
    })
  };
  return ResourceDocuments;
};