'use strict';
const models = require('../../models');
const _ = require('lodash')
const { getSheetData} = require('./gardenspec-sheet')

module.exports = {
  up: async(queryInterface, Sequelize) => {
    let gardenSpecsMemorial = await getSheetData('Garden Spec')
    gardenSpecsMemorial = JSON.parse(JSON.stringify(gardenSpecsMemorial))
    const gardenspecsMemorialValues = []
    await Promise.all(gardenSpecsMemorial.map(async (gardenSpec) => {
      let campusCode = _.get(gardenSpec, 'Campus') === 'OM' ? 'COM' : _.get(gardenSpec, 'Campus')
      let propertyCampus = await models.PropertyCampus.findOne({ where: { code: campusCode } })
      const propertyCampusId = parseInt(_.get(propertyCampus, 'id', 0))

      let propertyType = await models.PropertyType.findOne({ where: { name: _.get(gardenSpec, 'Property Type') } })
      const propertyTypeId = parseInt(_.get(propertyType, 'id', 0))

      let graves = parseInt(_.get(gardenSpec, 'Graves'))
      let rights = _.get(gardenSpec, 'Rights')
      let maxRights = _.get(gardenSpec, 'Max Rights')  
      rights = rights === 'N/A' ? -1 : parseInt(rights)
      maxRights = maxRights === 'N/A' ? -1 : parseInt(maxRights)

      let intermentRights = await models.IntermentRights.findOne({ where: { propertyTypeId: propertyTypeId, propertyCampusId: propertyCampusId, graves: graves, rights: rights, maxRights: maxRights } })
      const intermentRightsId = _.get(intermentRights, 'id', null)
      let memorialTypeValue =_.get(gardenSpec, 'Memorial Type')
      if (intermentRightsId && memorialTypeValue) {
        let mtypes = []
        if (memorialTypeValue === 'All') {
          memorialTypeValue = `Crypt Front| Stone Estate Monument|Niche Front|Upright|Cremation Estate Monument| Cremorial|
          Crypt Plate|
          Crypt Plate Single | Crypt Plate Vase | Crypt Plate Double | Crypt Plate Double Vase|
          Niche Plate Single|
          Lawn Marker | Flat Marker|
          Granite Estate Monument|
          Hedge Estate Monument|
          Niche Front Black Inscription|
          Niche Front White Inscription|
          Slant|Upright Gdn of Hope| Niche Plate Double`
        } else {
          mtypes = [memorialTypeValue]
        }
        if (memorialTypeValue.includes('|')) {
          mtypes = memorialTypeValue.split('|')
        }
        await Promise.all(
          mtypes.map(async mtype => {
            let memorialTypeValue = await models.AttributeValue.findOne({
              where: { name: mtype.trim() }
            })
            let memorialSizeAttributeValueId
            const memorialTypeAttributeValueId = _.get(
              memorialTypeValue,
              'id',
              null
            )
            if (memorialTypeAttributeValueId) {
              if (_.get(gardenSpec, 'Size')) {
                let msizes = [_.get(gardenSpec, 'Size')]
                if (_.get(gardenSpec, 'Size').includes('|')) {
                  msizes = _.get(gardenSpec, 'Size').split('|')
                }
                let trimmedMemorialSize
                for (let memorialSize of msizes) {
                  if (memorialSize) {
                    if (memorialSize.search('/') === -1) {
                      trimmedMemorialSize = memorialSize.replace(/ /g, '')
                    } else {
                      trimmedMemorialSize = memorialSize.split('/')
                      trimmedMemorialSize =
                        trimmedMemorialSize[0] +
                        '/' +
                        trimmedMemorialSize[1].replace(/ /g, '')
                    }
                    let memorialSizeValue = await models.AttributeValue.findOne(
                      { where: { name: trimmedMemorialSize } }
                    )
                    memorialSizeAttributeValueId = _.get(
                      memorialSizeValue,
                      'id',
                      null
                    )
                    gardenspecsMemorialValues.push({
                      intermentRightsId: intermentRightsId,
                      memorialTypeAttributeValueId: memorialTypeAttributeValueId,
                      memorialSizeAttributeValueId: memorialSizeAttributeValueId
                    })
                  }
                }
              } else {
                memorialSizeAttributeValueId = null
                gardenspecsMemorialValues.push({
                  intermentRightsId: intermentRightsId,
                  memorialTypeAttributeValueId: memorialTypeAttributeValueId,
                  memorialSizeAttributeValueId: memorialSizeAttributeValueId
                })
              }
            }
          })
        )
      }
    }))
    return queryInterface.bulkInsert('GardenSpecMemorial', gardenspecsMemorialValues, { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('GardenSpecMemorial', null, {
      truncate: true
    });
  }
};