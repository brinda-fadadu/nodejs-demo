const nodeoutlook = require('nodejs-nodemailer-outlook')
// const env = process.env.NODE_ENV || 'development'
const emailid = process.env.EMAIL_ID || 'a@gmail.com'
const emailpwd = process.env.EMAIL_PWD || 'W'
const logger = require('../logger')

exports.sendMail = function (to, subject, text, attachment, filename, cc, bcc, htmlContent) {
    let attachments = []
    let ccTo = ''
    let bccTo = ''
    let attachmentdData = {
        path: attachment
    }
    if (filename) {
        attachmentdData.filename = filename
    }
    if (attachment) {
        attachments.push({ ...attachmentdData })
    }
    if (cc) {
        ccTo = cc.join(',')
    }
    if (bcc) {
        bccTo = bcc.join(',')
    }
    return new Promise((resolve, reject) => {
        nodeoutlook.sendEmail({
            auth: {
                user: emailid,
                pass: emailpwd
            },
            from: emailid,
            to: to,
            cc: ccTo,
            bcc: bccTo,
            subject: subject,
            text: text,
            attachments,
            html: htmlContent,
            onError: (error) => {
                logger.info(`Email sending Failed to ${to} email with subject ${subject}`)
                reject(error)
            },
            onSuccess: (success) => {
                logger.info(`Email sent to ${to} email with subject ${subject}`)
                resolve(success)
            }
        })
    })
}
