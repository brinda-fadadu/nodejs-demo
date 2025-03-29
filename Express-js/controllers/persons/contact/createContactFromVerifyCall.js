const logger = require('../../../lib/logger')
const moment = require('moment')
const models = require('../../../models')
async function saveAsContact (obj) {
    const currentTime = moment().format('MM/DD/YYYY HH:mm:ss')
    const includeObj = [
        {
            model: models.ContactPerson,
            as: 'contactPerson'
        }
    ]
    let contact = {
        contactType: 'FamilyRelation',
        roleId: obj.roleData.id,
        personId: obj.isCaller ? obj.reasonData[obj.personType].id : obj.ele[obj.personType].id,
        relationshipId: obj.isCaller && !obj.relationId ? obj.callerDecentRelationshipId : obj.relationId ? obj.relationId : null
    }
    const user = obj.isCaller ? obj.ele : obj.ele[obj.userType]
    const address = obj.callerAddress || {}
    contact.contactPerson = {
        prefix: user.prefix,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        roleId: obj.roleData.id,
        relationId: obj.isCaller && !obj.relationId ? obj.callerDecentRelationshipId : obj.relationId ? obj.relationId : null,
        email: user.email,
        phoneNumber: user.phoneNumber,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        county: address.county,
        country: address.country,
        zipcode: address.zipcode,
        createdBy: obj.currentUser,
        updatedBy: obj.currentUser,
        createdAt: currentTime,
        updatedAt: currentTime
    }
    await models.Contact.create(contact, {
        include: includeObj
    })
}

async function anCreateContact (anData) {
    for (const x of anData.data.someOneHasPassed) {
        let decedentAndVerifiedPersonCheck = x.decedent.id === anData.verifiedPersonId
        let bothNokAndInformant = x.NextOfKin && x.InformantAsCaller
        let noNokAndInformant = !x.NextOfKin && x.InformantAsCaller
        let noNokAndNoInformant = !x.NextOfKin && !x.InformantAsCaller
        let nokAndNoInformant = x.NextOfKin && !x.InformantAsCaller
        if (((bothNokAndInformant) || (noNokAndInformant)) && !anData.data.IsCallFromOrganization && decedentAndVerifiedPersonCheck) {
            await saveAsContact({
                roleData: x.NextOfKin ? anData.roleNokData : anData.roleInformantData,
                ele: anData.data.caller,
                reasonData: x,
                callerAddress: anData.data.CallerAddress,
                currentUser: anData.currentUser,
                userType: x.NextOfKin ? 'nok' : 'informant',
                personType: 'decedent',
                callerDecentRelationshipId: x.CallerDecentRelationshipId,
                isCaller: true
            })
        } else if (((noNokAndNoInformant) || (nokAndNoInformant)) && !anData.data.IsCallFromOrganization && decedentAndVerifiedPersonCheck) {
            await saveAsContact({
                roleData: anData.roleInformantData,
                ele: x,
                relationId: x.informantRelation ? x.informantRelation.id : null,
                currentUser: anData.currentUser,
                userType: 'informant',
                personType: 'decedent',
                isCaller: false
            })
            if (nokAndNoInformant) {
                await saveAsContact({
                    roleData: anData.roleNokData,
                    ele: anData.data.caller,
                    reasonData: x,
                    callerAddress: anData.data.CallerAddress,
                    currentUser: anData.currentUser,
                    userType: 'nok',
                    personType: 'decedent',
                    callerDecentRelationshipId: x.CallerDecentRelationshipId,
                    isCaller: true
                })
            }
        } else if (anData.data.IsCallFromOrganization && noNokAndNoInformant && decedentAndVerifiedPersonCheck) {
            await saveAsContact({
                roleData: anData.roleInformantData,
                ele: x,
                relationId: x.informantRelation ? x.informantRelation.id : null,
                currentUser: anData.currentUser,
                userType: 'informant',
                personType: 'decedent',
                isCaller: false
            })
        }
    }
}

async function pnCreateContact (pnData) {
    for (const y of pnData.data.preNeedReason) {
        if (y.beneficiary && y.beneficiary.id === pnData.verifiedPersonId && !pnData.data.IsCallFromOrganization) { // not self
            await saveAsContact({
                roleData: {
                    id: null
                },
                ele: pnData.data.caller,
                reasonData: y,
                callerAddress: pnData.data.CallerAddress,
                relationId: y.pnRelation ? y.pnRelation.id : null,
                currentUser: pnData.currentUser,
                userType: 'beneficiary',
                personType: 'beneficiary',
                isCaller: true
            })
        }
    }
}

async function createContact (data, verifiedPersonId) {
    try {
        const currentUser = data.CreatedBy
        const callReason = data.Reason
        const roleNokData = await models.Role.findOne({ where: { Type: 'Contact', Name: 'Next of Kin' } })
        const roleInformantData = await models.Role.findOne({ where: { Type: 'Contact', Name: 'Informant' } })
        if ([1, 2].indexOf(callReason) !== -1) {
            if (callReason === 1) { // AN
                await anCreateContact({
                    data: data, verifiedPersonId: verifiedPersonId, roleNokData: roleNokData, roleInformantData: roleInformantData, currentUser: currentUser
                })
            } else if (callReason === 2) { // PN
                await pnCreateContact({
                    data: data, verifiedPersonId: verifiedPersonId
                })
            }
        }
        return data
    } catch (error) {
        logger.error(error)
        throw error
    }
}

module.exports = exports = createContact
