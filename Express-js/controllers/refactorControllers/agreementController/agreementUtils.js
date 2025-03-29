const models = require('../../../models')
const esAgreement = require('../../../es_models/agreement')
const _ = require('lodash')
const logger = require('../../../lib/logger')
const ApprovalsController = require('../adjustmentController/approvalsController')
/**
 *
 *
 * AN Funeral YYYYLOCXXXXX - (own sequence) 2019CFS00001
 * PN Funeral YYYYPNFXXXXX - (own sequence) 2019PNF00001
 * AN Cemetery YYYYANCXXXXX - (cemetery shared sequence) 2019ANC00001
 * PN Cemetery YYYYPNCXXXXX - (cemetery shared sequence) 2019PNC00002
 */

// contract number should be generated on checkout
/**
 *
 * @param {Number} agreementId id of the agreement
 * @param {Number} personId id of the person against whom the agreement is created
 * @param {*} t is transaction
 */
async function updateAgreementDetails (agreementId, personId, t) {
    try {
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        const verifiedPersonController = new VerifiedPersonController(personId)
        await verifiedPersonController.getVerifiedPerson(t)
        const agreementData = await models.Agreement.findOne({
            where: {
                id: agreementId
            },
            transaction: t
        })

        if (agreementData) {
            if (!agreementData.contractNumber) {
                agreementData.contractNumber = await createContractNo(agreementData, t)
                await esAgreement.save(agreementData)
            }
            const agreementDetails = await agreementData.save({ transaction: t })
            return agreementDetails
        } else {
            throw new Error('AGREEMENT_NOT_FOUND')
        }
    } catch (error) {
        logger.error(error)
        throw error
    }
}

/**
 *
 * @param {Object} agreementData details of the agreement found
 * @param {number} agreementData.type is the type of the agreement like funeral/cemetry
 * @param {number} agreementData.needType is the need type for which the agreemnt is created like AN/PN
 * @param {number} agreementData.locationId is the id of the location at which the agreement is created
 * @param {*} t transaction
 */
async function createContractNo (agreementData, t) {
    const AgreementController = require('./agreementController')
    try {
        let arrangementType, location, contractNumber, agreementType
        const needTypes = AgreementController.NEED_TYPES
        const types = AgreementController.TYPES
        arrangementType = _.findKey(needTypes, type => {
            return type === agreementData.needType
        })
        agreementType = _.findKey(types, type => {
            return type === agreementData.type
        })
        location = await models.Location.findOne({
            where: {
                id: agreementData.locationId
            },
            attributes: ['id', 'code'],
            transaction: t
        })
        const year = (new Date()).getFullYear()
        const counterCondtions = {
            year: year,
            arrangementType: arrangementType
        }
        contractNumber = [year]
        if (arrangementType === 'AN') {
            if (agreementType === 'Cemetry') {
                contractNumber.push('ANC')
            } else {
                counterCondtions.locationId = location.id
                contractNumber.push(location.code)
            }
        } else if (arrangementType === 'PN') {
            if (agreementType === 'Cemetry') {
                contractNumber.push('PNC')
            } else {
                contractNumber.push('PNF')
            }
        }
        const [agreementCounter] = await models.AgreementCounter.findOrCreate({
            where: counterCondtions,
            transaction: t
        })
        await agreementCounter.increment('value', { transaction: t })
        contractNumber.push(
            String(agreementCounter.value + 1).padStart(5, '0')
        )
        let contractNo = contractNumber.join('')
        return contractNo
    } catch (error) {
        logger.error(error)
        throw error
    }
}
function returnFinancedValue (agreement) {
    const activeFinace = _.get(agreement, 'financeDetails', []).filter(finance => finance.isActive || finance.isActive === null)
    if (activeFinace.length) {
        const specialFinance = ['Special-equal', 'Special-unequal']
        let financedStatus = false
        agreement.financeDetails.forEach(finance => {
            if (specialFinance.includes(finance.financeType)) {
                if (ApprovalsController.ApprovalStatusStr(_.get(finance, 'approval.status')) === 'Approved') {
                    financedStatus = true
                } else {
                    financedStatus = false
                }
            } else {
                financedStatus = true
            }
        })
        return financedStatus
    }
    return false
}

function propertyOwnerList (propertys) {
    let propertyOwnersList = {
        oldPropertyOwners: [],
        propertyOwners: []
    }
    if (propertys && propertys.length) {
        propertys.map((property) => {
            property.agreementPropertyOwner.map((propertyOwner) => {
                if (propertyOwner.deletedAt) {
                    propertyOwnersList.oldPropertyOwners.push({ id: propertyOwner.id, personId: propertyOwner.ownerId, person: propertyOwner.person })
                } else {
                    propertyOwnersList.propertyOwners.push({ id: propertyOwner.id, personId: propertyOwner.ownerId, person: propertyOwner.person })
                }
            })
        })
    }
    return propertyOwnersList
}
module.exports = {
    updateAgreementDetails,
    returnFinancedValue,
    propertyOwnerList
}
