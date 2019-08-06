'use strict';

const serverless = require('serverless-http');
const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');
const dynamodb = require('serverless-dynamodb-client');
const utils = require('../lib/utils');
const router = express.Router();

const GAME_PATH_PREFIX = process.env.GAME_PATH_PREFIX;
const PLAYERS_TABLE = process.env.PLAYERS_TABLE;
const GAMES_TABLE = process.env.GAMES_TABLE;

// 
// players
// players are the people whose score you may want to track
//

// get all players
router.get('/', function(req, res, next){
    let params = {
        TableName: PLAYERS_TABLE
    };

    // TODO: add caching
    dynamodb.doc.scan(params, function(error, data) {
        if (error) {
            console.error('There was an error getting player ' + playerId, error);
            res.status(400).json({
                error: 'There was an error getting player ' + playerId,
                message: error.message
            });
        }

        res.json(data.Items);
    });
});

// get a player by id
router.get('/:id', function(req, res, next){
    let playerId = _.get(req.params, 'id');
    let params = {
        TableName: PLAYERS_TABLE,
        Key: {
            id: playerId,
        },
        AttributesToGet: [
            'id',
            'fname',
            'lname',
            'favTeam',
        ],
    };

    dynamodb.doc.get(params, function(error, data) {
        if (error) {
            console.error('There was an error getting player ' + playerId, error);
            res.status(400).json({
                error: 'There was an error getting player ' + playerId,
                message: error.message
            });
        }

        res.json(data.Item);
    });
});

// get all games for a player
router.get('/:id' + GAME_PATH_PREFIX, async function(req, res, next){
    let playerId = _.get(req.params, 'id');
    let games = [];

    // define params
    let params = {
        TableName: GAMES_TABLE,
        IndexName: '',
        FilterExpression: '',
        ExpressionAttributeValues: {
            ':playerId': playerId.trim()
        },
        Select: 'ALL_ATTRIBUTES',
    };

    // set away player params
    params.IndexName = 'awayPlayerIndex';
    params.FilterExpression = 'contains(awayPlayer, :playerId)';
    let awayGamesPromise = dynamodb.doc.scan(params).promise();

    // set home player params
    params.IndexName = 'homePlayerIndex';
    params.FilterExpression = 'contains(homePlayer, :playerId)';
    let homeGamesPromise = dynamodb.doc.scan(params).promise();

    Promise.all([homeGamesPromise, awayGamesPromise]).then(function(values){
        games = values[0].Items.concat(values[1].Items);
        games = _.orderBy(games, ['created_at']); // sort by most recent games

        let fixAttr = ['awayPlayer', 'awayTeam', 'homePlayer', 'homeTeam'];
        res.json(utils.attrsToObject(fixAttr, games));
    }).catch(function(error){
        console.error('There was an error getting games for this player', error)
        res.status(400).json({
            error: 'There was an error getting games for this player',
            message: error.message
        });
    });

}); 

// add a player
router.post('/', utils.formHandler, function(req, res, next){
    let postData = req.postData;

    if (postData) {
        // required information: fname, lname
        // optional information: favTeam
        let fname = _.get(postData, 'fname');
        let lname = _.get(postData, 'lname');
        let favTeam = _.get(postData, 'favTeam');

        if (!fname && !lname) {
            res.status(400).json({
                error: 'A first and last name is required'
            });
        }

        let playerId = uuid();
        let params = {
            TableName: PLAYERS_TABLE,
            Item: {
                id: playerId,
                fname: fname,
                lname: lname,
                favTeam: favTeam,
                updated_at: moment().format(),
            },
        };

        dynamodb.doc.put(params, function(error, data) {
            if (error) {
                console.error('There was an error adding this player', error);
                res.status(400).json({
                    error: 'There was an error adding this player',
                    message: error.message
                });
            }

            res.json({
                message: 'Successfully added player ' + playerId,
                path: '/' + playerId
            });
        });
        return;
    }
    res.status(400).json({
        error: 'There was an error'
    });
});

// remove a player by id
router.delete('/:id', function(req, res, next){
    let playerId = _.get(req.params, 'id').trim();

    let params = {
        TableName: PLAYERS_TABLE,
        Key: {
            id: playerId,
        },
    };

    dynamodb.doc.delete(params, function(error, data) {
        if (error) {
            console.error('There was an error deleting player ' + playerId, error);
            res.status(400).json({
                error: 'There was an error deleting player ' + playerId,
                message: error.message
            });
        }

        res.json({
            message: 'Successfully deleted player'
        });
    });
});

module.exports = router;
