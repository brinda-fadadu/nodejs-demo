const {
  chai,
  server,
  expect,
  addTestUser,
  genAuthToken,
  getCities,
  getStates,
  getLanguages,
  getRelations,
  getCountries,
  getDeleteActionReasons
} = require('../../../helper')
const seedData = require('../../../../config/seed').seed
const models = require('../../../../models')
const createCall = require('../../../../controllers/Calls/CreateCall/create')
const moment = require('moment')
const faker = require('faker')
const env = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname) + '/../../../../config/config')[env]
const autoArchive = require('../../../../lib/autoArchive')

let authToken, user, cities, languages, states, countries, callReceivedLocations, relationsIds, createANCallReqData, deleteCallArr = [], schemaOfCreateCall, archivedCallsCount, callStatus = [7, 8]

async function schemaOfCreateCallFun(user) {
  cities = await getCities()
  languages = await getLanguages()
  states = await getStates()
  countries = await getCountries()
  callReceivedLocations = Object.keys(
    seedData.CallReceivedLocations
  ).map(Number)
  relationsIds = await getRelations()
  deleteActionReasonsCount = await getDeleteActionReasons()

  return createANCallReqData = {
    "call": {
      "callType": "Call",
      "caller": {
        "prefix": faker.name.prefix(),
        "firstName": faker.name.firstName(),
        "lastName": faker.name.lastName(),
        "middleName": faker.name.lastName(),
        "phone": faker.phone.phoneNumberFormat(1),
        "email": faker.internet.email(),
        "languageId": languages['English'],
        "isVerified": false,
        "address": {
          "line1": faker.address.streetName(),
          "line2": faker.address.streetAddress(),
          'city': faker.address.city(),
          'state': faker.address.state(),
          'county': faker.address.county(),
          'country': faker.address.country(),
          'zipcode': faker.address.zipCode(),
        }
      },
      "appointmentDateTime": moment().add(1, 'day').format(),
      "note": [{}],
      "reasonNote": [{}],
      "assignedToId": user.id,
      "callReceivedLocationId": callReceivedLocations[0],
      "isCallFromOrganization": false,
      "callStatus": 1,
      "reasonTypeId": 1,
      "isVerified": false,
      "reason": [{
        "decedent": {
          "prefix": faker.name.prefix(),
          "firstName": faker.name.firstName(),
          "lastName": faker.name.lastName(),
          "middleName": faker.name.lastName(),
          "dateOfBirth": moment().subtract(60, 'year').format(),
          "dateOfDeath": moment().subtract(1, 'day').format(),
          "isVerified": false
        },
        "isReadyForPickup": true,
        "isFuneralPN": false,
        "isCemeteryPN": false,
        "isNok": false,
        "informantSameAsCaller": false,
        "informant": {
          "prefix": faker.name.prefix(),
          "firstName": faker.name.firstName(),
          "middleName": faker.name.lastName(),
          "lastName": faker.name.lastName(),
          "email": faker.internet.email(),
          "phone": faker.phone.phoneNumberFormat(1),
          "relationshipId": relationsIds['Aunt'],
          "isVerified": false
        },
        "arrangerEmail": faker.internet.email(),
      }]
    }
  }
}

async function createCallFun(changeDates) {
  for (let i = 1; i <= 5; i++) {
    schemaOfCreateCall = await schemaOfCreateCallFun(user)
    anCallResp = await createCall.createCall(schemaOfCreateCall.call)
    if (changeDates) {
      await models.Call.update({
        CreatedAt: moment().subtract(config.archiveTimePeriod, 'days').format('YYYY-MM-DD'),
        UpdatedAt: moment().subtract(config.archiveTimePeriod, 'days').format('YYYY-MM-DD'),
        CallStatus: callStatus[Math.floor(Math.random() * callStatus.length)],
      }, { where: { Identifier: anCallResp.Identifier }, silent: true }); // setting createdAt and updatedAt to 35 days older
    }
  }
}

async function truncateTables() {
  await models.SomeOnePassed.destroy({ where: {} })
  await models.Person.destroy({ where: {} })
  await models.Call.destroy({ where: {} })
}

describe('/Auto Archive calls', function () {
  before(async () => {
    try {
      user = await addTestUser()
      authToken = await genAuthToken(user)
      return
    } catch (err) {
      console.log('Error:::::')
      console.log(err)
      process.exit()
    }
  })

  after(async () => {
    try {
      await truncateTables()
    } catch (error) {
      console.log('Error:::::')
      console.log(error)
    }
  })

  it(`should archive the calls which are ${config.archiveTimePeriod} days older - no calls present in database, so expecting 0 calls to be archived`, async function () {
    archivedCallsCount = await autoArchive.updateArchivedCalls()
    expect(archivedCallsCount).to.be.a('number')
    expect(archivedCallsCount).to.equal(0)
  })

  it(`should archive the calls which are ${config.archiveTimePeriod} days older - creating 5 calls which are ${config.archiveTimePeriod} days older and expecting 5 calls to be archived`, async function () {
    // creating 5 calls
    await createCallFun(true)
    archivedCallsCount = await autoArchive.updateArchivedCalls()
    expect(archivedCallsCount).to.be.a('number')
    expect(archivedCallsCount).to.equal(5)
  })

  it(`should archive the calls which are ${config.archiveTimePeriod} days older - creating 5 calls with present date and expecting 0 calls to be archived`, async function () {
    await truncateTables()
    // creating 5 calls
    await createCallFun(false)
    archivedCallsCount = await autoArchive.updateArchivedCalls()
    expect(archivedCallsCount).to.be.a('number')
    expect(archivedCallsCount).to.equal(0)
  })

  it(`should archive the calls which are ${config.archiveTimePeriod} days older - creating 10 calls (5 calls are ${config.archiveTimePeriod} days older and 5 calls are with present day),  expecting 5 calls to be archived`, async function () {
    await truncateTables()
    // creating 10 calls
    await createCallFun(true)
    await createCallFun(false)
    archivedCallsCount = await autoArchive.updateArchivedCalls()
    expect(archivedCallsCount).to.be.a('number')
    expect(archivedCallsCount).to.equal(5)
  })
});