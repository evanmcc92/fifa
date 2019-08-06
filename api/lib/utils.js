'use strict';

const formidable = require('formidable');
const _ = require('lodash');

module.exports = {
    checkObjectValues: function(obj) {
        let missingKeys = [];
        _.keys(obj).forEach( function(element, index) {
            if (!_.get(obj, element)) missingKeys.push(element);
        });
        return missingKeys;
    },

    formHandler: function(req, res, next) {
        let form = new formidable.IncomingForm();
        form.once('error', console.error);
        form.parse(req, function (err, fields, files) {
            req.postData = fields;
            next();
        });
    },
    toTitleCase: function(text) {
        // https://stackoverflow.com/a/4878800
        return text.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
    },
    attrsToObject: function(attrArray, object) {
        // make the following attributes objects
        if (Array.isArray(object)) {
            let revisedObj = [];
            object.forEach( function(obj, index) {
                attrArray.forEach( function(attr, i) {
                    obj[attr] = JSON.parse(obj[attr]);
                });
                revisedObj.push(obj)
            });
            return revisedObj;
        } else {
            attrArray.forEach( function(attr, i) {
                object[attr] = JSON.parse(object[attr]);
            });
            return object;
        }
    }
};
