const path = require('path')
const makeHTML = require('./dataHTML')
const logger = require('../../lib/logger')
const wkhtmltopdf = require('wkhtmltopdf')
const fs = require('fs')

const generatePDF = async (templateName, data, option, pdfName) => {
    return new Promise(async (resolve, reject) => {
        try {
            let htmlTemplate = path.resolve(__dirname, `./htmlTemplates/${templateName}.html`)
            data.amount = Number.parseFloat(data.amount).toFixed(2)
            let renderedHtml = await makeHTML(htmlTemplate, data)
            let pdfStream = wkhtmltopdf(renderedHtml, option)
            pdfStream.pipe(fs.createWriteStream(pdfName))
                .on('finish', () => {
                    resolve(pdfStream)
                })
        } catch (error) {
            logger.info({ name: 'Receipt PDF Generation error', error, data })
            reject(error)
        }
    })
}

module.exports = generatePDF
