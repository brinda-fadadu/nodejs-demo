const request = require('request-promise')

exports.pullData = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/decedent/${decedentId}/pull`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const data = await request(options)
    return data
}

exports.postUnlock = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/decedent/${decedentId}/unlock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.updateNOK = async (faaDecedentId, nok) => {
    const options = {
        url: `${process.env.FAA_API_URL}/decedent/${faaDecedentId}/nok-info?overrideFreeze=true`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        body: nok,
        json: true
    }
    const body = await request(options)
    return body
}

exports.lockPrayerCard = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/prayer-card/${decedentId}/lock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.unlockPrayerCard = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/prayer-card/${decedentId}/unlock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.lockProgram = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/program/${decedentId}/lock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.unlockProgram = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/program/${decedentId}/unlock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.syncDataToFAA = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/decedent/${decedentId}/syncWithOnePortal`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.lockObituary = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/obituary/${decedentId}/lock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.unlockObituary = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/obituary/${decedentId}/unlock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const body = await request(options)
    return body
}

exports.syncDecedent = async (decedentId, data) => {
    const options = {
        url: `${process.env.FAA_API_URL}/sync/${decedentId}`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        body: data,
        json: true
    }
    const body = await request(options)
    return body
}

exports.syncCemetery = async (decedentId, data) => {
    const options = {
        url: `${process.env.FAA_API_URL}/sync/${decedentId}/cemetery`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        body: data,
        json: true
    }
    const body = await request(options)
    return body
}

exports.lockBiographyAndDeathCertificates = async (decedentId) => {
    const options = {
        url: `${process.env.FAA_API_URL}/decedent/${decedentId}/biography/lock`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Authorization': `Bearer ${process.env.FAA_API_AUTH_TOKEN}`
        },
        json: true
    }
    const data = await request(options)
    return data
}
