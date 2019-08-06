'use strict';


const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const uuid = require('uuid/v4');

var teamsPath = path.join(__dirname, './teams.json');
var teamsData = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));


var newTeamData = [];

_.forIn(teamsData, function(value, country) {
    let obj = {}
    if (Array.isArray(value)) {
        value.forEach( function(team, index) {
            obj = {
                id: uuid(),
                teamName: team,
                country: country,
                league: country
            }
            newTeamData.push(obj);
        });
    } else {
        _.forIn(value, function(teams, league) {
            teams.forEach( function(team, index) {
                obj = {
                    id: uuid(),
                    teamName: team,
                    country: country,
                    league: league
                }
                newTeamData.push(obj);
            });
        });
    }
});

fs.writeFileSync('./data.json', JSON.stringify(newTeamData)  , 'utf-8'); 
console.log('./data.json');
