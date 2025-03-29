
const { addItemsToStatement } = require('../statements/addItemsSchema')
const { stripeClient } = require('../../../services').stripe
const { createPayorReqBody } = require('../statements/addPayorReqBody')
const {
    models 
} = require('../../helper')
const _ = require('underscore')


async function getPayorDetails () {
    try {
        const statementDetails = await addItemsToStatement()
        const payorId = await createPayorReqBody()
        return {
            payorId: payorId,
            statementId: statementDetails.statementId,
            authToken: statementDetails.authToken
        }

    } catch (error) {
        return error
    }
}
async function createCardToken (cardObj) {
    const cardToken = await stripeClient.createCardToken(
        cardObj
    )
    return {
        cardToken : cardToken.id
    }
}

async function getPayorById(statementId, payorId) {    
    const payors = await models.AgreementPerson.getPayors(statementId)    
    const payor = _.find(payors, ele => {
        return ele.id = payorId
    })
    return payor
}

module.exports = {
    createCardToken,
    getPayorDetails,
    getPayorById
}

