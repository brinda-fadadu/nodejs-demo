'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Country', [
      {
        'id':1,
        'name': 'United States',
        'code': 'USA'
      }, {
        'id':2,
        'name': 'Algeria',
        'code': 'DZA'
      }, {
        'id':3,
        'name': 'Argentina',
        'code': 'ARG'
      }, {
        'id':4,
        'name': 'Armenia',
        'code': 'ARM'
      }, {
        'id':5,
        'name': 'Austria',
        'code': 'AUT'
      }, {
        'id':6,
        'name': 'Belgium',
        'code': 'BEL'
      }, {
        'id':7,
        'name': 'Brazil',
        'code': 'BRA'
      }, {
        'id':8,
        'name': 'Britain',
        'code': 'GBR'
      }, {
        'id':9,
        'name': 'Canada',
        'code': 'CAN'
      }, {
        'id':10,
        'name': 'Chile',
        'code': 'CHL'
      }, {
        'id':11,
        'name': 'China',
        'code': 'CHN'
      }, {
        'id':12,
        'name': 'Colombia',
        'code': 'COL'
      }, {
        'id':13,
        'name': 'Cuba',
        'code': 'CUB'
      }, {
        'id':14,
        'name': 'Czechoslovakia',
        'code': 'CSK'
      }, {
        'id':15,
        'name': 'Denmark',
        'code': 'DNK'
      }, {
        'id':16,
        'name': 'Ecuador',
        'code': 'ECU'
      }, {
        'id':17,
        'name': 'Egypt',
        'code': 'EGY'
      }, {
        'id':18,
        'name': 'Estonia',
        'code': 'EST'
      }, {
        'id':19,
        'name': 'Finland',
        'code': 'FIN'
      }, {
        'id':20,
        'name': 'France',
        'code': 'FRA'
      }, {
        'id':21,
        'name': 'Germany',
        'code': 'DEU'
      }, {
        'id':22,
        'name': 'Greece',
        'code': 'GRC'
      }, {
        'id':23,
        'name': 'Hong Kong',
        'code': 'HKG'
      }, {
        'id':24,
        'name': 'Hungary',
        'code': 'HUN'
      }, {
        'id':25,
        'name': 'India',
        'code': 'IND'
      }, {
        'id':26,
        'name': 'Indonesia',
        'code': 'IDN'
      }, {
        'id':27,
        'name': 'Ireland',
        'code': 'IRL'
      }, {
        'id':28,
        'name': 'Israel',
        'code': 'ISR'
      }, {
        'id':29,
        'name': 'Italy',
        'code': 'ITA'
      }, {
        'id':30,
        'name': 'Ivory Coast',
        'code': 'CIV'
      }, {
        'id':31,
        'name': 'Japan',
        'code': 'JPN'
      }, {
        'id':32,
        'name': 'Kenya',
        'code': 'KEN'
      }, {
        'id':33,
        'name': 'Korea',
        'code': 'KOR'
      }, {
        'id':34,
        'name': 'Luxembourg',
        'code': 'LUX'
      }, {
        'id':35,
        'name': 'Mexico',
        'code': 'MEX'
      }, {
        'id':36,
        'name': 'Netherlands',
        'code': 'NLD'
      }, {
        'id':37,
        'name': 'New Zealand',
        'code': 'NZL'
      }, {
        'id':38,
        'name': 'Nicaragua',
        'code': 'NIC'
      }, {
        'id':39,
        'name': 'Nigeria',
        'code': 'NGA'
      }, {
        'id':40,
        'name': 'Norway',
        'code': 'NOR'
      }, {
        'id':41,
        'name': 'Philippines',
        'code': 'PHL'
      }, {
        'id':42,
        'name': 'Poland',
        'code': 'POL'
      }, {
        'id':43,
        'name': 'Portugal',
        'code': 'PRT'
      }, {
        'id':44,
        'name': 'Puerto Rico',
        'code': 'PRI'
      }, {
        'id':45,
        'name': 'Romania',
        'code': 'ROM'
      }, {
        'id':46,
        'name': 'Russia',
        'code': 'RUS'
      }, {
        'id':47,
        'name': 'Scotland',
        'code': 'GBR'
      }, {
        'id':48,
        'name': 'Senegal',
        'code': 'SEN'
      }, {
        'id':49,
        'name': 'South Africa',
        'code': 'ZAF'
      }, {
        'id':50,
        'name': 'South Korea',
        'code': 'KOR'
      }, {
        'id':51,
        'name': 'Soviet Union',
        'code': 'USR'
      }, {
        'id':52,
        'name': 'Spain',
        'code': 'ESP'
      }, {
        'id':53,
        'name': 'Sweden',
        'code': 'SWE'
      }, {
        'id':54,
        'name': 'Switzerland',
        'code': 'CHE'
      }, {
        'id':55,
        'name': 'Taiwan',
        'code': 'TWN'
      }, {
        'id':56,
        'name': 'Thailand',
        'code': 'THA'
      }, {
        'id':57,
        'name': 'Tunisia',
        'code': 'TUN'
      }, {
        'id':58,
        'name': 'Turkey',
        'code': 'TUR'
      }, {
        'id':59,
        'name': 'Ukraine',
        'code': 'UKR'
      }, {
        'id':60,
        'name': 'Wales',
        'code': 'GBR'
      }, {
        'id':61,
        'name': 'West Germany',
        'code': 'DEU'
      }, {
        'id':62,
        'name': 'Yugoslavia',
        'code': 'YUG'
      }, {
        'id':63,
        'name': 'Australia',
        'code': 'AUS'
      }, {
        'id':64,
        'name': 'Bulgaria',
        'code': 'BGR'
      }, {
        'id':65,
        'name': 'Jamaica',
        'code': 'JAM'
      }, {
        'id':66,
        'name': 'Venezuela',
        'code': 'VEN'
      }, {
        'id':67,
        'name': 'Dominican Republic',
        'code': 'DOM'
      }, {
        'id':68,
        'name': 'Albania',
        'code': 'ALB'
      }, {
        'id':69,
        'name': 'Burkina Faso',
        'code': 'BFA'
      }, {
        'id':70,
        'name': 'Peru',
        'code': 'PER'
      }, {
        'id':71,
        'name': 'Pakistan',
        'code': 'PAK'
      }, {
        'id':72,
        'name': 'Iran',
        'code': 'IRN'
      }, {
        'id':73,
        'name': 'Cameroon',
        'code': 'CMR'
      }, {
        'id':74,
        'name': 'Angola',
        'code': 'AGO'
      }, {
        'id':75,
        'name': 'Grenada',
        'code': 'GRD'
      }, {
        'id':76,
        'name': 'Botswana',
        'code': 'BWA'
      }, {
        'id':77,
        'name': 'Vietnam',
        'code': 'VNM'
      }, {
        'id':78,
        'name': 'Mongolia',
        'code': 'MNG'
      }, {
        'id':79,
        'name': 'Jordan',
        'code': 'JOR'
      }, {
        'id':80,
        'name': 'Bolivia',
        'code': 'BOL'
      }, {
        'id':81,
        'name': 'Iceland',
        'code': 'ISL'
      }, {
        'id':82,
        'name': 'Lebanon',
        'code': 'LBN'
      }, {
        'id':83,
        'name': 'Slovenia',
        'code': 'SVN'
      }, {
        'id':84,
        'name': 'Saudi Arabia',
        'code': 'SAU'
      }, {
        'id':85,
        'name': 'Macedonia',
        'code': 'MKD'
      }, {
        'id':86,
        'name': 'Czech Republic',
        'code': 'CZE'
      }, {
        'id':87,
        'name': 'Panama',
        'code': 'PAN'
      }, {
        'id':88,
        'name': 'El Salvador',
        'code': 'SLV'
      }, {
        'id':89,
        'name': 'Morocco',
        'code': 'MAR'
      }, {
        'id':90,
        'name': 'Bahamas',
        'code': 'BHS'
      }, {
        'id':91,
        'name': 'Bermuda',
        'code': 'BMU'
      }, {
        'id':92,
        'name': 'Honduras',
        'code': 'HND'
      }, {
        'id':93,
        'name': 'Guatemala',
        'code': 'GTM'
      }, {
        'id':94,
        'name': 'Singapore',
        'code': 'SGP'
      }, {
        'id':95,
        'name': 'Cambodia',
        'code': 'KHM'
      }, {
        'id':96,
        'name': 'Uruguay',
        'code': 'URY'
      }, {
        'id':97,
        'name': 'Monaco',
        'code': 'MCO'
      }, {
        'id':98,
        'name': 'Costa Rica',
        'code': 'CRI'
      }, {
        'id':99,
        'name': 'Malaysia',
        'code': 'MYS'
      }, {
        'id':100,
        'name': 'Lithuania',
        'code': 'LTU'
      }, {
        'id':101,
        'name': 'Paraguay',
        'code': 'PRY'
      }, {
        'id':102,
        'name': 'Slovak Republic',
        'code': 'SVK'
      }, {
        'id':103,
        'name': 'Syria',
        'code': 'SYR'
      }, {
        'id':104,
        'name': 'United Arab Emirates',
        'code': 'ARE'
      }, {
        'id':105,
        'name': 'Oman',
        'code': 'OMN'
      }, {
        'id':106,
        'name': 'Qatar',
        'code': 'QAT'
      }, {
        'id':107,
        'name': 'Iraq',
        'code': 'IRQ'
      }, {
        'id':108,
        'name': 'Yemen',
        'code': 'YEM'
      }, {
        'id':109,
        'name': 'Bahrain',
        'code': 'BHR'
      }, {
        'id':110,
        'name': 'Kuwait',
        'code': 'KWT'
      }, {
        'id':111,
        'name': 'Afghanistan',
        'code': 'AFG'
      }, {
        'id':112,
        'name': 'Palestine',
        'code': 'PSE'
      }, {
        'id':113,
        'name': 'Croatia',
        'code': 'HRV'
      }, {
        'id':114,
        'name': 'Fiji',
        'code': 'FJI'
      }, {
        'id':115,
        'name': 'Serbia',
        'code': 'SRB'
      }, {
        'id':116,
        'name': 'Montenegro',
        'code': 'MNE'
      }, {
        'id':117,
        'name': 'Kazakhstan',
        'code': 'KAZ'
      }, {
        'id':118,
        'name': 'Barbados',
        'code': 'BRB'
      }, {
        'id':119,
        'name': 'England',
        'code': 'GBR'
      }, {
        'id':120,
        'name': 'Haiti',
        'code': 'HTI'
      }, {
        'id':121,
        'name': 'Papua New Guinea',
        'code': 'PNG'
      }, {
        'id':122,
        'name': 'Bangladesh',
        'code': 'BGD'
      }, {
        'id':123,
        'name': 'St. Lucia',
        'code': 'LCA'
      }, {
        'id':124,
        'name': 'Andorra',
        'code': 'AND'
      }, {
        'id':125,
        'name': 'Aruba',
        'code': 'ABW'
      }, {
        'id':126,
        'name': 'Azerbaijan',
        'code': 'AZE'
      }, {
        'id':127,
        'name': 'Belize',
        'code': 'BLZ'
      }, {
        'id':128,
        'name': 'Benin',
        'code': 'BEN'
      }, {
        'id':129,
        'name': 'Bhutan',
        'code': 'BTN'
      }, {
        'id':130,
        'name': 'Burundi',
        'code': 'BDI'
      }, {
        'id':131,
        'name': 'Cape Verde',
        'code': 'CPV'
      }, {
        'id':132,
        'name': 'Central African Republic',
        'code': 'CAF'
      }, {
        'id':133,
        'name': 'Chad',
        'code': 'TCD'
      }, {
        'id':134,
        'name': 'Congo (Brazzaville)',
        'code': 'COG'
      }, {
        'id':135,
        'name': 'Cook Islands',
        'code': 'COK'
      }, {
        'id':136,
        'name': 'Cyprus',
        'code': 'CYP'
      }, {
        'id':137,
        'name': 'Djibouti',
        'code': 'DJI'
      }, {
        'id':138,
        'name': 'Ethiopia',
        'code': 'ETH'
      }, {
        'id':139,
        'name': 'Gabon',
        'code': 'GAB'
      }, {
        'id':140,
        'name': 'Gambia',
        'code': 'GMB'
      }, {
        'id':141,
        'name': 'Georgia (Republic)',
        'code': 'GEO'
      }, {
        'id':142,
        'name': 'Ghana',
        'code': 'GHA'
      }, {
        'id':143,
        'name': 'Gibraltar',
        'code': 'GIB'
      }, {
        'id':144,
        'name': 'Greenland',
        'code': 'GRL'
      }, {
        'id':145,
        'name': 'Guadeloupe',
        'code': 'GLP'
      }, {
        'id':146,
        'name': 'Guinea',
        'code': 'GIN'
      }, {
        'id':147,
        'name': 'Guinea-Bissau',
        'code': 'GNB'
      }, {
        'id':148,
        'name': 'Guyana',
        'code': 'GUY'
      }, {
        'id':149,
        'name': 'Kyrgyz Republic',
        'code': 'KGZ'
      }, {
        'id':150,
        'name': 'Laos',
        'code': 'LAO'
      }, {
        'id':151,
        'name': 'Latvia',
        'code': 'LVA'
      }, {
        'id':152,
        'name': 'Lesotho',
        'code': 'LSO'
      }, {
        'id':153,
        'name': 'Liberia',
        'code': 'LBR'
      }, {
        'id':154,
        'name': 'Libya',
        'code': 'LBY'
      }, {
        'id':155,
        'name': 'Liechtenstein',
        'code': 'LIE'
      }, {
        'id':156,
        'name': 'Macao',
        'code': 'MAC'
      }, {
        'id':157,
        'name': 'Madagascar',
        'code': 'MDG'
      }, {
        'id':158,
        'name': 'Malawi',
        'code': 'MWI'
      }, {
        'id':159,
        'name': 'Mali',
        'code': 'MLI'
      }, {
        'id':160,
        'name': 'Malta',
        'code': 'MLT'
      }, {
        'id':161,
        'name': 'Martinique',
        'code': 'MTQ'
      }, {
        'id':162,
        'name': 'Mauritania',
        'code': 'MRT'
      }, {
        'id':163,
        'name': 'Mauritius',
        'code': 'MUS'
      }, {
        'id':164,
        'name': 'Moldova',
        'code': 'MDA'
      }, {
        'id':165,
        'name': 'Montserrat',
        'code': 'MSR'
      }, {
        'id':166,
        'name': 'Mozambique',
        'code': 'MOZ'
      }, {
        'id':167,
        'name': 'Namibia',
        'code': 'NAM'
      }, {
        'id':168,
        'name': 'Nepal',
        'code': 'NPL'
      }, {
        'id':169,
        'name': 'Niger',
        'code': 'NER'
      }, {
        'id':170,
        'name': 'North Korea (Korean Peoples Democratic Republic)',
        'code': 'PRK'
      }, {
        'id':171,
        'name': 'Rwanda',
        'code': 'RWA'
      }, {
        'id':172,
        'name': 'Serbia and Montenegro',
        'code': 'SCG'
      }, {
        'id':173,
        'name': 'Sierra Leone',
        'code': 'SLE'
      }, {
        'id':174,
        'name': 'Slovakia',
        'code': 'SVK'
      }, {
        'id':175,
        'name': 'Sri Lanka',
        'code': 'LKA'
      }, {
        'id':176,
        'name': 'Sudan',
        'code': 'SDN'
      }, {
        'id':177,
        'name': 'Suriname',
        'code': 'SUR'
      }, {
        'id':178,
        'name': 'Swaziland',
        'code': 'SWZ'
      }, {
        'id':179,
        'name': 'Tajikistan',
        'code': 'TJK'
      }, {
        'id':180,
        'name': 'Tanzania',
        'code': 'TZA'
      }, {
        'id':181,
        'name': 'Togo',
        'code': 'TGO'
      }, {
        'id':182,
        'name': 'Trinidad And Tobago',
        'code': 'TTO'
      }, {
        'id':183,
        'name': 'Turkmenistan',
        'code': 'TKM'
      }, {
        'id':184,
        'name': 'Uganda',
        'code': 'UGA'
      }, {
        'id':185,
        'name': 'Upper Volta',
        'code': 'HVO'
      }, {
        'id':186,
        'name': 'Uzbekistan',
        'code': 'UZB'
      }, {
        'id': 187,
        'name': 'Zaire',
        'code': 'ZAR'
      }, {
        'id': 188,
        'name': 'Zambia',
        'code': 'ZMB'
      }, {
        'id': 189,
        'name': 'Zimbabwe',
        'code': 'ZWE'
      }, {
        'id': 190,
        'name': 'Guam',
        'code': 'GUM'
      }, {
        'id': 191,
        'name': 'American Samoa',
        'code': 'ASM'
      }, {
        'id': 192,
        'name': 'Anguilla',
        'code': 'AIA'
      }, {
        'id': 193,
        'name': 'Antarctica',
        'code': 'ATA'
      }, {
        'id': 194,
        'name': 'Bosnia And Herzegovina',
        'code': 'BIH'
      }, {
        'id': 195,
        'name': 'Bouvet Island',
        'code': 'BVT'
      }, {
        'id': 196,
        'name': 'British Indian Ocean Territory',
        'code': 'IOT'
      }, {
        'id': 197,
        'name': 'Brunei Darussalam',
        'code': 'BRN'
      }, {
        'id': 198,
        'name': 'Cayman Islands',
        'code': 'CYM'
      }, {
        'id': 199,
        'name': 'Christmas Island',
        'code': 'CXR'
      }, {
        'id': 200,
        'name': 'Cocos (Keeling) Islands',
        'code': 'CCK'
      }
    ], {},{
      id:{
        autoIncrement:true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Country', null, {})
  }
}
