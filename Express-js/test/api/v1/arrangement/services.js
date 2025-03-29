const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,   
    verifyPerson,
    createArrangementWithData,
    getServicesList,
    createStatementForArrangement
} = require('../../../helper')  //Please change the helper path if required

const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
const {getCallData,createCallData,getCallDataById} = require('../../../schema/call') 	// Please check this path from your file path
let arrangementId,authToken,scheduleServicesLength=0


describe('Listing all the services ', async () => {    
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        authToken = await genAuthToken(user)
        
        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        const verifyData = {
            callId: callResponse.Identifier,
            personId: callResponse.someOneHasPassed[0].DecedentId,
            currentUserId: user.id,
            userType:'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        const arrangementResponse = await createArrangementWithData({
            onePortalId: verificationResult.onePortalId
        })
        arrangementId = arrangementResponse.id
        const servicesList = await getServicesList()
        const statementData = {
            arrangementId: arrangementId,
            services:[]
        }
        
        servicesList.forEach(ele => {

            statementData.services.push({
                id: ele.id,
                quantity: 2
            })
            if(ele.IsSchedulingRequired){
                scheduleServicesLength += 2
            }
        })
        const statementId = await createStatementForArrangement(statementData)
        


    })

    after(async () => { 

        

    })

    beforeEach(async () => {

        /*Write code that need to need run before each test case*/

    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })
    //TODO: Rewrite the test cases once we defined sub services, Statement creation, Cemetery contract creation
    it('Get the list of services againest an arrangment and check all services', async () => {
        let response = await chai.request(server)
            .get(`/api/v1/arrangement/1/services`)
            .set('Authorization', authToken)            
            console.log(scheduleServicesLength)
            return expect(response.body.result.length).to.equal(scheduleServicesLength)
    })


    
    it('Create a schedule and check are getting the details of scheduled item along with the list', async () => {
        let response = await chai.request(server)
            .get(`/api/v1/arrangement/1234/services`)
            .set('Authorization', authToken)            
            console.log(response.status)
            return expect(response.status).to.equal(404)
    })

    

     /* You can write more test cases from here */
})