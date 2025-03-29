const models = require('../../../models')
const { propertyTypeMappings } = require('../../../config/seed')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const PropertyController = require('../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const ApprovalController = require('../../../controllers/refactorControllers/adjustmentController/approvalsController')
const BaseForm = require('./baseForm')
const _ = require('lodash')

class CemeteryAgreementController {
    static commonMethod (resObj, agItm) {
        if (agItm.agreementItemPrice.quantity > 0) {
            resObj.item.push(agItm.locationItem.Item.code)
            resObj.description.push(agItm.locationItem.Item.name)
            resObj.quantity += agItm.agreementItemPrice.quantity
            resObj.price += agItm.agreementItemPrice.totalPrice
        }
        return resObj
    }

    static getBeneficiaries (beneficiaries) {
        let result = beneficiaries.map(b => {
            return `${b.person.firstName} ${b.person.middleName} ${b.person.lastName}`
        })
        return result
    }

    static getIndexOfAttVal (attValArray, attVal) {
        let result = attValArray.findIndex(e => e.AttributeValue.name === attVal)
        return result
    }

    static async getCemeteryAgreementDetails (agreementId, caseInfoFormId) {
        try {
            const result = await models.Agreement.scope('commonIncludes', 'withAgreementPersons').findOne({
                where: {
                    id: agreementId
                },
                include: [{
                    model: models.AgreementAdjustment,
                    as: 'agreementAdjustments',
                    where: { deletedAt: null, deletedBy: null },
                    required: false,
                    include: [
                        {
                            model: models.Adjustment
                        },
                        {
                            model: models.Approval,
                            as: 'approval'
                        }
                    ]
                },
                {
                    model: models.AgreementFinance.scope('withFinanceSchedule', 'withApproval'),
                    as: 'financeDetails',
                    required: false,
                    where: {
                        isActive: true
                    }
                },
                {
                    model: models.Payment,
                    required: false,
                    where: {
                        voidedTime: null
                    }
                }
                ]
            })
            const result1 = await models.Agreement.findOne({
                where: {
                    id: agreementId
                },
                include: [
                    {
                        model: models.AgreementLocationItem,
                        as: 'agreementItems',
                        where: { deletedAt: null },
                        required: false,
                        include: [
                            {
                                model: models.AgreementItemPrice,
                                as: 'agreementItemPrice',
                                required: true
                            },
                            {
                                model: models.LocationItem,
                                include: [
                                    {
                                        model: models.Item,
                                        required: true,
                                        include: [
                                            {
                                                model: models.ItemAttributeValue,
                                                as: 'itemAttributes',
                                                attributes: ['id'],
                                                include: [
                                                    {
                                                        model: models.AttributeValue,
                                                        attributes: ['id', 'name']
                                                    }
                                                ]
                                            },
                                            {
                                                model: models.ItemCategory
                                            }
                                        ]
                                    }
                                ],
                                as: 'locationItem',
                                attributes: ['id', 'itemId'],
                                required: true
                            }
                        ]
                    },
                    {
                        model: models.AgreementMemorial,
                        as: 'agreementMemorials',
                        where: { deletedAt: null },
                        required: false,
                        attribute: ['id'],
                        include: [
                            {
                                model: models.AgreementMemorialItem,
                                as: 'agreementMemorialItems',
                                where: { deletedAt: null },
                                required: true,
                                include: [
                                    {
                                        model: models.AgreementItemPrice,
                                        as: 'agreementItemPrice',
                                        required: true
                                    },
                                    {
                                        model: models.LocationItem,
                                        include: [
                                            {
                                                model: models.Item,
                                                required: true,
                                                include: [
                                                    {
                                                        model: models.ItemAttributeValue,
                                                        as: 'itemAttributes',
                                                        attributes: ['id'],
                                                        include: [
                                                            {
                                                                model: models.AttributeValue,
                                                                attributes: ['id', 'name']
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        model: models.ItemCategory
                                                    }
                                                ]
                                            }
                                        ],
                                        as: 'locationItem',
                                        attributes: ['id', 'itemId'],
                                        required: true
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: models.AgreementProperty,
                        as: 'agreementProperties',
                        where: {
                            deletedAt: null,
                            deletedBy: null
                        },
                        required: false,
                        include: [
                            {
                                model: models.AgreementItemPrice,
                                as: 'agreementPropertyPriceDetails',
                                required: true
                            },
                            {
                                model: models.Property,
                                as: 'property',
                                required: true,
                                include: [
                                    {
                                        model: models.PropertyTypeCode,
                                        as: 'propertyTypeCode',
                                        required: true,
                                        include: [{
                                            model: models.PropertyType,
                                            as: 'propertyType',
                                            required: true
                                        }]
                                    },
                                    {
                                        model: models.PropertyGarden,
                                        as: 'propertyGardens',
                                        required: true,
                                        include: [
                                            {
                                                model: models.PropertyCampus,
                                                as: 'propertyCampus',
                                                required: true
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            })
            const baseForm = new BaseForm(caseInfoFormId)
            const agmtLocDetails = await baseForm.getAgreementPropertyLocation(agreementId)
            const agmntLocation = _.get(agmtLocDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
            let rightsInfo = await PropertyController.getIntermentAndAdditionalRights(agreementId)
            let owners = await PropertyController.getPropertyOwners(agreementId)
            let finalResult = {
                contractNumber: result.contractNumber,
                MemorialPark: !(agmtLocDetails && agmntLocation === 'Olivet campus'),
                OlivetCampus: !!(agmtLocDetails && agmntLocation === 'Olivet campus'),
                ownerNames: owners,
                beneficiary: this.getBeneficiaries(result.beneficiary),
                salesTaxPercent: result.location ? result.location.tax : null,
                salesTaxAmount: result.totalTax,
                totalPurchasePrice: result.totalPurchasePrice,
                totalCashPrice: result.totalCashPrice,
                cashDiscount: 0,
                preNeedDiscount: 0,
                credits: 0,
                financeType: null,
                repaymentAmount: 0,
                downPayment: result.totalPaid,
                amountFinanced: 0,
                financeCharge: 0,
                totalPayments: 0,
                salesPrice: result.totalCashPrice,
                interestRate: 0,
                noOfPayments: 0,
                beginningDate: null,
                dueDate: null,
                cremationService: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                cemeteryService: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                vault: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                casket: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                urn: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                keepsake: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                bequestService: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                CLdoc: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                CLassign: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                CLpermit: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                CLtitle: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                cryptPlate: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                nichePlate: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                monument: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                lawnMarker: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                base: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                foundation: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                vases: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                photo: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                inscription: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                others: {
                    item: [],
                    description: [],
                    quantity: 0,
                    price: 0
                },
                receiptNumbers: [],
                ppifAmount: 0
            }
            const needTypes = AgreementController.NEED_TYPES
            let needType = _.findKey(needTypes, type => {
                return type === result.needType
            })
            finalResult.preNeed = needType === 'PN'
            finalResult.atNeed = needType === 'AN'
            if (result1 && result1.agreementItems.length) {
                result1.agreementItems.map(agItm => {
                    if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Cremation Service') {
                        finalResult.cremationService = this.commonMethod(finalResult.cremationService, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && (agItm.locationItem.Item.ItemCategory.name === 'Disinterment Service' || agItm.locationItem.Item.ItemCategory.name === 'Interment Service')) {
                        finalResult.cemeteryService = this.commonMethod(finalResult.cemeteryService, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Vault') {
                        finalResult.vault = this.commonMethod(finalResult.vault, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Casket') {
                        finalResult.casket = this.commonMethod(finalResult.casket, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Urn') {
                        finalResult.urn = this.commonMethod(finalResult.urn, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Keepsake') {
                        finalResult.keepsake = this.commonMethod(finalResult.keepsake, agItm)
                    } else if (agItm.locationItem.Item.ItemCategory && agItm.locationItem.Item.ItemCategory.name === 'Bequest Service') {
                        finalResult.bequestService = this.commonMethod(finalResult.bequestService, agItm)
                    } else if (agItm.locationItem.Item.code === 'CLdoc') {
                        finalResult.CLdoc = this.commonMethod(finalResult.CLdoc, agItm)
                    } else if (agItm.locationItem.Item.code === 'CLassign') {
                        finalResult.CLassign = this.commonMethod(finalResult.CLassign, agItm)
                    } else if (agItm.locationItem.Item.code === 'CLpermit') {
                        finalResult.CLpermit = this.commonMethod(finalResult.CLpermit, agItm)
                    } else if (agItm.locationItem.Item.code === 'CLtitle') {
                        finalResult.CLtitle = this.commonMethod(finalResult.CLtitle, agItm)
                    } else {
                        finalResult.others = this.commonMethod(finalResult.others, agItm)
                    }
                })
            }
            if (result1 && result1.agreementProperties.length) {
                let [agmtProperty] = result1.agreementProperties
                let props = result1.agreementProperties.map(e => e.property.name)
                props = props.join(',').trim()
                let property = agmtProperty.property
                finalResult.developed = !property.preDeveloped
                finalResult.preDeveloped = !!property.preDeveloped
                finalResult.propertyLocation = `${property.propertyGardens.propertyCampus.name} - ${property.propertyGardens.name} - ${props}`
                let propertyType = agmtProperty ? propertyTypeMappings[property.propertyTypeCode.propertyType.name] : null
                finalResult.singleSpace = propertyType === 'Single Grave'
                finalResult.lawnCrypt = propertyType === 'Lawn Crypt'
                finalResult.estate = propertyType === 'Estate'
                finalResult.crypt = propertyType === 'Crypt'
                finalResult.niche = propertyType === 'Niche'
                finalResult.propertyPrice = 0
                finalResult.ecfAmount = 0
                finalResult.ecfQuantity = result1.agreementProperties.length
                finalResult.propertyRightsInfo = {}
                result1.agreementProperties.map(agPrpty => {
                    finalResult.propertyPrice += agPrpty.agreementPropertyPriceDetails.totalPrice
                    finalResult.ecfAmount += agPrpty.agreementPropertyPriceDetails.totalECFAmount
                })
                finalResult.propertyRightsInfo = rightsInfo
                finalResult.propertyRightsInfo.totalRights = rightsInfo.defaultRights + rightsInfo.additionalRightsCount
            }
            if (result1 && result1.agreementMemorials.length) {
                result1.agreementMemorials.map(agmtMem => {
                    agmtMem.agreementMemorialItems.map(agmtMemItem => {
                        let agmtMemItmCategory = agmtMemItem.locationItem.Item.ItemCategory
                        let agmtMemItmCatName = agmtMemItmCategory.name
                        let agmtMemItmAttVals = agmtMemItem.locationItem.Item.itemAttributes
                        if (agmtMemItmCategory && agmtMemItmCatName === 'Memorial' && agmtMemItmAttVals.length && this.getIndexOfAttVal(agmtMemItmAttVals, 'Crypt Plate') !== -1) {
                            finalResult.cryptPlate = this.commonMethod(finalResult.cryptPlate, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Memorial' && agmtMemItmAttVals.length && this.getIndexOfAttVal(agmtMemItmAttVals, 'NIche Plate') !== -1) {
                            finalResult.nichePlate = this.commonMethod(finalResult.nichePlate, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Memorial' && agmtMemItmAttVals.length && (this.getIndexOfAttVal(agmtMemItmAttVals, 'Upright') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Estate Monument') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Cremorial') !== -1)) {
                            finalResult.monument = this.commonMethod(finalResult.monument, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Memorial' && agmtMemItmAttVals.length && (this.getIndexOfAttVal(agmtMemItmAttVals, 'Lawn Marker') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Flat Marker') !== -1)) {
                            finalResult.lawnMarker = this.commonMethod(finalResult.lawnMarker, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmAttVals.length && (agmtMemItmCatName === 'Monument Base' || this.getIndexOfAttVal(agmtMemItmAttVals, 'Altar Plate') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Matching Base') !== -1)) {
                            finalResult.base = this.commonMethod(finalResult.base, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Foundation') {
                            finalResult.foundation = this.commonMethod(finalResult.foundation, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Monument Add On' && agmtMemItmAttVals.length && (this.getIndexOfAttVal(agmtMemItmAttVals, 'Vase') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Incense Pot') !== -1)) {
                            finalResult.vases = this.commonMethod(finalResult.vases, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Monument Add On' && agmtMemItmAttVals.length && this.getIndexOfAttVal(agmtMemItmAttVals, 'Photo') !== -1) {
                            finalResult.photo = this.commonMethod(finalResult.photo, agmtMemItem)
                        } else if (agmtMemItmCategory && agmtMemItmCatName === 'Monument Add On' && agmtMemItmAttVals.length && (this.getIndexOfAttVal(agmtMemItmAttVals, '1st Inscription') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, '2nd Inscription') !== -1 || this.getIndexOfAttVal(agmtMemItmAttVals, 'Inscription Only') !== -1)) {
                            finalResult.inscription = this.commonMethod(finalResult.inscription, agmtMemItem)
                        } else {
                            finalResult.others = this.commonMethod(finalResult.others, agmtMemItem)
                        }
                    })
                })
            }
            if (result && result.agreementAdjustments.length) {
                result.agreementAdjustments.map(agmtAdj => {
                    if (!agmtAdj.approval || (agmtAdj.approval && (agmtAdj.approval.status === ApprovalController.ApprovalStatus.Approved || agmtAdj.approval.status === ApprovalController.ApprovalStatus.AutoApproved))) {
                        let adjTitle = agmtAdj.Adjustment.title
                        if (adjTitle !== 'PN Guarantee Allowance Adjustment' && adjTitle !== 'PN on Cemetery Contract(s) Adjustment' && adjTitle !== 'Reinstate Credit Adjustment Adjustment') {
                            finalResult.cashDiscount += agmtAdj.amount
                        } else if (adjTitle === 'PN Guarantee Allowance Adjustment' || adjTitle === 'PN on Cemetery Contract(s) Adjustment') {
                            finalResult.preNeedDiscount += agmtAdj.amount
                        } else if (adjTitle === 'Reinstate Credit Adjustment Adjustment') {
                            finalResult.credits += agmtAdj.amount
                        }
                    }
                })
            }
            if (result && result.financeDetails.length) {
                let [finDetails] = result.financeDetails
                let approvalStatus = true
                if (finDetails.financeType === 'Special-equal' || finDetails.financeType === 'Special-unequal') {
                    approvalStatus = !!(finDetails.approval && finDetails.approval.status === 'Approved')
                }
                if (approvalStatus) {
                    let finSchedule = finDetails.agreementFinanceSchedule
                    let finSchedulelnth = finDetails.agreementFinanceSchedule.length
                    let firstSchedule, lastSchedule
                    if (finSchedulelnth) {
                        firstSchedule = finSchedule.find(fs => fs.paymentIndex === 1)
                        lastSchedule = finSchedule.find(fs => fs.paymentIndex === finSchedulelnth)
                    }
                    if (finDetails.financeType === 'Special-unequal') {
                        finalResult.repaymentAmount = finSchedule
                    } else {
                        finalResult.repaymentAmount = firstSchedule ? firstSchedule.expectedPaymentAmount : 0
                    }
                    finalResult.financeType = finDetails.financeType
                    finalResult.ppifAmount = finDetails.ppifAmount
                    finalResult.downPayment = finDetails.downPaymentAmount - finDetails.ppifAmount
                    finalResult.amountFinanced = finDetails.financedAmount
                    finalResult.financeCharge = finDetails.interestAmount
                    finalResult.totalPayments = finDetails.financedAmount + finDetails.interestAmount
                    finalResult.salesPrice = result.totalCashPrice + finDetails.interestAmount
                    finalResult.interestRate = finDetails.interestRate
                    finalResult.noOfPayments = finSchedulelnth
                    finalResult.beginningDate = firstSchedule ? firstSchedule.expectedPaymentDate : null
                    finalResult.dueDate = lastSchedule ? lastSchedule.expectedPaymentDate : null
                }
            }
            if (result.Payments) {
                result.Payments.map(p => {
                    if (p.status === 'success') {
                        finalResult.receiptNumbers.push(p.receiptNumber)
                    }
                })
            }
            return finalResult
        } catch (err) {
            throw err
        }
    }
}
module.exports = exports = CemeteryAgreementController
