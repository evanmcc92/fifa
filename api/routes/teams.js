'use strict'

const express = require('express')
const _ = require('lodash')
const dynamodb = require('serverless-dynamodb-client')
const utils = require('../lib/utils')
const router = express.Router()

const TEAMS_TABLE = process.env.TEAMS_TABLE

const BAD_REQUEST = 400

//
// teams
//

// get all teams
router.get('/', (req, res) => {
    // allowed queries
    const teamName = _.get(req.query, 'teamName')
    const league = _.get(req.query, 'league')
    const country = _.get(req.query, 'country')
    const keyConditionExpression = []

    const params = {
        ExpressionAttributeValues: {},
        FilterExpression:          '*',
        TableName:                 TEAMS_TABLE,
    }

    if (teamName) {
        keyConditionExpression.push('contains(teamName, :teamName)')
        params.ExpressionAttributeValues[':teamName'] = utils.toTitleCase(teamName)
    }

    if (league) {
        keyConditionExpression.push('contains(league, :league)')
        params.ExpressionAttributeValues[':league'] = league.toUpperCase()
    }

    if (country) {
        keyConditionExpression.push('contains(country, :country)')
        params.ExpressionAttributeValues[':country'] = country.toUpperCase()
    }

    if (keyConditionExpression.length > 0) {
        params.FilterExpression = keyConditionExpression.join(' AND ')
    } else {
        delete params.FilterExpression
        delete params.ExpressionAttributeValues
        delete params.KeyConditionExpression
    }

    // TODO: add caching
    dynamodb.doc.scan(params, (error, data) => {
        if (error) {
            console.error('There was an error getting the teams', error)
            res.status(BAD_REQUEST).json({
                error:   'There was an error getting the teams',
                message: error.message
            })
            return
        }

        res.json(data.Items)
    })
})

// get a team by id
router.get('/:id', (req, res) => {
    const teamId = _.get(req.params, 'id')
    const params = {
        Key: {
            id: teamId,
        },
        TableName: TEAMS_TABLE,
    }

    dynamodb.doc.get(params, (error, data) => {
        if (error) {
            console.error(`There was an error getting teams ${teamId}`, error)
            res.status(BAD_REQUEST).json({
                error:   `There was an error getting teams ${teamId}`,
                message: error.message
            })
            return
        }

        res.json(data.Item)
    })
})

module.exports = router
