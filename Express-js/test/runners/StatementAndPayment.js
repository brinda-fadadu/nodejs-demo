try{
    const fs = require('fs')
    const path = require('path')
    const Mocha = require('mocha')    
    let reporterOptions = {}
    if(process.env.TEST_MODE !='single') {
        reporterOptions = {
            slack: {
                url:'https://hooks.slack.com/services/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',
                channel: 'general',
                username: 'medaamarnadh'
            },
            title: 'Statement And Payments Runner'
        }
    }
    const mocha = new Mocha({
        reporter: 'mocha-ci-reporter',
        reporterOptions: reporterOptions,
        asyncOnly: true,
        globals: ['userToken'],
        timeout: 4000
    })
    const testDir = process.cwd()+'/test/api/v1'    
    let testSpecs = []
    let cargv = process.argv.slice(2)
    if(cargv && cargv.length) {
        testSpecs = cargv
    }
    if(!testSpecs || !testSpecs.length) {
        testSpecs = [            
            'statement/createStatement_test.js',
            'statement/get_statement.js',
            'statement/packages_list.js',
            'statement/locationItemsList.js',
            'statement/addAndRemovePackage.js',
            'statement/addAndRemoveLocationItem.js',
            'statement/statementCheckout.js'
            
        ]
    }    
    testSpecs.forEach(filePath => {
        mocha.addFile(path.join(testDir, filePath))
    })
    
    const runner = mocha.run(async (failures) => {            
        if(failures) {
            process.exit(1)
        } else {
            process.exit(0)
        }
    })
    runner.on('hook', async (hook) => {
      //  hook.pending = true
    })
    
    }catch(err){
        console.log(err)
    }