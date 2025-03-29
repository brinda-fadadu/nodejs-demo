let Handlebars = require('handlebars')
let fs = require('fs')
const util = require('util')
const moment = require('moment-timezone')

const readFile = util.promisify(fs.readFile)

const makeHTML = async (htmlTemplate, data) => {
    handlebarsHelperFunction(data.timezone)
    const html = await readFile(htmlTemplate, 'utf-8')
    let template = Handlebars.compile(html, { preventIndent: true })
    let result = template(data)
    return result
}

const handlebarsHelperFunction = (timezone) => {
    Handlebars.registerHelper('assign', function (name, value, options) {
        if (!options.data.root) {
            options.data.root = {}
        }
        if (value) {
            value = moment(value).tz(timezone).format('LL')
        }
        options.data.root[name] = value
    })
    Handlebars.registerHelper('dateFormat', function (items, format, options) {
        let headingDate = false
        if (format === 'fullDate') {
            format = 'LLLL'
            headingDate = true
            if (!options.data.root) {
                options.data.root = {}
            }
        }
        let date
        if (items && items !== '-') {
            date = moment(items).tz(timezone).format(format)

            if (date && format === 'LLLL') {
                date = date.split(' ').splice(0, 4)
                if (!headingDate) {
                    date[1] = date[1].slice(0, 3)
                }
                date = date.join(' ')
            }
        } else {
            date = '-'
        }
        return date
    })

    Handlebars.registerHelper('FuneralArrangementSectionLocation', function (items) {
        const locationObj = {
            viewing: 'Viewing Location',
            visitation1: 'Visitation Location',
            visitation2: 'Visitation 2 Location',
            visitation3: 'Visitation 3 Location',
            reception: 'Reception Room'
        }
        let funeralLocationObj = {}
        let funeralLocationHtml = ''
        items.map((item) => {
            funeralLocationObj[item.type] = item
        })
        Object.keys(locationObj).map((location) => {
            let startTime
            startTime = funeralLocationObj[location] && funeralLocationObj[location].startTime && funeralLocationObj[location].startTime !== '-' ? moment(funeralLocationObj[location].startTime).tz(timezone).format('MM/DD/YYYY hh:mm A') : '-'
            funeralLocationHtml += `<div class="container-card-item">
            <div class="item-card">
                <div class="item-card-name">${locationObj[location]}</div>
                <div class="item-card-value">${funeralLocationObj[location] && funeralLocationObj[location].location ? funeralLocationObj[location].location : '-'}</div>
            </div>
            <div class="item-card">
                <div class="item-card-name">Date &amp; Time</div>
                <div class="item-card-value">${startTime}</div>
            </div>
        </div>`
        })
        return funeralLocationHtml
    })
    Handlebars.registerHelper('notEqualsToCondition', function (cond1, cond2, options) {
        return (cond1 !== cond2) ? options.fn(this) : options.inverse(this)
    })

    Handlebars.registerHelper('get_length', function (obj, options) {
        if (!options.data.root) {
            options.data.root = {}
        }
        options.data.root['callerLength'] = obj.length - 1
    })
    Handlebars.registerHelper('ifCondOR', function (cond1, cond2, cond3, options) {
        if (cond1 || cond2 || cond3) {
            return options.fn(this)
        }
        return options.inverse(this)
    })
}

module.exports = makeHTML
