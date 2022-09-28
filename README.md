# fidc-debug-tools
ForgeRock Identity Cloud Debug Tools

## Overview
The Identity Cloud Debug Tools are a set of node.js-based shell scripts that allow tailing of log files to debug custom configurations and scripts.

The tools break down into two main components:
- tail.js - The backend library that handles log record retrieval and provides default log output capabilities as well. This library is referenced by the other scripts.
- tail_*.sh - Specialized scripts to debug specific cloud components. These scripts potentially overwrite the default log output capabilities of tail.js and they provide filter configurations to limit the output to relevant data for the task.

## Install dependencies:
The scripts require `dotenv` to externalize environment configuration. install it via `npm`:
```
$ npm install dotenv --save
```

The scripts require `logzio-nodejs` to upload log records to Logz.io. install it via `npm`:
```
$ npm install logzio-nodejs --save
```

## Configure a `.env` file for your cloud tenant
Modify the sample `.env` file provided in this repository to match your environment:
```
# Specify the full base URL of the FIDC service.
ORIGIN=https://openam-<tenant>.forgeblocks.com

# Specify the log API key and secret,
# as described in https://backstage.forgerock.com/docs/idcloud/latest/paas/tenant/audit-logs.html#api-key
API_KEY_ID=<api_key_id>
API_KEY_SECRET=<api_key_secret>

// Logz.io token as described in https://app-eu.logz.io/#/dashboard/settings/general
LOGZIO_TOKEN=<logz.io_token>

// empty = FIDC auditing default, debug = add core debug, all = everything, custom = actual sources
SOURCES=[<empty>|debug|all|<custom>]
```

## Review default filter settings in the tail_* scripts
