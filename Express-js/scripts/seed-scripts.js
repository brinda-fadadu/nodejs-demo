const _ = require('underscore')
const xlsx = require('node-xlsx')
const csv = require('csvtojson')

async function converToJson (data) {
    try {
        data = data.map(ele => {
            return ele.join(',')
        })
        data = data.join('\n')
        const jsonData = await csv().fromString(data)
        return jsonData
    } catch (err) {
        throw err
    }
}

exports.getSheetData = async function (sheetName, fileName) {
    const fileNameToExtract = fileName || 'Item_OnePortal.xlsx'
    const workSheetsFromBuffer = xlsx.parse(`${__dirname}/seeders/${fileNameToExtract}`, {
        strip: true
    })
    const sheet = _.find(workSheetsFromBuffer, { name: sheetName })
    const sheetJsonData = await converToJson(sheet.data)
    return sheetJsonData
}
