/**
 * Created by mihneaspirescu on 05/07/2017.
 */
const rp  = require('request-promise-native');
const AWS = require("aws-sdk");
const ec2 = new AWS.EC2();

AWS.config.update({
    region  : "eu-west-1",
    endpoint: "https://dynamodb.eu-west-1.amazonaws.com"
});


function getInstanceData() {
    const options = {
        uri : `http://169.254.169.254/latest/dynamic/instance-identity/document`,
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options)
}


let instance = {};

getInstanceData().then(instanceDetails => {
    instance = {
        availabilityZone: instanceDetails.availabilityZone,
        privateIp       : instanceDetails.privateIp,
        instanceId      : instanceDetails.instanceId,
        region          : instanceDetails.region
    };

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
}).then( params => {
    return ec2.describeTags(params).promise()
}).then((err, data) => {
    console.log(data);
}).catch(err => {
    console.log(err, err.stack);
});