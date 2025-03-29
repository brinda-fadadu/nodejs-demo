module.exports = async function(queryInterface, tableName, tableDefinition, opts){
    opts['tableName'] = tableName
   
    await queryInterface.createTable(tableName, tableDefinition, opts),
    queryInterface.addConstraint(tableName, ['id'], {
        type: 'primary key',
        name: `PK_${tableName}`
    })
  
}