module.exports = {
    email_queue: 'EmailQueue',
    sms_queue: 'SMSQueue',
    docusign_queue: `DocusignQueue_${process.env.NODE_ENV}`,
    faa_queue: `FaaQueue_${process.env.NODE_ENV}`
}
