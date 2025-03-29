function formatAddress (address) {
    if (address.city) {
        address.city = formatString(address.city)
    }
    if (address.state) {
        address.state = formatString(address.state)
    }
    if (address.country) {
        address.country = formatString(address.country)
    }
    if (address.county) {
        address.county = formatString(address.county)
    }
    return address
}

function formatString (string) {
    let splitStr = string.toLowerCase().split(' ')
    for (let i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1)
    }
    return splitStr.join(' ').trim().replace(/\s+/g, ' ')
}

module.exports = {
    formatAddress
}
