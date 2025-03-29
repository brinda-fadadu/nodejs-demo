const _ = require('lodash')

function returnFullName (person) {
    return _.values(
        _.pick(person, ['firstName', 'middleName', 'lastName'])
    ).join(' ')
}
function formatPhoneNumber (value) {
    if (!value || value === '') {
        return ''
    }
    let val = value.replace(/\D/g, '')
    let newVal = ''
    // format - (XXX) XXX-XXXX
    if (val.length > 0) {
        newVal = `(`
    }
    if (val.length > 3) {
        newVal += `${val.substr(0, 3)}) `
        val = val.substr(3)
    }
    if (val.length > 3 && val.length < 7) {
        newVal += `${val.substr(0, 3)}-`
        val = val.substr(3)
    }
    if (val.length > 6) {
        newVal += `${val.substr(0, 3)}-`
        val = val.substr(3)
    }
    newVal += val
    return newVal
};
module.exports = {
    returnFullName,
    formatPhoneNumber
}
