const {
    chai,
    server,
    addTestUser,
    genAuthToken,   
    verifyPerson,
    getLocations,
} = require('../../../../helper')

const _ = require('underscore')
const {getCallData, createCallData} = require('../../../../schema/call')
let authToken, onePortalId, updatedData

let reqData = {
    "dateOfDeath": "2018-06-22",
    "placeOfDeathTypeId": 3,
    "locationOfRemainTypeId": 2,
    "placeOfDeath": {
        "line1": "Place of Death Address1",
        "line2": "Place of Death  Address2",
        "city": "Adjuntas",
        "state": "New York",
        "country": "United States",
        "addressTypeId": 1
    },
    "locationOfRemains": {
        "name": "HelloWorld",
        "organizationTypeId": 1,
        "address": {
            "line1": "Location of Remain Address1",
            "line2": "Location of Remain  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
    },
    "hospitalDeathStatus": null,
    "placeOfDeathSameAsResidentialAddress": false,
    "locationOfRemainsSameAsPlaceOfDeath": false,
    "locationOfRemainsSameAsResidentialAddress": false
}

describe('Update Death Info details', async () => {    
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        locations = await getLocations()        
        authToken = await genAuthToken(user)
        
        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        const verifyData = {
            callId: callResponse.identifier,
            personId: callResponse.someOneHasPassed[0].decedentId,
            currentUserId: user.id,
            userType:'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        onePortalId = verificationResult.onePortalId
        let residenceDetails = {
            "line1": "Residential Address line 1",
            "line2": "Residential Address line 2",
            "city": "Res City",
            "state": "Res State",
            "country": "Res Country",
            "zipcode": "00601",
            "county": "Res Countys",
            "noOfYearsAtCountry": 10
           }
        let updatedResidenceDetails = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/residence-info`)
            .set('authorization', authToken)
            .send(residenceDetails)  
        console.log(updatedResidenceDetails)
    })

    it('1 Should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', '')
            .send(reqData)
        res.should.have.status(401);
    })

    it('2 Should return status code 422 without request data', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Input required`)
    })

    it('3 Should return success while adding New Address in POD and New Org in LOR', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.locationOfRemains.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('4 Should return error while adding Invalid Existing Address in POD and Existing Org in LOR', async () => {
        reqData.existingPlaceOfDeathAddressId = 100000
        reqData.locationOfRemains = updatedData.data.locationOfRemains.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(400);
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal("Selected Address not found in the database for place of death")
    })

    it('5 Should return error while adding Existing Address in POD and Invalid Existing Org in LOR', async () => {
        reqData.existingPlaceOfDeathAddressId = updatedData.data.placeOfDeath.details.Address.id
        reqData.locationOfRemains = 100000
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(400);
        res.body.should.have.property('success').and.to.be.equal(false)
        res.body.should.have.property('error').and.to.be.equal("Selected Organization not found in the database for place of death")
    })

    it('6 Should return success while adding New/Existing Address in POD and Existing Org in LOR', async () => {
        reqData.locationOfRemains = updatedData.data.locationOfRemains.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(updatedData.data.locationOfRemains.details.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(updatedData.data.locationOfRemains.details.Address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(updatedData.data.locationOfRemains.details.Address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(updatedData.data.locationOfRemains.details.Address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(updatedData.data.locationOfRemains.details.Address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(updatedData.data.locationOfRemains.details.Address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('7 Should return success while adding Existing Address in POD and New Org in LOR', async () => {
        reqData.locationOfRemains = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Location of Remain Address1",
                "line2": "Location of Remain  Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.locationOfRemains.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('8 Should return success while adding New Address in POD and LOR', async () => {
        reqData.locationOfRemains = {
            "line1": "Location of Remain Address1",
            "line2": "Location of Remain  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
        reqData.locationOfRemainTypeId = 3
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.country)
        updatedData = res.body
    })

    it('9 Should return success while adding New/Existing Address in POD and LOR', async () => {
        reqData.existingLocationOfRemainAddressId = updatedData.data.locationOfRemains.details.Address.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.country)
        updatedData = res.body
    })

    it('10 Should return success while adding New Org in POD and New/Existing Address in LOR', async () => {
        reqData.placeOfDeathTypeId = 2
        reqData.placeOfDeath = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Place Of Death Address1",
                "line2": "Place Of Death Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.hospitalDeathStatus = "IP"
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.country)
        updatedData = res.body
    })

    it('11 Should return success while adding Existing Org in POD and New/Existing Address in LOR', async () => {
        reqData.placeOfDeath = updatedData.data.placeOfDeath.details.id
        delete reqData.existingPlaceOfDeathAddressId
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.country)
        updatedData = res.body
    })

    it('12 Should return success while adding New Org in POD and New Org in LOR', async () => {
        reqData.placeOfDeath = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Place Of Death Address1",
                "line2": "Place Of Death Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.locationOfRemainTypeId = 2
        reqData.locationOfRemains = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Location of Remain Address1",
                "line2": "Location of Remain  Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        delete reqData.existingLocationOfRemainAddressId
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.locationOfRemains.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('13 Should return success while adding New Org in POD and Existing Org in LOR', async () => {
        reqData.placeOfDeath = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Place Of Death Address1",
                "line2": "Place Of Death Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.locationOfRemains = updatedData.data.locationOfRemains.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(updatedData.data.locationOfRemains.details.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(updatedData.data.locationOfRemains.details.Address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(updatedData.data.locationOfRemains.details.Address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(updatedData.data.locationOfRemains.details.Address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(updatedData.data.locationOfRemains.details.Address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(updatedData.data.locationOfRemains.details.Address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('14 Should return success while adding Existing Org in POD and Existing Org in LOR', async () => {
        reqData.placeOfDeath = updatedData.data.placeOfDeath.details.id
        reqData.locationOfRemains = updatedData.data.locationOfRemains.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(updatedData.data.locationOfRemains.details.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(updatedData.data.locationOfRemains.details.Address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(updatedData.data.locationOfRemains.details.Address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(updatedData.data.locationOfRemains.details.Address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(updatedData.data.locationOfRemains.details.Address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(updatedData.data.locationOfRemains.details.Address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('15 Should return success while adding Existing Org in POD and New Org in LOR', async () => {
        reqData.placeOfDeath = updatedData.data.placeOfDeath.details.id
        reqData.locationOfRemains = reqData.locationOfRemains = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Location of Remain Address1",
                "line2": "Location of Remain  Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.locationOfRemains.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('16 Should return success while adding Same As Residential Address in POD and LOR', async () => {
        reqData.decedentResidentialAddressId = reqData.placeOfDeath = reqData.locationOfRemains = updatedData.data.residentialAddress.Address.id
        reqData.placeOfDeathTypeId = reqData.locationOfRemainTypeId = 3
        reqData.hospitalDeathStatus = null
        reqData.placeOfDeathSameAsResidentialAddress = reqData.locationOfRemainsSameAsResidentialAddress = true
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('17 Should return success while adding Same As Residential Address in POD and Same As POD in LOR', async () => {
        delete reqData.locationOfRemains
        reqData.locationOfRemainsSameAsResidentialAddress = false
        reqData.locationOfRemainsSameAsPlaceOfDeath = true
        reqData.existingPlaceOfDeathAddressId = updatedData.data.placeOfDeath.details.Address.id
        reqData.existingLocationOfRemainAddressId = updatedData.data.locationOfRemains.details.Address.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('18 Should return success while adding Same As Residential Address in POD and New/Existing Address in LOR', async () => {
        reqData.locationOfRemains = {
            "line1": "Location of Remain Address1",
            "line2": "Location of Remain  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
        reqData.locationOfRemainsSameAsPlaceOfDeath = false
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.country)
        updatedData = res.body
    })

    it('19 Should return success while adding Same As Residential Address in POD and New Org in LOR', async () => {
        reqData.locationOfRemains = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Location of Remain Address1",
                "line2": "Location of Remain  Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.locationOfRemainTypeId = 2
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.locationOfRemains.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.locationOfRemains.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.locationOfRemains.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.locationOfRemains.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.locationOfRemains.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.locationOfRemains.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('20 Should return success while adding Same As Residential Address in POD and Existing Org in LOR', async () => {
        reqData.locationOfRemains = updatedData.data.locationOfRemains.details.id
        delete reqData.existingLocationOfRemainAddressId
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('organization')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(updatedData.data.locationOfRemains.details.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(updatedData.data.locationOfRemains.details.Address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(updatedData.data.locationOfRemains.details.Address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(updatedData.data.locationOfRemains.details.Address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(updatedData.data.locationOfRemains.details.Address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(updatedData.data.locationOfRemains.details.Address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('21 Should return success while adding New/Existing Address in POD and Same As POD in LOR', async () => {
        reqData.placeOfDeath = {
            "line1": "Place of Death Address1",
            "line2": "Place of Death  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
        delete reqData.locationOfRemains
        reqData.locationOfRemainTypeId = reqData.placeOfDeathTypeId
        reqData.locationOfRemainsSameAsPlaceOfDeath = true
        reqData.placeOfDeathSameAsResidentialAddress = false
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        updatedData = res.body
    })

    it('22 Should return success while adding New Org in POD and Same As POD in LOR', async () => {
        reqData.placeOfDeath = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Place Of Death Address1",
                "line2": "Place Of Death Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.hospitalDeathStatus = "IP"
        reqData.locationOfRemainTypeId = reqData.placeOfDeathTypeId = 2
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('23 Should return success while adding Existing Org in POD and Same As POD in LOR', async () => {
        reqData.placeOfDeath = updatedData.data.placeOfDeath.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.locationOfRemains.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.locationOfRemains.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.locationOfRemains.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.locationOfRemains.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.locationOfRemains.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.locationOfRemains.details.OrganizationType.should.have.property('Type')
        updatedData = res.body
    })

    it('24 Should return success while adding New Address in POD and Same As Residential Address in LOR', async () => {
        reqData.placeOfDeath = {
            "line1": "Place of Death Address1",
            "line2": "Place of Death  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
        reqData.placeOfDeathTypeId = reqData.locationOfRemainTypeId = 3
        reqData.hospitalDeathStatus = null
        reqData.decedentResidentialAddressId = reqData.locationOfRemains = updatedData.data.residentialAddress.Address.id
        reqData.locationOfRemainsSameAsPlaceOfDeath = false
        reqData.locationOfRemainsSameAsResidentialAddress = true
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('25 Should return success while adding Existing Address in POD and Same As Residential Address in LOR', async () => {
        reqData.placeOfDeath = {
            "line1": "Place of Death Address1",
            "line2": "Place of Death  Address2",
            "city": "Adjuntas",
            "state": "New York",
            "country": "United States",
            "addressTypeId": 1
        }
        reqData.existingPlaceOfDeathAddressId = updatedData.data.placeOfDeath.details.Address.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`address`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.country)
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('26 Should return success while adding New Org in POD and Same As Residential Address in LOR', async () => {
        reqData.placeOfDeathTypeId = 2
        reqData.placeOfDeath = {
            "name": "HelloWorld",
            "organizationTypeId": 1,
            "address": {
                "line1": "Place Of Death Address1",
                "line2": "Place Of Death Address2",
                "city": "Adjuntas",
                "state": "New York",
                "country": "United States",
                "addressTypeId": 1
            }
        }
        reqData.existingPlaceOfDeathAddressId = updatedData.data.placeOfDeath.details.Address.id
        reqData.hospitalDeathStatus = "IP"
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(reqData.placeOfDeath.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(reqData.placeOfDeath.address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(reqData.placeOfDeath.address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(reqData.placeOfDeath.address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(reqData.placeOfDeath.address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(reqData.placeOfDeath.address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('27 Should return success while adding Existing Org in POD and Same As Residential Address in LOR', async () => {
        reqData.placeOfDeath = updatedData.data.placeOfDeath.details.id
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object')
        res.body.data.placeOfDeath.should.have.property('type').and.to.be.equal(`organization`)
        res.body.data.placeOfDeath.should.have.property('details').and.to.be.an('object')
        res.body.data.placeOfDeath.details.should.have.property('name').to.equal(updatedData.data.placeOfDeath.details.name)
        res.body.data.placeOfDeath.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.placeOfDeath.details.Address.should.have.property('line1').to.equal(updatedData.data.placeOfDeath.details.Address.line1)
        res.body.data.placeOfDeath.details.Address.should.have.property('line2').to.equal(updatedData.data.placeOfDeath.details.Address.line2)
        res.body.data.placeOfDeath.details.Address.should.have.property('city').to.equal(updatedData.data.placeOfDeath.details.Address.city)
        res.body.data.placeOfDeath.details.Address.should.have.property('state').to.equal(updatedData.data.placeOfDeath.details.Address.state)
        res.body.data.placeOfDeath.details.Address.should.have.property('country').to.equal(updatedData.data.placeOfDeath.details.Address.country)
        res.body.data.placeOfDeath.details.should.have.property('OrganizationType').and.to.be.an('object')
        res.body.data.placeOfDeath.details.OrganizationType.should.have.property('Type')
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object')
        res.body.data.locationOfRemains.should.have.property('type').to.equal('address')
        res.body.data.locationOfRemains.should.have.property('details').and.to.be.an('object')
        res.body.data.locationOfRemains.details.should.have.property('Address').and.to.be.an('object')
        res.body.data.locationOfRemains.details.Address.should.have.property('id').to.equal(updatedData.data.residentialAddress.Address.id)
        updatedData = res.body
    })

    it('28 Should return success while adding only Date Of Death where as POD and LOR should be null', async () => {
        reqData = {
            dateOfDeath: "2018-06-22",
            hospitalDeathStatus: null,
            placeOfDeathSameAsResidentialAddress: false,
            locationOfRemainsSameAsPlaceOfDeath: false,
            locationOfRemainsSameAsResidentialAddress: false
        }
        const res = await chai.request(server)
            .put(`/api/v1/persons/${onePortalId}/death-info`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(200);
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('data').and.to.be.an('object')
        res.body.data.should.have.property('onePortalId').and.to.be.equal(`${onePortalId}`)
        res.body.data.should.have.property('residentialAddress').and.to.be.an('object')
        res.body.data.residentialAddress.should.have.property('Address').and.to.be.an('object')
        res.body.data.residentialAddress.Address.should.have.property('line1').to.equal(updatedData.data.residentialAddress.Address.line1)
        res.body.data.residentialAddress.Address.should.have.property('line2').to.equal(updatedData.data.residentialAddress.Address.line2)
        res.body.data.residentialAddress.Address.should.have.property('city').to.equal(updatedData.data.residentialAddress.Address.city)
        res.body.data.residentialAddress.Address.should.have.property('state').to.equal(updatedData.data.residentialAddress.Address.state)
        res.body.data.residentialAddress.Address.should.have.property('country').to.equal(updatedData.data.residentialAddress.Address.country)
        res.body.data.should.have.property('placeOfDeath').and.to.be.an('object').that.is.empty
        res.body.data.should.have.property('locationOfRemains').and.to.be.an('object').that.is.empty
        updatedData = res.body
    })
})
