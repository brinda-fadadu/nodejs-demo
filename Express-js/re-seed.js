const { sequelize } = require('./models')
const _ = require('lodash')

// The tables to be re-seeded, Consider the order based on foreign keys
const tabelNames = [
    'GardenSpec',
    'GardenSpecMemorial',
    'MemorialSpec',
    'MemorialAddOnSpec',
    'ItemCategoryIndustry',
    'ItemCategoryAttributeValue',
    'ItemAttributeValue',
    'AttributeValue',
    'Attribute'
]

// Seeder files for all the tables that needs to be re-seeded
const seederNames = {
    'ItemCategoryIndustry': '20191021174630-ItemCategoryIndustry.js',
    'ItemCategoryAttributeValue': '20191022101450-ItemCategoryAttributeValue.js',
    'ItemAttributeValue': '20191022085534-ItemAttributevalue.js',
    'AttributeValue': '20191021175706-AttributeValue.js',
    'Attribute': '20191021175520-Attribute.js',
    'GardenSpec': '20200327115216-garden-spec.js',
    'GardenSpecException': '20200327115247-garden-spec-exception.js',
    'GardenSpecMemorial': '20201102045032-gardenspecs-memorials.js',
    'MemorialSpec': '20200417092314-memorial-spec.js',
    'MemorialAddOnSpec': '20200417092356-memorial-addon-spec.js'
}

let reSeedTable = async () => {
    await Promise.all(tabelNames.map(async (table) => {
        let seederName = seederNames[table]
        // Delete all the data in the table
        await sequelize.query(`DELETE FROM ${table}`,
            {
                type: sequelize.QueryTypes.DELETE
            })
        // Delete the entry of seeder script from the SequelizeData
        await sequelize.query(`DELETE FROM SequelizeData WHERE name LIKE '${seederName}'`,
            {
                type: sequelize.QueryTypes.DELETE
            })
        // Reset the primary key index to 0
        await sequelize.query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`,
            {
                type: sequelize.QueryTypes.DELETE
            })
    }))

    // Reversing the order of the table for seeding
    let reversedTable = _.reverse(tabelNames)

    // Excecute the sequelize seeding command
    for (let table in reversedTable) {
        let tableName = reversedTable[table]
        let seederName = seederNames[tableName]
        await execShellCommand(`npx sequelize db:seed --seed ${seederName} --seeders-path scripts/seeders`)
    }
    console.log('re-seed completed')
    return true
}

let execShellCommand = async (cmd) => {
    const spawnSync = require('child_process').spawnSync
    return spawnSync(cmd, {
        stdio: 'inherit',
        shell: true
    })
}

reSeedTable()
