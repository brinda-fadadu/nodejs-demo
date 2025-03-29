const callData = require('./schema/call')
const createCallController = require('../controllers/Calls/CreateCall/create')
const verifyPersonController = require('../controllers/Calls/VerifyCall/verifyCall')

async function generateOpi (user) {
    try {
        
        let callReqBody = await callData.getCallData()
        let callCreated = await createCallController.createCall(callReqBody.call)
        let decedentIds = callCreated.someOneHasPassed.map(e => {
            return e.decedent.id
        })
        let reasonIds = callCreated.someOneHasPassed.map(e => {
            return e.id
        })
        let verifyReqBody = {}
        verifyReqBody.params = {}
        verifyReqBody.params.callId = callCreated.identifier
        verifyReqBody.body = {}
        verifyReqBody.currentUser = {}
        verifyReqBody.currentUser.id = user.id
        verifyReqBody.body.person = {
            "personId": decedentIds[0],
            "userType": "Decedent",
            "reasonId": reasonIds[0]
        }
        //verify the decedent
        let callVerification = await verifyPersonController.verifyCall(verifyReqBody)
        return {
            personId: callVerification.personId,
            opi: callVerification.onePortalId
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    generateOpi
}