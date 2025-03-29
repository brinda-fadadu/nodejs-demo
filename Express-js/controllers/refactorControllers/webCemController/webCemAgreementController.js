const models = require('../../../models')
const _ = require('lodash')
const logger = require('../../../lib/logger')
const AgreementController = require('../agreementController/agreementController')
const WebCemCallController = require('./webCemCallController')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const AddendumController = require('../agreementController/addendum')
const getEmployees = require('../../../controllers/employees/getEmployees')
class WebCemAgreementController {
    static async getAgreementPersons (agreementId, personId, roleId) {
        const agreementPerson = await models.AgreementPerson.findOne({
            where: {
                agreementId,
                personId,
                roleId,
                deletedAt: null
            },
            attributes: ['id']
        })
        return agreementPerson
    }
    /**
   *
   * @param {Object<{arrangerId: Number, locationId: Number, needType: Number, saleTypeId: Number, decedent: Object, purchaser: Object}} reqBody
   */
    static async createOrUpdateContract (reqBody) {
        try {
            let agreement
            if (reqBody.id) {
                agreement = await models.Agreement.findOne({
                    where: { id: reqBody.id },
                    attributes: ['id']
                })
                if (!agreement) {
                    throw new Error('AGREEMENT_NOT_FOUND')
                }
            }
            const userId = await this.getUserId(reqBody.user)
            let decedentId
            let persons = []
            if (_.get(reqBody, 'purchaser.onePortalId')) {
                let agreementPerson
                const purchaserId = await WebCemCallController.getPersonId(_.get(reqBody, 'purchaser.onePortalId'))
                if (agreement) {
                    agreementPerson = await this.getAgreementPersons(agreement.id, purchaserId, 1)
                }
                const personObj = {
                    agreementRoleId: 1,
                    personId: purchaserId
                }
                if (agreementPerson) {
                    personObj.id = agreementPerson.id
                }
                persons.push(personObj)
            }
            if (_.get(reqBody, 'decedent.onePortalId')) {
                let agreementPerson
                decedentId = await WebCemCallController.getPersonId(_.get(reqBody, 'decedent.onePortalId'))
                if (agreement) {
                    agreementPerson = await this.getAgreementPersons(agreement.id, decedentId, 3)
                }
                const personObj = {
                    agreementRoleId: 3,
                    personId: decedentId
                }
                if (agreementPerson) {
                    personObj.id = agreementPerson.id
                }
                persons.push(personObj)
            }
            const contractPayload = {
                id: agreement ? agreement.id : null,
                locationId: reqBody.locationId,
                arrangerId: reqBody.arrangerId,
                type: 2,
                needType: reqBody.needType,
                saleTypeId: reqBody.saleTypeId,
                persons: persons
            }
            let createdContract
            if (agreement) {
                const agreementController = new AgreementController(agreement.id)
                createdContract = await agreementController.editAgreement(decedentId, contractPayload, userId)
            } else {
                createdContract = await AgreementController.createOrEditAgreement(decedentId, contractPayload, userId)
            }
            logger.info('Contract is created/updated')
            return createdContract
        } catch (err) {
            logger.error('Unable to create contract')
            throw err
        }
    }
    /**
     * @param {String} onePortalId
     * @param {Number} needType
     */
    static async getDropdownValues (onePortalId, needType) {
        const personId = await WebCemCallController.getPersonId(onePortalId)
        if (!personId) {
            throw new Error('PERSON_NOT_FOUND')
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(2, needType)
        const employeeList = await getEmployees()
        let result = {
            saleTypes,
            salesCounsellors: _.orderBy(employeeList, ['name'], ['asc']),
            cemeteryAuthority: [
                { value: 2, label: 'Brand Name', code: 'CFS' }
            ]
        }
        return result
    }
    // static async getEmployees () {
    //     const employeeList = await getEmployees()
    //     return employeeList
    // }
    static async getUserId (user) {
        const userDetail = await models.User.findOne({
            where: {
                email: user.email
            }
        })
        return userDetail ? userDetail.id : ''
    }

    static async getEthnicityId () {
        try {
            const getEthnicity = await models.Ethnicity.findAll({
                attributes: [['id', 'value'], ['name', 'label']]
            })
            return getEthnicity
        } catch (err) {
            throw (err)
        }
    }
    static async createAddendum (agreementId, arrangerId, user) {
        try {
            const userId = await this.getUserId(user)
            const addendumController = new AddendumController(agreementId)
            const arranger = await models.Agreement.findOne({
                where: {
                    id: agreementId
                },
                attributes: ['arrangerId']
            })
            let payload = {}
            if (!arranger) {
                throw new Error('AGREEMENT_NOT_FOUND')
            }
            if (arranger.arrangerId !== arrangerId) {
                payload = {
                    arrangerId: arrangerId
                }
            }
            const result = await addendumController.createAddendum(userId, payload)
            return result
        } catch (err) {
            throw err
        }
    }
}
module.exports = WebCemAgreementController
