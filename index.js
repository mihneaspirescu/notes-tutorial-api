/**
 * Created by mihneaspirescu on 02/07/2017.
 */
const bodyParser = require('body-parser');
const app        = require('express')();
const cors       = require('cors');
const requestIp  = require('request-ip');
const rp         = require('request-promise-native');
const ip         = require('ip');
const shortid    = require('shortid');
const AWS        = require("aws-sdk");

AWS.config.update({
    region  : "eu-west-1",
    endpoint: "https://dynamodb.eu-west-1.amazonaws.com"
});


let docClient = new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'});


// all environments
app.set('port', process.env.PORT || 3000);

//enable json parsing
app.use(bodyParser.json());
app.use(function (error, req, res, next) {
    if (error instanceof SyntaxError) {
        res.json({success: false, reason: "marformed json"});
    } else {
        next();
    }
});
//enable cors
app.use(cors());


// inside middleware handler.
// gets the ip of the request
app.use(requestIp.mw());


app.get('/location', (req, res) => {

    const ipAddr = req.clientIp;


    if (ip.isPrivate(ipAddr)) {
        res.json({
            success : false,
            reason  : "private-addr",
            ip      : ipAddr,
            location: "private address",
        });
        return;
    }


    getLocation(ipAddr).then(function (location) {

        res.json({
            success     : true,
            ip          : ipAddr,
            location    : location.country,
            country_code: location.countryCode,
            flag_url    : `http://www.geognos.com/api/en/countries/flag/${location.countryCode}.png`
        });


    }).catch(function (err) {
        // API call failed...
        res.json({error: err})
    });


});





app.post('/note', (req, res) => {


    const postInfo = req.body;

    if (!postInfo.hasOwnProperty('title') ||
        !postInfo.hasOwnProperty('content') ||
        !postInfo.hasOwnProperty('location')) {
        res.json({success: false, reason: "not all fields provided"});
        return;
    }

    // we don't want to allow clients to post if they don't have a full location
    // object. I.E: if the result of the location endpoint is a private address we
    // don't want the client to post as it's missing the country_code and flag_url.
    if (!postInfo.location.hasOwnProperty('ip') ||
        !postInfo.location.hasOwnProperty('country_code') ||
        !postInfo.location.hasOwnProperty('location') ||
        !postInfo.location.hasOwnProperty('flag_url')) {

        res.json({success: false, reason: "not all fields provided for location"});
        return;
    }


    let note         = postInfo;
    note.inserted_at = Date.now();
    note.note_id     = shortid.generate();


    insertNoteInDynamoDB(note).then(() => {
        res.json({success: true, note});
    });


});


// gets all notes
// will be limited to the last 20
app.get('/note', (req, res) => {

    let country_code = req.query.country_code;
    getAllNotesFromDynamoDb(country_code).then(data => {
        res.json({success: true, data: data.Items, length: data.Items.length})
    }).catch(err => {
        res.json({success: false, reason: "Something went wrong"})
    });

});


app.get('/note/:id', (req, res) => {

    const id   = req.params.id;



    getNoteWithIDFromDynamoDB(id).then(data => {
        res.json({success: true, note:data.Items[0]})
    })

});
app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'))
});

//////////////////////////////////////////////////////////////////////
///////////////////// Dynamodb helpers
//////////////////////////////////////////////////////////////////////


const insertNoteInDynamoDB = (note) => {

    return new Promise(function (resolve, reject) {
        let noteInsert = {
            note_id     : note.note_id,
            inserted_at : note.inserted_at,
            content     : note.content,
            title       : note.title,
            location    : note.location.location,
            country_code: note.location.country_code,
            flag_url    : note.location.flag_url,
            ip          : note.location.ip,
            dummy       : "true"
        };

        const params = {
            Item     : noteInsert,
            TableName: "Notes"
        };
        docClient.put(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const getNoteWithIDFromDynamoDB = (note_id) => {

    let params = {
        TableName: "Notes",
    };

    params.IndexName                 = "note_id-index";
    params.KeyConditionExpression    = 'note_id = :id';
    params.ExpressionAttributeValues = {
        ':id': note_id
    };

    return docClient.query(params).promise();


};


const getAllNotesFromDynamoDb = (country_code) => {

    return new Promise(function (resolve, reject) {

        let params = {
            TableName       : "Notes",
            ScanIndexForward: false,
            Limit           : 20
        };


        if (country_code) {
            params.KeyConditionExpression    = 'country_code = :cc';
            params.ExpressionAttributeValues = {
                ':cc': country_code
            };
        } else {
            params.IndexName                 = "dummy-inserted_at-index";
            params.KeyConditionExpression    = 'dummy = :dummydata';
            params.ExpressionAttributeValues = {
                ':dummydata': "true"
            };
        }

        docClient.query(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })


};


function getLocation(ip) {
    const options = {
        uri : `http://ip-api.com/json/${ip}`,
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options)
}


