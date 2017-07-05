/**
 * Created by mihneaspirescu on 02/07/2017.
 */
module.exports = {
    apps: [{
        name          : "api",
        script        : "./index.js",
        watch         : true,
        env           : {
            "NODE_ENV": "development",
            "APP_ENV" : "dev"
        },
        env_production: {
            "NODE_ENV": "production",
            "APP_ENV" : "prod",
            "PORT"    : "80"
        }
    }]
};