/**
 * Created by mihneaspirescu on 05/07/2017.
 */
const rp  = require('request-promise-native');
const AWS = require("aws-sdk");



function getInstanceData() {
    const options = {
        uri : `http://169.254.169.254/latest/dynamic/instance-identity/document`,
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options)
}


let _instance = {};

exports.loadInfo = () => getInstanceData().then(instanceDetails => {
    _instance = {
        availabilityZone: instanceDetails.availabilityZone,
        privateIp       : instanceDetails.privateIp,
        instanceId      : instanceDetails.instanceId,
        region          : instanceDetails.region
    };

    AWS.config.update({
        region: instanceDetails.region,
    });


    return {
        Filters: [
            {
                Name  : "resource-id",
                Values: [
                    instanceDetails.instanceId
                ]
            }
        ]
    };
}).then(params => {
    // get the tags of the current running instance
    const ec2 = new AWS.EC2();
    return ec2.describeTags(params).promise()
}).then((data) => {
    // parse the tags and return an object with it's
    // tags as key-value pairs.
    let tags = {};
    data.Tags.forEach((tag) => {
        tags[tag.Key] = tag.Value
    });
    return tags;
}).then(tags => {
    // aggregate the necessary information

    return {tags:tags, instanceDetails: _instance};
}).catch(err => {
    console.log(err, err.stack);
});