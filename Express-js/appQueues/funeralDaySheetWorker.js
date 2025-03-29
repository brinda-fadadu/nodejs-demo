const generatePDF = require('../utils/generatePDF/generatePDF')
const logger = require('../lib/logger')
const fs = require('fs')
const util = require('util')
const realpath = util.promisify(fs.realpath)
const unlink = util.promisify(fs.unlink)

const Email = require('../lib/Emailer/core')

async function funeralDaySheetWorker (job, done) {
    try {
        logger.info(`Processing funeral day sheet job #' ${JSON.stringify(job.id)} ' ----> '  ${JSON.stringify(job.data)}`)
        let pdfName = './' + Date.now() + '.pdf'
        await generatePDF(job.data.templateName, job.data.data, job.data.option, pdfName)
        let pdfFile = await realpath(pdfName)
        if (job.data.templateName === 'funeralDaySheetTemplate') {
            await Email.sendMail(job.data.email, job.data.subject, job.data.content, pdfFile, job.data.pdfName)
            await unlink(pdfFile)
        }
        logger.info(`done funeral day sheet job # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(job.data.id)}`)
        done(null, { success: true, jobId: job.id })
    } catch (e) {
        logger.info(`failed funeral day sheet job # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(e)}`)
        done(e)
    }
}

exports.funeralDaySheetWorker = funeralDaySheetWorker
