const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const SMS = require('../lib/SMSNotification/sms')
const models = require('../models')
const ejs = require('ejs')
const path = require('path')

async function callAssignedWorker (job, done) {
    try {
        const payload = job.data
        if (payload.assignedToIds.length && process.env.NODE_ENV !== 'test') {
            await Promise.all(payload.assignedToIds.map(async assignedToId => {
                const employee = await models.Employee.findByPk(assignedToId)
                if (employee.email) {
                    const envs = [
                        'production'
                    ]
                    let bcc = []
                    if (envs.includes(process.env.NODE_ENV)) {
                        bcc = [
                            'h@gmail.com',
                            'a@gmail.com'
                        ]
                    } else {
                        bcc = [
                            'a@gmail.com',
                            'b@gmail.com'
                        ]
                    }
                    payload.employeeName = employee.name
                    let to = employee.email
                    let subject = `Call Assigned - ${payload.callId}`
                    let text = `Hello ${employee.name},A call: ${payload.callId} has been assigned to you. Please log on to the OnePortal application and navigate to the All Calls Panel, to review and do the needful. - OnePortal`
                    let htmlContent = await ejs.renderFile(path.resolve(__dirname, '../views/callAssignedEmail.ejs'), payload)
                    Email.sendMail(to, subject, text, '', '', '', bcc, htmlContent)
                }
                if (employee.phoneNumber) {
                    let toNumber = employee.phoneNumber
                    let message = `Hello ${employee.name},\n\nA call: ${payload.callId} has been assigned to you. Please log on to the OnePortal\napplication and navigate to the All Calls Panel, to review and do the needful.\n\n- OnePortal`
                    SMS.sendSms(toNumber, message)
                }
            }))
        }
        done(null, { data: payload })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    callAssignedWorker
}
