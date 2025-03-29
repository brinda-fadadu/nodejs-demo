const moment = require('moment')

const faker = require('faker')


function funeralServiceSchema() {
    try {
        const funeralServiceObject = {
            Code: faker.random.word(),
            Name: faker.random.word(),
            Description: faker.random.word(),
            Price: faker.finance.amount(),
            IsDisabled: false,
            TaxRate: faker.finance.amount(),
            ContractType: faker.random.number({ min: 1, max: 2 }),
            IsSchedulingRequired: faker.random.boolean()
        }

        return funeralServiceObject
    } catch (error) {
        console.log(error)
    }
}

function packageCategorySchema() {
    const packageCategory = {
        Name: faker.random.word(),
        Category: faker.random.word()
    }
    return packageCategory
}

function funeralPackageSchema() {
    const packageObject = {
        Name: faker.random.word(),
        Code: faker.random.word(),
        Description: faker.random.word(),
        Price: faker.finance.amount(),
        IsDisabled: false,
        TaxRate: faker.finance.amount(),
        PackageCategoryId: faker.random.number(),
        ContractType: faker.random.number({ min: 1, max: 2 }),
    }

    return packageObject
}

function packageItemSchema() {
    const packageItem = {
        IsDisabled: false,
        CreatedBy: faker.random.number(),
    }

    return packageItem
}

function itemSchema() {
    const item = {

        Code: faker.random.word(),
        Name: faker.random.word(),
        Description: faker.random.word(),
        Price: faker.finance.amount(),
        IsDisabled: false,
        TaxRate: faker.finance.amount(),
        ContractType: faker.random.number({ min: 1, max: 2 }),
        ItemCategoryId: faker.random.number(),
    }

    return item
}

function itemCategorySchema() {
    const itemCategory = {
        Name: faker.random.word(),
        Code: faker.random.word(),
        ContractType: faker.random.number({ min: 1, max: 2 })
    }
    return itemCategory
}

module.exports = exports = {
    itemSchema,
    packageItemSchema,
    itemCategorySchema,
    funeralPackageSchema,
    funeralServiceSchema,
    packageCategorySchema,
}
