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
    getAddressTypes,
    getCountries,
    getOrganizationTypes,
    getFollowupTypes
} = require('../../../../helper')  //Please change the helper path if required

const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
const {getOtherReasonCallData,getOtherReasonEditCallData} = require('../../../../schema/otherReason') 	// Please check this path from your file path
const {createCallData,getCallDataById,getCallData} = require('../../../../schema/call')
let identifier,callData,followupTypes,editCallData

describe('Using to test Maintenance request reason edit call', async () => {

    before(async () => {
        
        callData =await getOtherReasonCallData();
        const user = await addTestUser()
        callData.call.userId = user.id          
        const callResult = await createCallData(callData.call)
        
        identifier = callResult.Identifier        
        followupTypes = await getFollowupTypes()

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {
        let getCall = await getCallDataById(identifier)   
        editCallData = await getOtherReasonEditCallData(getCall)       
        return true

    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })

    it('Change the followup Email', async () => {
        let followupEmail = faker.internet.email()+'AB'
        editCallData.call.reason[0].email = followupEmail
      
        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('Authorization',authToken)
            .send(editCallData)                  
            return res.body.call.otherReason[0].EmailContact.should.to.equal(followupEmail)
    })

     /* You can write more test cases from here */
})