const schedule = require('node-schedule')
const Sequelize = require('sequelize')
const models = require('../models/index')
var moment = require('moment')
const seed = require('../config/seed').seed
const Op = Sequelize.Op
const logger = require('./logger')
const env = process.env.NODE_ENV || 'development'
const path = require('path')
const config = require(path.join(__dirname) + '/../config/config')[env]

function getIndexOfCallStatus (callStatus) {
    return Number(Object.keys(seed.CallStatus)[Object.values(seed.CallStatus).indexOf(callStatus)])
}

async function updateArchivedCalls () {
    try {
        let getRows = await models.Call.findAll({
            attributes: ['identifier'],
            where: {
                status: [getIndexOfCallStatus('Completed - No Contact'), getIndexOfCallStatus('Completed - Contact ; Left Message')],
                updatedAt: {
                    [Op.lt]: moment().subtract(config.archiveTimePeriod, 'days').format('YYYY-MM-DD')
                },
                archivedAt: null
            }
        })

        if (getRows.length > 0) {
            const archivedIds = []
            getRows.forEach(element => {
                archivedIds.push(element.identifier)
            })

            let updateRes = await models.Call.update({
                archivedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            }, {
                where: {
                    identifier: archivedIds
                }
            })

            if (updateRes) {
                logger.info(getRows.length + ' call(s) are archived successfully')
            }
        } else {
            logger.info('No records found to archive')
        }
        return getRows.length
    } catch (error) {
        logger.error('AutoArchive : ' + error)
    }
}

module.exports = async function (runAt = '0 0 0 * * *') {
    schedule.scheduleJob(runAt, async function () {
        try {
            updateArchivedCalls()
        } catch (error) {
            logger.error(error)
        }
    })
}

module.exports.updateArchivedCalls = updateArchivedCalls
