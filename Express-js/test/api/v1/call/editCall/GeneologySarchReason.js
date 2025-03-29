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
    getMaintenanceTypes
} = require('../../../../helper')  //Please change the helper path if required

const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
const {getGeneologyCallData,getGeneologyEditCallData} = require('../../../../schema/geneologySearch') 	// Please check this path from your file path
const {createCallData,getCallDataById,getCallData} = require('../../../../schema/call')
let identifier,callData,editCallData

describe('Using to test Maintenance request reason edit call', async () => {

    before(async () => {
        
        callData =await getGeneologyCallData();
        const user = await addTestUser()
        callData.call.userId = user.id          
        const callResult = await createCallData(callData.call)
        
        identifier = callResult.Identifier        

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {
        let getCall = await getCallDataById(identifier)   
        editCallData = await getGeneologyEditCallData(getCall)       
        return true

    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })

    it('Changing the firstname of the decedent', async () => {
        let firstName = faker.name.firstName()+'Test'
        editCallData.call.reason[0].decedent.firstName = firstName
        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('Authorization',authToken)
            .send(editCallData)                        
            return res.body.call.geneologySearchReason[0].decedent.FirstName.should.to.equal(firstName)
    })

     /* You can write more test cases from here */
})