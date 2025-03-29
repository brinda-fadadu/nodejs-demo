
const Joi = require('@hapi/joi')
const _ = require('underscore')
const { validationCommonErrHandler } = require('../commonValidations')

async function fieldsValidation (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        type: Joi.string().label('Agreement Type').error(validationCommonErrHandler),
        agreementLocationItemId: Joi.number().label('Agreement Location Item id').error(validationCommonErrHandler),
        agreementPackageItemId: Joi.number().label('Agreement Package Item id').error(validationCommonErrHandler),
        agreementCashAdvancedItemId: Joi.number().label('Agreement Cashadvanceditem id').error(validationCommonErrHandler),
        itemUsageId: Joi.number().label('Item Usage id').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function agreementItemsValidation (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        categoryName: Joi.string().required().label('Category Name').error(validationCommonErrHandler),
        type: Joi.string().label('Type').error(validationCommonErrHandler),
        serviceName: Joi.string()
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function funeralArrangementDetailsValidation (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        serviceName: Joi.string().required().valid('Cemetery Graveside Service', 'Cemetery Cremation Service', 'Cemetery Witness Cremation Services', 'Cemetery Disinterment Service').label('Service Name').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function scheduledFuneralServiceValidaton (req, res, next) {
    Joi.validate(req.params, Joi.object().keys({
        personId: Joi.number().required().label('Person id').error(validationCommonErrHandler),
        scheduledFuneralServiceId: Joi.number().required().label('Scheduled funeral service id').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function createOrUpdateScheduledFuneralServiceValidator (req, res, next) {
    let bodySchema = {
        id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
        agreementLocationItemId: Joi.number().allow(null).label('Agreement location item id').error(validationCommonErrHandler),
        agreementPackageItemId: Joi.number().allow(null).label('Agreement package item id').error(validationCommonErrHandler),
        agreementCashAdvancedItemId: Joi.number().allow(null).label('Agreement cash advanced item id').error(validationCommonErrHandler),
        schedulingDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            date: Joi.date().required().label('Date').error(validationCommonErrHandler),
            beginningTime: Joi.date().required().label('Beginning Time').error(validationCommonErrHandler),
            endingTime: Joi.date().required().greater(Joi.ref('beginningTime')).label('Ending Time').error(validationCommonErrHandler),
            clFacilityLocationId: Joi.number().allow(null).label('CL facility location id').error(validationCommonErrHandler),
            serviceLocationId: Joi.number().allow(null).label('Service location id').error(validationCommonErrHandler),
            reservedChapel: {
                id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
                chapelId: Joi.number().label('Chapel id').error(validationCommonErrHandler),
                reservationDate: Joi.date().label('Reservation Date').error(validationCommonErrHandler),
                startTime: Joi.date().label('Start Time').error(validationCommonErrHandler),
                endTime: Joi.date().label('End Time').error(validationCommonErrHandler)
            },
            cremationType: Joi.string().allow(null).valid(['Standard Cremation', 'Witness Cremation', 'Priority cremation 24H', 'Priority cremation 48H', 'Priority cremation 72H']),
            graveSideReason: Joi.string().allow(null).valid(['Cremated Remains TBD', 'Cremated Remains Release to Family', 'Ship Out', 'Cremated Remains - Scattering', 'Graveside Reschedule: TBD'])
        },
        cemeteryInformationDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            clCemeteryLocationId: Joi.number().allow(null).label('CL Cemetery location id').error(validationCommonErrHandler),
            cemeteryLocationId: Joi.number().allow(null).label('Cemetery location id').error(validationCommonErrHandler),
            burialSite: Joi.string().allow('', null).label('Burial Site').error(validationCommonErrHandler)
        },
        resourcesDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isHearseNeeded: Joi.boolean().label('isHearseNeeded').error(validationCommonErrHandler),
            isUtilityCarNeeded: Joi.boolean().label('isUtilityCarNeeded').error(validationCommonErrHandler),
            crematoryId: Joi.number().allow(null).label('Crematory id').error(validationCommonErrHandler),
            crematoryDate: Joi.date().allow(null).label('Crematory Date').error(validationCommonErrHandler),
            crematoryStartTime: Joi.date().allow(null).label('Crematory Start Time').error(validationCommonErrHandler),
            crematoryEndTime: Joi.date().allow(null).label('Crematory End Time').error(validationCommonErrHandler),
            pallbearers: Joi.array().items(Joi.number()).label('Pallbearers').error(validationCommonErrHandler),
            notesFromFamily: Joi.array().items({
                id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
                content: Joi.string().required().label('Content').error(validationCommonErrHandler)
            }).label('Notes From Family').error(validationCommonErrHandler),
            notesFromStaff: Joi.array().items({
                id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
                content: Joi.string().required().label('Content').error(validationCommonErrHandler)
            }).label('Notes From Staff').error(validationCommonErrHandler)
        },
        subServicesDetails: Joi.array().items({
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            subServiceId: Joi.number().required().label('Sub service id').error(validationCommonErrHandler),
            startTime: Joi.date().required().label('Start Time').error(validationCommonErrHandler),
            endTime: Joi.date().required().label('End Time').error(validationCommonErrHandler)
        }),
        casketDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isOutSideCasket: Joi.boolean().label('isOutSideCasket').error(validationCommonErrHandler),
            resourceType: Joi.string().allow('', null).label('Resource Type').error(validationCommonErrHandler),
            casketId: Joi.number().allow(null).label('Casket Id').error(validationCommonErrHandler),
            casketType: Joi.string().allow('', null).label('Casket Type').error(validationCommonErrHandler)
        },
        urnInformationDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isFamilyOwnedUrn: Joi.boolean().label('isFamilyOwnedUrn').error(validationCommonErrHandler),
            resourceType: Joi.string().allow('', null).label('Resource Type').error(validationCommonErrHandler),
            urnId: Joi.number().allow(null).label('Urn Id').error(validationCommonErrHandler),
            height: Joi.string().allow('', null).label('height').error(validationCommonErrHandler),
            width: Joi.string().allow('', null).label('width').error(validationCommonErrHandler),
            depth: Joi.string().allow('', null).label('Depth').error(validationCommonErrHandler),
            urnType: Joi.number().allow(null).label('Urn type').error(validationCommonErrHandler),
            urnStatus: Joi.string().allow('', null).label('Urn status').error(validationCommonErrHandler),
            receivedDate: Joi.date().allow(null).label('Received Date').error(validationCommonErrHandler),
            isTransferRequired: Joi.boolean().label('isTransferRequired').error(validationCommonErrHandler)
        },
        schedulingFile: {
            id: Joi.number().allow(null, ''),
            fileUrl: Joi.string().allow(null, '').label('Supporting Document').error(validationCommonErrHandler),
            folderName: Joi.string().allow(null, '').label('Foldername').error(validationCommonErrHandler),
            originalFileName: Joi.string().allow(null, '').label('Original file name').error(validationCommonErrHandler)
        },
        timezone: Joi.string().label('timezone').required().error(validationCommonErrHandler)
    }

    if (req.body.schedulingDetails.clFacilityLocationId !== null && !_.isEmpty(req.body.schedulingDetails.reservedChapel)) {
        bodySchema.schedulingDetails.reservedChapel = {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            chapelId: Joi.number().required().label('Chapel id').error(validationCommonErrHandler),
            reservationDate: Joi.date().required().label('Reservation Date').error(validationCommonErrHandler),
            startTime: Joi.date().required().label('Start Time').error(validationCommonErrHandler),
            endTime: Joi.date().required().label('End Time').error(validationCommonErrHandler)
        }
    }

    if ((req.body.schedulingDetails && req.body.schedulingDetails.cremationType) || (req.body.schedulingDetails && req.body.schedulingDetails.graveSideReason)) {
        bodySchema.schedulingDetails.date = Joi.date().allow(null).label('Date').error(validationCommonErrHandler)
        bodySchema.schedulingDetails.beginningTime = Joi.date().allow(null).label('Beginning Time').error(validationCommonErrHandler)
        bodySchema.schedulingDetails.endingTime = Joi.date().allow(null).label('Ending Time').error(validationCommonErrHandler)
    }

    if (Object.keys(req.body).length) {
        Joi.validate(req.params, Joi.object().keys({
            personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
        }), { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } else {
        res.status(422).json({
            message: `Input required`
        })
    }
}

async function updateScheduledDateTimeValidator (req, res, next) {
    let bodySchema = {
        workOrderId: Joi.number().allow(null).label('WorkOrder Id').error(validationCommonErrHandler),
        beginningTime: Joi.date().required().label('Beginning Time').error(validationCommonErrHandler),
        endingTime: Joi.date().required().greater(Joi.ref('beginningTime')).label('Ending Time').error(validationCommonErrHandler)
    }

    if (Object.keys(req.body).length) {
        Joi.validate(req.params, Joi.object().keys({
            personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
        }), { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } else {
        res.status(422).json({
            message: `Input required`
        })
    }
}

async function createOrUpdateScheduledCemeteryServiceValidator (req, res, next) {
    let bodySchema = {
        id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
        itemUsageId: Joi.number().allow(null).label('Item Usage id').error(validationCommonErrHandler),
        agreementLocationItemId: Joi.number().allow(null).label('Agreement Location Item id').error(validationCommonErrHandler),
        isMiscSalesService: Joi.boolean().label('isMiscSalesService').error(validationCommonErrHandler),
        intermentInformationDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            propertyId: Joi.array().items(Joi.number()).label('Property Id').error(validationCommonErrHandler),
            beginningTime: Joi.date().allow(null).label('Interment Beginning Time').error(validationCommonErrHandler),
            endingTime: Joi.date().allow(null).greater(Joi.ref('beginningTime')).label('Interment Ending Time').error(validationCommonErrHandler),
            temporaryBurialLocationId: Joi.number().allow(null).label('Temporary Burial Location id').error(validationCommonErrHandler),
            temporaryDisintermentLocationId: Joi.number().allow(null).label('Temporary Disinterment Location id').error(validationCommonErrHandler),
            memorialInformation: Joi.string().allow('', null).label('Memorial Information').error(validationCommonErrHandler),
            isPreburied: Joi.boolean().label('isPreburied').error(validationCommonErrHandler),
            cremationType: Joi.string().allow(null).valid(['Standard Cremation', 'Witness Cremation', 'Priority cremation 24H', 'Priority cremation 48H', 'Priority cremation 72H'])
        },
        intermentRequestDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isWitnessLoweringOrEntombment: Joi.boolean().label('isWitnessLoweringOrEntombment').error(validationCommonErrHandler),
            isWitnessCoveringOrSealings: Joi.boolean().label('isWitnessCoveringOrSealings').error(validationCommonErrHandler),
            isWitnessFilling: Joi.boolean().label('isWitnessFilling').error(validationCommonErrHandler),
            isReopenBottom: Joi.boolean().label('isReopenBottom').error(validationCommonErrHandler),
            isBurningPot: Joi.boolean().label('isBurningPot').error(validationCommonErrHandler),
            isMoundOfDirtByFootend: Joi.boolean().label('isMoundOfDirtByFootend').error(validationCommonErrHandler),
            isUseOfTent: Joi.boolean().label('isUseOfTent').error(validationCommonErrHandler),
            isPlaceAndNotify: Joi.boolean().label('isPlaceAndNotify').error(validationCommonErrHandler),
            isReopenTop: Joi.boolean().label('isReopenTop').error(validationCommonErrHandler)
        },
        disintermentInformationDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            propertyId: Joi.array().items(Joi.number()).label('Property Id').error(validationCommonErrHandler),
            beginningTime: Joi.date().allow(null).label('Disinterment Beginning Time').error(validationCommonErrHandler),
            endingTime: Joi.date().allow(null).greater(Joi.ref('beginningTime')).label('Disinterment Ending Time').error(validationCommonErrHandler),
            disintermentReason: Joi.string().allow('', null).label('disintermentReason').error(validationCommonErrHandler),
            disintermentType: Joi.string().allow(null).valid('fullbody', 'crematedremains').label('disintermentType').error(validationCommonErrHandler),
            instruction: Joi.string().allow('', null).label('instruction').error(validationCommonErrHandler)
        },
        notesFromFamily: Joi.array().items({
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            content: Joi.string().required().label('Content').error(validationCommonErrHandler)
        }).label('Notes From Family').error(validationCommonErrHandler),
        notesFromStaff: Joi.array().items({
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            content: Joi.string().required().label('Content').error(validationCommonErrHandler)
        }).label('Notes From Staff').error(validationCommonErrHandler),
        casketDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isOutSideCasket: Joi.boolean().label('isOutSideCasket').error(validationCommonErrHandler),
            resourceType: Joi.string().allow(null).label('Resource Type').valid('AgreementLocationItem', 'ItemUsage').error(validationCommonErrHandler),
            casketId: Joi.number().allow(null).label('Casket Id').error(validationCommonErrHandler),
            casketType: Joi.string().allow('', null).label('Casket Type').error(validationCommonErrHandler)
        },
        vaultDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isVaultFromDisinterment: Joi.boolean().label('isVaultFromDisinterment').error(validationCommonErrHandler),
            resourceType: Joi.string().allow(null).label('Resource Type').valid('AgreementLocationItem', 'ItemUsage').error(validationCommonErrHandler),
            vaultId: Joi.number().allow(null).label('vault Id').error(validationCommonErrHandler),
            disinteredVaultDetails: Joi.string().allow('', null).label('Disintered Vault Details').error(validationCommonErrHandler)
        },
        merchandiseAdditionalInfoDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isVasesSelected: Joi.boolean().label('isVassesSelected').error(validationCommonErrHandler),
            noOfVases: Joi.number().allow(null).label('noOfVasses').error(validationCommonErrHandler),
            instruction: Joi.string().allow('', null).label('instruction').error(validationCommonErrHandler)
        },
        genericDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isLocationVerifiedWithFamily: Joi.boolean().label('isLocationVerifiedWithFamily').error(validationCommonErrHandler),
            isLocationVerifiedWithPlattedRecord: Joi.boolean().label('isLocationVerifiedWithPlattedRecord').error(validationCommonErrHandler),
            isElectronicCIF: Joi.boolean().label('isElectronicCIF').error(validationCommonErrHandler),
            reviewedTrustStatement: Joi.boolean().label('reviewedTrustStatement').error(validationCommonErrHandler),
            confirmedExpectedMerchandiseDelivery: Joi.boolean().label('confirmedExpectedMerchandiseDelivery').error(validationCommonErrHandler),
            confirmedPlacementScheduleWithFuneralDirector: Joi.boolean().label('confirmedPlacementScheduleWithFuneralDirector').error(validationCommonErrHandler),
            isPermitted: Joi.boolean().label('isPermitted').error(validationCommonErrHandler),
            isWitnessedCremation: Joi.boolean().label('isWitnessedCremation').error(validationCommonErrHandler),
            noOfWitness: Joi.number().allow(null).label('noOfWitness').error(validationCommonErrHandler),
            instruction: Joi.string().allow('', null).label('instruction').error(validationCommonErrHandler)
        },
        urnInformationDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            isFamilyOwnedUrn: Joi.boolean().label('isFamilyOwnedUrn').error(validationCommonErrHandler),
            resourceType: Joi.string().allow(null).label('Resource Type').valid('AgreementLocationItem', 'ItemUsage').error(validationCommonErrHandler),
            urnId: Joi.number().allow(null).label('Urn Id').error(validationCommonErrHandler),
            height: Joi.string().allow('', null).label('height').error(validationCommonErrHandler),
            width: Joi.string().allow('', null).label('width').error(validationCommonErrHandler),
            depth: Joi.string().allow('', null).label('Depth').error(validationCommonErrHandler),
            urnType: Joi.number().allow(null).label('Urn type').error(validationCommonErrHandler),
            urnStatus: Joi.string().allow('', null).label('Urn status').error(validationCommonErrHandler),
            receivedDate: Joi.date().allow(null).label('Received Date').error(validationCommonErrHandler),
            isTransferRequired: Joi.boolean().label('isTransferRequired').error(validationCommonErrHandler)
        },
        funeralArrangementDetails: {
            id: Joi.number().allow(null).label('id').error(validationCommonErrHandler),
            clFacilityLocationId: Joi.number().allow(null).label('CL facility location id').error(validationCommonErrHandler),
            serviceLocationId: Joi.number().allow(null).label('Service Location Id').error(validationCommonErrHandler),
            funeralHomePhone: Joi.string().allow('', null).label('Funeral Home Phone').error(validationCommonErrHandler),
            phone: Joi.string().allow('', null).label('phone').error(validationCommonErrHandler),
            funeralDirectorId: Joi.number().allow(null).label('Funeral Director Id').error(validationCommonErrHandler),
            instruction: Joi.string().allow('', null).label('Instruction').error(validationCommonErrHandler),
            funeralArrangementSectionLocations: Joi.array().items({
                type: Joi.string().required().valid('viewing', 'visitation1', 'visitation2', 'visitation3', 'reception').label('Type').error(validationCommonErrHandler),
                location: Joi.string().allow('', null).label('Location').error(validationCommonErrHandler),
                startTime: Joi.date().allow(null).label('Funeral service Start Time').error(validationCommonErrHandler),
                endTime: Joi.date().allow(null).label('Funeral service End Time').error(validationCommonErrHandler)
            })
        },
        schedulingFile: {
            id: Joi.number().allow(null),
            fileUrl: Joi.string().allow(null).label('Supporting Document').error(validationCommonErrHandler),
            folderName: Joi.string().allow(null, '').label('Foldername').error(validationCommonErrHandler),
            originalFileName: Joi.string().allow(null, '').label('Original file name').error(validationCommonErrHandler)
        }
    }

    if (req.body.intermentInformationDetails && req.body.intermentInformationDetails.startTime) {
        bodySchema.intermentInformationDetails.beginningTime = Joi.date().required().label('Interment Beginning Time').error(validationCommonErrHandler)
        bodySchema.intermentInformationDetails.endingTime = Joi.date().required().greater(Joi.ref('bodySchema.intermentInformationDetails.beginningTime')).label('Interment Ending Time').error(validationCommonErrHandler)
    } else if (req.body.disintermentInformationDetails && req.body.disintermentInformationDetails.startTime) {
        bodySchema.disintermentInformationDetails.beginningTime = Joi.date().required().label('Disinterment Beginning Time').error(validationCommonErrHandler)
        bodySchema.disintermentInformationDetails.endingTime = Joi.date().required().greater(Joi.ref('bodySchema.disintermentInformationDetails.beginningTime')).label('Disinterment Ending Time').error(validationCommonErrHandler)
    } else {}

    if (req.body.casketDetails.resourceType) {
        bodySchema.casketDetails.casketId = Joi.number().required().label('Casket Id').error(validationCommonErrHandler)
    }
    if (req.body.casketDetails.casketId) {
        bodySchema.casketDetails.resourceType = Joi.string().required().label('Resource Type').error(validationCommonErrHandler)
    }

    if (req.body.urnInformationDetails.resourceType) {
        bodySchema.urnInformationDetails.urnId = Joi.number().required().label('Urn Id').error(validationCommonErrHandler)
    }
    if (req.body.urnInformationDetails.urnId) {
        bodySchema.urnInformationDetails.resourceType = Joi.string().required().label('Resource Type').error(validationCommonErrHandler)
    }

    if (req.body.vaultDetails && req.body.vaultDetails.resourceType) {
        bodySchema.vaultDetails.vaultId = Joi.number().required().label('Vault Id').error(validationCommonErrHandler)
    }
    if (req.body.vaultDetails && req.body.vaultDetails.vaultId) {
        bodySchema.vaultDetails.resourceType = Joi.string().required().label('Resource Type').error(validationCommonErrHandler)
    }
    if (req.body.intermentInformationDetails && req.body.intermentInformationDetails.cremationType) {
        bodySchema.intermentInformationDetails.beginningTime = Joi.date().allow(null).label('Beginning Time').error(validationCommonErrHandler)
        bodySchema.intermentInformationDetails.endingTime = Joi.date().allow(null).label('Ending Time').error(validationCommonErrHandler)
    }

    if (Object.keys(req.body).length) {
        Joi.validate(req.params, Joi.object().keys({
            personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
        }), { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } else {
        res.status(422).json({
            message: `Input required`
        })
    }
}

async function scheduledCemeteryServiceValidaton (req, res, next) {
    Joi.validate(req.params, Joi.object().keys({
        personId: Joi.number().required().label('Person id').error(validationCommonErrHandler),
        scheduledCemeteryServiceId: Joi.number().required().label('Scheduled cemetery service id').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    fieldsValidation,
    agreementItemsValidation,
    scheduledFuneralServiceValidaton,
    createOrUpdateScheduledFuneralServiceValidator,
    funeralArrangementDetailsValidation,
    createOrUpdateScheduledCemeteryServiceValidator,
    scheduledCemeteryServiceValidaton,
    updateScheduledDateTimeValidator
}
