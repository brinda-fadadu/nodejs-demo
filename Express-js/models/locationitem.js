'use strict';
const Sequelize = require('sequelize')
const Op = Sequelize.Op

module.exports = (sequelize, DataTypes) => {
  const LocationItem = sequelize.define('LocationItem', {
    locationId: DataTypes.INTEGER,
    itemId: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10, 2),
    forMiscSale: DataTypes.BOOLEAN
  }, {
    tableName: 'LocationItem'
  });
  LocationItem.associate = function(models) {
    // associations can be defined here
    LocationItem.belongsTo(models.Item, {foreignKey: 'itemId'});

    LocationItem.addScope('withSchedulingService', {
      include: [
        {
          model: models.Item,
          attributes: ['id','name'],
          required: true,
          include: [
            {
              model: models.ItemAttributeValue,
              as: 'itemAttributes',
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: models.AttributeValue,
                  attributes: ['id', 'name'],
                  required: true,
                  include: [
                    {
                      model: models.Attribute,
                      as: 'attribute',
                      where: {
                        name: 'Scheduling Service'
                      },
                      required: true
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    LocationItem.addScope('withSchedulingServiceMiscSales',  (itemIndustry)=>({
      include: [
        {
          model: models.Item,
          attributes: ['id','name'],
          required: true,
          include: [
            {
              model: models.ItemAttributeValue,
              as: 'itemAttributes',
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: models.AttributeValue,
                  attributes: ['id', 'name'],
                  required: true,
                  include: [
                    {
                      model: models.Attribute,
                      as: 'attribute',
                      where: {
                        name: 'Scheduling Service'
                      },
                      required: true
                    }
                  ]
                }
              ]
            },
            {
              model: models.ItemCategory,
              required: true,
              include: [
                {
                  model: models.ItemCategoryIndustry,
                  as: 'itemCategoryIndustry',
                  include: [
                    {
                      model: models.ItemIndustry,
                      where :{
                        name: itemIndustry
                      },
                      required: true
                    }
                  ],
                  required: true
                }
              ]
            }
          ]
        }
      ]
    }))

    LocationItem.addScope('withItemCategoryandItemType',{
      include: [
        {
          model: models.Item,
          attributes: ['id', 'name', 'code'],
          required: true,
          include: [
            {
              model: models.ItemCategory,
              attributes: ['id', 'name', 'itemTypeId'],
              required: true,
              include: [
                {
                  model: models.ItemType,
                  attributes: ['name'],
                  required: true
                }
              ]
            }
          ]
        }
      ]
    })

    LocationItem.addScope('withAttributeValues', {
      include: [
        {
          model: models.Item,
          attributes: ['id'],
          required: true,
          include: [
            {
              model: models.ItemAttributeValue,
              as: 'itemAttributes',
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: models.AttributeValue,
                  attributes: ['id', 'name'],
                  required: true,
                  include: [
                    {
                      model: models.Attribute,
                      as: 'attribute',
                      where: {
                        name: {
                          [Op.in]: ['Scheduling Service', 'Burial Type']
                        }
                      },
                      required: true
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  };
  return LocationItem;
};