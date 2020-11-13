'use strict'

const formidable = require('formidable')
const dynamodb = require('serverless-dynamodb-client')
const _ = require('lodash')

const PLAYERS_TABLE = process.env.PLAYERS_TABLE
const GAMES_TABLE = process.env.GAMES_TABLE
const TEAMS_TABLE = process.env.TEAMS_TABLE

module.exports = {
    attrsToObject: (attrArray, object) => {
        // make the following attributes objects
        if (Array.isArray(object)) {
            const revisedObj = []
            object.forEach(obj => {
                attrArray.forEach(attr => {
                    obj[attr] = JSON.parse(obj[attr])
                })
                revisedObj.push(obj)
            })
            return revisedObj
        }
        attrArray.forEach(attr => {
            object[attr] = JSON.parse(object[attr])
        })
        return object

    },
    checkObjectValues: obj => {
        const missingKeys = []
        _.keys(obj).forEach(element => {
            if (!_.get(obj, element)) missingKeys.push(element)
        })
        return missingKeys
    },
    formHandler: (req, res, next) => {
        const form = new formidable.IncomingForm()
        form.once('error', console.error)
        form.parse(req, (err, fields) => {
            if (err) {
                console.error(err)
            }
            req.postData = fields
            next()
        })
    },
    toTitleCase: text =>
        // https://stackoverflow.com/a/4878800
        text.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' '),
    validateObjectAttributes: (obj, table) => {
        let tableName
        if (table === 'player') {
            tableName = PLAYERS_TABLE
        } else if (table === 'game') {
            tableName = GAMES_TABLE
        } else if (table === 'team') {
            tableName = TEAMS_TABLE
        }
        const params = {
            Key: {
                id: obj.id,
            },
            TableName: tableName,
        }

        return dynamodb.doc.get(params).promise()
    }
}
