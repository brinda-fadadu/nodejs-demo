const models = require('../../../models/index')
const { upsert, getAgreementRoles } = require('../utils')
const { returnFinancedValue } = require('./agreementUtils')
const logger = require('../../../lib/logger')
const moment = require('moment')
const _ = require('lodash')
class AddendumController {
    constructor (agreementId, addendumId) {
        this.agreementId = agreementId
        this.addendumId = addendumId
    }

    /**
     * Returns currently in progress addendum
     */
    async getInProgressAddendum (t) {
        const addendum = await models.Addendum.findOne({
            where: {
                agreementId: this.agreementId,
                status: 'In Progress' // TODO : Make a file to store constants
            },
            transaction: t
        })
        if (addendum) {
            return addendum.toJSON()
        } else {
            return null
        }
    }

    async _addendumCreationCheck (transaction) {
        // Addendums shouldn't be allowed for PNF insurance statement after 90days of HMIS submission
        const getHMISSyncDate = await models.sequelize.query(`SELECT HDS.createdAt FROM Agreement AS A
        INNER JOIN SaleType AS ST ON A.saleTypeId = ST.id
        INNER JOIN HMISDataSync AS HDS ON HDS.agreementId = A.id
        where ST.code IN ('FORTHOUGHT',
        'GAINS',
        'HOMSTEADER',
        'INS FORETH',
        'PRECOA')
        AND 
        A.id = :agreementId`,
        {
            type: models.Sequelize.QueryTypes.SELECT,
            replacements: {
                agreementId: this.agreementId
            },
            transaction
        })
        if (getHMISSyncDate.length) {
            const lastUpdatedDate = moment(getHMISSyncDate[0].createdAt)
            const curent = moment().startOf('day')

            // Calcualte days since the HIMS sync is sumitted.
            const daysSinceLastUpdate = moment.duration(curent.diff(lastUpdatedDate)).asDays()
            if (daysSinceLastUpdate > 90) {
                throw new Error('ADDENDUM_CREATION_CHECK1')
            }
        }

        // Addendums shouldn't be allowed for PNF trust statement after the statement is paid-in-full (due becomes 0)
        const getAgreementDue = await models.sequelize.query(`SELECT A.due FROM Agreement AS A
        INNER JOIN SaleType AS ST ON A.saleTypeId = ST.id
        WHERE ST.code IN ('CFT', 'CFTGA', 'MEMBERSHIP', 'TPI') 
        AND 
        A.id = :agreementId`,
        {
            type: models.Sequelize.QueryTypes.SELECT,
            replacements: {
                agreementId: this.agreementId
            },
            transaction
        })
        if (getAgreementDue.length) {
            if (getAgreementDue[0].due <= 0) {
                throw new Error('ADDENDUM_CREATION_CHECK2')
            }
        }
    }

