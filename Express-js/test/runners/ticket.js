try{
    const fs = require('fs')
    const path = require('path')
    const Mocha = require('mocha')
    const FgBlue = "\x1b[34m\x1b[1m"
    
    const mocha = new Mocha({
        //reporter: 'list'
        
        asyncOnly: true,
        reporter: 'spec',
        globals: ['userToken'],
        timeout: 4000
    })
    const testDir = process.cwd()+'/test/unitTest'
    //TODO: JSON configuration
    const testSpecs = [
        'ticket.js'
        
    ]
    testSpecs.forEach(filePath => {
        mocha.addFile(path.join(testDir, filePath))
    })
    
        const runner =  mocha.run(async (failures) => {
            if(failures && failures.length) {            
                process.exit(1)
            } else {
                process.exit(0)
            }
        })
        
        runner.on('start', (test) => {
            console.log('Execution started:::::::')
        })
        runner.on('fail', (test) => {
            console.log(test)
        })
        runner.on('suite', (suite) => {
            console.log(FgBlue, suite.title+' started',)
        })
        runner.on('suite end', (suite) => {
            if(suite.title) {
                console.log(FgBlue, suite.title +" end", )
            }        
        })    
    }catch(err){
        console.log(err)
    }