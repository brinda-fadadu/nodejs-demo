const logger = require('../../lib/logger')
const WebCemPropertyController = require('../../controllers/refactorControllers/webCemController/webCemPropertyController')
const WebCemController = require('../../controllers/refactorControllers/webCemController/webCemController')
const pushDataToServiceBus = require('./azureServiceBus')
const _ = require('lodash')
const models = require('../../models')
async function webCemSyncEventsWorker (
    job, done
) {
    try {
        let payload
        switch (job.data.event) {
        case 'property.save':
            let jobData = job.data
            let userId = jobData.userId || jobData.payload.userId
            payload = await WebCemPropertyController.saveProperty(jobData.propertyId, jobData.agreementId, jobData.status, jobData.payload, userId, jobData.contractObj)
            break
        case 'property.decedents.add':
            let data = job.data.payload
            payload = await WebCemPropertyController.saveDecedentForProperty(data.personId, data.propertyId, data.lotSellUnitId, data.lotSpaceId, data.userId)
            break
        case 'property.decedents.remove':
            payload = await WebCemPropertyController.removePropertyForDecedents(job.data.payload)
            break
        case 'decedent.save':
            let decedentData = {}
            logger.info(`Executing into decedent.save event....`)
            if (_.get(job.data.payload, 'triggerPoint') === 'CaseInfo') {
                logger.info(`Executing case info case...`)
                // const AgreementController = require('../../controllers/refactorControllers/agreementController/agreementController')
                // const types = AgreementController.TYPES
                // const agreementsOfPerson = await AgreementController.getListOfAgreements(job.data.payload.personId, [
                //     types['Funeral'],
                //     types['Cemetry']
                // ])
                // if (agreementsOfPerson.length > 0) {
                const isAlive = _.get(job, 'data.payload.isAlive') ? job.data.payload.isAlive : false
                decedentData = await WebCemController.returnDecedentSavePayload(job.data.payload.personId, job.data.payload.userId, isAlive)
                // }
            } else if (_.get(job.data.payload, 'triggerPoint') === 'WorkOrder') {
                let resourceModel = ''
                if (_.get(job.data.payload, 'resourceType') === 'ScheduledCemeteryService') {
                    resourceModel = models.ScheduledCemeteryService
                }
                if (_.get(job.data.payload, 'resourceType') === 'ScheduledFuneralService') {
                    resourceModel = models.ScheduledFuneralService
                }
                const service = await resourceModel.findOne({
                    where: {
                        id: job.data.payload.resourceId
                    },
                    attributes: ['personId']
                })
                decedentData = await WebCemController.returnDecedentSavePayload(service.personId, job.data.payload.userId)
            } else if (_.get(job.data.payload, 'triggerPoint') === 'Agreement') {
                const agreementOwner = await models.AgreementPerson.findOne({
                    where: {
                        agreementId: job.data.payload.agreementId,
                        isOwner: true
                    }
                })
                if (agreementOwner) {
                    decedentData = await WebCemController.returnDecedentSavePayload(agreementOwner.personId, job.data.payload.userId)
                }
            } else {
                decedentData = await WebCemController.returnDecedentSavePayload(job.data.payload.personId, job.data.payload.userId)
            }
            logger.info(`Decedent details are fetched.....`)
            payload = {
                decedent: {
                    cl_ref: _.get(decedentData, 'cl_ref', ''),
                    title: _.get(decedentData, 'title', ''),
                    first_name: _.get(decedentData, 'first_name', ''),
                    middle_name: _.get(decedentData, 'middle_name', ''),
                    nee: _.get(decedentData, 'nee', ''),
                    last_name: _.get(decedentData, 'last_name', ''),
                    suffix: _.get(decedentData, 'suffix', ''),
                    aka: _.get(decedentData, 'aka', ''),
                    date_of_birth: _.get(decedentData, 'date_of_birth', ''),
                    date_of_death: _.get(decedentData, 'date_of_death', ''),
                    date_of_service: _.get(decedentData, 'date_of_service', ''),
                    gender: _.get(decedentData, 'gender', ''),
                    age: _.get(decedentData, 'age', ''),
                    burial_status: _.get(decedentData, 'burial_status', ''),
                    cremation_number: _.get(decedentData, 'cremation_number', ''),
                    cremation_place: _.get(decedentData, 'cremation_place'),
                    service_branch: _.get(decedentData, 'service_branch', ''),
                    service_era: _.get(decedentData, 'service_era', ''),
                    picture_url: _.get(decedentData, 'pictureUrl')
                },
                user: _.get(decedentData, 'user')
            }
            break
        case 'property.owners.add':
            payload = await WebCemPropertyController.addPropertyOwner(job.data.payload)
            break
        case 'property.owners.remove':
            payload = await WebCemPropertyController.removePropertyOwner(job.data.payload)
            break
        case 'default':
            console.log('Defualt case')
            break
        }
        await pushDataToServiceBus(job.data.event, payload)

        // job = {
        //     event: 'decedent.save',
        //     payload: {
        //         id: 'decedentId'
        //     }
        // }
        // 1. based on the event call that respective methods by sending them the id in the payload.
        //  2. fetch the payload to be sent

        // we will write the service bus integration code here.
        logger.info(`done sending data to service bus # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(job.data.id)}`)
        done(null, { success: true, jobId: job.id })
    } catch (error) {
        logger.error(`error in sending data to azure-service-bus-for-web-cem + ${JSON.stringify(job.id)}  ' ----> '  ${JSON.stringify(job.id)}`)
        done(error)
    }
}
async function webCemSyncDbWorker (job, done) {
    try {
        const payload = await WebCemPropertyController.syncProperties()
        if (payload && payload.length) {
            await pushDataToServiceBus('property.save', payload)
        }
        logger.info(`done sending data to service bus # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(job.data.id)}`)
        done(null, { success: true, jobId: job.id })
    } catch (error) {
        logger.error(`error in sending data to azure-service-bus-for-web-cem + ${JSON.stringify(job.id)}  ' ----> '  ${JSON.stringify(job.id)}`)
        done(error)
    }
}
module.exports = { webCemSyncEventsWorker, webCemSyncDbWorker }
