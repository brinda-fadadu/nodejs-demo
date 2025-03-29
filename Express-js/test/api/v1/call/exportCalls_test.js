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
  getCountries
} = require('../../../helper')
const seedData = require('../../../../config/seed').seed
const models = require('../../../../models')
const createCall = require('../../../../controllers/Calls/CreateCall/create')
const moment = require('moment')
const faker = require('faker')
const baseUrl = '/api/v1/calls/export'

let authToken, user, cities, languages, states, countries, callReceivedLocations, relationsIds, createANCallReqData,  anCallIdentifer, pageLimit = 10, page = 1, tz = moment.tz.guess(), CallIdentifiers = [], createdDateFromFilter, createdDateToFilter, schemaOfCreateCall, callStatus = [], callReason = [], callerFNames = [], callerEmails = [], callerPhoneNumbers = [], assignedToUsers = []

async function schemaOfCreateCallFun (user) {
  cities = await getCities()
  languages = await getLanguages()
  states = await getStates()
  countries = await getCountries()
  callReceivedLocations = Object.keys(
      seedData.CallReceivedLocations
  ).map(Number)
  relationsIds = await getRelations()

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
          "cityId": cities['Prairie Ridge'],
          "cityName": "Prairie Ridge",
          "stateId": states['Alabama'],
          "countryId": countries['United States'],
          "zipCode": faker.address.zipCode().split('-')[0]
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
          "IsVerified": false
        },
        "arrangerEmail": faker.internet.email(),
      }]
    }
  }
}

describe('/POST Export calls', function () {
  before(async () => {
    try{
      user = await addTestUser()
      authToken = await genAuthToken(user)
      createdDateFromFilter = moment().startOf('day').format()
      createdDateToFilter = moment().endOf('day').format()
      
      // creating 10 calls
      for(let i=1;i<=10;i++) {
        schemaOfCreateCall = await schemaOfCreateCallFun(user)
        anCallResp = await createCall.createCall(schemaOfCreateCall.call)
        CallIdentifiers.push(anCallResp.Identifier)
        callStatus.push(anCallResp.CallStatus)
        callReason.push(anCallResp.Reason)
        callerFNames.push(anCallResp.caller.FirstName)
        callerEmails.push(anCallResp.caller.Email)
        callerPhoneNumbers.push(anCallResp.caller.PhoneNumber)
        assignedToUsers.push(anCallResp.AssignedTo)
      }
      return
    } catch (err){
      console.log('Error:::::')
      console.log(err)
      process.exit()
    }
  })

  after(async () => {
    try {
        await models.SomeOnePassed.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
        await models.Call.destroy({ where: {} })
    } catch (error) {
      console.log('Error:::::')
      console.log(error)
    }
  })

  it('should return error message if the token is not present', async function () {
    const res = await chai.request(server)
        .get(`${baseUrl}`)
        .set("authorization", "")
        res.should.have.status(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
  })

  it('it should download calls information as CSV format', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0], CallIdentifiers[1], CallIdentifiers[2], CallIdentifiers[3], CallIdentifiers[4], CallIdentifiers[5], CallIdentifiers[6], CallIdentifiers[7], CallIdentifiers[8], CallIdentifiers[9])
  })

  it('should return no records found message if we pass page number which does not contain records', async function () {
    const res = await chai.request(server)
        .get(`${baseUrl}/?limit=${pageLimit}&page=2&userTimeZone=${tz}`)
        .set("authorization", authToken)
        res.should.have.status(200)
        res.body.should.have.property('msg').and.to.be.equal("No records found");
  })

  it('it should download calls information as CSV format if we pass call ids as query string', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&callIds[]=${CallIdentifiers[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  // it('it should download calls information as CSV format if we pass creation date (date range)', async () => {
  //   // createdDateFromFilter = encodeURIComponent(createdDateFromFilter).replace(/%20/g, "+")
  //   // createdDateToFilter = encodeURIComponent(createdDateToFilter).replace(/%20/g, "+")

  //   createdDateFromFilter = escape(createdDateFromFilter.replace(/ /gi,"+"))
  //   createdDateToFilter = escape(createdDateToFilter.replace(/ /gi,"+"))
  //   let url = `${baseUrl}/?limit=${pageLimit}&page=${page}&createdFromDate=${createdDateFromFilter}&createdToDate=${createdDateToFilter}&userTimeZone=${tz}`
  //   const res = await chai.request(server)
  //     .get(url)
  //     .set("authorization", authToken)

  //   res.should.have.status(200)
  //   expect(res.text).to.have.string(CallIdentifiers[0])
  // })

  it('it should download calls information as CSV format if we pass call id as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&callId=${CallIdentifiers[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass call status as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&status[]=${callStatus[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass call reason as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&reason[]=${callReason[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass caller name as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&callerName=${callerFNames[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass caller email id (contact) as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&contactEmail=${callerEmails[0]}&contactNo=${callerEmails[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass caller phone number (contact) as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&contactEmail=${callerPhoneNumbers[0]}&contactNo=${callerPhoneNumbers[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass assigned to user as filter', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&assignedTo=${assignedToUsers[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass multiple filter (status, reason, callerName, assignedTo', async () => {
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&status[]=${callStatus[0]}&reason[]=${callReason[0]}&callerName=${callerFNames[0]}&assignedTo=${assignedToUsers[0]}&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(CallIdentifiers[0])
  })

  it('it should download calls information as CSV format if we pass assigned to user as "UnAssigned" filter', async () => {
    schemaOfCreateCall = await schemaOfCreateCallFun(user)
    delete schemaOfCreateCall.call.assignedToId
    anCallResp = await createCall.createCall(schemaOfCreateCall.call)
    const res = await chai.request(server)
      .get(`${baseUrl}/?limit=${pageLimit}&page=${page}&assignedTo=0&userTimeZone=${tz}`)
      .set("authorization", authToken)

    res.should.have.status(200)
    expect(res.text).to.have.string(anCallResp.Identifier)
  })
});