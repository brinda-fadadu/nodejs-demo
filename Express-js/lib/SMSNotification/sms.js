// RingCentral is used for sending SMS.
// Staging - https://platform.devtest.ringcentral.com
// Prod - https://platform.ringcentral.com
// Rest API extension - /restapi/v1.0
const SDK = require('@ringcentral/sdk').SDK
let envPath = '.env'
const logger = require('../logger')

require('dotenv').config({ path: envPath })

const rcsdk = new SDK({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})
const platform = rcsdk.platform({
    server: process.env.RINGCENTRAL_SERVER_URL
})

class SMS {
    static sendPostReq (platform, toNumber, message) {
        if (toNumber) {
            platform.post('/restapi/v1.0/account/~/extension/~/sms', {
                from: { phoneNumber: process.env.RINGCENTRAL_USERNAME },
                to: [
                    { phoneNumber: toNumber }
                ],
                text: message
            }).then(response => {
                return 'SMS sent: ' + response.json().id
            }).catch(e => {
                throw new Error(e)
            })
        } else {
            throw new Error('Recipient phone number not found')
        }
    }
    static sendSms (toNumber, message) {
        rcsdk.platform().loggedIn().then((status) => {
            if (status) {
                this.sendPostReq(platform, toNumber, message)
            } else {
                platform.login({
                    username: process.env.RINGCENTRAL_USERNAME,
                    extension: process.env.RINGCENTRAL_EXTENSION,
                    password: process.env.RINGCENTRAL_PASSWORD
                }).then(response => {
                    this.sendPostReq(platform, toNumber, message)
                }).catch(e => {
                    logger.error(e)
                    throw new Error(e)
                })
            }
        })
    }
}
module.exports = SMS
// let assignedTo = { Email: 'narutosanjiv@gmail.com', PhoneNumber: '+15593582839' }
// sendSms(assignedTo.PhoneNumber, 'sasasasasas')
