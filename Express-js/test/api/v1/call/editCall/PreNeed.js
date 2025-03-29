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
    getOrganizationTypes
} = require('../../../../helper')  //Please change the helper path if required

const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')

const {
    getPreNeedCallData,
    createPreNeedCall,
    getPreNeedCallById,
    getPreNeedEditCall
} = require('../../../../schema/PreNeedCall') 	// Please check this path from your file path

console.log('After Schema::::');
let editCallData, identifier, call,authToken, relations
console.log('Before describe')
describe('PUT /api/v1/call/:Identifier in all possible scenarios', async () => {

    before(async () => {
        const callData =await getPreNeedCallData()    
        const user = await addTestUser()
        callData.call.userId = user.id      
        const callResult = await createPreNeedCall(callData.call);
        identifier = callResult.Identifier
        authToken = await genAuthToken(user)
        relations = await getRelations()
        /*Write code that need to run before test suite*/

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {

        call = await getPreNeedCallById(identifier)
        editCallData = await getPreNeedEditCall(call)        
        return true
    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })

    it('Testing the API by changing the beneficiary details', async () => {
        let preNeeds = []
        
        editCallData.call.reason = editCallData.call.reason.map(ele => {
            ele.beneficiary.firstName += 'TEST'
            ele.beneficiary.lastName  += 'TEST'
            preNeeds.push(ele.beneficiary);
            return ele;
        })

        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('authorization', authToken)
            .send(editCallData)
            res.body.call.preNeedReason.should.to.satisfy(preNeedReasons => {
                let testPassed = true
                preNeedReasons.forEach(ele => {
                    
                    if(_.pluck(preNeeds,'firstName').indexOf(ele.beneficiary.FirstName) === -1){
                        testPassed = false
                    }
                    if(_.pluck(preNeeds,'lastName').indexOf(ele.beneficiary.LastName) === -1){
                        testPassed = false
                    }
                });
                
                return testPassed
            })
    })


     /* You can write more test cases from here */
})