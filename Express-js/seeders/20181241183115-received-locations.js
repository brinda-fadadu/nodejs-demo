'use strict'
const models = require('../models/index')

let insertCities = async function (queryInterface) {
  const Cities = require('./cities.json')
  let formatted_cities_data = []
  Cities.forEach((city) => {
    let name = city['Descr'].replace(/^\s+/, '').replace(/\s+$/, '')
    let cityCd = city['City_Cd'].replace(/^\s+/, '').replace(/\s+$/, '')
    let id = city['id']
    formatted_cities_data.push({id: id, name: name, code: cityCd})
  })
  await queryInterface.bulkInsert('City', formatted_cities_data,{},{id:{autoIncrement:true}})
}



module.exports = {
  up: async (queryInterface) => {
    // insertCities(queryInterface)
    let cities = await models.City.findAll({
      attributes: ['id', 'name', 'code']
    }
    )
    let citiesMap = {}
    cities.forEach((c) => {
      citiesMap[c.dataValues.name] = c.dataValues.id
    })

    const Locations = require('./locations.json')

    let countries = await models.Country.findOne({
      where: {
        code: 'USA'
      },
      attributes: ['id']
    })
    let countryId = countries.dataValues.id
    await Promise.all(
      Locations.map(async(location) => {
        let inputdata = {
          id: location['id'],
          name: location['description'],
          code: location['code'],
          place: {
            address: {
              line1: location['streetAddress'],
              state: location['state'],
              city: location['city'],
              country: countryId,
              zipcode: location['zip']
            }
          },
          campus: location['campus'],
          phoneNumber: location['phone'],
          tax: location['tax'],
          license: location['license'],
          fax: location['fax'],
          locationType: 'Location'
        }

        await models.Location.create(inputdata, {
          include: [
            {
              model: models.Place,
              as: 'place',
              include: [{
                model: models.Address,
                as: 'address',
              }]
            }
          ]
        }
        )
      })
    )
    return true
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('City', null, {})
    await queryInterface.bulkDelete('Address', null, {})
    await queryInterface.bulkDelete('Location', null, {})
    await queryInterface.bulkDelete('Place', null, {})
  }
}