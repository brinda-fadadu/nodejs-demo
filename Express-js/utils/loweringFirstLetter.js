function lowering (dbObject, reverseState) {
    let allCapsArray = ['aka', 'ssn']
    let reverse = !!reverseState
    let result
    if (dbObject.toJSON) {
        dbObject = dbObject.toJSON()
    }
    if (Array.isArray(dbObject)) {
        result = dbObject.map(objectOfEachKey => lowering(objectOfEachKey, reverse))
    } else {
        result = {}
        Object.keys(dbObject).forEach((eachKey) => {
            let updatedKey
            if (reverse) {
                if (allCapsArray.includes(eachKey)) {
                    updatedKey = eachKey.toUpperCase()
                } else {
                    updatedKey = eachKey.charAt(0).toUpperCase() + eachKey.slice(1)
                }
            } else {
                updatedKey = eachKey.charAt(0).toLowerCase() + eachKey.slice(1)
            }
            if (dbObject[eachKey] instanceof Date) {
                result[updatedKey] = dbObject[eachKey]
                return
            }
            if (Array.isArray(dbObject[eachKey])) {
                result[updatedKey] = dbObject[eachKey].map(objectOfEachKey => lowering(objectOfEachKey, reverse))
            } else {
                if (typeof (dbObject[eachKey]) === 'object' &&
                    !Array.isArray(dbObject[eachKey]) &&
                    dbObject[eachKey] !== null) {
                    result[updatedKey] = lowering(dbObject[eachKey], reverse)
                } else {
                    result[updatedKey] = dbObject[eachKey]
                }
            }
        })
    }
    return result
}

module.exports = exports = lowering
