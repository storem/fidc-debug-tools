/**
 * Obtains logs from ForgeRock Identity Cloud (FIDC)  '/monitoring/logs/tail' endpoint
 * as described in https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/audit-logs.html
 * Sends the logs data to standard output by default, or to a passed in callback function.
 * @param {object} param0 Object wrapping all arguments.
 * @param {string} param0.origin Base URL to an FIDC instance.
 * @param {string} param0.api_key_id For details, see: https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/audit-logs.html#api-key
 * @param {string} param0.api_key_secret For details, see: https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/audit-logs.html#api-key
 * @param {source} param0.source The logs' source, as described in https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/audit-logs.html#getting_sources
 * @param {number} [param0.frequency=2] The frequency (in seconds) with which the logs should be requested from the REST endpoint.
 * @param {boolean} param0.exclude Exclude filter if true, include otherwise
 * @param {array} param0.filter Array of loggers to filter (exclude or include)
 * @param {function} [param0.showLogs=showLogs(logsObject)] A function to output logs.
 * @param {string} param0.logzio_token For details, see: https://app-eu.logz.io/#/dashboard/settings/general
 * @param {array} param0.realms Array of realms to filter on (include undefined to match records without realm).
 */
module.exports = function ({
    origin,
    api_key_id,
    api_key_secret,
    source,
    frequency,
    exclude,
    filter,
    showLogs,
    scriptonly,
    logzio_token,
    realms
}) {

    if (logzio_token) {
        var logger = require('logzio-nodejs').createLogger({
            token: logzio_token,
            protocol: 'https',
            host: 'listener.logz.io',
            port: '8071',
            type: 'ForgeRockIDCloud',
            //addTimestampWithNanoSecs: true,
            extraFields: { origin: origin }
        });
    }

    var logzio = logzio_token?true:false;
    var filterRealms = realms.length>0?true:false;

    frequency = frequency * 1000 || 5000

    /**
     * Processes the logs' content: filters, formats, etc.
     * If no `showLogs` method is passed in arguments, is applied to the data received from the REST endpoint.
     * In this instance, prepares stringified JSON output for a command line tool like `jq`.
     * @param {object} logsObject The object containing logs.
     * @param {object[]} [logsObject.result] An array of logs.
     * @param {string|object} [logsObject.result.payload] A log payload.
     */
    showLogs = showLogs || function ({
        logsObject
    }) {
        if (Array.isArray(logsObject.result)) {
            //console.error(`${logsObject.result.length}`);
            let excluded = 0;
            logsObject.result.forEach(log => {
                log.payload['@timestamp'] = log.payload.timestamp
                if (scriptonly) {
                    const scriptRegex = /scripts.*/g;
                    if (log.payload.logger) {
                        if (log.payload.logger.match(scriptRegex)) {
                            let flattenedPayload
                            if (log.payload.entries && log.payload.entries[0] && log.payload.entries[0].info) {
                              flattenedPayload = { ...log.payload, ...log.payload.entries[0].info}
                            } else {
                                flattenedPayload = log.payload
                            }
                            //console.log(JSON.stringify(log.payload))
                            console.log(JSON.stringify(flattenedPayload))
                            if (logzio) {
                                logger.log(flattenedPayload)
                            }
                        } else excluded++;
                    } else excluded++;
                } else {
                    if ((exclude && (filter.includes(log.payload.logger) || filter.includes(log.type))) ||
                        (!exclude && (!filter.includes(log.payload.logger) || !filter.includes(log.type)))) {
                        excluded++
                        // console.error('EXCLUDED: exclude='+exclude+' filter includes '+log.payload.logger+'='+filter.includes(log.payload.logger)+' filter includes '+log.type+'='+filter.includes(log.type))
                    } else {
                        // console.error('INCLUDED: exclude='+exclude+' filter includes '+log.payload.logger+'='+filter.includes(log.payload.logger)+' filter includes '+log.type+'='+filter.includes(log.type))
                        if (filterRealms && !realms.includes(log.payload.realm)) {
                            excluded++
                        } else {
                            let flattenedPayload
                            if (log.payload.entries && log.payload.entries[0] && log.payload.entries[0].info) {
                              flattenedPayload = { ...log.payload, ...log.payload.entries[0].info}
                            } else {
                                flattenedPayload = log.payload
                            }
                            //console.log(JSON.stringify(log.payload))
                            console.log(JSON.stringify(flattenedPayload))
                            if (logzio) {
                                logger.log(flattenedPayload)
                            }
                        }
                    }
                }
            })
            if (excluded > 0) {
                console.error('Filtered out ' + excluded + ' events.')
            }
        } else {
            logsObject['@timestamp'] = logsObject.timestamp
            let flattenedObject 
            if (logsObject.entries && logsObject.entries[0] && logsObject.entries[0].info) {
                flattenedObject = { ...logsObject, ...logsObject.entries[0].info}
            } else {
                flattenedObject = logsObject
            }
            //console.log(JSON.stringify(logsObject))
            console.log(JSON.stringify(flattenedObject))
            if (logzio) {
                logger.log(flattenedObject)
            }
        }
    }

    /**
     * @returns {string} Concatenated query string parameters.
     */
    function getParams() {
        return Object.keys(params).map((key) => {
            if (params[key]) {
                return (key + "=" + encodeURIComponent(params[key]))
            }
        }).join("&")
    }

    /**
     * Obtains logs from the '/monitoring/logs/tail' endpoint.
     * Keeps track of the last request's `pagedResultsCookie` to avoid overlaps in the delivered content.
     */
    function getLogs() {
        // Authorization options.
        let rateLimit = 0;
        let rateLimitRemaining = 0;
        let rateLimitReset = 0;
        const options = {
            headers: {
                'x-api-key': api_key_id,
                'x-api-secret': api_key_secret
            }
        }

        // The API call.
        http.get(
            origin + '/monitoring/logs/tail?' + getParams(),
            options,
            (res) => {
                // console.log(res.headers);
                rateLimit = parseInt(res.headers['x-ratelimit-limit']);
                rateLimitRemaining = parseInt(res.headers['x-ratelimit-remaining']);
                rateLimitReset = parseInt(res.headers['x-ratelimit-reset']) * 1000 | frequency;
                var data = ''

                // To avoid dependencies, use the native module and receive data in chunks.
                res.on('data', (chunk) => {
                    data += chunk
                })

                // Process the data when the entire response has been received.
                res.on('end', () => {
                    var logsObject

                    try {
                        logsObject = JSON.parse(data)
                    } catch (e) {
                        logsObject = {
                            "scriptError": String(e)
                        }
                    }
                    showLogs({
                        logsObject
                    })

                    // Set the _pagedResultsCookie query parameter for the next request
                    // to retrieve all records stored since the last one.
                    if (logsObject.pagedResultsCookie) {
                        params._pagedResultsCookie = logsObject.pagedResultsCookie;
                    }
                })
                setTimeout(getLogs, getTimeout(rateLimitReset));
            }
        )
    }

    function getTimeout(rateLimitReset) {
        const rightNow = Date.now();
        let timeout = 0;
        timeout = rateLimitReset - rightNow;
        timeout = timeout < 0 ? 0 : timeout;
        timeout = timeout < frequency ? frequency : timeout;
        // console.error(`"next in ${timeout}ms"`);
        return timeout;
    }
    /**
     * Derives a native module name from the origin; 'http' or 'https' is expected.
     */
    const moduleName = (new URL(origin)).protocol.split(':')[0]
    const http = require(moduleName)

    /**
     * Defines URL query string params.
     */
    var params = {
        source: source
    }

    console.error("origin=%s key=%s freq=%dms src=%s filter=%s scriptonly=%s realms=%s", origin, api_key_id, frequency, source, (exclude ? 'exclude' : 'include'), scriptonly, realms)
    getLogs()
}