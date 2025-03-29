'use strict';
const models = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let locations = await models.Location.findAll({ where: {} })
    locations = JSON.parse(JSON.stringify(locations))
    const cfsLocationId = locations.find(ele => ele.code === 'CFS').id
    const cngLocationId = locations.find(ele => ele.code === 'CNG').id
    const ssoLocationId = locations.find(ele => ele.code === 'SSO').id
    const mdcLocationId = locations.find(ele => ele.code === 'MDC').id
    const chapelData = [
      {
        "id": 1,
        "name": "Room",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 2,
        "name": "Laurel Room",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 3,
        "name": "Maple Room",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 4,
        "name": "Palm Room",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 5,
        "name": "Rose Room",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 6,
        "name": "Tiffany Chapel",
        "locationId": cfsLocationId,
        "line1": "1370 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 7,
        "name": "Newall Chapel",
        "locationId": cfsLocationId,
        "line1": "1383 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 8,
        "name": "Noble Chapel",
        "locationId": cfsLocationId,
        "line1": "1363 El Camino Real",
        "city": "Colma",
        "state": "California",
        "zip": "94014",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 9,
        "name": "Chapel Large Room",
        "locationId": cngLocationId,
        "line1": "2 Park Road",
        "city": "Burlingame",
        "state": "California",
        "zip": "94010",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 10,
        "name": "Chapel Small Room",
        "locationId": cngLocationId,
        "line1": "2 Park Road",
        "city": "Burlingame",
        "state": "California",
        "zip": "94010",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 11,
        "name": "Viewing Room",
        "locationId": cngLocationId,
        "line1": "2 Park Road",
        "city": "Burlingame",
        "state": "California",
        "zip": "94010",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 12,
        "name": "Chapel One",
        "locationId": ssoLocationId,
        "line1": "977 S. El Camino Real",
        "city": "San Mateo",
        "state": "California",
        "zip": "94402",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 13,
        "name": "Chapel Two",
        "locationId": ssoLocationId,
        "line1": "977 S. El Camino Real",
        "city": "San Mateo",
        "state": "California",
        "zip": "94402",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 14,
        "name": "Viewing Room",
        "locationId": ssoLocationId,
        "line1": "977 S. El Camino Real",
        "city": "San Mateo",
        "state": "California",
        "zip": "94402",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 15,
        "name": "Chapel One",
        "locationId": mdcLocationId,
        "line1": "645 Kelly Avenue",
        "city": "Half Moon Bay",
        "state": "California",
        "zip": "94019",
        "county": "San Mateo",
        "country": "United States"
      },
      {
        "id": 16,
        "name": "Abbey Chapel",
        "locationId": cfsLocationId
      },
      {
        "id": 17,
        "name": "Olivet Chapel",
        "locationId": cfsLocationId
      }
    ]
    await Promise.all(
      chapelData.map(async(eachchapel) => {
        let inputdata = {
          id: eachchapel['id'],
          name: eachchapel['name'],
          locationId: eachchapel['locationId'],
          place: {
            address: {
              line1: eachchapel['line1'],
              city: eachchapel['city'],
              state: eachchapel['state'],
              county: eachchapel['county'],
              country: eachchapel['country'],
              zipcode: eachchapel['zip']
            }
          }
        }
        await models.Chapel.create(inputdata, {
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

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Chapel', null, { truncate: true });

  }
};
