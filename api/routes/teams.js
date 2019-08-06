'use strict';

const serverless = require('serverless-http');
const express = require('express');
const _ = require('lodash');
const dynamodb = require('serverless-dynamodb-client');
const utils = require('../lib/utils');
const router = express.Router();

const TEAMS_TABLE = process.env.TEAMS_TABLE;

// 
// teams
// 

// get all teams
router.get('/', function(req, res, next){
    // allowed queries
    let teamName = _.get(req.query, 'teamName');
    let league = _.get(req.query, 'league');
    let country = _.get(req.query, 'country');
    let keyConditionExpression = [];

    let params = {
        TableName: TEAMS_TABLE,
        FilterExpression: '*',
        ExpressionAttributeValues: {},
    };

    if (teamName) {
        keyConditionExpression.push('contains(teamName, :teamName)');
        params.ExpressionAttributeValues[':teamName'] = utils.toTitleCase(teamName);
    }

    if (league) {
        keyConditionExpression.push('contains(league, :league)');
        params.ExpressionAttributeValues[':league'] = league.toUpperCase();
    }

    if (country) {
        keyConditionExpression.push('contains(country, :country)');
        params.ExpressionAttributeValues[':country'] = country.toUpperCase();
    }

    if (keyConditionExpression.length > 0) {
        params.FilterExpression = keyConditionExpression.join(' AND ');
    } else {
        delete params.FilterExpression; 
        delete params.ExpressionAttributeValues; 
        delete params.KeyConditionExpression; 
    }

    // TODO: add caching
    dynamodb.doc.scan(params, function(error, data) {
        if (error) {
            console.error('There was an error getting the teams', error);
            res.status(400).json({
                error: 'There was an error getting the teams',
                message: error.message
            });
            return;
        }

        res.json(data.Items);
    });
});

// get a team by id
router.get('/:id', function(req, res, next){
    let teamId = _.get(req.params, 'id');
    let params = {
        TableName: TEAMS_TABLE,
        Key: {
            id: teamId,
        },
    };

    dynamodb.doc.get(params, function(error, data) {
        if (error) {
            console.error('There was an error getting teams ' + teamId, error);
            res.status(400).json({
                error: 'There was an error getting teams ' + teamId,
                message: error.message
            });
            return;
        }

        res.json(data.Item);
    });
});

module.exports = router;