    /**
    * create addendum for the given agreementId
    */
    async createAddendum (userId, webCemPayload) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            await this._addendumCreationCheck(transaction)
            const agreementAndAddendum = await this.getAllAddendum(transaction)
            await this._addendumCreationCheck(transaction)
            this._checkAllPreviousAddendum(agreementAndAddendum.addendumList)
            const numberOfAddendum = agreementAndAddendum.addendumList.length
            const currentAddendumNumber = ('0' + (numberOfAddendum + 1)).slice(-2)
            const newAddendumNumber = `${agreementAndAddendum.agreementDetails.contractNumber.trim()}-${currentAddendumNumber}`
            const payload = {
                status: 'In progress',
                agreementId: this.agreementId,
                addendumNumber: newAddendumNumber
            }
            if (webCemPayload) {
                if (webCemPayload.arrangerId) {
                    const agreementpayload = {
                        id: this.agreementId,
                        arrangerId: webCemPayload.arrangerId
                    }
                    await upsert('Agreement', agreementpayload, transaction, { userId })
                }
            }
            const createdAddendum = await upsert('Addendum', payload, transaction)
            // Adding due to previousDue in Agreement while creating Addendum for Financing purpose
            await models.Agreement.update({
                previousDue: agreementAndAddendum.agreementDetails.due
            }, {
                where: { id: this.agreementId },
                transaction
            })
            // Removing existing records in CertificateOfSepulcher table if contract/addendum is inprogress
            await models.CertificateOfSepulcher.update({
                deletedAt: new Date(),
                deletedBy: userId
            }, {
                where: { agreementId: this.agreementId }, transaction
            })
            await transaction.commit()
            return createdAddendum
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * This method is used to edit the addendum to add/remove beneficiaries/decedents from cemetery contract
     * @param {Array<{personId: Number, agreementRoleId: Number, id: Number, isDeleted: Boolean}>} reqBody.persons
     * @param {Number} reqBody.arrangerId id of the Sales Counselor
     * @param {Number} userId id of the currently logged in user
     * @returns {Object} retuen updated addendumDetails
     */
    async editAddendum (reqBody, userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const addendumDetails = await this.getAddendumDetails(transaction)
            if (addendumDetails && addendumDetails.status === 'In progress') {
                const AgreementController = require('./agreementController')
                // checking if atleast one beneficiary is there
                const agreementRoles = await getAgreementRoles('map', transaction)
                const beneficiaries = reqBody.persons.filter(person => !person.isDeleted && person.agreementRoleId === agreementRoles['Beneficiary'])
                if (beneficiaries.length === 0) {
                    throw new Error('AT_LEAST_ONE_BENEFICIARY_NEED_TO_BE_THERE')
                }
                await AgreementController._validateAgreementPersons(reqBody, agreementRoles, transaction)
                if (reqBody.arrangerId) {
                    const payload = {
                        id: this.agreementId,
                        arrangerId: reqBody.arrangerId
                    }
                    await upsert('Agreement', payload, transaction, { userId })
                }
                const agreementController = new AgreementController(this.agreementId)
                await AgreementController._checkForVerifiedPersons(reqBody.persons, transaction)
                // deleting the agreementPersons
                const personsToDelete = _.remove(reqBody.persons, person => {
                    return person.isDeleted
                })
                if (personsToDelete.length) {
                    personsToDelete.forEach(person => { person.deletedInAddendumId = this.addendumId })
                    await agreementController._deleteAgreementPersons(personsToDelete, userId, transaction)
                }
                const toUpdatePersons = _.remove(reqBody.persons, person => {
                    return !person.isDeleted && person.id
                })
                if (toUpdatePersons.length) {
                    // updating the agreementPersons
                    await agreementController._updatingAgreementPersons(toUpdatePersons, transaction)
                }
                if (beneficiaries.length > addendumDetails.totalRights) {
                    throw new Error('BENEFICIARIES_ARE_MORE_THAN_TOTAL_RIGHTS')
                }
                if (reqBody.persons && reqBody.persons.length > 0) {
                    reqBody.persons.forEach(person => {
                        person.addedInAddendumId = this.addendumId
                    })
                    reqBody.type = addendumDetails.type
                    await agreementController._insertingNewAgreementPersons(
                        reqBody,
                        agreementRoles,
                        transaction
                    )
                }
                const agreementDetails = await agreementController.getAgreementDetails(transaction)
                const cancelAgreement = agreementDetails.type === 2 ? true : agreementDetails.needType === 2
                if (reqBody.isCancelled && cancelAgreement) {
                    const AgreementItemController = require('./agreementItemController')
                    const agreementItemController = new AgreementItemController(this.agreementId)
                    const usedItems = await agreementItemController.fetchItemUsageItems(transaction)
                    if (usedItems.length === 0) {
                        const payload = { id: this.agreementId, status: 'Cancelled' }
                        await upsert('Agreement', payload, transaction, { userId })
                        await models.sequelize.query(`update Addendum set status='Cancelled' where agreementId=${this.agreementId}`, {
                            type: models.Sequelize.QueryTypes.UPDATE,
                            transaction
                        })
                    } else {
                        throw new Error('CANNOT CANCEL AGREEMENT')
                    }
                }
                await transaction.commit()
            }
            return addendumDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
    * get the details of single addendum
    * @param transaction is the db transaction
    */
    async getAddendumDetails (transaction, isWebCemPayload, lotSellUnitId) {
        const agreementDetails = await this._getAgreementDetailsForAddendum(transaction, isWebCemPayload, lotSellUnitId)
        const addendum = await models.Addendum.findOne({
            where: {
                id: this.addendumId,
                agreementId: this.agreementId
            },
            include: [{
                model: models.HMISAddendumDataSync,
                as: 'hmisAddendumSyncDetails',
                attributes: ['id'],
                include: [{
                    model: models.HMISDataSyncStatus,
                    as: 'HMISDataSyncStatus',
                    attributes: ['name']
                }]
            }],
            transaction
        })
        if (!addendum) {
            throw new Error('ADDENDUM_NOT_FOUND')
        }

        return this._mergeAgreementAndAddendum(agreementDetails, addendum)
    }

    /**
    * get the agreement and addendum details
    * @param transaction is the db transaction
    */
    async getAllAddendum (transaction, isWebCemPayload, lotSellUnitId) {
        let agreementDetails = await this._getAgreementDetailsForAddendum(transaction, isWebCemPayload, lotSellUnitId)
        const fetchAddendumList = await models.Addendum.findAll({
            where: {
                agreementId: this.agreementId
            },
            transaction
        })
        agreementDetails = agreementDetails.toJSON()
        const addendumList = await Promise.all(fetchAddendumList.map(async (eachAddendum) => {
            agreementDetails.financed = await returnFinancedValue(agreementDetails)
            return this._mergeAgreementAndAddendum(agreementDetails, eachAddendum)
        }))
        return {
            addendumList,
            agreementDetails
        }
    }

    /**
    * check if all the previous addendum are completed
    * @param list of all the previous addendum
    */
    _checkAllPreviousAddendum (list) {
        const areAllAddendumCompleted = list.every((eachAddendum) => {
            return eachAddendum.status === 'Submitted'
        })
        if (!areAllAddendumCompleted) {
            throw new Error('ADDENDUM_IS_NOT_COMPLETED')
        }
    }

    /**
    * merge agreement and addendum in the response
    * @param agreement is the parent agreement object
    * @param addendum is the addendum object of agreement
    */
    _mergeAgreementAndAddendum (agreement, addendum) {
        addendum = addendum.toJSON ? addendum.toJSON() : addendum
        agreement = agreement.toJSON ? agreement.toJSON() : agreement
        return {
            ...agreement,
            ...addendum
        }
    }

    /**
    * validate agreement params and return agreement details
    * @param transaction is the db transaction
    */
    async _getAgreementDetailsForAddendum (transaction, isWebCemPayload, lotSellUnitId) {
        const AgreementController = require('./agreementController')
        const agreementController = new AgreementController(this.agreementId)
        const agreementDetails = await agreementController.getAgreementDetails(transaction, isWebCemPayload, lotSellUnitId)
        if (agreementDetails.status === 'In progress') {
            throw new Error('AGREEMENT_IS_NOT_COMPLETED')
        }
        return agreementDetails
    }

    /**
    * convert the addendum status to complete
    * (this method is only for dev integration)
    */
    async markAddendumComplete (transaction) {
        const result = await models.Addendum.update({
            status: 'Submitted'
        }, { where: { id: this.addendumId }, transaction })
        return result
    }
    /**
     * Returns Changelog list based on the addendum
     * @params {Number} addendumId
     */
    static async getChangeLogs (addendumId) {
        try {
            const query = `SELECT 
            ad.addendumNumber, 
            ch.quantity, 
            ch.unitPrice, 
            ch.totalPrice, 
            ch.updatedAt,
            ch.agreementId, 
            ch.addendumId, 
            i.name AS itemName, 
            i.code AS itemCode, 
            NULL AS rights,
            NULL AS maxRights,
            NULL AS totalRights,
            NULL AS lotSpaceId,
            CASE  
            WHEN it.name = 'Services' THEN 'services'
            WHEN it.name = 'Merchandises' THEN 'merchandises'
            END AS itemType,
            case 
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS action FROM ChangeLog ch 
            INNER JOIN AgreementLocationItem ali ON ali.id=ch.resourceId AND ch.resourceType = 'AgreementLocationItem' 
            INNER JOIN Addendum ad ON ad.id = ch.addendumId 
            INNER JOIN LocationItem li ON ali.locationItemId = li.id 
            INNER JOIN Item i ON i.id = li.itemId 
            INNER JOIN ItemCategory ic ON ic.id  = i.itemCategoryId 
            INNER JOIN ItemType it ON it.id = ic.itemTypeId WHERE ch.addendumId = ${addendumId} and ch.quantity != 0

            UNION ALL 

            SELECT 
            ad.addendumNumber, 
            ch.quantity, 
            ch.unitPrice, 
            ch.totalPrice, 
            ch.updatedAt, 
            ch.agreementId, 
            ch.addendumId, 
            p.code AS itemCode, 
            p.name AS itemName, 
            NULL AS rights,
            NULL AS maxRights,
            NULL AS totalRights,
            NULL AS lotSpaceId,
            'packages' AS itemType, 
            CASE  
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' END AS action FROM ChangeLog ch 
            INNER JOIN AgreementPackage ap ON ap.id=ch.resourceId AND ch.resourceType = 'AgreementPackage' 
            INNER JOIN Package p ON ap.packageId = p.id 
            INNER JOIN Addendum ad ON ad.id = ch.addendumId WHERE ch.addendumId = ${addendumId} and ch.quantity != 0

            UNION ALL 

            SELECT 
            ad.addendumNumber, 
            ch.quantity, 
            ch.unitPrice, 
            ch.totalPrice, 
            ch.updatedAt,
            ch.agreementId,
            ch.addendumId,
            i.name AS itemName,
            i.code AS itemCode,
            NULL AS rights,
            NULL AS maxRights,
            NULL AS totalRights,
            NULL AS lotSpaceId,
            'cashAdvancedItems' AS itemType, 
            CASE  
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS action FROM ChangeLog ch
            INNER JOIN AgreementCashAdvancedItem aci ON aci.id=ch.resourceId AND ch.resourceType = 'AgreementCashAdvancedItem' 
            INNER JOIN LocationItem li ON aci.locationItemId = li.id 
            INNER JOIN Addendum ad ON ad.id = ch.addendumId 
            INNER JOIN Item i ON i.id = li.itemId WHERE ch.addendumId =${addendumId} and ch.quantity != 0

            UNION ALL 

            SELECT 
            ad.addendumNumber,
            ch.quantity,            
            NULL AS unitPrice,
            NULL AS totalPrice,
            ch.updatedAt,
            ch.agreementId,
            ch.addendumId,
            ir.code AS itemCode,
            ir.name AS itemName, 
            NULL AS rights,
            NULL AS maxRights,
            NULL AS totalRights,
            NULL AS lotSpaceId,
            'specialOrderRequests' AS itemType,
            CASE  
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS action FROM ChangeLog ch 
            INNER JOIN ItemRequest ir ON ch.resourceId = ir.id AND ch.resourceType='ItemRequest' 
            INNER JOIN Addendum ad ON ad.id = ch.addendumId 
            WHERE ch.addendumId = ${addendumId} and ch.quantity != 0

            UNION ALL 

            SELECT 
            ad.addendumNumber,
            ch.quantity, 
            ch.unitPrice, 
            ch.totalPrice, 
            ch.updatedAt, 
            ch.agreementId,
            ch.addendumId,
            p.name AS itemName,
            p.propertyItemCode AS itemCode,
            ISNULL(itr.rights, 0) AS rights,
            ISNULL(itr.maxRights, 0) AS maxRights,
            ISNULL(itr.maxRights, 0) + (
                SELECT Count(*) FROM
                AgreementPropertyAdditionalRight apr
                WHERE apr.deletedBy is NULL AND apr.deletedAt is NULL AND apr.agreementPropertyId = agp.id
            ) AS totalRights,
            NULL AS lotSpaceId,
            'properties' AS itemType,
            CASE  
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS action FROM ChangeLog AS ch
            INNER JOIN AgreementProperty agp ON agp.id = ch.resourceId AND ch.resourceType= 'AgreementProperty'
            INNER JOIN Property p ON p.id = agp.propertyId
            INNER JOIN PropertyGarden pg ON pg.id = p.propertyGardenId
            INNER JOIN [PropertyTypeCode] AS ptc ON ptc.id = p.propertyTypeCodeId
            INNER JOIN [PropertyType] AS pt ON pt.id = ptc.propertyTypeId
            LEFT JOIN IntermentRights itr ON itr.propertyTypeId = pt.id AND itr.propertyCampusId = pg.propertyCampusId AND itr.graves=(CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END) 
            INNER JOIN Addendum ad ON ad.id = ch.addendumId
            WHERE ch.addendumId = ${addendumId} and ch.quantity != 0
            
            UNION ALL 

            SELECT 
            ad.addendumNumber,
            ch.quantity, 
            ch.unitPrice, 
            ch.totalPrice, 
            ch.updatedAt, 
            ch.agreementId,
            ch.addendumId,
            p.name AS itemName,
            p.propertyItemCode AS itemCode,
            NULL AS rights,
            NULL AS maxRights,
            NULL AS totalRights,
            lsp.lotSpaceId AS lotSpaceId,
            'agreementRights' AS itemType,
            CASE  
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS action FROM ChangeLog AS ch
            INNER JOIN AgreementPropertyAdditionalRight agr ON agr.id = ch.resourceId AND ch.resourceType= 'AgreementPropertyAdditionalRight'
            INNER JOIN AgreementProperty agp ON agp.id = agr.agreementPropertyId
            INNER JOIN Property p ON p.id = agp.propertyId
            INNER JOIN LotSpace lsp ON lsp.id = agr.lotSpaceId
            INNER JOIN Addendum ad ON ad.id = ch.addendumId
            WHERE ch.addendumId = ${addendumId} and ch.quantity != 0`

            const monumentsQuery = `
            SELECT 
            am.id,
            ad.addendumNumber,
            ch.agreementId,
            ch.addendumId,
            ch.quantity as 'memorials.quantity', 
            ch.unitPrice as 'memorials.unitPrice', 
            ch.totalPrice as 'memorials.totalPrice', 
            ch.updatedAt as 'memorials.updatedAt', 
            i.code as 'memorials.itemCode',
            i.name as 'memorials.itemName',
            ic.name as 'memorials.itemCategory',
            case 
            WHEN ch.quantity < 0 THEN 'removed' 
            WHEN ch.quantity >=0 THEN 'added' 
            END AS 'memorials.action',
            av.id as 'memorialType.id',
            av.name as 'memorialType.name',
            'monuments' AS itemType
            FROM ChangeLog ch 
            INNER JOIN AgreementMemorialItem ami ON ami.id = ch.resourceId AND ch.resourceType = 'AgreementMemorialItem'
            INNER JOIN AgreementMemorial am ON am.id = ami.agreementMemorialId
            INNER JOIN AttributeValue av ON av.id = am.memorialTypeAttributeValueId
            INNER JOIN Addendum ad ON ad.id = ch.addendumId 
            INNER JOIN LocationItem li ON ami.locationItemId = li.id 
            INNER JOIN Item i ON i.id = li.itemId
            INNER JOIN ItemCategory ic ON ic.id  = i.itemCategoryId 
            WHERE ch.addendumId = ${addendumId} and ch.quantity != 0`

            const monuments = await models.sequelize.query(monumentsQuery, {
                nest: true
            })

            let result = await models.sequelize.query(query, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {}
            })

            result = [
                ...result,
                ...monuments
            ]
            if (result && result.length) {
                return result
            } else {
                return []
            }
        } catch (err) {
            throw err
        }
    }
}

module.exports = AddendumController
