/**
 * Created by mihneaspirescu on 02/07/2017.
 */
module.exports = {
    apps : [{
        name        : "api",
        script      : "./index.js",
        watch       : true,
        env: {
            "NODE_ENV": "development",
        },
        env_production : {
            "NODE_ENV": "production",
            "PORT":"80"
        }
    }]
};