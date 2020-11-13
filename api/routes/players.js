'use strict'

const serverless = require('serverless-http')
const express = require('express')
const _ = require('lodash')
const uuid = require('uuid/v5')
const dynamodb = require('serverless-dynamodb-client')
const utils = require('../lib/utils')
const moment = require('moment')
const router = express.Router()

const GAME_PATH_PREFIX = process.env.GAME_PATH_PREFIX
const PLAYER_PATH_PREFIX = process.env.PLAYER_PATH_PREFIX
const PLAYERS_TABLE = process.env.PLAYERS_TABLE
const GAMES_TABLE = process.env.GAMES_TABLE

//
// players
// players are the people whose score you may want to track
//

// get all players
router.get('/', function(req, res, next) {
    const params = {
        TableName: PLAYERS_TABLE
    }

    // TODO: add caching
    dynamodb.doc.scan(params, function(error, data) {
        if (error) {
            console.error(`There was an error getting player ${playerId}`, error)
            res.status(400).json({
                error:   `There was an error getting player ${playerId}`,
                message: error.message
            })
        }

        const playersData = _.get(data, 'Items')
        if (playersData.length > 0) {
            const out = {
                players: playersData,
            }
            res.json(out)
        } else {
            res.json({message: 'There are no players.'})
        }
    })
})

// get a player by id
router.get('/:id', function(req, res, next) {
    const playerId = _.get(req.params, 'id')
    const params = {
        TableName: PLAYERS_TABLE,
        Key:       {
            id: playerId,
        },
        AttributesToGet: [
            'id',
            'fname',
            'lname',
            'favTeam',
        ],
    }

    dynamodb.doc.get(params, function(error, data) {
        if (error) {
            console.error(`There was an error getting player ${playerId}`, error)
            res.status(400).json({
                error:   `There was an error getting player ${playerId}`,
                message: error.message
            })
        }

        const playersData = []
        playersData.push(_.get(data, 'Item'))
        if (_.find(playersData, 'id')) {
            const out = {
                count:  playersData.length,
                player: playersData,
            }
            res.json(out)
        } else {
            res.json({message: 'This player does not exist.'})
        }
    })
})

// get all games for a player
router.get(`/:id${GAME_PATH_PREFIX}`, async function(req, res, next) {
    const playerId = _.get(req.params, 'id')
    let games = []

    // define params
    const params = {
        TableName:                 GAMES_TABLE,
        IndexName:                 '',
        FilterExpression:          '',
        ExpressionAttributeValues: {
            ':playerId': playerId.trim()
        },
        Select: 'ALL_ATTRIBUTES',
    }

    // set away player params
    params.IndexName = 'awayPlayerIndex'
    params.FilterExpression = 'contains(awayPlayer, :playerId)'
    const awayGamesPromise = dynamodb.doc.scan(params).promise()

    // set home player params
    params.IndexName = 'homePlayerIndex'
    params.FilterExpression = 'contains(homePlayer, :playerId)'
    const homeGamesPromise = dynamodb.doc.scan(params).promise()

    Promise.all([homeGamesPromise, awayGamesPromise]).then(function(values) {
        games = values[0].Items.concat(values[1].Items)
        games = _.orderBy(games, ['created_at'], ['desc']) // sort by most recent games

        const fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam']
        games = utils.attrsToObject(fixAttr, games)
        const limit = _.get(req.query, 'limit', games.length)
        if (games.length > limit) {
            games.length = limit
        }
        const out = {
            count: games.length,
            games: games
        }

        res.json(out)
    }).catch(function(error) {
        console.error('There was an error getting games for this player', error)
        res.status(400).json({
            error:   'There was an error getting games for this player',
            message: error.message
        })
    })
})

// add a player
router.post('/', utils.formHandler, function(req, res, next) {
    const postData = req.postData

    if (postData) {
        // required information: fname, lname
        // optional information: favTeam
        const fname = _.get(postData, 'fname')
        const lname = _.get(postData, 'lname')
        const favTeam = _.get(postData, 'favTeam')
        const playerId = _.get(postData, 'id', uuid(`${fname} ${lname}`, uuid.DNS))

        if (!fname && !lname) {
            res.status(400).json({
                error: 'A first and last name is required'
            })
        }

        const params = {
            TableName: PLAYERS_TABLE,
            Item:      {
                id:         playerId,
                fname:      fname,
                lname:      lname,
                favTeam:    favTeam,
                updated_at: moment().format(),
            },
        }

        dynamodb.doc.put(params, function(error, data) {
            if (error) {
                console.error('There was an error adding this player', error)
                res.status(400).json({
                    error:   'There was an error adding this player',
                    message: error.message
                })
            }

            res.json({
                message: `Successfully added player ${playerId}`,
                path:    `${PLAYER_PATH_PREFIX}/${playerId}`
            })
        })
        return
    }
    res.status(400).json({
        error: 'There was an error'
    })
})

// remove a player by id
router.delete('/:id', function(req, res, next) {
    const playerId = _.get(req.params, 'id').trim()

    const params = {
        TableName: PLAYERS_TABLE,
        Key:       {
            id: playerId,
        },
    }

    dynamodb.doc.delete(params, function(error, data) {
        if (error) {
            console.error(`There was an error deleting player ${playerId}`, error)
            res.status(400).json({
                error:   `There was an error deleting player ${playerId}`,
                message: error.message
            })
        }

        res.json({
            message: 'Successfully deleted player'
        })
    })
})

module.exports = router
