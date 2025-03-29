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
const {getMaintenanceCallData,getMaintenanceEditCallData} = require('../../../../schema/maintenanceCall') 	// Please check this path from your file path
const {createCallData,getCallDataById,getCallData} = require('../../../../schema/call')
let identifier,callData,maintenanceTypes,editCallData

describe('Using to test Maintenance request reason edit call', async () => {

    before(async () => {
        
        callData =await getMaintenanceCallData();
        const user = await addTestUser()
        callData.call.userId = user.id          
        const callResult = await createCallData(callData.call)
        
        identifier = callResult.Identifier        
        maintenanceTypes = await getMaintenanceTypes()

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {
        let getCall = await getCallDataById(identifier)   
        editCallData = await getMaintenanceEditCallData(getCall)       
        return true

    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })

    it('Changes in grave marker location', async () => {
        let graveMarkerLocation = faker.random.word()+'AB'
        editCallData.call.reason[0].graveMarkerLocation = graveMarkerLocation
        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('Authorization',authToken)
            .send(editCallData)
            return res.body.call.maintenanceRequestReason[0].GraveMarkerLocation.should.to.equal(graveMarkerLocation)
    })

     /* You can write more test cases from here */
})