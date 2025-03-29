'use strict';
const models = require('../../models');
const  { getSheetData } = require('./gardenspec-sheet')


module.exports = {
  up: async(queryInterface, Sequelize) => {
    let attributeIds = await models.Attribute.findAll({ where: {} })
    attributeIds = JSON.parse(JSON.stringify(attributeIds))
    //Finding the attributeId for Memorial Type and Memorial Size
    const memorialTypeAttributeId = attributeIds.find(ele => ele.name === 'Memorial Type').id
    const memorialSizeAttributeId = attributeIds.find(ele => ele.name === 'Memorial Size').id
    let attributeValueIds = await models.AttributeValue.findAll({ where: {} })
    const memorialSpecs = await getSheetData('Memorial Spec')
    attributeValueIds = JSON.parse(JSON.stringify(attributeValueIds))
    //Finding the AttributeValueIds
    const uprightAttributeValueId = attributeValueIds.find(ele => ele.name === 'Upright' && ele.attributeId === memorialTypeAttributeId).id
    const lawnMarkerAttributeValueId = attributeValueIds.find(ele => ele.name === 'Lawn Marker' && ele.attributeId === memorialTypeAttributeId).id
    const itemCategories = await models.ItemCategory.findAll({ where: {}})
    let itemCategoryValues = JSON.parse(JSON.stringify(itemCategories))
    let foundationCategoryId = itemCategoryValues.find(ele => ele.name === 'Foundation').id
    let baseCategoryId = itemCategoryValues.find(ele => ele.name === 'Monument Base').id
    let designCategoryId = itemCategoryValues.find(ele => ele.name === 'Memorial Design').id
    console.log('Completed categories')
    const memorialSpecValues = []
    memorialSpecs.forEach((memorialSpec) => {
      console.log(memorialSpec)
      let memorialTypeAttributeValueId = attributeValueIds.find(ele => memorialSpec['Memorial Type'] === ele.name && ele.attributeId === memorialTypeAttributeId).id      
      
      let memorialSizeAttributeValueId = memorialSpec['Memorial Size'] ? attributeValueIds.find(ele => memorialSpec['Memorial Size'] === ele.name && ele.attributeId === memorialSizeAttributeId).id : null
      
      if (memorialSpec['Memorial Foundation']) {     
        let specAttributeValues = memorialSpec['Memorial Foundation'].split('&').map(ele => {          
          let temp = ele.trim()          
          return attributeValueIds.find(attributeValue => attributeValue.name == temp).id
        })
        memorialSpecValues.push({
          memorialTypeAttributeValueId: memorialTypeAttributeValueId,
          memorialSizeAttributeValueId: memorialSizeAttributeValueId,
          itemCategoryId: foundationCategoryId,
          attributeValueIds: JSON.stringify(specAttributeValues)
        })
      }

      if (memorialSpec['Memorial Base']) {
        console.log('Base')
        let specAttributeValues = memorialSpec['Memorial Base'].split('&').map(ele => {          
          return attributeValueIds.find(attributeValue => attributeValue.name == ele).id
        })
        memorialSpecValues.push({
          memorialTypeAttributeValueId: memorialTypeAttributeValueId,
          memorialSizeAttributeValueId: memorialSizeAttributeValueId,
          itemCategoryId: baseCategoryId,
          attributeValueIds: JSON.stringify(specAttributeValues)
        })
      }

      if (memorialSpec['Memorial Design']) {
        console.log('design')
        let specAttributeValues = memorialSpec['Memorial Design'].split('&').map(ele => {
          return attributeValueIds.find(attributeValue => attributeValue.name == ele).id
        })        
        memorialSpecValues.push({
          memorialTypeAttributeValueId: memorialTypeAttributeValueId,
          memorialSizeAttributeValueId: memorialSizeAttributeValueId,
          itemCategoryId: designCategoryId,
          attributeValueIds: JSON.stringify(specAttributeValues)
        })
      }
    })
    // console.log(memorialSpecValues)
    return queryInterface.bulkInsert('MemorialSpec',memorialSpecValues,{ logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })

    /** 
    const x24x30AttributeValueId = attributeValueIds.find(ele => ele.name === '24X30' && ele.attributeId === memorialSizeAttributeId).id
    const x16x24AttributeValueId = attributeValueIds.find(ele => ele.name === '16X24' && ele.attributeId === memorialSizeAttributeId).id
    const x30x1AttributeValueId = attributeValueIds.find(ele => ele.name === '30X1' && ele.attributeId === memorialSizeAttributeId).id
    const x20x28AttributeValueId = attributeValueIds.find(ele => ele.name === '20X28' && ele.attributeId === memorialSizeAttributeId).id
    const x30x30AttributeValueId = attributeValueIds.find(ele => ele.name === '30X30' && ele.attributeId === memorialSizeAttributeId).id
    const x36x1AttributeValueId = attributeValueIds.find(ele => ele.name === '36X1' && ele.attributeId === memorialSizeAttributeId).id
    const x42x1AttributeValueId = attributeValueIds.find(ele => ele.name === '42X1' && ele.attributeId === memorialSizeAttributeId).id
    const x28x34AttributeValueId = attributeValueIds.find(ele => ele.name === '28X34' && ele.attributeId === memorialSizeAttributeId).id
    console.log('Fetched the attribute value Ids')

    let categoryIds = await models.ItemCategory.findAll({ where: {} })
    categoryIds = JSON.parse(JSON.stringify(categoryIds))
    //Finding the categoryId for foundation and case
    const foundationCategoryId = categoryIds.find(ele => ele.name === 'Foundation').id
    const baseCategoryId = categoryIds.find(ele => ele.name === 'Monument Base').id
    
    return queryInterface.bulkInsert('MemorialSpec',[
      {
        id: 1,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x24x30AttributeValueId,
        itemCategoryId: foundationCategoryId,
        attributeValueIds:JSON.stringify([uprightAttributeValueId,x30x1AttributeValueId])
      },
      {
        id: 2,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x24x30AttributeValueId,
        itemCategoryId: baseCategoryId,
        attributeValueIds:JSON.stringify([x30x1AttributeValueId])
      },
      {
        id: 3,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x30x30AttributeValueId,
        itemCategoryId: foundationCategoryId,
        attributeValueIds:JSON.stringify([uprightAttributeValueId,x36x1AttributeValueId])
      },
      {
        id: 4,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x30x30AttributeValueId,
        itemCategoryId: baseCategoryId,
        attributeValueIds:JSON.stringify([x36x1AttributeValueId])
      },
      {
        id: 5,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x30x30AttributeValueId,
        itemCategoryId: foundationCategoryId,
        attributeValueIds:JSON.stringify([uprightAttributeValueId,x42x1AttributeValueId])
      },
      {
        id: 6,
        memorialTypeAttributeValueId: uprightAttributeValueId,
        memorialSizeAttributeValueId: x30x30AttributeValueId,
        itemCategoryId: baseCategoryId,
        attributeValueIds:JSON.stringify([x42x1AttributeValueId])
      },
      {
        id: 7,
        memorialTypeAttributeValueId: lawnMarkerAttributeValueId,
        memorialSizeAttributeValueId: x16x24AttributeValueId,
        itemCategoryId: foundationCategoryId,
        attributeValueIds:JSON.stringify([lawnMarkerAttributeValueId,x20x28AttributeValueId])
      },
      {
        id: 8,
        memorialTypeAttributeValueId: lawnMarkerAttributeValueId,
        memorialSizeAttributeValueId: x24x30AttributeValueId,
        itemCategoryId: foundationCategoryId,
        attributeValueIds:JSON.stringify([lawnMarkerAttributeValueId,x28x34AttributeValueId])
      },
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    }) */
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MemorialSpec', null, {
      truncate: true
    });
  }
};
