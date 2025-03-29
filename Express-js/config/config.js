module.exports = {
    'development': {
        'username': 'SA',
        'password': '',
        'database': 'data',
        'host': '127.0.0.1',
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '4e0f87da7a4e447b90a8111c4ed77b63',
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '127.0.0.1'
        },
        'logging': true,
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'test': {
        'username': 'SA',
        'password': '',
        'database': 'data',
        'host': '127.0.0.1',
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '4e0f87da7a4e447b90a8111c4ed77b63',
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'redis': {
            'port': 6379,
            'host': '127.0.0.1'
        },
        'logging': false
    },
    'QA': {
        'username': 'dev',
        'password': '',
        'database': 'database6',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'Integration': {
        'username': 'sa',
        'password': '',
        'database': 'OnePortalUAT',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'UAT': {
        'username': 'sa',
        'password': '',
        'database': 'OnePortalUATDB',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '10.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389/OU=product Name, DC=corp, DC=data',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'define': {
            'timestamps': false
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'pool': {
            'max': 250,
            'min': 0,
            'acquire': 60000,
            'idle': 10000
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000,
                'cancelTimeout': 10000
            }
        },
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData'
    },
    'Migration': {
        'username': 'sa',
        'password': '',
        'database': 'OnePortalDB_Fix_4',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '10.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389/OU=product Name, DC=corp, DC=data',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 500000
            }
        }
    },
    'CI': {
        'username': 'sa',
        'password': '',
        'database': 'dataCI',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '4e0f87da7a4e447b90a8111c4ed77b63',
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'define': {
            'timestamps': false
        },
        'logging': false
    },
    'refactoring': {
        'username': 'sa',
        'password': '',
        'database': 'DataRefactor8',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2f79d8bbad0a43ae80e581f3edda6b35',
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'logging': true,
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'webcem': {
        'username': 'sa',
        'password': '',
        'database': 'OnePortalWebCem',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        }
    },
    'HMISSync': {
        'username': 'sa',
        'password': '',
        'database': 'datahmissync2',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        }
    },
    'FuneralUAT': {
        'username': 'sa',
        'password': '',
        'database': 'OnePortalMigrateUAT2',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '10.10.1.139'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'preproduction': {
        'username': process.env.DB_USER_NAME,
        'password': process.env.DB_PASSWORD,
        'database': process.env.DB_NAME,
        'host': process.env.DB_HOST,
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': process.env.LDAP_URL,
        'rollbar_accesstoken': process.env.ROLLBAR_TOKEN,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'logging': true,
        'redis': {
            'port': process.env.REDIS_PORT,
            'host': process.env.REDIS_HOST
        },
        'define': {
            'timestamps': true
        },
        'pool': {
            'max': 250,
            'min': 0,
            'acquire': 60000,
            'idle': 10000
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'production': {
        'username': process.env.DB_USER_NAME,
        'password': process.env.DB_PASSWORD,
        'database': process.env.DB_NAME,
        'host': process.env.DB_HOST,
        'dialect': 'mssql',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': process.env.LDAP_URL,
        'rollbar_accesstoken': process.env.ROLLBAR_TOKEN,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'archiveTimePeriod': 30,
        'logging': true,
        'redis': {
            'port': process.env.REDIS_PORT,
            'host': process.env.REDIS_HOST
        },
        'define': {
            'timestamps': true
        },
        'pool': {
            'max': 250,
            'min': 0,
            'acquire': 60000,
            'idle': 10000
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000,
                'cancelTimeout': 10000
            }
        }
    },
    'App': {
        'username': 'dev',
        'password': '',
        'database': 'App',
        'host': 'DEV-SQL01',
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': 'ldap://hqs-ad02.data.corp:389',
        'rollbar_accesstoken': '2255006c9bcd463c8c048b24ee9741cd',
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': 6379,
            'host': '127.0.0.1'
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    },
    'appqa': {
        'username': process.env.DB_USER_NAME,
        'password': process.env.DB_PASSWORD,
        'database': process.env.DB_NAME,
        'host': process.env.DB_HOST,
        'dialect': 'mssql',
        'databaseVersion': '11.0.0',
        'smsloginurl': 'https://platform.devtest.ringcentral.com/restapi/oauth/token',
        'smsurl': 'https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms',
        'ldap_url': process.env.LDAP_URL,
        'rollbar_accesstoken': process.env.ROLLBAR_TOKEN,
        'archiveTimePeriod': 30,
        'seederStorage': 'sequelize',
        'seederStorageTableName': 'SequelizeData',
        'define': {
            'timestamps': true
        },
        'redis': {
            'port': process.env.REDIS_PORT,
            'host': process.env.REDIS_HOST
        },
        'dialectOptions': {
            'options': {
                'requestTimeout': 300000
            }
        }
    }
}
