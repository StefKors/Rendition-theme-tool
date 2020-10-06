 /* eslint-disable */ 
const data = [
    {
      "id": "1bde4004-e655-48f2-a708-8a74089a63da",
      "data": {
        "Problem": "Some devices display errors such as `x509: certificate signed by unknown authority`. That often is the result of Man-in-the-Middle (MitM) proxies that try to use their own certificate for resin, and we cannot do much about that.\n\nTo diagnose this, can try to run a query to the API, and see whether the reply makes sense:\n\n```\ncurl -v -i -k https://api.resin.io/ping\n```\nHere `-v` is increased verbosity, `-i` shows the headers as well, and `-k` allows insecure connection. If the reply is `OK`, then we should be fine, and the certificate error might be due to other cause (questionmark). If the output is not `OK`, then the output might have some clues of why the issue is happening (ie. info from the MitM proxy that can be feedback to the user)\n",
        "Solution": "No solution really, just diagnostics as above."
      },
      "name": "Certificate issues on devices due to unknown authority",
      "slug": "scratchpad-entry-1bde4004-e655-48f2-a708-8a74089a63da",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2020-08-04T07:21:49.074Z"
      },
      "created_at": "2019-03-01T17:59:56.510Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "33338477-1d2c-4e23-83b3-b3c429f46b0d",
      "data": {
        "Problem": "In some cases, when updating a pre-multicontainer device version (balenaOS <2.10) to a multicontainer device, the supervisor ends up in a state, when the supervisor is trying to report device state, but is barred from that. The symptom is having logs like:\n```\nEvent: Device state report failure {\"error\":{\"message\":\"\"}}\nEvent: Device state report failure {\"error\":{\"message\":\"\"}}\n...\n```\nrepeated a lot, the device state staying \"Update successful, rebooting\", and the host OS version/supervisor version not being reported.\n\nIt's to do with the supervisor migrating to service/release/etc to id 1, which is valid but not for the particular device.",
        "Solution": "Inside the device, run this command:\n\n```\nbalena exec -it resin_supervisor node -e \"const database = new (require('sqlite3').Database)('/data/database.sqlite', (err) => {if (err) { throw err; } database.all('SELECT name FROM image WHERE serviceId = 1;', console.log)});\"\n```\nand save the output of the `registry2....` URL there.\n\nIn the dashboard's debug console (which provides easy SDK access) then paste this function:\n```\nconst getSql = async (dockerImage) => {\n    dockerImage = dockerImage.replace(/:latest$/, '')\n    const result = await sdk.pine.get({\n        resource:'image',\n        options: {\n            $top: 10,\n            $select: ['id', 'is_stored_at__image_location'],\n            $filter: {\n                is_stored_at__image_location: dockerImage\n            },\n            $expand: {\n                is_a_build_of__service:{\n                    $select:'id'\n                },\n                is_part_of__release: {\n                    $select:'is_part_of__release'\n                }\n            }\n        }\n    })\n    console.log(`balena exec -it resin_supervisor node -e \"const database = new (require('sqlite3').Database)('/data/database.sqlite', (err) => {if (err) { throw err; } database.all('UPDATE image SET serviceId = ${result[0].is_a_build_of__service[0].id}, imageId = ${result[0].id}, releaseId = ${result[0].is_part_of__release[0].is_part_of__release.__id} WHERE serviceId = 1 AND name = \\\\'${dockerImage}:latest\\\\';', console.log)});\"`)\n}\n```\nand then run the function with the previously saved URL: \n```\nawait getSql('registry2.balena-cloud.com/....')\n```\n\nwhich will give the required command line on the device to update the supervisor database. \n\nThe code that will be displayed on the debug console will be similar to:\n```\n`balena exec -it resin_supervisor node -e \"const database = new (require('sqlite3').Database)('/data/database.sqlite', (err) => {if (err) { throw err; } database.all('UPDATE image SET serviceId = 6347, imageId = 1136579, releaseId = 910858 WHERE serviceId = 1 AND name = \\'registry2.balena-cloud.com/v2/22d7...:latest\\';', console.log)});\"`\n```\n\nCopy this code and paste it on the Host OS terminal. In a few seconds, the device should be running fine\n\n## Another solution\n\n```\nsystemctl stop resin-supervisor\nbalena rm -f $(balena ps -a -q) || true\nbalena tag $(balena images | grep registry2 | awk '{print $1}') backup\nbalena rmi $(balena images | grep registry2 | awk '{print $1}')\nsystemctl restart resin-supervisor\nwhile ! balena images | grep -q registry2 ; do echo \"waiting on supervisor download\" && sleep 5; done\nbalena rmi backup\n```\nthis ^^ is **sharable with the users** from https://gist.github.com/imrehg/6386b02f198858aca82cbcfcd133bd88 (to sidestep intercom's inability of code blocks)\nThis results in a \"faux\" image download, in the course of what the supervisor database is updated, and thus no copy pastes were needed.\n\n## Deltas\n\nIt seems to also just happen if deltas were *disabled* on the device before the update\nThe fix can be enabling deltas on the device or application, and making sure that the last image downloaded was with deltas. Just enabling the delta downloads before the update makes no difference, Thus best is fleet-wise setting.",
        "severity": "low"
      },
      "name": "Supervisor cannot update device state after host OS update",
      "slug": "support-issue-supervisor-cannot-update-device-state-after-host-os-update-e65a715c-f83b-4b94-8fcd-2f9199b6a72b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-08-09T20:37:04.285Z",
        "support issue has attached support thread": "2020-07-29T16:36:21.494Z"
      },
      "created_at": "2019-06-27T10:14:15.468Z",
      "updated_at": "2019-08-09T20:37:04.245Z",
      "capabilities": []
    },
    {
      "id": "88b558ac-dab9-42ea-a7e5-659d78ed68af",
      "data": {
        "Problem": "Support agents cannot log in as the user to update the supervisor. Here's a script to do that on the device with SSH access only.",
        "Solution": "### Note\n\nUsers cannot update the supervisor themselves - The UI feature that you see as admins is hidden to them, the only way they could do it is using the same hostOS process as we do. In general, we avoid to give them the instructions, because they might break things if they try things on their own (that is, by installing a supervisor that is incompatible with the running resinOS on the device). More often than not, advising them to update the resinOS is the way to go - if the most recent resinOS version doesn't have the desired supervisor version updated, we should perform the update on behalf of them\n\n---\n\n### Update Steps\n\n* Check the available supervisor versions at [https://api.resin.io/v3/supervisor_release](https://api.resin.io/v3/supervisor_release), for the device type, and note the `vX.Y.Z` number, e.g. `v6.3.5`\n* SSH into the device\n* set the `TAG` shell variable to that, eg `TAG=v6.3.5`\n* copy and paste the below script into the shell to run it - it will take the device's credentials, calls the API for the supervisor for cross-check, and then update the database for this device.\n\n```\nif [ -f \"/mnt/boot/config.json\" ]; then\n  CONFIGJSON=/mnt/boot/config.json\nelif [ -f \"/mnt/conf/config.json\" ]; then\n  CONFIGJSON=/mnt/conf/config.json\nfi\nif [ -z \"$TAG\" ]; then\n  echo \"Please set TAG=vX.Y.Z supervisor version (e.g TAG=v6.3.5)\"\nelif [ -z \"$CONFIGJSON\" ]; then\n  echo \"Couldn't find config.json, cannot continue\".\nelse\n  APIKEY=\"$(jq -r '.apiKey // .deviceApiKey' \"${CONFIGJSON}\")\"\n  DEVICEID=\"$(jq -r '.deviceId' \"${CONFIGJSON}\")\"\n  API_ENDPOINT=\"$(jq -r '.apiEndpoint' \"${CONFIGJSON}\")\"\n  SLUG=\"$(jq -r '.deviceType' \"${CONFIGJSON}\")\"\n  SUPERVISOR_ID=$(curl -s \"${API_ENDPOINT}/v3/supervisor_release?\\$select=id,image_name&\\$filter=((device_type%20eq%20'$SLUG')%20and%20(supervisor_version%20eq%20'$TAG'))&apikey=${APIKEY}\" | jq -e -r '.d[0].id')\n  echo \"Extracted supervisor ID: $SUPERVISOR_ID\"\n  curl -s \"${API_ENDPOINT}/v2/device($DEVICEID)?apikey=$APIKEY\" -X PATCH -H 'Content-Type: application/json;charset=UTF-8' --data-binary \"{\\\"supervisor_release\\\": \\\"$SUPERVISOR_ID\\\"}\"\nfi\n```\n\nAfter this, run `update-resin-supervisor` (or see the other issues, e.g. if you are on resinOS version `>=2.0.8 || < 2.7.0`, as it needs patched updater: [#9d028ef7-7b26-4bad-bfba-0e40f0e077f5](/#/3c0ca68c-92d6-4842-847a-0cd9735bf4ad/9d028ef7-7b26-4bad-bfba-0e40f0e077f5) or on ~~resinOS `>=2.9.0 || < 2.11.2` see this: [#f4972410-2328-11e8-bbbd-bdbf69c42691](#f4972410-2328-11e8-bbbd-bdbf69c42691)~~ (link lost, have to find it again)",
        "severity": "low"
      },
      "name": "On device supervisor update for support agents",
      "slug": "scratchpad-entry-88b558ac-dab9-42ea-a7e5-659d78ed68af",
      "tags": [
        "Supervisor",
        "supervisor update"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-24T10:06:40.029Z",
        "support issue has attached support thread": "2020-07-21T09:36:12.934Z"
      },
      "created_at": "2019-03-01T17:59:56.914Z",
      "updated_at": "2020-07-24T10:06:39.948Z",
      "capabilities": []
    },
    {
      "id": "5f9db3fb-6281-49ae-8f3a-b3e79ca61da4",
      "data": {
        "Solution": "**GDPR Update:**\n\nPost-GDPR, users may ask for all their personal/account data to be deleted along with their resin.io account. The process to do this is still TBD. Check https://github.com/resin-io/hq/issues/1367 for the discussions as well as further context on how / what we delete from which service. Please follow the following script:\n\n- Inform the user that we are processing the request and will let them know\n- Apply the 'GDPR-ACCOUNT-DELETE` tag to the Front conversation\n- Ping @afitzek, \n- Create a template based on [https://docs.google.com/spreadsheets/d/1BXFvfmEIvxbxgE7IamFLk1We-PCzg9z5sMGMsTrcnII/edit#gid=0](GDPR PII Data Delete Checklist) to use a checklist for processed services\n- Remember to grab the user's balenaCloud username, user ID and email before doing any deleting and add this info in the respective fields in the checklist spreadsheet ^ \n- Store the link to the spreadsheet in the delete request Front thread to help with tracking with the status for the respective user. These are to make sure that we keep user identifiers in a single place while we delete user data from our servers and subprocessors\n\n\n\nThe normal resin.io account delete action is intentionally missing, because, for the time being, we need resources related to resin.io accounts (e.g. userIDs) while we clear up user date from all related subprocessors/third-party services\n\n**Notes here:**\nFirst of all we need to check if it's a customer. Are they a paid user?\n\nPing @afitzek with the requester's email or username to check if they are a paid user - This is checked from [https://admin.resin.io/users](https://admin.resin.io/users)  the billing plan will say 'free' or a number of paid plans.\n\nIf paid user then we must inform the Sales team: create a FlowDock thread in s/sales_meta, pinging @@customer_success, to review before taking action. This is a situation that should typically be handled by sales initially, in particular the customer interaction. There may be an opportunity, for example, to see if a downgrade is an option.\n\nThere are also a number of steps on the sales backend that need to be addressed, like Salesforce and Recurly account updating, as well as some other documentation related to revenue tracking.\n\nSo the main steps that the sales team will do are:\n\n- Sales will remove user from Recurly\n- Sales may schedule an exit interview\n- Sales comment on what got done and what is needed to be done by the support agent\n\nThe support agent should provide a summary of what has been done, what info we have about the user, devices, etc in the corresponding front thread as a note.\n\n**IMPORTANT!!!** Do not help users delete their accounts until you are 100% sure that they are not collaborators with one of our customers, because deleting their account will cause any devices they created for the company be deleted as well.\n\nIf the user is a collaborator and there are too many devices to check individually, you can use this script - as long as none of the devices are attributed to the user account you'd like to delete you're safe.\n```#!/bin/bash\n\nTOKEN=\"userToken\"\n\nbalena devices \\\n    | awk '{print $1}' \\\n    | grep -v 'ID' \\\n    | xargs -I{} curl -s 'https://api.balena-cloud.com/v2/device({})?$expand=user' -H \"authorization: Bearer $TOKEN\" --compressed \\\n    | jq '.d[0] | \"\\(.id) \\(.application.__id) \\(.user[0].username)\"'\n```\nIt is currently not possible for a user to delete their account using the dashboard.  However it is possible to do so using a direct API request with the *user's* auth token (the auth token must belong to the account being deleted), so either the user can perform the request with their auth token from the preferences panel or an admin can use the 'login as' admin panel feature to copy the user's auth token and run the request themselves.\n\n```sh\nuserId=\"...\"\nuserAuthToken=\"...\"\ncurl -X DELETE \"https://api.balena-cloud.com/v2/user($userId)\" -H \"Authorization: Bearer $userAuthToken\" --compressed\n```\n\nYou should get an `OK` response on successful account deletion.\n\nThis can also be done via the in-browser SDK, eg:\n```\nawait sdk.pine.delete({\n\tresource: 'user',\n\tid: await sdk.auth.getUserId(),\n})\n```\n\nAlso, since we don't use email verification we need to take some extra steps to establish the identify of the user that is asking for account deletion:\n\n1. The user must provide the username of the account that he wants to delete.\n2. The account deletion request must originate the email that is set in the account 'Preferences'.\n3. Even if the original account deletion request satisfies both 1. and 2., we should ask for a final confirmation by sending an email to the account email address, because some misconfigured email servers are still open to spoofing attacks.\n\nIn closing, since this is a parting user we should ask for feedback, e.g.:\n\n> Your account has been deleted. Thanks for trying out balena. We would really appreciate any feedback you have, so that we can improve.",
        "severity": "low"
      },
      "name": "User wants to delete account",
      "slug": "scratchpad-entry-5f9db3fb-6281-49ae-8f3a-b3e79ca61da4",
      "tags": [
        "gdpr"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-02T20:20:22.959Z",
        "support issue has attached support thread": "2020-07-13T15:48:07.455Z"
      },
      "created_at": "2018-08-23T16:12:55.976Z",
      "updated_at": "2019-09-02T20:20:22.905Z",
      "capabilities": []
    },
    {
      "id": "ec435e92-e881-4777-8610-61b2bf536e0f",
      "data": {
        "Problem": "On 2.14.x, the supervisor might not start up properly, because of overlapping networks error. The logs show something like this:\n\n\n```\nAug 22 14:07:39 30b0c40 healthdog[969]: [2018-08-22T14:07:39.349Z] Creating supervisor0 network\nAug 22 14:07:39 30b0c40 healthdog[969]: [2018-08-22T14:07:39.360Z] Scheduling another update attempt due to failure:  30000 { Error: (HTTP code 403) unexpected - cannot create network 0f5f114b028040adbb2d10ba1fe55114f5f8548e772c68bae88dbfc4e383ca41 (supervisor0): conflicts with network d8f6381877ca73256a47eb70dc638cfbc6962ff9abdbe2f76f037f51adcf817c (docker0): networkshave overlapping IPv4\nAug 22 14:07:39 30b0c40 healthdog[969]:     at /usr/src/app/dist/app.js:638:87671\nAug 22 14:07:39 30b0c40 healthdog[969]:     at /usr/src/app/dist/app.js:638:87634\nAug 22 14:07:39 30b0c40 healthdog[969]:     at m.buildPayload (/usr/src/app/dist/app.js:638:87644)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at IncomingMessage.<anonymous> (/usr/src/app/dist/app.js:638:87144)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at emitNone (events.js:91:20)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at IncomingMessage.emit (events.js:185:7)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at endReadableNT (_stream_readable.js:974:12)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at _combinedTickCallback (internal/process/next_tick.js:80:11)\nAug 22 14:07:39 30b0c40 healthdog[969]:     at process._tickCallback (internal/process/next_tick.js:104:9)\nAug 22 14:07:39 30b0c40 healthdog[969]:   reason: undefined,\nAug 22 14:07:39 30b0c40 healthdog[969]:   statusCode: 403,\nAug 22 14:07:39 30b0c40 healthdog[969]:   json: { message: 'cannot create network 0f5f114b028040adbb2d10ba1fe55114f5f8548e772c68bae88dbfc4e383ca41 (supervisor0): conflicts with network d8f6381877ca73256a47eb70dc638cfbc6962ff9abdbe2f76f037f51adcf817c (docker0): networks have overlapping IPv4' } }\nAug 22 14:07:39 30b0c40 healthdog[969]: [2018-08-22T14:07:39.363Z] Apply error Error: (HTTP code 403) unexpected - cannot create network 0f5f114b028040adbb2d10ba1fe55114f5f8548e772c68bae88dbfc4e383ca41 (supervisor0): conflicts with network d8f6381877ca73256a47eb70dc638cfbc6962ff9abdbe2f76f037f51adcf817c (docker0): networks have overlapping IPv4\n```",
        "Solution": "Need to remove existing network info, and restart the supervisor\n\n```\nsystemctl stop resin-supervisor && \\\nbalena rm -f $(balena ps -a -q) && \\\nsystemctl stop balena && \\\nrm -rf /var/lib/docker/network/ && \\\nsystemctl start balena && \\\nsystemctl start resin-supervisor\n```\n"
      },
      "name": "cannot create network (supervisor0): conflicts with networ (docker0): networks have overlapping IPv4",
      "slug": "scratchpad-entry-ec435e92-e881-4777-8610-61b2bf536e0f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2020-07-10T14:55:06.104Z"
      },
      "created_at": "2019-03-01T17:59:57.449Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4dfdf053-e226-4ec2-8143-fbf54af81666",
      "data": {
        "Problem": "App container doesn't start up, with errors like this:\n\n```\n22.08.18 07:49:24 (+0100) Failed to start service 'charger-ws sha256:875f532668b572537aff33bb8a55db84c2cc454049810d0de7566eb0c5b63334' due to '(HTTP code 500) server error - driver failed programming external connectivity onendpoint charger-ws_397845_553923 (760679469bf7af34087bae7d2ba8ea6ac7c94f9075c739cecc32a1d28514d95c): Bind for 0.0.0.0:9000 failed: port is already allocated '\n```",
        "Solution": "Likely in `docker-compose.yml` the user has both `network_mode: host` and `ports` settings like:\n\n```\nports:\n  - '9000:9000'\n```\n\nShould only have one of those, when host networking, the ports should run into the problem like above (since in that case, the container has all access, doesn't need the ports setting). The user has to remove one or the other.\n\nThis error has also been observed *without* network mode host. The solution was to kill the containers and remove the *app-specific* bridged docker network (ie. named `123456_blah`).",
        "severity": "low"
      },
      "name": "Application container fails to bind to port: port is already allocated",
      "slug": "scratchpad-entry-4dfdf053-e226-4ec2-8143-fbf54af81666",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-30T08:13:40.231Z"
      },
      "created_at": "2019-03-01T17:59:56.710Z",
      "updated_at": "2020-06-30T08:13:40.179Z",
      "capabilities": []
    },
    {
      "id": "171982dd-b6ea-4880-b6f7-a0a35a89ed96",
      "data": {
        "Problem": "udev rules won't create any rule files ",
        "Solution": "Relevant documentation can be found here: https://www.balena.io/docs/reference/OS/configuration/#udevrules\nand some examples : https://github.com/tmigone/balena-udev-examples and https://github.com/balena-io-playground/gps-tracker\n\nThe user should check under /etc/udev/rules.d/. In case the files are missing then we have to troubleshoot further. \nAs first the user can check the logs of the os-udevrules service and check if they are having some syntax issues with their config.json.\n\nAs next, the user is adviced to run udevadm monitor/trigger to debug the udev rules and check if the rules are being properly applied and not being overridden, etc.\n\nThey can open two terminals connecting to the host OS for further debugging:\n* On one terminal, you can run udevadm monitor which will print out events sent out by  udev rules. Keep this running\n* in the second terminal, run udevadmn trigger which will request device events from the kernel",
        "severity": "low"
      },
      "name": "udev rules won't create any rule files ",
      "slug": "support-issue-udev-rules-won-t-create-any-rule-files-f9ec6356-d81b-4e97-ac67-469146e9ea10",
      "tags": [
        "udev rules",
        "udev"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-16T14:39:06.164Z",
        "support issue has attached support thread": "2020-06-16T10:06:33.382Z"
      },
      "created_at": "2020-06-16T09:57:54.389Z",
      "updated_at": "2020-06-16T14:39:06.118Z",
      "capabilities": []
    },
    {
      "id": "bdb7d062-1a42-40b0-8116-d4a0e8f074f7",
      "data": {
        "Problem": "Device failing to download containers properly, supervisor logs show:\n```\nconnection error: desc = \"transport: dial unix:///var/run/balena-engine/containerd/balena-engine-containerd.sock: timeout\n```\nWe weren't able to webterminal into the device. Its suspected the network was really bad.\nAfter reboot the device didn't come back online.",
        "Solution": "Not known yet.",
        "archived": false,
        "category": "engine",
        "severity": "medium"
      },
      "name": "connection error: desc = \"transport: dial unix:///var/run/balena-engine/containerd/balena-engine-containerd.sock: timeout",
      "slug": "support-issue-connection-error-desc-transport-dial-unix-var-run-balena-engine-containerd-balena-engine-containerd-sock-timeout-3e91b03a-0fd1-4ed8-95d7-d44f99d4d8d3",
      "tags": [
        "balena-engine",
        "timeout",
        "bad-network",
        "symptom"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T11:44:37.819Z",
        "support issue has attached support thread": "2020-06-12T15:02:23.102Z"
      },
      "created_at": "2019-04-23T11:44:37.274Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3db35bac-5639-4465-ba79-fb766aa3350a",
      "data": {
        "Problem": "In case the user needs (or wants) to use the staging of balenaCloud, or download a device image that is still on staging.",
        "Solution": "The staging version of balenaCloud is available here: https://dashboard.balena-staging.com/\n\nThe user will need to create a new account. We should recommend that users who require staging access download the image from staging, but then use `balena join`/`balena leave` to move the device back to production to eliminate variables when testing. On staging, there is no guarantee of any kind. https://github.com/balena-io/balena-cli-advanced-masterclass#22-moving-devices-between-environments",
        "severity": "low",
        "shareable": true
      },
      "name": "balenaCloud Staging",
      "slug": "support-issue-balenacloud-staging-0c94ad39-c762-4eb3-b686-83fc270dd3d9",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-10T18:30:45.524Z",
        "support issue has attached support thread": "2020-06-10T18:31:10.072Z"
      },
      "created_at": "2020-02-04T18:36:19.450Z",
      "updated_at": "2020-06-10T18:30:45.468Z",
      "capabilities": []
    },
    {
      "id": "6cf3b74f-e827-40fe-b90e-db4e579ba69d",
      "data": {
        "Problem": "User wants to do their app update by inserting a USB drive into the device locally rather than having the app pulled remotely.\n\nThere are a number of use cases for this, like air gapped environments, poor bandwidth devices or devices operating in china that can't connect out.",
        "Solution": "no solution as of yet.",
        "archived": false,
        "category": "APP updates",
        "severity": "low"
      },
      "name": "User would like to do App updates from a local USB drive (perhaps even offline or air gapped)",
      "slug": "support-issue-ser-would-like-to-do-pp-updates-from-a-local-drive-perhaps-even-offline-or-air-gapped-9c4b38be-b516-4005-9129-7961aa218797",
      "tags": [
        "offline",
        "updates",
        "USB"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T13:59:28.058Z",
        "support issue has attached support thread": "2020-06-08T13:39:28.759Z"
      },
      "created_at": "2019-04-23T13:59:27.615Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "72bc4210-eb08-43e6-b48d-28de39583970",
      "data": {
        "Problem": "Customer asks for access for some particular GH users to private device-type BalenaOS repositories that have been created just for them like: \n\ntbalena-os/balena-dt-cloudconnector\nbalena-os/meta-dt-cloudconnector\nbalena-os/dt-u-boot\nbalena-os/dt-imx-kernel",
        "Solution": "We ask the @@operations team to grand access to the requested users to this repo. ",
        "category": "access",
        "severity": "low"
      },
      "name": "Customer ask for access to private device-type  BalenaOS repositories on Github",
      "slug": "support-issue-customer-ask-for-access-to-private-device-type-repositories-9cbf555e-8352-4ccc-b62c-55ebde40a7f4",
      "tags": [
        "access ",
        "Github access"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-27T11:49:37.050Z",
        "support issue has attached support thread": "2020-05-27T11:47:26.102Z"
      },
      "created_at": "2020-05-27T11:44:52.238Z",
      "updated_at": "2020-05-27T11:49:36.986Z",
      "capabilities": []
    },
    {
      "id": "1f13264b-2ebb-4e79-802d-05574e401ffa",
      "data": {
        "Problem": "Devices giving `no space left on device` errors when downloading new container. An example of error messages that are encountered in the logs is:\n\n```\nFailed to start application 'registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746' due to '(HTTP code 404) no such image - no such image: registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746: No such image: registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746:latest\nFailed to download application 'registry2.resin.io/v2/5b05d6a9f91cce28262265aa3b3833f7' due to 'failed to register layer: Error processing tar file(exit status 1): write /usr/lib/jvm/jdk-8-oracle-arm32-vfp-hflt/src.zip: no space left on device'\n```",
        "Solution": "Please follow the instructions at https://balena-io.github.io/scratchpad/#7b57aa47-8d2f-46fd-b166-5381dc733374\n(The link used to be: https://resin-io.github.io/scratchpad/#6f9e8460-7abc-11e8-b24f-057f3ee29435 )\n",
        "severity": "low"
      },
      "name": "Dangling docker diffs filling up disk",
      "slug": "scratchpad-entry-1f13264b-2ebb-4e79-802d-05574e401ffa",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-14T17:20:12.959Z"
      },
      "created_at": "2019-03-01T17:59:56.530Z",
      "updated_at": "2020-05-14T17:20:12.876Z",
      "capabilities": []
    },
    {
      "id": "cd20ba68-7b91-40ae-9516-72c0ea3c15bc",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "Devices running 1.x versions of resinOS can update to specific versions of 2.x (usually 2.2/2.4/2.6 or something similar)\n\nAt the moment, there is a bug in the dashboard which makes it show that devices can perform a balenaOS Host OS update (HUP) from 1.26 to 2.47\nWhile the following issue is fixed https://github.com/balena-io/balenacloud-dashboard/issues/3478 , customers run into an issue trying to hup from 1.26 to 2.47. The dashboard throws an error and confuses users and support agents.",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "Perform a HUP in steps via the dashboard until the bug is fixed. https://github.com/balena-io/balenacloud-dashboard/issues/3478\n\nHUP from 1.x to a valid version of 1.x that can HUP to 2.x\n(e.g for rpi, 1.8 has to reach 1.26 first, for bbb 1.x has to reach 1.30 first).\n\nThe valid combinations are device/version specific. They are defined here https://github.com/balena-io-modules/balena-hup-action-utils/blob/master/lib/config.ts#L26-L31\n\nThen HUP to a valid version of 2.x\ne.g. for rpi, 1.26 has to HUP to between 2.2 and 2.5.\nThen HUP to latest.\n",
        "severity": "low"
      },
      "name": "HUP (Host os UPdate) from 1.x to 2.4x+",
      "slug": "support-issue-hup-from-1-x-to-2-4x-0101486b-e9e2-4335-983a-ea1475ab60f8",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-24T14:16:19.104Z",
        "support issue has attached support thread": "2020-03-23T16:01:04.092Z"
      },
      "created_at": "2020-03-23T16:01:02.984Z",
      "updated_at": "2020-03-24T14:16:19.044Z",
      "capabilities": []
    },
    {
      "id": "0e4cad8d-68b3-49fa-866c-109d74ac6b66",
      "data": {
        "Problem": "If trying to develop an application where the device uses UART to communicate with sensors, the serial console log on uart pins can mess things up. This is only a problem on .dev (\"development\") images.",
        "Solution": "To fix this up on the development images do:\n```\nmount -o remount,rw / # Disable read-only rootfs\nsystemctl mask serial-getty@serial0.service # Mask serial Getty service\nreboot\n```",
        "category": "serial UART",
        "severity": "low",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "UART": {
              "type": "string"
            }
          }
        }
      },
      "name": "Disable serial console on Development balenaOS",
      "slug": "support-issue-disable-serial-console-on-development-balenaos-6b129c8c-2b22-4da3-a05b-58650076b9ff",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-13T10:46:32.516Z"
      },
      "created_at": "2020-03-13T10:46:32.332Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c1ad9c00-ae21-4c87-a752-142c26baf6cc",
      "data": {
        "Problem": "Experienced on :\nDevice type: BeagleBone Black\nOS version: Resin OS 2.7.5+rev2\nSupervisor version: 6.3.6",
        "Solution": "Hopefully will be fixed/improved once https://github.com/balena-os/resinhup/issues/232 is fixed.",
        "category": "hup",
        "severity": "low"
      },
      "name": "Host OS update (HUP) fails on device with slow IO",
      "slug": "support-issue-update-fails-on-device-with-slow-50d95388-159e-4cc4-99f6-e356cf0dc5c8",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:27:52.538Z",
        "support issue has attached support thread": "2019-04-30T13:43:34.017Z"
      },
      "created_at": "2019-04-30T13:43:31.332Z",
      "updated_at": "2020-02-28T20:27:52.496Z",
      "capabilities": []
    },
    {
      "id": "4048ba11-304f-4e46-a8d6-66b85254e1ac",
      "data": {
        "Problem": "User trying to perform a host OS update reports the following error:\n\n```\nresinhup failed: exit code 1 stderr: [000000001][ERROR]Cannot find manifest, target image might not exist. Bailing out...\n```",
        "Solution": "The device cannot access  `registry.hub.docker.com` to download the manifest.\n\nTry a local download with:\n\n```\ncurl --retry 10 --write-out \"%{http_code}\" \"https://registry.hub.docker.com/v2/resin/resinos/manifests/<release-tag>-<device-slug>\"\n```\nFor example:\n\n```\ncurl --retry 10 --write-out \"%{http_code}\" \"https://registry.hub.docker.com/v2/resin/resinos/manifests/v2.38.0_rev1-raspberrypi3\"\n```\n\nIf there is connectivity it should return a \"401 Unauthorized\" code.\n\nIf it returns something like:\n\n```\ncurl: (60) server certificate verification failed. CAfile: /etc/ssl/certs/ca-certificates.crt CRLfile: none\nMore details here: https://curl.haxx.se/docs/sslcerts.html\ncurl failed to verify the legitimacy of the server and therefore could not\nestablish a secure connection to it. To learn more about this situation and\nhow to fix it, please visit the web page mentioned above.\n```\nIt means the device has a problem with the certificate.\nMost likely the time in the device is wrong and needs setting.\n\nIf that does not fix it and the certificate error persists, the following command can be used to obtain the certificate information:\n```\nopenssl s_client -showcerts -servername https://registry.hub.docker.com -connect registry.hub.docker.com:443\n```",
        "category": "hup",
        "severity": "low",
        "shareable": true
      },
      "name": "Host OS update (HUP) fails with Cannot find manifest",
      "slug": "support-issue-host-os-fails-with-cannot-find-manifest-fce9f6a2-975a-4f61-9e0d-2fc0aad6e066",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:22:00.168Z"
      },
      "created_at": "2019-12-17T18:16:52.570Z",
      "updated_at": "2020-02-28T20:19:47.330Z",
      "capabilities": []
    },
    {
      "id": "432573d0-aab2-4b77-a833-39cb765d684b",
      "data": {
        "Problem": "When a host OS update (`resinhup`) is interrupted on `hostapp-update` enabled device, it leaves leftover data on the inactive partition. In the next update attempt, the update might run out of space due to that, since balena don't seem to clean up properly.\n\n\n```\n[000000007][LOG]Starting hostapp-update\n2.11.0_rev1-raspberrypi3: Pulling from resin/resinos-staging\n82c501641192: Pulling fs layer\n82c501641192: Ready to download\nfailed to register layer: Error processing tar file(exit status 1): write /lib/firmware/ti-connectivity/wl18xx-fw-3.bin: no space left on device\n[000000226][ERROR]hostapp-update has failed...-\n```\n\nCan check the space used by:\n\n```\ndf -h /mnt/sysroot/inactive\n```\nIt will likely not empty (which is approx 2MB storage used), if it's anything more of that, then a manual cleanup is required.",
        "Solution": "The update can be unblocked by clearing out the problematic `balena` folder:\n\n```\nsystemctl stop balena-host\nrm -rf /mnt/sysroot/inactive/balena\nsystemctl start balena-host\n```\nAfter this, to clear the failed update status, the easiest is to restart the supervisor (with `systemctl restart resin-supervisor`) and retry the update. If the supervisor restart doesn't clear the status (in a couple of minutes), then rebooting the device should work too.\n\n\nFor resinOS versions `<2.9.x` which run `docker`\n```\nsystemctl stop docker-host\nrm -rf /mnt/sysroot/inactive/docker\nrm -rf /mnt/sysroot/inactive/balena\nsystemctl start docker-host\n```\nand follow the \"After this...\" section above.\n",
        "category": "hup",
        "severity": "low"
      },
      "name": "Host OS update (HUP) fails with no space left on device error",
      "slug": "scratchpad-entry-432573d0-aab2-4b77-a833-39cb765d684b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:13:34.621Z",
        "support issue has attached support thread": "2020-02-07T18:39:53.136Z"
      },
      "created_at": "2018-08-23T16:13:29.668Z",
      "updated_at": "2020-02-28T20:13:34.543Z",
      "capabilities": []
    },
    {
      "id": "23b15a4b-246b-4080-9fea-278425809e28",
      "data": {
        "Problem": "A full state partition leads to a `No space left on device error`. Note that this is the same error as https://jel.ly.fish/432573d0-aab2-4b77-a833-39cb765d684b which is caused by a full inactive partition. \n\nYou can check the space used by:\n\n```\ndf -h /mnt/state\n```\n\nIf it is full, then it could be an issue with temporary NetworkManager logs filling the space. Check the size of the `/mnt/state/root-overlay/var/lib/NetworkManager` directory and check it's contents for numerous files such as `timestamps.XXXXXX`.",
        "Solution": "This [bug](https://github.com/balena-os/meta-balena/issues/1747) was fixed in balenaOS 2.46, and when the device is upgraded to 2.46 these files will be removed. However, in order to complete the upgrade, you will need to clear some space on the state partition. \n\nTo do so the simplest way is to remove the temporary files via:\n\n`rm /var/lib/NetworkManager/{timestamps,seen-bssids}.??????`\n\nAlternatively, you can remove persistent logging (with permission from the user), if enabled, to free some space on the state partition.\n\nAfter this, to clear the failed update status, the easiest is to restart the supervisor (with systemctl restart resin-supervisor) and retry the update.",
        "category": "hup",
        "severity": "low",
        "fixedInOSVersion": "2.46",
        "affectedOSVersions": [
          "<2.46"
        ]
      },
      "name": "Host OS update (HUP) fails with no space left on device error due to full state partition",
      "slug": "support-issue-host-os-update-fails-with-no-space-left-on-device-error-due-to-full-state-partition-13c55d43-adca-4da0-aa91-64d8064c407b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:12:43.420Z",
        "support issue has attached support thread": "2020-03-05T16:45:10.126Z"
      },
      "created_at": "2020-02-07T23:32:34.715Z",
      "updated_at": "2020-02-28T20:12:43.373Z",
      "capabilities": []
    },
    {
      "id": "e2529ccb-45b7-419b-918d-ac640fcadb94",
      "data": {
        "Problem": "User wants to migrate their existing devices to balena",
        "Solution": "As things stand now, brownfield migrations are done very hands on and with a commercial deal. Ping someone from the customer success team to reach out to the user.\nThis was discussed here: https://www.flowdock.com/app/rulemotion/user_happiness/threads/haD3OgBrw9x5HGS-WS5CAMHIHov",
        "severity": "low"
      },
      "name": "Brownfield migrations",
      "slug": "support-issue-brownfield-migrations-eb3f2e0a-d544-47de-a8b7-7a390c14ac5f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-21T14:26:08.474Z"
      },
      "created_at": "2020-02-21T14:25:31.396Z",
      "updated_at": "2020-02-21T14:26:08.437Z",
      "capabilities": []
    },
    {
      "id": "433d045d-ccf0-449b-a010-4009f5c69d74",
      "data": {
        "Problem": "`journalctl -u resin-supervisor` yields:\n```\nresin-supervisor[1144]: (node:1) UnhandledPromiseRejectionWarning: TimeoutError: Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?\n```\nThis is a supervisor issue: https://github.com/balena-io/balena-supervisor/issues/987 fixed in `v9.15.6 `\n",
        "Solution": "\nSolutions:\n- A host os update to BalenaOS 2.37.0+ .\n- A supervisor update  (v9.15.7+) using https://jel.ly.fish/88b558ac-dab9-42ea-a7e5-659d78ed68af",
        "category": "supervisor",
        "severity": "medium",
        "mentionsUser": [
          "user-xginn8",
          "user-shaunmulligan"
        ],
        "fixedInOSVersion": "2.37.0",
        "fixedInSupervisorVersion": "v9.15.6"
      },
      "name": "Device not getting updates",
      "slug": "support-issue-evice-not-getting-updated-440030d9-2988-408b-be97-84093990f1b7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-26T15:52:13.623Z",
        "support issue has attached support thread": "2020-02-20T13:34:17.133Z"
      },
      "created_at": "2019-06-17T13:30:44.903Z",
      "updated_at": "2020-02-20T15:22:03.157Z",
      "capabilities": []
    },
    {
      "id": "9795717e-fa25-4474-8222-e62121f67693",
      "data": {
        "Problem": "balenaOS 2.44.0 & 2.45.0 were removed from production on 11/20/2019.  \n\nWe tweaked the supervisor healthcheck a bit that introduced a race condition in 2.44.0 and 2.45.0. The supervisor may fail to start on a device running this version. The race will happen on every boot.\n\nIn case the supervisor fails its healthcheck, healthdog was restarting the supervisor container. We changed that so that balenaEngine would restart the supervisor container instead.\n\nBefore the balenaEngine daemon can fully start and bind to `/var/run/balena-engine.sock`, the supervisor container can sometimes start too quickly.\n\nWhen the supervisor container doesn't find `/var/run/balena-engine.sock`, the default daemon behaviour with the `docker run -v` flag is to make `/var/run/balena-engine.sock` a folder on the hostOS. Supervisor can't access balena-engine via the socket. The folder on the hostOS keeps existing. The device can't recover. Bad things happen.\n\nfurther reading:\nhttps://www.flowdock.com/app/rulemotion/r-resinos/threads/cs_lLeY9v52H-AuH7hUobpBZMop\nhttps://app.frontapp.com/open/cnv_3sihq9v\nhttps://github.com/balena-os/meta-balena/issues/1748\nhttps://github.com/balena-os/meta-balena/pull/1749",
        "Solution": "Fix has gone into 2.45.1+ and 2.46.0+.",
        "category": "balenaOS, removed, yanked",
        "severity": "medium",
        "shareable": true,
        "fixedInOSVersion": "2.45.1",
        "affectedOSVersions": [
          "2.44.0",
          "2.45.0"
        ]
      },
      "name": "balenaOS 2.44.0/2.45.0 removed from production",
      "slug": "support-issue-balenaos-2-44-0-2-45-0-removed-from-production-67c53b00-8c2f-4201-af71-156d0dba754e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-12T17:54:35.899Z"
      },
      "created_at": "2020-02-12T17:54:35.756Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a597f6dd-7237-4842-8b67-5960152de2f1",
      "data": {
        "Problem": "balenaOS 2.39.0 was removed from production on 09/16/2019.\n\nWe had a supervisor issue on v10.0.3 where the supervisor deleted itself (fixed in v10.1.4 https://github.com/balena-io/balena-supervisor/blob/master/CHANGELOG.md#1014---2019-07-25). meta-balena 2.39.0 included that supervisor, and we have released that for some device types. A \"customer\" (internal team member, but still an actual user) downloaded and run one of those images, and ended up needing a lot of debugging why the device is not working. Once the supervisor issue became known, a supervisor update on the device fixed things, but since these versions were still available to download, it could have broken things for more people.\n\nRemoved from production Intel NUC 2.39.0+rev2 / rev3 (latest is 2.41.x) and UP Board 2.39.0+rev1 (latest goes back to 2.29.2+rev1). Other device types don't seem to have affected versions.\n\nfurther reading: https://www.flowdock.com/app/rulemotion/r-beginners/threads/cEbys4fkDmHwXAvdRKRMbhJbbIY",
        "Solution": "Upgrade balenaOS.",
        "category": "balenaOS, removed, yanked",
        "severity": "medium",
        "shareable": true,
        "fixedInOSVersion": "2.41.0",
        "affectedOSVersions": [
          "2.39.0"
        ],
        "fixedInSupervisorVersion": "10.1.4",
        "affectedSupervisorVersions": [
          "10.0.3",
          "10.0.4",
          "10.0.5",
          "10.1.0",
          "10.1.1",
          "10.1.2",
          "10.1.3"
        ]
      },
      "name": "balenaOS 2.39.0 removed from production",
      "slug": "support-issue-balenaos-2-39-0-removed-from-production-8c59431e-4432-419d-8f08-15d24639895e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-12T17:37:44.930Z"
      },
      "created_at": "2020-02-12T17:37:44.788Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "06d0cd30-c09e-4c00-b8cd-58c0a3719d12",
      "data": {
        "Problem": "Device type: Raspberry Pi 3, Intel NUC\nOS version: balenaOS 2.43.0+rev1, balenaOS 2.39.0+rev1\nSupervisor version: 10.2.2, 10.0.3\n\nEngine is restarting over and over with the following error: `Error starting daemon: Couldn't create reference store repository: invalid character 's' looking for beginning of value`.\n\nI ran the fingerprint check to see if any corruption, but its all fine. Its also running from a good powersupply and there is nothing weird on dmesg.",
        "Solution": "None yet, some ongoing discussion here: https://www.flowdock.com/app/rulemotion/user_happiness/threads/WfrfZ5hriC5CwIcNWJZpF89L-kS \n\nWe found that the reason seems to have been a watchdog related SIGABRT, power cut or anything that would interrupt the engine. Since many filesystem access operations in the docker core are non-atomic this has left parts of the image store in a corrupted state.\nWhile containerd was able to run containers, the engine had trouble to get back up.\n\nRecommended action is to use the https://jel.ly.fish/565d83ef-1625-4c83-8d07-b6e8b6eb054c workaround. Specifically:\n```\nsystemctl stop resin-supervisor\nsystemctl stop docker\nrm -rf /var/lib/docker/{aufs,overlay,containers,image,tmp}\nsystemctl start docker\nupdate-resin-supervisor\n```",
        "severity": "low",
        "affectedOSVersions": [
          "2.43.0, 2.39.0"
        ],
        "affectedSupervisorVersions": [
          "10.2.2, 10.0.3"
        ]
      },
      "name": "Balena engine restarting constantly with \"Error starting daemon: Couldn't create reference store repository\"",
      "slug": "support-issue-balena-engine-restarting-constantly-with-error-starting-daemon-couldn-t-create-reference-store-repository-e7d2b12c-c8f5-4804-8cbc-e86cff746ec7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-12T16:42:24.354Z",
        "support issue has attached support thread": "2020-02-12T16:33:33.385Z"
      },
      "created_at": "2020-02-12T10:16:34.063Z",
      "updated_at": "2020-02-12T16:42:24.311Z",
      "capabilities": []
    },
    {
      "id": "6859dde7-4039-4e09-ade9-c71c8a06d873",
      "data": {
        "Problem": "In the logs (`dmesg` or `journalctl`) you may find something similar to the following:\n\n```\n[Mon Feb 10 15:42:27 2020] [<8087a44c>] (__schedule) from [<8087ab9c>] (schedule+0x4c/0xac)\n[Mon Feb 10 15:42:27 2020] [<8087ab9c>] (schedule) from [<8014efbc>] (io_schedule+0x20/0x40)\n[Mon Feb 10 15:42:27 2020] [<8014efbc>] (io_schedule) from [<8022a674>] (wait_on_page_bit+0x138/0x170)\n[Mon Feb 10 15:42:27 2020] [<8022a674>] (wait_on_page_bit) from [<8022a798>] (__filemap_fdatawait_range+0xec/0x134)\n[Mon Feb 10 15:42:27 2020] [<8022a798>] (__filemap_fdatawait_range) from [<8022a84c>] (filemap_fdatawait_keep_errors+0x34/0x60)\n[Mon Feb 10 15:42:27 2020] [<8022a84c>] (filemap_fdatawait_keep_errors) from [<80393c3c>] (jbd2_journal_commit_transaction+0x900/0x1800)\n[Mon Feb 10 15:42:27 2020] [<80393c3c>] (jbd2_journal_commit_transaction) from [<8039a044>] (kjournald2+0x11c/0x304)\n[Mon Feb 10 15:42:27 2020] [<8039a044>] (kjournald2) from [<80140484>] (kthread+0x170/0x178)\n[Mon Feb 10 15:42:27 2020] [<80140484>] (kthread) from [<8010876c>] (ret_from_fork+0x14/0x28)\n[Mon Feb 10 15:42:27 2020] INFO: task balenad:2245 blocked for more than 120 second\n```\n\nThe specifics may change, but `blocked for more than 120 second` usually indicates that the kernel (and not the watchdog) is killing or indefinitely blocking a process due to a slow or overloaded SD card.",
        "Solution": "The usual when dealing with (possibly) slow SD cards.",
        "severity": "medium",
        "shareable": true
      },
      "name": "Overloaded SD card",
      "slug": "support-issue-overloaded-sd-card-1e539652-0bfb-4a43-bda8-59afc9b44f3a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-12T10:15:24.566Z"
      },
      "created_at": "2020-02-12T10:15:24.410Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2ade9266-d27e-4031-a4b1-e252075c4da4",
      "data": {
        "Problem": "A customer wants us to provide a copy of Balena's W9 form for their internal use. ",
        "Solution": "W9 form can be located here: https://bit.ly/balenaW9",
        "category": "customer-success",
        "severity": "low"
      },
      "name": "Balena W9 form for customers",
      "slug": "support-issue-balena-w9-form-for-customers-2ed111f8-a088-4e9c-9097-89a21093a86b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-11T18:35:36.383Z",
        "support issue has attached support thread": "2020-02-11T18:36:00.930Z"
      },
      "created_at": "2020-02-11T18:35:24.299Z",
      "updated_at": "2020-02-11T18:35:36.344Z",
      "capabilities": []
    },
    {
      "id": "8af967ec-31b4-4c53-b73d-a9f277220920",
      "data": {
        "Problem": "A device may appear offline or exhibit odd behavior, and whilst logs have simmilar entries:\n```\nJun 21 13:37:38 5f918ed resin-supervisor[9447]: LogBackend: unexpected error: { Error: self signed certificate in certificate chain\nJun 21 13:37:38 5f918ed resin-supervisor[9447]:     at TLSSocket.onConnectSecure (_tls_wrap.js:1051:34)\nJun 21 13:37:38 5f918ed resin-supervisor[9447]:     at TLSSocket.emit (events.js:189:13)\nJun 21 13:37:38 5f918ed resin-supervisor[9447]:     at TLSSocket._finishInit (_tls_wrap.js:633:8) code: 'SELF_SIGNED_CERT_IN_CHAIN' }\nJun 21 13:37:40 5f918ed resin-supervisor[9447]: Failed to get target state for device: Error: self signed certificate in certificate chain\n```",
        "Solution": "This is usually caused while the device attempts to establish a new TLS connection to the outside world, and something in the middle injects a self-signed certificate.\nIf `openssl s_client -showcerts -servername api.balena-cloud.com -connect api.balena-cloud.com:443 | openssl x509 -inform pem -noout -text ` on the device\nyields a certificate different than expected, the cause of this issue should be on the device side network.",
        "severity": "medium"
      },
      "name": "Device is offline or having log stream issues, (SELF_SIGNED_CERT_IN_CHAIN)",
      "slug": "support-issue-evice-is-offline-or-having-log-stream-issues-7b5ce616-7cf8-4fc8-b4bc-0b2efef9bda4",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-01-30T10:29:49.419Z",
        "support issue has attached support thread": "2019-06-21T14:19:39.917Z"
      },
      "created_at": "2019-06-21T14:18:32.453Z",
      "updated_at": "2020-01-30T10:29:49.376Z",
      "capabilities": []
    },
    {
      "id": "1668c9ab-32bd-4052-8888-d69d0a95b619",
      "data": {
        "severity": "low"
      },
      "name": "Test issue 2",
      "slug": "support-issue-est-issue-2-f91f2c0b-79f1-48d2-b492-6db4d0e68c0e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-11T14:33:13.987Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "13b9dcfa-8276-4447-b012-68fe16537023",
      "data": {
        "Problem": "Sometimes we don't know if something's wrong with the supervisor state, so we want to see what it holds in its sqlite database, and yet the supervisor container doesn't have an sqlite3 binary (it uses node-sqlite3 and knexjs instead).",
        "Solution": "We can use nodejs to access the database. We first run node inside the supervisor container:\n\n```\nbalena exec -ti resin_supervisor node\n```\n\n(The supervisor must be running for this to work)\n\nOnce in the node shell, we can load the sqlite3 module:\n\n```\nsqlite3 = require('sqlite3');\ndb = new sqlite3.Database('/data/database.sqlite');\n```\n\nAnd we can use this `db` object to run SQL queries, e.g.:\n\n```\ndb.all('SELECT * FROM app;', console.log);\ndb.all('SELECT * FROM config;', console.log);\ndb.run('UPDATE knex_migrations_lock SET is_locked = 0;');\n```\n\n**Be very careful if you modify values, as you may break the supervisor. It's strongly recommended to discuss with the supervisor maintainers before attempting this.**\n\nRefer to the [node-sqlite3 API docs](https://github.com/mapbox/node-sqlite3/wiki/API) for the available functions, and the [supervisor's migrations](https://github.com/balena-io/balena-supervisor/tree/master/src/migrations) for the schema.",
        "severity": "low"
      },
      "name": "Reading/modifying the supervisor database on a device",
      "slug": "support-issue-eading-modifying-the-supervisor-database-on-a-device-d49694b4-58e9-44d2-96eb-efc8d4174d25",
      "tags": [
        "supervisor",
        "sqlite",
        "knex"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-02-05T23:16:21.421Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6a8428fa-f290-457c-9b10-51f8f111bac9",
      "data": {
        "Solution": "Sometimes a user will only supply a UUID. In these cases, it's now possible to use `resin-cli` to retrieve the full Dashboard URL for the device. As an admin, login to `resin-cli` and run the following:\n\n```\nresin device <UUID>\n```\n\nThis will return full details for the device (OS, IP addy, etc.) but also the Dashboard URL.\n\nAs of Dashboard v1.80 we now use the following url schema which also supports short uuids\n```\nhttps://dashboard.resin.io/devices/<deviceUuid>\n```"
      },
      "name": "Retrieving a Dashboard URL from a Device UUID",
      "slug": "scratchpad-entry-6a8428fa-f290-457c-9b10-51f8f111bac9",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.831Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6ab61f74-610c-406e-903b-727a8c03e233",
      "data": {
        "Solution": "It is currently not possible to selectively update a subset of devices associated with an application.\n\nHowever, what you could do is create a new application for each group of devices you want to update separately, and use the same git repository for each application.\n\nTo do this, you'd add a new remote to the same source repository for each device group, eg:\n```\n     git remote add appone <user>@git.resin.io:<user>/appone.git\n     git remote add apptwo <user>@git.resin.io:<user>/apptwo.git\n```\nfor each different application (in this case, 'appone' and 'apptwo').\nYou can then assign half your fleet to application 'appone' and the other half of your fleet to application 'apptwo'.\nNow if you push to the appropriate remote (eg. 'appone'), only those devices attached to that application will be updated.\nYou can easily move devices between applications by selecting a device from a current application, then selecting 'Actions' and then 'Move device'."
      },
      "name": "User wants to update only some Devices attached to an Application",
      "slug": "scratchpad-entry-6ab61f74-610c-406e-903b-727a8c03e233",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.839Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "726db7fc-7e26-49da-ac39-0c678aebcd1d",
      "data": {
        "Problem": "Users are asking if resinOS is affected.\n\nForum thread: https://forums.resin.io/t/update-on-spectre-vulnerability/2451",
        "Solution": "Canned response:\n\nWe are already looking into the Meltdown and Spectre vulnerabilities. We made a list of all our supported devices, and are trying to get patches into ResinOS as fast as we can.\n\nOne thing to keep in mind is that Meltdown and Spectre require code execution on the device, so these vulnerabilities can only be exploited once an attacker is already able to execute code on the device itself.\n\nMeltdown is Variant of Spectre and we will use the classification from ARM: https://developer.arm.com/support/security-update\n\nWe are looking into the kernel patches for KPTI (Kernel page-table isolation) and how we get this patches into ResinOS as fast as possible. ARM points to arm64 linux kernel patches for KPTI (Kernel page-table isolation): https://git.kernel.org/pub/scm/linux/kernel/git/arm64/linux.git/log/?h=kpti\n\nThe base images are not affected by Variant 2, because docker containers do not have their own kernel, but are just “namespaced” within the kernel of the host-OS.\n\nVariant 1 becomes a problem when untrusted code is executed in a sandboxed environment. We are currently trying to find situations where this could be a problem in ResinOS. One example for this would also be the eBPF system in the kernel.\n\nVariant 2 and 3 (aka Meltdown) requires the adoption of KPTI (kernel page-table isolation) in the kernel of the host-OS.\n\nVariant 3a which might leak information from privileged system registers, does not require any additional software mitigation.\n\nGood news for all Raspberry Pi users, because all Raspberry Pis are not affected: https://www.raspberrypi.org/blog/why-raspberry-pi-isnt-vulnerable-to-spectre-or-meltdown/\n\nFor more technical details on how Spectre and Meltdown affect ARM devices and what software mitigations are available, we can refer to the ARM whitepaper:\nhttps://developer.arm.com/support/security-update/download-the-whitepaper\n\nWe are tracking the patches and trying to integrate them into ResinOS as soon as possible. We will open up issues and track the progress on these in the device repositories of ResinOS:\nhttps://github.com/resin-os/"
      },
      "name": "Spectre and Meltdown vulnerabilities",
      "slug": "scratchpad-entry-726db7fc-7e26-49da-ac39-0c678aebcd1d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.853Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "730c3ce0-a726-4e1e-a0a6-73fc6d8f85e6",
      "data": {
        "Solution": "We've noticed a few 2.x devices where deltas or docker pull had failed a bunch of times because docker never cleaned up `/var/lib/docker/tmp` . Symptoms of this issue include `df -h` reporting a filled up `/mnt/data` partition and supervisor errors like this can also be reported:\n\n```\nFailed to download application 'registry2.resin.io/rpi3customers2/9049638af1dea245daaf9b3110a2663bc742126b' due\n     to 'write /var/lib/docker/tmp/GetImageBlob685611256: no space left on device'\n    24.04.17 11:35:23 (+0300) Downloading application 'registry2.resin.io/rpi3customers2/9049638af1dea245daaf9b3110a2663bc742126b'\n```\n\n The current workaround here is to simply delete this folder:\n\n```\n# systemctl stop resin-supervisor\n# systemctl stop docker\n# rm -r /var/lib/docker/tmp/*\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\nIn Front, add the [/mnt/data/docker/tmp/ grows large and eventually /mnt/data/ is filled](https://github.com/resin-io/hq/issues/888) issue to the ticket."
      },
      "name": "Clearing Down Space (aufs)",
      "slug": "scratchpad-entry-730c3ce0-a726-4e1e-a0a6-73fc6d8f85e6",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.861Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "743c28ab-2e25-440c-ae91-c5d0fb24c87d",
      "data": {
        "Problem": "This is because these pieces of software assume that `$(hostname)` resolves to an IP address. Known offenders are tomcat and rabbitmq.",
        "Solution": "The solution is to append an appropriate entry to the `/etc/hosts` file. This can be accomplished in a startup script (i.e. one run via CMD in the Dockerfile) via:\n```\ngrep -q \"$(hostname)\" /etc/hosts || echo \"127.0.0.1 $(hostname)\" >> /etc/hosts\n```\nThis checks whether the entry already exists before inserting one if it doesn't.\nDiscussion for a more permanent fix was raised [in r/ideas](https://www.flowdock.com/app/rulemotion/resin-ideas/threads/wcEF__kZsKI7hqH2FC-Gg7qEG-y)."
      },
      "name": "User software fails with cannot resolve $(hostname) issue",
      "slug": "scratchpad-entry-743c28ab-2e25-440c-ae91-c5d0fb24c87d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.869Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7805f80e-9b38-44d9-b0c5-e86c4dd6eca6",
      "data": {
        "Solution": "The containers in which resin.io applications are run are extremely powerful, nearly any code you run will have no idea it's not being run in the host OS. We map devices, network and persistent storage (located at `/data`) to provide applications with more than a typical container-run application would have access to. While we provide a lot of power to these applications, we disallow access to the host OS for a number of reasons:-\n\n1. A core feature of resin.io is that we keep track of your code and make it updateable. Code in the host OS obviously isn't kept inside a container so we are unable to track or update it at all.\n2. If code run in the host OS inadvertently (or otherwise :) kills our supervisor or overwrites critical data such as data used to identify it, the device could become inaccessible.\n3. Configuration of network device drivers, mount points, security provisions, and many other details have been carefully chosen to serve the resin ecosystem and your containers - code running in the host OS might interfere with this leading to issues or degradation of performance which we would likely not be able to help you with, see issue 4.\n4. When troubleshooting issues we base our assumptions on the host OS behaving as we expect it to - if you have made changes here, there's a good chance we won't be able to reproduce the issues locally and therefore won't be able to help you.\n5. The whole purpose of a container is to give you complete control over the environment your code operates in and allow you to configure it exactly as you wish - the host OS has to have things configured a certain way and is extremely minimal in what it provides to code running inside of it (enough to allow resin containers to run), why throw all of that away?\n\nIf there's something you need to do or inspect that resin.io doesn't provide you within your application container, let us know and we will do all we can to help. There is a surprisingly little that requires host OS access and very soon we hope to reduce this to virtually zero.\n\n__NOTE:__ In resinOS 2.x devices we have a read-only rootfs and will also be allowing direct hostOS from the dashboard, but at the time of writing this feature is not released yet."
      },
      "name": "Host OS",
      "slug": "scratchpad-entry-7805f80e-9b38-44d9-b0c5-e86c4dd6eca6",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.883Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7888a947-a4e4-460e-8ec7-5260941727b4",
      "data": {
        "Solution": "You can enable deltas by simply creating a fleet config variable named `RESIN_SUPERVISOR_DELTA` with its value set to `1`. The supervisor version needs to be `> 1.5.0`."
      },
      "name": "Enabling Deltas",
      "slug": "scratchpad-entry-7888a947-a4e4-460e-8ec7-5260941727b4",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.892Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c088b58b-f1ad-405d-8ff4-ee5bb56a64bf",
      "data": {
        "Problem": "User reports: I've got a device that appears healthy and is reporting online but shows no logs and terminal access.\n\nOn the device you should see the Supervisor failing to adjust OOM score, starting gosuper, etc, things that suggest lack of permissions.\n\nThe issue appears to be Docker corrupting its internal state (to be precise: forgetting the \"HostConfig\" of the Supervisor) and prevents the container from starting and running correctly.\n\nTo confirm the issue is corruption to Docker HostConfig for the supervisor, inspect the container:\n\n```\n$ docker inspect resin_supervisor\n...\n\"HostConfig\": {\n    \"Binds\": null,\n    \"ContainerIDFile\": \"\",\n    \"LogConfig\": {\n        \"Type\": \"journald\",\n        \"Config\": {}\n    },\n    \"NetworkMode\": \"default\",\n    \"PortBindings\": null,\n    \"RestartPolicy\": {\n        \"Name\": \"\",\n        \"MaximumRetryCount\": 0\n    },\n    \"AutoRemove\": false,\n    \"VolumeDriver\": \"\",\n    \"VolumesFrom\": null,\n    \"CapAdd\": null,\n    \"CapDrop\": null,\n    \"Dns\": [],\n    \"DnsOptions\": [],\n    \"DnsSearch\": [],\n    \"ExtraHosts\": null,\n    \"GroupAdd\": null,\n    \"IpcMode\": \"\",\n    \"Cgroup\": \"\",\n    \"Links\": null,\n    \"OomScoreAdj\": 0,\n    \"PidMode\": \"\",\n    \"Privileged\": false,\n    \"PublishAllPorts\": false,\n    \"ReadonlyRootfs\": false,\n    \"SecurityOpt\": null,\n    \"UTSMode\": \"\",\n    \"UsernsMode\": \"\",\n    \"ShmSize\": 0,\n    \"Runtime\": \"runc\",\n    \"ConsoleSize\": [\n        0,\n        0\n    ],\n    \"Isolation\": \"\",\n    \"CpuShares\": 0,\n    \"Memory\": 0,\n    \"NanoCpus\": 0,\n    \"CgroupParent\": \"\",\n    \"BlkioWeight\": 0,\n    \"BlkioWeightDevice\": null,\n    \"BlkioDeviceReadBps\": null,\n    \"BlkioDeviceWriteBps\": null,\n    \"BlkioDeviceReadIOps\": null,\n    \"BlkioDeviceWriteIOps\": null,\n    \"CpuPeriod\": 0,\n    \"CpuQuota\": 0,\n    \"CpuRealtimePeriod\": 0,\n    \"CpuRealtimeRuntime\": 0,\n    \"CpusetCpus\": \"\",\n    \"CpusetMems\": \"\",\n    \"Devices\": null,\n    \"DiskQuota\": 0,\n    \"KernelMemory\": 0,\n    \"MemoryReservation\": 0,\n    \"MemorySwap\": 0,\n    \"MemorySwappiness\": null,\n    \"OomKillDisable\": null,\n    \"PidsLimit\": 0,\n    \"Ulimits\": null,\n    \"CpuCount\": 0,\n    \"CpuPercent\": 0,\n    \"IOMaximumIOps\": 0,\n    \"IOMaximumBandwidth\": 0\n},\n...\n```\n\nThe HostConfig of the container should approximate the one above -- i.e. it should look like it has default values (zeros, empty arrays, etc.)\n",
        "Solution": "To fix the device,  recreate the supervisor container.\n\n```\n$ systemctl stop resin-supervisor\n$ docker rm -vf resin_supervisor\n$ systemctl start resin-supervisor\n```\n"
      },
      "name": "Device appears online but is unresponsive",
      "slug": "scratchpad-entry-c088b58b-f1ad-405d-8ff4-ee5bb56a64bf",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.230Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "86832eb1-8175-4f28-8578-1fd8d7121278",
      "data": {
        "Problem": "E.g. https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1166584613\n\n```\nSetting up apt-show-versions (0.22.4) ...\n** initializing cache. This may take a while **\nError: No information about packages! (Maybe no deb entries?)\ndpkg: error processing package apt-show-versions (--configure):\nsubprocess installed post-installation script returned error exit status 255\nErrors were encountered while processing:\napt-show-versions\nE: Sub-process /usr/bin/dpkg returned an error code (1)\nRemoving intermediate container 67817652f5ec\n```\n\n###Treatment\n\nThe issue appears to be with `apt-show-versions` not correctly handling gzipped apt indexes. The fix is to remove a configuration file which instructs apt to compress this index:\n```\nrm /etc/apt/apt.conf.d/docker-gzip-indexes\n```\n\nSo in general the Dockerfile will end up looking like:\n```\nRUN rm /etc/apt/apt.conf.d/docker-gzip-indexes\nRUN apt-get -y update \\\n    && apt-get install -y apt-show-versions <yada yada> \\\n    && rm -rf /var/lib/apt/*\n```\n\nIt's even more important than usual to remove `/var/lib/apt/*` here as without compression the index stored here will be even larger than usual."
      },
      "name": "apt-get install fails with 'Error: No information about packages! (Maybe no deb entries?)' error",
      "slug": "scratchpad-entry-86832eb1-8175-4f28-8578-1fd8d7121278",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.902Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "86a5d797-b3ce-40fd-ad98-e67d8cd6053e",
      "data": {
        "Problem": "On >=2.0.0 and <=2.2.0 devices it is possible that the containers lose networking. It can happen if the IP address  assigned to `docker0` changes. Diagnose it with `ifconfig docker0`, it should show on those versions `172.17.0.1`. If it doesn't, networking inside containers might not work. Diagnose that with `docker exec -ti resin_supervisor /bin/sh` and then `ping google.com`. If it cannot ping, then this is likely the issue (can see whether `/etc/resolv.conf` inside the container contains the same IP as `ifconfig docker0` shows)",
        "Solution": "Need to coerce docker to use the given IP address. Stop docker, start manually with the required settings, stop that, and restart the system docker. This is a full script to do that in one go:\n\n```\nsystemctl stop resin-supervisor && \\\nsystemctl stop docker && \\\n(timeout 15 /usr/bin/dockerd --log-driver=journald -s aufs --dns 172.17.0.1 --bip 172.17.0.1/24 || true ) && \\\nsystemctl start docker && \\\nsystemctl start resin-supervisor && \\\necho \"Done\"\n```\n\n(Note that `systemctl stop docker` can take a while, depending on the user application).\n\nAlso, recommend using resinOS 2.3.0+ (which does not have this potential issue)."
      },
      "name": "No network in the containers",
      "slug": "scratchpad-entry-86a5d797-b3ce-40fd-ad98-e67d8cd6053e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.905Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8d856917-25cb-4d85-aa61-4e8b05bc8cf6",
      "data": {
        "Problem": "A device appears to be stuck in the downloading state however, never completing the download successfully. Typically the device stays online throughout.\nAdditionally supervisor logs show errors like:\n```\nIncomingMessage.<anonymous> (/app/node_modules/dockerode/node_modules/docker-modem/lib/modem.js:243:9)\\n    at IncomingMessage.emit (events.js:117:20)\\n    at _stream_readable.js:944:16\\n    at process._tickCallback (node.js:448:13)\"}}\nUpdating failed, but there is already another update scheduled immediately:  [Error: 1 error: HTTP code is 500 which indicates error: server error - Invalid registry endpoint https://registry.resin.io/v1/: Get https://registry.resin.io/v1/_ping: dial tcp: i/o timeout. If this private registry supports only HTTP or HTTPS with an unknown CA certificate, please add `--insecure-registry registry.resin.io` to the daemon's arguments. In the case of HTTPS, if you have access to the registry's CA certificate, no need for the flag; simply place the CA certificate at /etc/rce/certs.d/registry.resin.io/ca.crt\n]\nEvent: Device info update failure {\"error\":{\"message\":\"getaddrinfo ENOTFOUND\",\"stack\":\"Error: getaddrinfo ENOTFOUND\\n    at errnoException (dns.js:37:11)\\n    at Object.onanswer [as oncomplete] (dns.js:124:16)\"},\"stateDiff\":{\"status\":\"Idle\"}}\nUpdating failed, but there is already another update scheduled immediately:  { [Error: getaddrinfo ENOTFOUND]\n  cause: { [Error: getaddrinfo ENOTFOUND] code: 'ENOTFOUND', errno: 'ENOTFOUND', syscall: 'getaddrinfo' },\n```\n\nOn the device itself you often notice a very slow speed when retrieving data from the web, e.g. curl'ing example.com. This is because the Google servers listed in `resolv.conf` are timing out before the local DNS is resorted to and actually functioning correctly.\n\nThe reason there are problems despite the ability to actually resolve addresses is that the slowdown is so great that docker simply fails to function correctly, rendering all docker-related tasks (like downloading a new image) completely broken.",
        "Solution": "**IMPORTANT:** This isn't the exclusive cause, as other issues have presented with similar symptoms.\nThe local network is having trouble using either `8.8.8.8` or both `8.8.8.8` and `8.8.4.4` of the Google DNS servers. This can often occur when the device is located on a restrictive network that wants to perform filtering of some kind.\n\nIt's possible to confirm the issue by very carefully adjusting `/etc/resolv.conf` and curl-ing e.g. example.com, by a process of elimination you can see which request is resolved quickly or slowly - slowly indicates a problem (see note above about why this is.)\n\nThe solution is to firstly as soon as possible, comment out the problematic google servers in `/etc/resolv.conf`. Once this initial triage is performed, go ahead and edit `config.json` (typically in `/mnt/conf` in the host OS) and remove the `NameServers=` line from all network configurations to force use of the local DNS server only.\n\nThe user can be advised as to how to do this remotely for devices that need it, see [this intercom conversation](https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1730803796) for more details on that."
      },
      "name": "Download starting/stopping loops over and over, never completing",
      "slug": "scratchpad-entry-8d856917-25cb-4d85-aa61-4e8b05bc8cf6",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.920Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8ea00777-c426-4dbd-b399-6b1eef7d0945",
      "data": {
        "Problem": "1) Time on the device is inaccurate, usually first noticed in logs, but can be confirmed using `date` command on the host OS.\n2) Confirm using `journalctl -u systemd-timesyncd`, looking for `Stopped Network Time Synchronisation` as the final entry.",
        "Solution": "* ssh into the host OS.\n* `systemctl restart systemd-timesyncd` to start the service on the host OS.\n* `date` to confirm that the correct time has been applied.\n* `docker ps` to find the name of running containers.\n* `docker exec <container> date` to confirm that the time has propagated.\n"
      },
      "name": "NTP service stopped",
      "slug": "scratchpad-entry-8ea00777-c426-4dbd-b399-6b1eef7d0945",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.922Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8ed466ef-61f6-43cd-9222-e0b437a5b382",
      "data": {
        "Solution": "the `/data/` is specific to a given app, so if you move the device back to the other app you'll find /data/ is there for that app again.  The reason for this is that if you move devices between applications running different code then keeping `/data/` from the other would potentially cause issues, there are plans to add the option to purge `/data/` on move (so it will be gone on moving back, without having to purge before moving), as well as the option to transfer the data across."
      },
      "name": "Why does /data disappear when I move a device between applications?",
      "slug": "scratchpad-entry-8ed466ef-61f6-43cd-9222-e0b437a5b382",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.925Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8f4a4475-b586-4f8b-9d03-4881267ba3ac",
      "data": {
        "Problem": "Users sometimes ask us to change wifi settings on a production device (maybe even remote device). Should direct them to [our docs](https://docs.resin.io/deployment/network/2.0.0/#changing-the-network-at-runtime) where there's some scripts to do it as self-service using NetworkManager over dbus using Python. But that's not always an option, and if we need to change network settings, it's good to know how.",
        "Solution": "Log into the device. The rest of the work will be through `nmcli`, the NetworkManager command line interface (see more in [their docs](https://developer.gnome.org/NetworkManager/stable/nmcli.html):\n\n* run `nmcli` on its own to show all interfaces and what connections they have, or `nmcli c` for a connection summary, where all connection files known to NM are listed, with the connected ones highlighted\n* If there's already a wifi interface, the best is to clone it into a new one:\n\n```\nnmcli c clone resin-wifi resin-wifi2\nnmcli c modify resin-wifi2 wifi.ssid NEWSSID wifi-sec.psk NEWPASSWORD\n```\nThis will set up a new connection. You can use `nmcli c up resin-wifi2` to try to connect to it then (will likely break you current connection, if everything goes well). If need to remove old connections, don't forget not just removing with `nmcli c delete <CONNECTIONNAME>`, but also from `/mnt/boot/system-connections` too, otherwise it will be copied back from there on the next boot."
      },
      "name": "Changing Wifi credentials on a 2.x device",
      "slug": "scratchpad-entry-8f4a4475-b586-4f8b-9d03-4881267ba3ac",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.930Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8f6eb978-a9dd-4e86-ad55-2302869aad80",
      "data": {
        "Solution": "Under severe conditions, you may have issues with the `resin-data` partition\nfailing to mount, with errors like `BTRFS: open_ctree failed` appearing in `dmesg` indicating that the btrfs\nsuperblock has a bad checksum.\n\nFirst it's worth attempting to repair the corruption via:\n\n```bash\nbtrfs check --repair /dev/disk/by-label/resin-data\n```\n\nYou may need to run this multiple times before it succeeds.\n\nIf this does not fix the issue, you may need to go ahead and nuke the device\nfrom orbit - see the [remote reprovisioning][nuke] section from the scratch pad\nfor details.\n\n[faq-free-space]:https://btrfs.wiki.kernel.org/index.php/FAQ#How_much_free_space_do_I_have.3F\n[nuke]:https://github.com/resin-io/hq/wiki/Scratch-Pad#remotely-reprovisioning-ie-nuking-a-device\n[docker-btrfs-practice]:https://docs.docker.com/engine/userguide/storagedriver/btrfs-driver/"
      },
      "name": "Fix Superblock Corruption",
      "slug": "scratchpad-entry-8f6eb978-a9dd-4e86-ad55-2302869aad80",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.936Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8fdfe926-476c-471b-bb80-f793f1830694",
      "data": {
        "Solution": "This is possible using the resin CLI (see [this thread](https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1194504367) for discussion.) Assuming you already have NodeJS installed in your computer, install the CLI using:\n```\n    $ npm install -g resin-cli # might need sudo depending on the environment\n```\nThen login:\n```\n    $ resin login\n```\nThen to download a device image, configure it and burn it to an sd card (make sure the sd card is plugged into your computer before you run this command), run:\n```\n    $ sudo resin device init --application <application name>\n```\n\nGoing forward you can re-use this command to initialise a device for a new application of the same device type without having to redownload the image.\nThe images are stored in `~/.resin/cache`, and remain cached for a week."
      },
      "name": "Using the same application image for multiple applications",
      "slug": "scratchpad-entry-8fdfe926-476c-471b-bb80-f793f1830694",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.939Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "93f88884-2bdf-4f27-8e37-a732d3853fe1",
      "data": {
        "Solution": "System configuration of the Raspberry Pi is determined by `/boot/config.txt`. We don't expose this directly from the container itself, however you can access it on the SD card directly in the FAT boot partition (TODO: Label?)"
      },
      "name": "Raspberry Pi",
      "slug": "scratchpad-entry-93f88884-2bdf-4f27-8e37-a732d3853fe1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.960Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "94a8c95f-b179-4309-a242-dcee9d9a7fdd",
      "data": {
        "Problem": "There are some cases, when it is desirable to reprovision a device while it is online, e.g. to change the device's UUID or owner or other things. This is a pretty drastic measure, but came up a few times (mostly in connection with Disruptive Technologies), so taking some notes on how to do that.",
        "Solution": "To reprovision a device, follow these steps below. They are not necessarily all the steps required, or more than needed for a specific case, so adjust it as necessary!\n\nLog in to resin cli with the target user's credentials (probably token).\n\nBest is to generate a new device/UUID at the start:\n\n```\nresin device register ${APPLICATION}\n```\nThis by default gives the old, long UUID (at the time of this writing), and if that's not acceptable, then generate a 16-byte UUID with:\n```\nopenssl rand -hex 16\n```\nand then\n```\nresin device register ${APPLICATION} --uuid ${NEW_UUID}\n```\n\nThis creates the new device, that you can check in the dashboard, where you can, optionally:\n\n* recreate all the Environment Variables from the old device\n* recreate all the Configuration Variables from the old device\n\nYou can also optionally set the release of the device if pinned (using [`staged-releases`](https://github.com/resin-io-playground/staged-releases) (also optional).\n\nTo check the currently set release, you can for example run:\n\n```\ncurl \"https://api.resin.io/v1/device?\\$filter=uuid%20eq%20'${OLD_UUID}'\" \\\n-H \"Content-Type: application/json\" \\\n-H \"Authorization: Bearer ${TOKEN}\" |jq '.d[0].commit'\n```\n\nGenerate a new `config.json` with something like:\n\n```\nresin config generate --device ${NEW_UUID} --output ${NEW_UUID}.config.json\n```\n\nSSH into the device, and run through the followign steps:\n\n* Stopping the supervisor\n* Removing the running containers\n* Removing supervisor database\n* Resetting the state partiton\n\nYou can do this by:\n```\nsystemctl stop resin-supervisor\nbalena rm -f $(balena ps -a -q)\nrm /mnt/data/resin-data/resin-supervisor/database.sqlite\nrm /mnt/state/remove_me_to_reset\n```\n(or replace `balena` with `docker` above, if it's a resinOS <2.9.0 device)\n\nFinally, the main thing, replacing the old `config.json` with the new one. Copy `${NEW_UUID}.config.json` onto the device and move it to `/mnt/boot/config.json`\n\nCheck all these changes (that the `config.json` has the expected values, that the changes above were successfully applied, etc), and when satisfied, reboot the device.\n\nIt should come online with the new UUID, and no application download should happen (the device should have all the things it needs).\n"
      },
      "name": "Remote reprovisioning a device",
      "slug": "scratchpad-entry-94a8c95f-b179-4309-a242-dcee9d9a7fdd",
      "tags": [
        "hard"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.965Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "95b9ec2d-9119-4a0a-a843-aef0d7a399f7",
      "data": {
        "Solution": "That's a feature we're currently working on. I don't have information on when it'll be available, but there are some experimental ways of doing this using docker in docker. Here are a couple of projects that are using on this method:\n\n* https://github.com/abresas/multi-container\n* https://github.com/pcarranzav/resin-aerofs\n* https://github.com/pcarranzav/resin-kubernetes\n\nYou might also want to check a blog post we have on this topic: https://resin.io/engineering/our-first-experiments-with-multi-container-apps/"
      },
      "name": "Multi-container apps",
      "slug": "scratchpad-entry-95b9ec2d-9119-4a0a-a843-aef0d7a399f7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.977Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9d028ef7-7b26-4bad-bfba-0e40f0e077f5",
      "data": {
        "Problem": "A typo in update-resin-supervisor makes it unable to pull a supervisor based on API response, as the API call is done incorrectly using the device API key.",
        "Solution": "\n\nUse the update-resin-supervisor from the fixed version, after the new version was tagged in the API, log into the device and run:\n```\ncurl -o /tmp/update-resin-supervisor https://raw.githubusercontent.com/resin-os/meta-resin/v2.7.0/meta-resin-common/recipes-containers/docker-disk/docker-resin-supervisor-disk/update-resin-supervisor\nbash /tmp/update-resin-supervisor\n```"
      },
      "name": "update-resin-supervisor does not run properly by itself",
      "slug": "scratchpad-entry-9d028ef7-7b26-4bad-bfba-0e40f0e077f5",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.983Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9f522154-e628-451b-9826-4e32d6abdabe",
      "data": {
        "Solution": "See [this intercom thread](https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1142657594) for more details on the user issue that provoked this need.\nTo activate this execute the following list of `connmanctl` commands:\n\n```\nscan wifi\nservices (parse output to get id for our ssid)\nagent on\nconnect <service-id>\n[enter passphrase]\n```"
      },
      "name": "Setting SSID and passphrase via connmanctl",
      "slug": "scratchpad-entry-9f522154-e628-451b-9826-4e32d6abdabe",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.994Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9fa94cff-e53e-4a0b-ba8c-35160ec09cf0",
      "data": {
        "Problem": "After moving applications, the supervisor is downloading the new application image, but it also trying to repot the deletion of the old. That doesn't work, because after the move the device doesn't have access to the old image's info anymore, resulting in supervisor logs like:\n\n```\n[2018-10-05T04:26:33.930Z] Event: Device state report failure {\"error\":{\"message\":\"Unauthorized\"}}\n[2018-10-05T04:26:43.215Z] Event: Device state report failure {\"error\":{\"message\":\"Unauthorized\"}}\n[2018-10-05T04:26:56.025Z] Event: Device state report failure {\"error\":{\"message\":\"Unauthorized\"}}\n...\n```\n\nIf it happens near the start of the device uptime, the supervisor might not ever get marked healthy, and thus get killed, resulting in a download loop. ",
        "Solution": "Go into the host OS, stop the supervisor, remove the previous application image with `balena rmi` (keep the supervisor image!!!), and restart the supervisor."
      },
      "name": "Device in download loop after moving applications",
      "slug": "scratchpad-entry-9fa94cff-e53e-4a0b-ba8c-35160ec09cf0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.001Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a4404646-96b4-408a-81ca-cfe8b11f99ea",
      "data": {
        "Problem": "Users may want to know where resin.io fits in, an indicative question from this conversation (https://app.frontapp.com/open/cnv_v1k8nv) is:\n\n```\nI am new to resinio and read about it on internet. Could you please help with the queries below There are a lot of IoT infrastructure solutions available and am not sure where does resin.io fits in.\n\n- Is resin.io only for IoT end device or can it be used for edge device?\n- How is resinio better than azure IoT or Aws IoT\n- Since there are a lot of solutions, how to know which is better, do you have a comparison sheet.\n```",
        "Solution": "This is a reference answer from Alison - see full conversation here - https://app.frontapp.com/open/cnv_v1k8nv\n\n```\nResin.io helps you remotely develop, deploy, and manage software on your IoT devices - at scale. Think of us as the infrastructure that enables you to easily build and deploy code at the edge. We take care of all the hard problems so you can focus on your projects and applications.\n\nWe've taken cloud-native development and deployment workflows and adapted them for the unique constraints of the edge. We use containers as the mechanism for deploying code, and have adapted Docker for IoT (you can read more about why we think containers matter for IoT here).\n\nWe primarily support Linux-capable devices (some might call them \"gateways,\" though most of our customers actually use those as their main edge device), though we've been developing a feature to allow remote updating of microcontrollers via a resin-managed gateway - more soon!\n\nSince we're fairly agnostic about what software you run in the containers on your device, and where you choose to send / analyze any data you collect, we actually integrate quite nicely with cloud providers such as Azure IoT, AWS IoT, Google IoT, etc.\n\nHope that helps - let us know if you have any follow up questions!\n\n```"
      },
      "name": "User wants to know how resin.io compares with other solutions",
      "slug": "scratchpad-entry-a4404646-96b4-408a-81ca-cfe8b11f99ea",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.023Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a8eb38d9-d990-4ead-b0c5-c19d16843cd2",
      "data": {
        "Solution": "It's usually not necessarily to forward ports within the container (in the way you would with a `docker run -p [host port]:[container port]` command), however if you do need to do this, it can be achieved with `iptables`.\n\nFor example, mapping port 80 to 8080 can be achieved with the following:-\n```\niptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080\n```"
      },
      "name": "Forwarding Ports",
      "slug": "scratchpad-entry-a8eb38d9-d990-4ead-b0c5-c19d16843cd2",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.032Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a966b0d5-ed16-4782-907b-76d9015a9de1",
      "data": {
        "Solution": "#### raspberry-pi\nAdd:\n```\ndtoverlay=w1-gpio\n```\nto `/boot/config.txt`\nSee https://resin.io/blog/updating-config-txt-remotely/ on how to do that.\n\nThe container should also `modprobe w1-gpio && modprobe w1-therm`. Then the temperature probe should show up under `/sys/bus/w1/devices`"
      },
      "name": "How to use Raspberry Pi one-wire temperature sensor",
      "slug": "scratchpad-entry-a966b0d5-ed16-4782-907b-76d9015a9de1",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.041Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "aebc15ca-19a4-4003-be15-a603830f50c1",
      "data": {
        "Solution": "__NOTE:__ This only applies to resinOS 1.x devices (since it uses btrfs), **do not apply to resinOS 2.x devices**\n__NOTE:__ Check the below 'Fixing failure to mount resin-data partition' tip\n\n#### Updated Remote Reprovision Instructions\nIf dmesg shows:\n```\n[1457340.910669] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n[1457341.923549] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n[1457342.936517] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n[1457343.948401] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n[1457344.960486] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n[1457345.983949] BTRFS warning (device mmcblk0p6): csum failed ino 40931 off 0 csum 3454425842 expected csum 4290359512\n```\n\nRemote nuke of btrfs:\n1. Note down the supervisor docker image name and tag\n`docker images`\n```\nroot@raspberrypi3:~# docker images\nREPOSITORY                 TAG                 IMAGE ID            CREATED             SIZE\nresin/armv7hf-supervisor   latest              f473e316acb9        9 weeks ago         62.07 MB\nresin/armv7hf-supervisor   v2.7.1              f473e316acb9        9 weeks ago         62.07 MB\n```\n\n1. Unmount the data partition:\n`systemctl stop mnt-data.mount`\n\n2. Recreate the btrfs partition with the required label, replace `DATA_PARTITION` with something like `mmcblk0p6`:\n\n```\nexport DATA_PARTITION=mmcblk0p6\nmkfs.btrfs --mixed --metadata=single --label resin-data --force /dev/${DATA_PARTITION}\n```\n\n3. reboot the device:\n`reboot`\n\n4. Pull the correct supervisor version, that is now given by the API, so whatever supervisor version the device was set for. Replace `armv7hf` with the correct architecture if necessary. The pull is from the legacy registry for 1.x devices nowawadays:\n\n```\nupdate-resin-supervisor -i registry.resinstaging.io/resin/armv7hf-supervisor\n```\n\n**[below are LEGACY instructions]**\nNote the below instructions are currently only for rpi/rpi2. I am not sure on the status of supervisor versions for other devices, plus the below may even be out of date by the time you try this, **check with colleagues to make sure this is the appropriate supervisor to pull.**\n\n* Determine which block device contains the main BTRFS data partition - if the partition is still mounted, run `mount | grep /mnt/data` to determine this. If it is not mounted, logs should indicate the correct device, or you can run `lsblk` and the device with the largest listed space will be the one in question. The naming will be something like `/dev/mmcblk0p6`.\n* Now you know the device, unmount it (if mounted), create the btrfs filesystem, label it correctly and reboot the device:\n\n```Bash\nexport PARTITION=/dev/mmcblk0p6\numount ${PARTITION}\n# might need wait a bit for umount to finish\nmkfs.btrfs --mixed --metadata=single --force ${PARTITION}\nbtrfs filesystem label ${PARTITION} resin-data\nreboot\n```\n* After reboot, you will need to pull a new instance of the supervisor.\n\nNOTE: Update the tag accordingly. **Match the existing version of the supervisor**. It may risk issues if the host OS doesn't support features assumed to exist by a new supervisor. From supervisor 1.4.0 on we publish versions to the staging registry, older versions however are not guaranteed to be present. A member of the supervisor or infrastructure team might be able to push a required version there if necessary.\n\n```\nexport SUPERVISOR=v1.8.0\n```\nIf the device is an RPi:\n```\nrce pull registry.resinstaging.io/resin/rpi-supervisor:${SUPERVISOR}\nrce tag registry.resinstaging.io/resin/rpi-supervisor:${SUPERVISOR} resin/rpi-supervisor:latest\n```\nIf the device is an RPi2/RPi3:\n```\nrce pull registry.resinstaging.io/resin/armv7hf-supervisor:${SUPERVISOR}\nrce tag registry.resinstaging.io/resin/armv7hf-supervisor:${SUPERVISOR} resin/armv7hf-supervisor:latest\n```\n* Finally start the supervisor:\n```\nsystemctl start resin-supervisor\n```\n**[End of LEGACY instructions]**"
      },
      "name": "Remotely reprovisioning (i.e. nuking) a device",
      "slug": "scratchpad-entry-aebc15ca-19a4-4003-be15-a603830f50c1",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.054Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "aeed529b-6da2-415f-9d95-ea666c0c6a85",
      "data": {
        "Solution": "This issue results in no updates being downloaded despite the application having had code pushed to it. In the logs at `/var/log/supervisor-log/resin_supervisor_stdout.log` you'll see:-\n```\nEvent: Device bootstrap failed, retrying {\"error\":{\"message\":\"\\\"uuid\\\" must be unique.\",\"stack\":\"Error: \\\"uuid\\\" must be unique.\\n    at /app/node_modules/pinejs-client/request.js:91:17\\n    at tryCatcher (/app/node_modules/bluebird/js/main/util.js:24:31)\\n    at Promise._settlePromiseFromHandler (/app/node_modules/bluebird/js/main/promise.js:452:31)\\n    at Promise._settlePromiseAt (/app/node_modules/bluebird/js/main/promise.js:530:18)\\n    at Promise._settlePromises\n```\nTo fix, edit `/mnt/data-disk/config.json` and add the following property to the top-level of the json:-\n```\n\"registered_at\": 0\n```\nFinally, restart the supervisor:-\n```\nrce restart resin_supervisor\n```"
      },
      "name": "Fixing the Bash/Node Race",
      "slug": "scratchpad-entry-aeed529b-6da2-415f-9d95-ea666c0c6a85",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.066Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "af03b771-d699-4e1f-9551-1a19879ba480",
      "data": {
        "Problem": "1. Appears online, but device is Idle.\n2. Application commit hash vs. device commit hash doesn't change over an extended period of time - no updates.\n3. If IP addresses are listed for the device it's not RES-233, as the device would have to be registered for this to happen. The cause is likely #2.\n4. The VPN address being incorrect (or more than one VPN address) is a sure indicator of a broken supervisor and indicates #2.",
        "Solution": "There are 2 possible causes encountered so far -\n\n1. The device is failing to register correctly, probably due to the UUID not being correctly written to config.json. This has been fixed in later versions of resinOS.\n\nThe solution here is to SSH into the device, edit the `config.json` and set our own UUID then restart the supervisor. A device reboot might also do it, but that's not confirmed. See below for detailed instructions!\n\n2. The device is having trouble running the supervisor, quite possibly due to running out of memory.\n\nThe solution here is to either have the user power-cycle or SSH in and kill the `rce` (resinOS < 1.2) or `docker` (resinOS >= 1.2) process, first ensuring that it is indeed using significant amounts of memory. The OOM killer may do the job for you (smile)"
      },
      "name": "Device appears online but not updating",
      "slug": "scratchpad-entry-af03b771-d699-4e1f-9551-1a19879ba480",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.078Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b0edb235-1a4d-4bde-921a-edda09b5dbf0",
      "data": {
        "Problem": "The error `Conflict. The name \"/resin_supervisor\" is already in use by container` can happen when docker removed the name from its layerdb without actually removing the layers. You can't remove the container because it said no container existed with that name, and you can't start one with that name because it says it already exist.",
        "Solution": "Make sure that the user's app container is running and supervisor is indeed dead.\n\n```\n$ docker ps -a\n```\n\nIf the above command says for the supervisor STATUS is \"Removal In Progress\" and it has been like this for a sensible while, then you have the bug https://github.com/docker/docker/issues/22312 . To fix this, stop docker, stop resin-supervisor, delete the supervisor container, start docker, start resin-supervisor:\n\n```\n# systemctl stop docker\n# systemctl stop resin-supervisor\n# rm -r /var/lib/docker/containers/<CONTAINER ID as reported by \"docker ps -a\">\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\nor here's a complete script that you can copy-paste and run inside the hostOS to automate this:\n\n```\nCONTAINER=$(docker ps -a --no-trunc | grep Removal |  grep resin_supervisor | awk '{ print $1 }')\nif [ ! -z \"$CONTAINER\" ]; then\necho \"Found removal in progress supervisor: ${CONTAINER}\";\n systemctl stop resin-supervisor\n systemctl stop docker\n rm -r /var/lib/docker/containers/${CONTAINER}\n systemctl start docker\n systemctl start resin-supervisor\nfi\n```\n\nAfter this, the supervisor container should start correctly. If not, read below for other info if any, it means you are not this lucky :)\n\n**Either way, make sure to convey to the user that they should upgrade resinOS to at least 1.26**, otherwise the issue is likely to happen again. Here's a nice snippet to use:\n>We have issued a fix for this particular bug in resinOS 1.26, so if you wish to avoid this issue in the future, you can upgrade this device to resinOS 1.26. This can be done by navigating to the devices \"Actions\" page and clicking on the action that says \"ResinOS Update\", this will give you an interactive prompt and you can select resinOS 1.26 from the list.\n\nCheck journalctl for the error:\n\n```\n# journalctl -u resin-supervisor -n20\nNov 09 18:58:25 raspberrypi3 systemd[1]: Started Resin supervisor.\nNov 09 18:58:25 raspberrypi3 bash[1353]: docker: Error response from daemon: Conflict. The name \"/resin_supervisor\" is already in use by container 2055f64ab1fc2526fc383e5daeb0ee76717d427d3585af7a24ba13f6800cbd41. You have to remove (or rename) that container to be able to reus\ne that name..\nNov 09 18:58:25 raspberrypi3 bash[1353]: See '/usr/bin/docker run --help'.\nNov 09 18:58:25 raspberrypi3 systemd[1]: [[1;39mresin-supervisor.service: Main process exited, code=exited, status=125/n/a[[0m\nNov 09 18:58:26 raspberrypi3 docker[1384]: Failed to stop container (resin_supervisor): Error response from daemon: No such container: resin_supervisor\nNov 09 18:58:27 raspberrypi3 docker[1394]: Failed to remove container (resin_supervisor): Error response from daemon: No such container: resin_supervisor\n```\n\nFirst, try restarting Docker:\n\n```\n# systemctl stop docker\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\n__IMPORTANT__ `systemctl restart docker` does **NOT** work.\n\nSee if that fixes the issue (give 30 or more seconds to the supervisor to start up):\n\n```\n# docker ps -a | grep resin_supervisor\n911d82302435  resin/armv7hf-supervisor  \"/sbin/init\"  46 minutes ago  Up 46 minutes  resin_supervisor\n```\n\nIf that didn't work, stop services, unmount Docker filesystem, mount again and start services:\n\n```\n# systemctl stop docker\n# systemctl stop var-lib-docker.mount\n# systemctl start var-lib-docker.mount\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\nIf that still didn't work, ask the user to reboot the device. Remember to disconnect from the device before the reboot.\n\nIf that still didn't work, ping Petros, it's his kind of thing :)"
      },
      "name": "The name \"/resin_supervisor\" is already in use by container`",
      "slug": "scratchpad-entry-b0edb235-1a4d-4bde-921a-edda09b5dbf0",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.094Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b261abeb-b270-46be-8606-5aa5d51f4dfd",
      "data": {
        "Solution": "If we see these logs on the dashboard:\n```\n* start-stop-daemon: caught an interrupt\n* start-stop-daemon: /etc/resinApp.sh died\n```\nor\n```\nstart-stop-daemon: /etc/resinApp.sh is already running\n```\n\nWe should look at what the user has in the CMD instruction to investigate the issue. With OpenRC, the same as systemd, we put user CMD instruction in /etc/resinApp.sh and run it as an OpenRC service. On init, OpenRC will execute the script (and store the PID at /var/run/resinapp.pid). When user restarts the service, OpenRC will stop the process with that PID and start the script again. These logs indicate something is wrong when OpenRC executes or kills `/etc/resinApp.sh` so we should start investigating from its content."
      },
      "name": "Start-stop-daemon unable to start resin service on Alpine Linux base images",
      "slug": "scratchpad-entry-b261abeb-b270-46be-8606-5aa5d51f4dfd",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.103Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b462e457-e105-45b8-84c7-c1a9df601b7a",
      "data": {
        "Solution": "__NOTE:__ ARM native builders have been deprecated.\n\nSorry that you have encountered this issue. This is part of a problem that exists between qemu and git, due to git relying upon some fairly exotic system call mechanics which confuse qemu. This results in sporadic issues with git operations in this environment, which is what we use to run ARM binaries on the build servers while building your image. Recently we've gone to the lengths of patching qemu to work around the problem, in fact twice, but regardless of local testing it seems there are many iterations of the issue which make it more difficult than we anticipated. We are now actively looking at different approaches to the problem, and are working to resolve this as soon as we can. I've added you to our notification list and we'll notify you as soon as we have a fix production.\n\nIn the meantime, I recommend simply editing your Dockerfile to avoid the git clone. One fairly straightforward method is to simply retrieve the code using the packaged-up release from github, e.g.:\n```\nRUN wget --output-document=subg_rfspy.tar.gz https://github.com/ps2/subg_rfspy/archive/v0.6-1-g28d741f-1-g02f7164.tar.gz\nRUN mkdir subg_rfspy && tar --strip 1 --directory subg_rfspy -xf subg_rfspy.tar.gz\n```\nThis can be slotted in to replace the git clone line.Alternatively, you can try our native arm servers by running:\n```\ngit push resin master:master-arm\n```\nHowever I must warn you that we've been having issues with our ARM server providers which might result in issues, which is why I prefer a solution of avoiding git clone if possible."
      },
      "name": "User wants to git clone from Github, but build keeps hanging",
      "slug": "scratchpad-entry-b462e457-e105-45b8-84c7-c1a9df601b7a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.117Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b6d4594e-4a3b-460f-922b-b7b8c6938cdd",
      "data": {
        "Solution": "There are 2 ways of doing this, both of them result in disabling tty-replacement .service on the hostOS. The difference between them is that one is done remotely and one is done manually with access to the device's SD card.\n\nIf you are inside a running hostOS just run: systemctl disable tty-replacement.service or `rm /etc/systemd/system/multi-user.wants/tty-replacement.service`\n\nIf you have the SD card mounted on a machine just run: `rm /mnt/resin-root/etc/systemd/system/multi-user.wants/tty-replacement.service` (please replace the /mnt/resin-root with your actual mount point for resin-root)\n\n#### Fixing serial console for raspberrypi3\n\n1. (Required only for pre-1.1.4 hostOS) Inside cmdline.txt (found in boot partition) modify console=ttyAMA0,115200 to console=S0,115200.\n2. Inside config.txt (found in boot partition) and set core_freq=250"
      },
      "name": "Disabling tty-replacement (i.e. what is spawned instead of getty in production images)",
      "slug": "scratchpad-entry-b6d4594e-4a3b-460f-922b-b7b8c6938cdd",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.145Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ba412cb0-6856-491e-b863-9b6f04bca5f3",
      "data": {
        "Problem": "The build fails when `pip` tries to uninstall existing packages during pip install.",
        "Solution": "The reason for this is an issue with overlay storage from Docker. Detail here: https://github.com/docker/docker/issues/12327.\nThere is a workaround here by adding `--ignore-installed` to `pip install` commands to make sure it won't uninstall existing packages which are not in the same layer.\nAnother workaround is: take everything to one layer only by executing all pip commands under single `RUN` command in Dockerfile."
      },
      "name": "Build fails because of pip install",
      "slug": "scratchpad-entry-ba412cb0-6856-491e-b863-9b6f04bca5f3",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.167Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "bc9fc90b-571f-419c-b908-5409fd0bbc8f",
      "data": {
        "Problem": "Data can't be written to the filesystem, only read.\n###Treatment\nThis appears be down to how often the kernel tries to reclaim memory used for the VFS cache. If so, there's a way to hotfix this on an device, using the repo at https://github.com/resin-os/resinos-fixes Simply clone, make sure you've followed the details on how to SSH into a user device (you'll need to be added to the admin access list), and then from your host run:\n```\n./run-fix.sh -f fix-mmc-bbb -u <deviceId> -s resin\n```\nThis will reduce the chance of this occurring again on the device. If the fix is applied then the device rebooted, the device should hopefully not get into this state again. If reboot doesn't fix the situation and the FS is corrupted, then a re-provision of the device will be required. As Lorenzo noted, 'Think of this as a vaccine rather than a cure'."
      },
      "name": "Beaglebone goes into 'read only' filesystem mode",
      "slug": "scratchpad-entry-bc9fc90b-571f-419c-b908-5409fd0bbc8f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.202Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "bd0c275c-4501-457f-ae92-f16d0103bb87",
      "data": {
        "Problem": "Line endings differ between windows and the unix-y world (they used to be different again for mac but not for many years), which can result in issues. E.g. a user seeing something like: `/usr/src/app/run.sh: line 2: $'\r': command not found`",
        "Solution": "To resolve this, the user needs to configure git to auto convert line endings. Point them at https://help.github.com/articles/dealing-with-line-endings/#platform-windows."
      },
      "name": "Issues with Line Endings",
      "slug": "scratchpad-entry-bd0c275c-4501-457f-ae92-f16d0103bb87",
      "tags": [
        "hard"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.211Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c5c48175-f157-4a61-bbe3-fb0486b7c9bf",
      "data": {
        "Problem": "We need a source of truth to track resinOS/supervisor compatibility, for cases where a supervisor must be updated independently of the resinOS",
        "Solution": "<table>\n    <tr>\n        <td> resinOS version </td>\n        <td> Most recent compatible Supervisor version </td>\n    </tr>\n    <tr>\n        <td> <2.12.0 </td>\n        <td> Latest 6.x version</td>\n    </tr>\n    <tr>\n        <td> >=2.12.0 </td>\n        <td> Need to check with the active supervisor maintainer </td>\n    </tr>\n</table>"
      },
      "name": "Supervisor / resinOS compatibility matrix",
      "slug": "scratchpad-entry-c5c48175-f157-4a61-bbe3-fb0486b7c9bf",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.245Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c666a43f-f4a7-4d22-9ef1-7cd5d91106c1",
      "data": {
        "Solution": "* As well as any other actions, ping @floion and remind him of this thread https://app.frontapp.com/open/cnv_guvi6h\n\nA response from Petros on this issue:\n```\nFirst with the good news, your device is up and running again. We did a thorough investigation on the device and found that the reason it was getting filesystem errors was due to the eMMC subsystem being unable to fulfil read/write requests coming from the filesystem. And the reason the eMMC subsystem was failing was because it couldn't allocate memory, and the reason it couldn't allocate memory was due to memory fragmentation. This was indicated by dmesg logs like the following..\n    [ 3511.434696] edma 49000000.edma: edma_prep_slave_sg: Failed to allocate a descriptor\n    [ 3511.442410] omap_hsmmc 481d8000.mmc: prep_slave_sg() failed\n    [ 3511.448149] omap_hsmmc 481d8000.mmc: MMC start dma failure\n    [ 3511.922619] mmcblk0: unknown error -1 sending read/write command, card status 0x900\n    [ 3511.930544] blk_update_request: 1839 callbacks suppressed\n    [ 3511.936050] blk_update_request: I/O error, dev mmcblk0, sector 6357616\n..and it was further verified by inspecting /proc/buddyinfo.\nThis issue seems to be happening at least since 2011[1] on beaglebones and keeps happening even with new kernels[2]. The suggested workaround in most threads was to set the sysctl parameter vm.min_free_kbytes to 8192[3]. This causes the kernel to more aggressively reclaim memory and reduce fragmentation. However, this didn't help and we were still hitting the problem on your device.\nThe issue was fixed by increasing vm.min_free_kbytes to 65536. Your device has this setting persisted in its rootfs so it will be using this value even after reboot. We've also notified a member of our team that has much more experience on the kernel's memory subsystem to look into it. This setting seems like something we should add to our images, but we need to make sure it doesn't have other negative side effects.\nWe should keep an eye on this device to see how it performs with this kernel tweak in the following days.\n[1] https://bugs.launchpad.net/ubuntu/+source/linux-ti-omap4/+bug/746137\n[2] https://groups.google.com/forum/#!topic/beagleboard/tdCUVMicDrk\n[3] http://www.keypressure.com/blog/yay-fedora-23-on-beaglebone-black/\n```\n\n#### Try the following to fix:\nadd the following contents in `/etc/sysctl.d/fix-mmc-bbb.conf`\n```\nvm.min_free_kbytes=8192\nvm.dirty_ratio=5\nvm.dirty_background_ratio=10\n```\nThen reboot the device. If that does not work, you will need to remotely nuke data partition of device. See details earlier in the page."
      },
      "name": "Beaglebone Filesystem becomes Read-only:",
      "slug": "scratchpad-entry-c666a43f-f4a7-4d22-9ef1-7cd5d91106c1",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.258Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c6fdff2f-1ef8-425d-acd6-c5d67bf31c02",
      "data": {
        "Problem": "The device downloaded a new user application image, but cannot start it, and the logs have such errors in there:\n\n```\njson: { message: 'Cannot update container cd592947b048c56658dcfdbb0a5b8b2cddfe5d43d1a9a0c0c22bd92c3cd188d5: rpc error: code = Unknown desc = failed to write a *:* rwm to devices.allow: write /sys/fs/cgroup/devices/docker/cd592947b048c56658dcfdbb0a5b8b2cddfe5d43d1a9a0c0c22bd92c3cd188d5/devices.allow: invalid argument\\n' } }\n```",
        "Solution": "The fix is recreating the user container (stop the supervisor, remove containers, and restart the supervisor):\n\n```\nsystemctl stop resin-supervisor && balena rm -f $(balena ps -a -q) && systemctl restart resin-supervisor\n```"
      },
      "name": "User application 100% downloaded but then not started and \"... devices.allow: invalid argument\" error in logs",
      "slug": "scratchpad-entry-c6fdff2f-1ef8-425d-acd6-c5d67bf31c02",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.265Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c8586289-bbf5-449f-a27a-3a4b9246a04f",
      "data": {
        "Solution": "You can do this by Base64 encoding the file you want to use and using this value for either an Application or Device specific environment variable. This will need to be decoded by a startup script for you application. We are planning on supporting environment files in the future."
      },
      "name": "User wants to set a file as an Environment Variable",
      "slug": "scratchpad-entry-c8586289-bbf5-449f-a27a-3a4b9246a04f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.293Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "aba1748b-6088-4b9e-b701-b803c9add8ca",
      "data": {
        "Solution": "**About the issue:** http://superuser.com/questions/539287/swapon-failed-invalid-argument-on-a-linux-system-with-btrfs-filesystem\n**Workaround:** map the file to a loop device\nSo here are the steps to workaround it on BTRFS (tested on your container):\n* dd if=/dev/zero of=/swapfile bs=1024 count=1048576\n* losetup -f /swapfile\n* losetup (check assigned loop device - next commands assumes loop0)\n* mkswap /dev/loop0\n* swapon /dev/loop0\n* free -m (check output)\n__Important:__ This will result in severely degraded swap performance, see https://wiki.archlinux.org/index.php/swap#Swap_file"
      },
      "name": "(can't) Swap on BTRFS",
      "slug": "scratchpad-entry-can-t-wap-on-b625476f-edd4-4aad-9594-72ce3bf6f134",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.301Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "d4f5ebbd-44f2-40fe-af10-e5c36ac5782b",
      "data": {
        "Problem": "We don't guarantee that resin git remotes will remain up to date or persisted. They are provided primarily as a convenient caching feature for faster pushes. If a user expects the code in their git remote to be up to date (or even present; we may flush their repo), they may inquire as to why their content is gone.\n\nAdditionally, historically we haven't made it clear in our documentation that this is the case, so there may be confusion.\n\nIn practice, the repos are only cleared through some sort of incident on our side. The first such major incident occurred 2018-01-31, where 95% of repos were deleted. It's likely that people will notice that theirs is empty over the following few weeks.",
        "Solution": "The user should be using a 3rd party version management tool such as GitHub, GitLab, etc. If they have been relying on Resin for their canonical code hosting, we cannot help them at this point.\n\nA suggested response to the user is something like:\n\nWe don't consider code pushed to our git remote to be persistent, nor do we guarantee that it will stay there once pushed. We do generally store it as a cache to speed up future pushes, but we treat it like cache. This is different than how we treat core data in our database, or build artifacts like containers for devices. As such, while it rarely happens, our architecture doesn't preclude git data being stale or missing on a subsequent push. We strongly encourage using a dedicated git hosting provider such as GitHub or GitLab as a central location for your source."
      },
      "name": "User wants to know why their Resin git repo is missing or out of date",
      "slug": "scratchpad-entry-d4f5ebbd-44f2-40fe-af10-e5c36ac5782b",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.319Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "d606e759-25db-4bce-872d-5f1377ce2182",
      "data": {
        "Solution": "\"Fleet size depends quite a bit on the individual use case. Across our ~100 paid customers, typically the consumer device fleets are the ones scaling towards 1,000s of devices and the more industrial device fleets tend to comprise a small number of more actively managed and mission critical devices.\""
      },
      "name": "User wants to know the biggest fleet size we have",
      "slug": "scratchpad-entry-d606e759-25db-4bce-872d-5f1377ce2182",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.337Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "daa35516-caae-4361-84ca-55cafa65c424",
      "data": {
        "Solution": "In order to configure static IP on a pre-provisioned SD card (we don't currently have an easy means of changing network settings on a provisioned device SD card) perform the following steps:-\n\n* Mount the FAT partitions of the image either directly from the image file, or by burning the SD card and mounting it on your computer. The volume will be called `resin-conf`.\n* Find `config.json` and in it you will find a network key/value pair which contains json string encoded connman settings. Decode it (can be done via JSON.parse), and then  edit the entry to include the following entry, replacing [static IP] with your desired static IP:-\n```\n[service_home_ethernet]\nType = ethernet\nIPv4 = [static IP]/255.255.255.0/192.168.1.1\nNameservers = 192.168.1.1,8.8.8.8\n```\n\nNote that this assumes your network gateway is `192.168.1.1`, this can vary so adjust this according to your local network configuration.\n\n* Encode this data as json (can be done via JSON.stringify), and then replace the existing value with the new one.\n* The image will now contain your static IP configuration, simply write it to your SD card as you usually would.\n* If you're curious about further configurability, this network.config file is simply a connman network configuration file (see https://en.wikipedia.org/wiki/ConnMan and https://wiki.archlinux.org/index.php/Connman), http://git.kernel.org/cgit/network/connman/connman.git/tree/doc/config-format.txt has more details on the configuration options available here."
      },
      "name": "Static IP",
      "slug": "scratchpad-entry-daa35516-caae-4361-84ca-55cafa65c424",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.345Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "dafb8d9b-40cd-4c59-8976-e83ce4d68523",
      "data": {
        "Problem": "When attempting to `wget` an https resource, an error similar to the below is shown:\n```\ncurl performs SSL certificate verification by default, using a \"bundle\"\nof Certificate Authority (CA) public keys (CA certs). If the default\nbundle file isn't adequate, you can specify an alternate file\nusing the --cacert option.\nIf this HTTPS server uses a certificate signed by a CA represented in\nthe bundle, the certificate verification probably failed due to a\nproblem with the certificate (it might be expired, or the name might\nnot match the domain name in the URL).\nIf you'd like to turn off curl's verification of the certificate, use\nthe -k (or --insecure) option.\n```",
        "Solution": "Install the `ca-certificates` package by adding the following to the Dockerfile (sensibly appending to other apt-get install's present in the file as necessary):\n```\nRUN apt-get install ca-certificates\n```"
      },
      "name": "Issue with missing certificates on SSL download",
      "slug": "scratchpad-entry-dafb8d9b-40cd-4c59-8976-e83ce4d68523",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.357Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "db3e6be8-d6b3-4348-9708-17058d5b513f",
      "data": {
        "Solution": "This is usually a symptom of the Supervisor being dead. Most times this is caused by https://github.com/resin-io/hq/issues/401 - refer to the workaround there. If it is **not** that issue (i.e. logs don't show the \"name already taken\" error), then the same fix might still work, but first **please run [leech](https://github.com/resin-io/leech), attach to the ticket as a .txt file, and ping the Supervisor team** (e.g. @pcarranzav) for diagnosis. Then fix the device.\n\nOther logs that can be useful:\n```\njournalctl -fn 100 -u resin-supervisor\njournalctl -fn 100 -u docker\ndmesg | tail -n 100\ndocker ps -a # before and after applying any fixes\ndocker images\n```"
      },
      "name": "Device stuck in \"Stopping\" state",
      "slug": "scratchpad-entry-db3e6be8-d6b3-4348-9708-17058d5b513f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.370Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "db837638-93d0-4ffa-88ab-50f075b1b0d8",
      "data": {
        "Solution": "Note that sometimes rce will refuse to start even when space is available and the command will work because of systemd being special in some way (typically you'd systemctl start rce.service.)\n\n**DISCLAIMER: Do not do this unless you really need to. And certainly do not leave a device running rce this way.**\n\n1. Ensure rce isn't running, i.e. `pidof rce` returns nothing.\n2. Fork an rce process and configure it not to respond to SIGHUP via:\n```\nnohup rce --restart=false -s btrfs -d -g /var/lib/rce &\n```\nLogs from the command will be output to nohup.out, check that to ensure that it has started correctly, and now `rce ps`, `rce image` etc. should work.\n\n3. Kill the abomination rce via `kill $(pidof rce)` and start the service correctly via `systemctl start rce`, or if that doesn't work by restarting the device if it is appropriate to do so."
      },
      "name": "Manually starting rce",
      "slug": "scratchpad-entry-db837638-93d0-4ffa-88ab-50f075b1b0d8",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.383Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "dc0a687d-71da-4000-b51b-97d3307807bf",
      "data": {
        "Solution": "Hello Ken,\nI want to bring in front of you a problem that we encounter while having you testing and using resin on staging server.\n\nAs you already know, this server is a testing environment for development and is not an uncommon situation where things break or don't behave the way they should. So in order to minimize this risk, we ask you to start using staging builds on the production server. The process of doing this is not hard and once you get in possession of the config files, the process is even simpler.\n\nHere is the procedure you need to follow in order to do what I mentioned above:\n\n1. Acquire a production config file to be used on the staging builds\n\n    * login into dashboard.resin.io\n    * create a new \"Technologic TS-4900\" application (if you don't already have one)\n    * get into the app and download an image with the configuration you want to use (WiFi, Ethernet etc.) - this will be the app that you will be using when running resin on your devices\n    * mount the raw image\n`sudo losetup -f -P downloadedProductionImage.img`\n    * check which loop device was used\n```\nandrei@resin tmp $ losetup\nNAME       SIZELIMIT OFFSET AUTOCLEAR RO BACK-FILE\n/dev/loop0         0      0         1  0\n/var/lib/docker/devicemapper/devicemapper/data\n/dev/loop1         0      0         1  0\n/var/lib/docker/devicemapper/devicemapper/metadata\n/dev/loop2         0      0         0  0 /home/andrei/tmp/downloadedProductionImage.img\n```\nIn this example it is **loop2**\n* Get the config file for your production application:\n```\nsudo mcopy -i /dev/loop2p5 ::config.json config.json.production\n```\nYour production config file is now saved as config.json.production\n* Unmount loop device\n```\nsudo losetup -d /dev/loop2\n```\n\n2. Inject the downloaded config file into a staging image\n* login into dashboard.resinstaging.io\n* create a new \"Technologic TS-4900\" application (if you don't already have one)\n* get into the app and download an image - the network configuration doesn't matter here as we will use the production config\n* mount the raw image\n```\nsudo losetup -f -P downloadedStagingImage.img\n```\n* check which loop device was used\n```\nandrei@resin tmp $ losetup\nNAME       SIZELIMIT OFFSET AUTOCLEAR RO BACK-FILE\n/dev/loop0         0      0         1  0\n/var/lib/docker/devicemapper/devicemapper/data\n/dev/loop1         0      0         1  0\n/var/lib/docker/devicemapper/devicemapper/metadata\n/dev/loop2         0      0         0  0 /home/andrei/tmp/downloadedStagingImage.img\n```\nIn this example it is `loop2`\n\n* Inject the production config file:\n```\nsudo mcopy -o -i /dev/loop2p5  config.json.production ::config.json\n```\nYour staging image is not injected with the production config\n\n*Unmount loop device\n```\nsudo losetup -d /dev/loop2\n```\n\n3. Follow the provisioning steps using the production server and the downloadedStagingImage.img image with the injected production config file.\n\nAfter you get your production config you won't need to do steps under \"Acquire a production config file to be used on the staging builds\" again. Use the config file you downloaded once. This is valid as long as you don't delete or switch your application (production server).\nTell us if this is clear and I am at your disposal with any question you might have."
      },
      "name": "Use a staging build on production environment",
      "slug": "scratchpad-entry-dc0a687d-71da-4000-b51b-97d3307807bf",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.393Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "df347583-39b3-4953-9d2e-91c2858a2cf3",
      "data": {
        "Solution": "NOTE: See [HQ wiki](https://github.com/resin-io/hq/blob/btrfs-issues-plan/specs/btrfs-issues-plan.md) entry for an alternative explanation.\n\nIf a user is using docker-in-docker, it might happen that orphaned volumes fill up space. Supervisor versions over 1.3.0 should (in theory) properly clean this up (ping Pablo Carranza to raise the issue otherwise).\n\nTo clean orphaned volumes you can use https://github.com/pcarranzav/docker-cleanup-volumes like this:\n```\ncurl https://raw.githubusercontent.com/pcarranzav/docker-cleanup-volumes/master/docker-cleanup-volumes.sh > rce-cleanup-volumes.sh\nchmod +x rce-cleanup-volumes.sh\nsystemctl stop resin-supervisor\nrce stop $(rce ps -q)\n# use ./rce-cleanup-volumes.sh --dry-run if you want to check what will be deleted\n./rce-cleanup-volumes.sh\nsystemctl restart rce\nsystemctl start resin-supervisor\n```"
      },
      "name": "Cleaning orphaned volumes",
      "slug": "scratchpad-entry-df347583-39b3-4953-9d2e-91c2858a2cf3",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.403Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e2ce9e98-f4bc-4ec1-8d92-a56c8dbf3b65",
      "data": {
        "Problem": "User restarts power on Beaglebone Black and it fails to restart correctly. In some cases LEDs are lit, in some not.\n**It is worth asking if the Beaglebone is connected to any serial devices, since noise on the serial line during boot can cause the boot to hang in U-boot. We have a fix for this in resinOS 1.17.**\n\n###Treatment\nIt seems generally the advise is to not do this, and it's a hardware issue. Relevant links:-\nhttp://elinux.org/Beagleboard:BeagleBoneBlack#Improper_Power_Down....All_Revisions\nhttps://groups.google.com/forum/#!topic/beagleboard/aXv6An1xfqI%5B101-125%5D\nhttp://stackoverflow.com/questions/27426975/beaglebone-black-doesnt-power-on"
      },
      "name": "Beaglebone Black Not Powering Up",
      "slug": "scratchpad-entry-e2ce9e98-f4bc-4ec1-8d92-a56c8dbf3b65",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.413Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e33fedc5-1ed9-449c-adef-bde8d8aa79ca",
      "data": {
        "Problem": "wlan de-authenticates immediately after authentication with error code = 3\n\n**Important note:** This is fixed for our base images. However, custom user base images might still encounter it.\n\n**should only affect very old versions of resinOS**",
        "Solution": "This is because the container's systemd takes over the host's systemd socket.\nWe must ensure for 2 things:\n\n1. the application reaches the host's systemd always\n2. to disable the container's connman service because the container's systemd tries to run another connman service.\n\nIn order to do so, add the following in the Dockerfile:\n```\nRUN systemctl disable connman\n```\nAnd add the following line in a startup script (that can be part of the CMD command in the Dockerfile):\n```\nexport DBUS_SYSTEM_BUS_ADDRESS='unix:path=/host_run/dbus/system_bus_socket'\n```\n\n#### REFS:\nRelated convo: https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1820026687\nwifi-connect-app: https://github.com/resin-io/resin-wifi-connect\nRelavant discussion in r/ideas: https://www.flowdock.com/app/rulemotion/resin-ideas/threads/u51wowG3P3LIpLQzp7G_xTzZFdN\nConnmap API: https://github.com/Doodle3D/connman-api\nKilling and masking services: https://docs.fedoraproject.org/en-US/Fedora/19/html/Installation_Guide/s1-boot-init-shutdown-administration-kill.html"
      },
      "name": "Wifi connect app stops working when systemd enabled",
      "slug": "scratchpad-entry-e33fedc5-1ed9-449c-adef-bde8d8aa79ca",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.426Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e85119e3-41f1-4017-8f2e-69300b245f62",
      "data": {
        "Solution": "Find the user container with `balena container ls -a`, then remove it with `balena rm <container_id>`, and finally restart balena/the supervisor to ensure the container gets redownloaded with `systemctl restart {balena,resin-supervisor}`."
      },
      "name": "(HTTP code 500) server error - driver \"aufs\" failed to remove root filesystem",
      "slug": "scratchpad-entry-e85119e3-41f1-4017-8f2e-69300b245f62",
      "tags": [
        "non-shareable",
        "needs-review"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.429Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "eb86f1ad-7f83-403d-a5a3-d1baed9d77d1",
      "data": {
        "Solution": "We plan to add this to the API properly in future, for the time being there is an early access workaround:\n\n1. Using your auth token do a POST request to https://api.resin.io/application/#{application.id}/generate-api-key (sending the token in the Auth header) - see https://github.com/resin-io/resin-sdk/blob/397c0e5dc570c3d094561b6d3d27ae3254d9a141/build/models/application.js#L324 for example usage\n2. The server should reply with an API key (json-encoded string, so you may need to strip an extra pair of quotes)\nAdd `?apikey=API_KEY` to all your API requests and do __not__ send the token header anymore.\n\n**Using the SDK:**\n```\nresin.auth.login({ /* credentials */ });\n// ...\nresin.models.application.getApiKey('MyApp').then(function(apiKey) {\n  // use apiKey\n});\n```"
      },
      "name": "Getting a Permanent API Key",
      "slug": "scratchpad-entry-eb86f1ad-7f83-403d-a5a3-d1baed9d77d1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.441Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "d36f4fa9-f58b-4910-9943-d94824938959",
      "data": {
        "Problem": "Customer has created a new release (via `balena push`) and wants to retrieve the logs for that build (maybe they've used detached mode in the CLI).",
        "Solution": "Retrieving build logs for a release:\n    \n1. If you don’t already have the release hash/release ID of the build for the app (and you must know the app ID, see https://www.balena.io/docs/reference/api/resources/application/ for information on how to do that) run:\n        ```\n        curl -XGET \\\n        \"https://api.balena-cloud.com/v4/release?\\$filter=belongs_to__application%20eq%20<APP ID>\" \\\n        -H \"Content-Type: application/json\" \\\n        -H \"Authorization: Bearer <AUTH_TOKEN>\"\n        ```\n        Running the output through `jq` gives you all the releases, note they will not be in chronological order, so you’ll need to parse the timestamps to get the latest build. Here’s the latest from a query:\n        ```\n        {\n          \"id\": 1190733,\n          \"created_at\": \"2019-12-18T11:31:10.000Z\",\n          \"belongs_to__application\": {\n            \"__deferred\": {\n              \"uri\": \"/resin/application(1544229)\"\n            },\n            \"__id\": 1544229\n          },\n          \"is_created_by__user\": {\n            \"__deferred\": {\n              \"uri\": \"/resin/user(9505)\"\n            },\n            \"__id\": 9505\n          },\n          \"commit\": \"9f44d9de9cdf11987110f30a3939d645\",\n          \"composition\": {\n            \"version\": \"2.1\",\n            \"services\": {\n              \"frontend\": {\n                \"build\": {\n                  \"context\": \"./frontend\"\n                },\n                \"network_mode\": \"host\"\n              },\n              \"backend\": {\n                \"build\": {\n                  \"context\": \"./backend\"\n                },\n                \"labels\": {\n                  \"io.balena.features.supervisor-api\": \"1\",\n                  \"io.balena.features.balena-api\": \"1\"\n                },\n                \"privileged\": true\n              }\n            }\n          },\n          \"status\": \"success\",\n          \"source\": \"cloud\",\n          \"start_timestamp\": \"2019-12-18T11:31:09.967Z\",\n          \"end_timestamp\": \"2019-12-18T11:31:24.655Z\",\n          \"update_timestamp\": \"2019-12-18T11:31:27.836Z\",\n          \"__metadata\": {\n            \"uri\": \"/resin/release(@id)?@id=1190733\"\n          }\n        ```\n        The `id` is the internal ID of the build\n2. Using the internal release ID, now craft an appropriate API query for the logs (where `<RELEASE_ID>` here would be `1190733` from the above output example):\n        ```\n        curl -XGET \\\n        'https://api.balena-cloud.com/v5/release(<RELEASE_ID>)?$expand=contains__image($select=id&$expand=image($select=id,is_stored_at__image_location,build_log,image_size,start_timestamp,end_timestamp,push_timestamp,error_message&$expand=is_a_build_of__service($select=service_name))),release_tag($select=tag_key,value),is_created_by__user($select=id,username)' \\\n        -H \"Content-Type: application/json\" \\\n        -H \"authorization: Bearer <AUTH_TOKEN>”\n        ```\n        Important note here, use single quotes for this curl line API request, not double quotes, else the URL will be malformed. The response will return the build log output in JSON format, with each service build log in its own object. Again, running through `jq` will get you something like this (only first service shown):\n        ```\n        {\n        \"d\": [\n            {\n            \"contains__image\": [\n                {\n                \"image\": [\n                    {\n                    \"is_a_build_of__service\": [\n                        {\n                        \"service_name\": \"frontend\",\n                        \"__metadata\": {}\n                        }\n                    ],\n                    \"id\": 1786828,\n                    \"is_stored_at__image_location\": \"registry2.balena-cloud.com/v2/b82f6aa27a25fcc5e597a5f13f99a1d5\",\n                    \"build_log\": \"Step 1/6 : FROM balenalib/fincm3-node:10\\n ---> 5f8c40d93898\\nStep 2/6 : WORKDIR /usr/src/app\\n ---> Running in 2be98cb2991d\\nRemoving intermediate container 2be98cb2991d\\n ---> 098e7151576a\\nStep 3/6 : COPY package* ./\\n ---> 33a3807b4cec\\nStep 4/6 : RUN npm ci --production && npm cache clean --force && rm -rf /tmp/*\\n ---> Running in 5087670f6cd6\\nadded 94 packages in 1.986s\\n\\u001b[91mnpm\\u001b[0m\\n\\u001b[91m \\u001b[0m\\n\\u001b[91mWARN\\u001b[0m\\n\\u001b[91m \\u001b[0m\\n\\u001b[91musing --force I sure hope you know what you are doing.\\n\\u001b[0m\\nRemoving intermediate container 5087670f6cd6\\n ---> 7bc172020406\\nStep 5/6 : COPY index.js ./\\n ---> 044731652ab9\\nStep 6/6 : CMD [\\\"npm\\\", \\\"start\\\"]\\n ---> Running in 9f7406f34c04\\nRemoving intermediate container 9f7406f34c04\\n ---> 234c159ac4a5\\nSuccessfully built 234c159ac4a5\\n\",\n                    \"image_size\": 233323889,\n                    \"start_timestamp\": \"2019-12-18T11:20:59.665Z\",\n                    \"end_timestamp\": \"2019-12-18T11:21:19.957Z\",\n                    \"push_timestamp\": \"2019-12-18T11:21:27.304Z\",\n                    \"error_message\": null,\n                    \"__metadata\": {\n                        \"uri\": \"/resin/image(@id)?@id=1786828\"\n                    }\n                    }\n                ],\n            …\n        }\n        ```",
        "severity": "low"
      },
      "name": "Retrieving build logs for a release",
      "slug": "support-issue-retrieving-build-logs-for-a-release-061335a3-b3ac-420c-8acf-d7a3be0ead74",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-12-18T12:17:41.886Z"
      },
      "created_at": "2019-12-18T12:17:10.842Z",
      "updated_at": "2019-12-18T12:17:41.823Z",
      "capabilities": []
    },
    {
      "id": "c2b6609a-8464-4e9d-83f7-2aecd7331c3c",
      "data": {
        "Problem": "A user wanted to be sure its customers could **not** access its source code via TTY. We double checked and reported that DEV images have TTY enabled and PROD images have it disabled, but it took 6 devs to handle the thread.",
        "Solution": "We should document the state (enabled/disabled) of TTY for balenaos in some security related chapter, so that we ensure our users that, even though their users will have phisical access to the device, they won't be able to have root access using TTY",
        "severity": "low"
      },
      "name": "Document state of TTY access for dev and prod balenaos images",
      "slug": "support-issue-document-state-of-tty-access-for-dev-and-prod-balenaos-images-1ab8c62c-c003-4b7e-8ae4-0a0a62e384f7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-12-16T16:26:01.764Z",
        "support issue has attached support thread": "2019-12-16T16:26:02.652Z"
      },
      "created_at": "2019-12-16T16:26:01.584Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6000a575-d0b5-44b6-83d7-5f28cbb898e2",
      "data": {
        "Solution": "If the hostOS version is 1.1.4:\n```\n   Append the following line to uEnv.txt (found in boot partition) fdtfile=am335x-boneblack-emmc-overlay.dtb\n```\nIf the host OS version is < 1.1.4:\n\n1. mount -o remount,rw /boot\n2. Append the following line to uEnv.txt (found in boot partition) fdtfile=am335x-boneblack-emmc-overlay.dtb\n3. umount /boot\n4. cd /boot ; wget http://build1.dev.resin.io/~theodor/zImage-am335x-boneblack-emmc-overlay.dtb\n5. mv zImage-am335x-boneblack-emmc-overlay.dtb am335x-boneblack-emmc-overlay.dtb\n\n**Note:** The necessary device tree (am335x-boneblack-emmc-overlay) is only available in our 1.1.4 version of the hostOS\n\n**Note:** Both these processes require reboot of the device."
      },
      "name": "Disabling HDMI/enabling TTYS5",
      "slug": "scratchpad-entry-6000a575-d0b5-44b6-83d7-5f28cbb898e2",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.784Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6084ca4b-b67c-47ed-85dd-1e61ccf7ccca",
      "data": {
        "Problem": "User tries to use some application which relies upon a library which uses ADC, and it fails to work correctly at all.",
        "Solution": "**__NOTE:__ this is now working on resinOS 1.1 and up**\n\nSadly the diagnosis is currently terminal - we don't  support ADC/capemgr because of it requiring ancient linux. Some discussion from Andrei Gherzan is included below:-\n\nWe have two options here. capemgr was discontinued from 3.8 and replaced by https://github.com/RobertCNelson/dtb-rebuilder/tree/4.1.x from 4. We basically have two options:\ndowngrade and use linux-beaglebone 3.8 - dynamic dtb loading via capemgr\nkeep meta-ti kernel and use dtb-rebuilder - statuc dtb loading - basically this is a tool which patches the default dts and builds it for a specific cape.\nIn any case we need to think of a way for a user to be able to upload his dtb - new cape for example. As well, a cape is not something that you switch and given our business model, we do remote deployment which doesn't involve any hw interaction. So from my perspective maybe we can instruct users how to build their dts or have a way for users to upload their dtb and have the imagemaker inject it in the right place."
      },
      "name": "Why doesn't ADC work on my Beaglebone Black?",
      "slug": "scratchpad-entry-6084ca4b-b67c-47ed-85dd-1e61ccf7ccca",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.789Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "63492201-b920-433f-80bd-b178597aee51",
      "data": {
        "Solution": "Run the following commands:\n```\nrm -f /mnt/etc/systemd/system/multi-user.target.wants/ofono.service /mnt/etc/systemd/system/ofono.service\nln -s /dev/null /mnt/etc/systemd/system/ofono.service\n```"
      },
      "name": "Disable Ofono",
      "slug": "scratchpad-entry-63492201-b920-433f-80bd-b178597aee51",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.795Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "649a118f-9893-4133-a917-3c67f7ef502e",
      "data": {
        "Problem": "If a user asks for updating the host OS on some of their devices, or the whole\nfleet:\n\n* start a thread in Flowdock `r/support_meta` as usual from the support sidebar, and make a \"#deviceupdate\" hashtag on it, so proper notifications are sent, and give some context there, so the FleetOps team can pick it up!\n* also ping `@imrehg` on this",
        "Solution": "__NOTE:__ We support most hostOS update types (1.x->1.x, 1.x->2.x, 2.x->2.x), but many of it are manual updates. Here's an update matrix for info, if not sure ask @imrehg in the Support channel before promising an update to the user!\n\n[Matrix of possible version updates](https://docs.google.com/a/resin.io/spreadsheets/d/171cgf11Po5W_TKgg5mRKlj7fbsca4E21iOYMWLg2PMM/edit?usp=sharing)"
      },
      "name": "Updating the Host OS",
      "slug": "scratchpad-entry-649a118f-9893-4133-a917-3c67f7ef502e",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.798Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "67e102e9-3f22-4017-8eed-7269b0903a05",
      "data": {
        "Solution": "Dashboard v1.80 no longer exposes the DeviceID and only shows the Device UUID.\nIn general we are going to hide Device IDs from all our user facing APIs/Components.\nIn case that a user needs the DeviceID to use it in one of our user facing APIs/Components that still uses Device IDs\n1. Open an issue to update that component to use Device UUIDs\n1. Give the user a workaround like the following canned response:\n> In the meantime, the best thing I can propose is to use the resin-CLI to retrieve the device ID. Specifically `$ resin device <deviceUuid>` should retrieve all the device information. Additionally, let me share with you a link to the respective documentation page of the CLI: https://docs.resin.io/tools/cli/#device-60-uuid-62-\n\n> An alternative would be to use the API directly to retrieve the same information like this: `curl \"https://api.resin.io/v1/device?\\$filter=uuid%20eq%20'<the_device_uuid>'\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer <your_auth_token>\"`. Here is also the documentation page for our API https://docs.resin.io/runtime/data-api/"
      },
      "name": "User wants to find the Device ID",
      "slug": "scratchpad-entry-67e102e9-3f22-4017-8eed-7269b0903a05",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.805Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "bda6fcf9-875c-42c3-81fc-8c4dd782030c",
      "data": {
        "Problem": "You get an error when trying to pull an image from the resin registry, e.g.:\n```\n$ docker pull resin/resin-api\nPulling repository resin/resin-api\nGet https://registry-1.docker.io/v1/repositories/resin/resin-api/tags: read tcp 52.0.195.198:443: i/o timeout\n```\n\nIt turns out that this is a rather unfriendly error message that occurs in some version of docker which in fact means the default `latest` tag cannot be found.",
        "Solution": "You also need to specify the image tag, e.g.:\n```\n$ docker pull resin/resin-api:v0.0.1\n```"
      },
      "name": "Pulling from resin registry fails",
      "slug": "scratchpad-entry-bda6fcf9-875c-42c3-81fc-8c4dd782030c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.222Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "69b44114-7a3e-46b2-a229-6fbf91387d3b",
      "data": {
        "Solution": "So to do this via the API directly, you need to use an OData expresion.\nIn order to execute this command you need:\n\n* your authorisation token, which you can grab athttps://dashboard.resin.io/preferences?tab=details.\n* The ID of the application you want to transfer the device to - if you click on an app, the URL will be https://dashboard.resin.io/apps/<app id>/devices, this<app id> is what you need. For example, https://dashboard.resin.io/apps/12345678/devices would indicate app id 12345678.\n* The UUID for the device you want to move. You can find this in the device dashboard on the 'Device Summary' tab, and there's even a handy copy button for you to copy it to the clipboard easily.\n\nOnce you have all these, you are good to go. The ODATA query you need to use here is `$filter=uuid eq '<device uuid>'`, and to move the device we want to alter the device record, so we want to submit a **PATCH** request with JSON data set to `{ \"application\": <app id> }`.\n\nPutting this all together, we can achieve what we need with a simple bash script using cURL. You need to export the device uuid as **DEVICE_UUID**, the token as **TOKEN** and the app id as **APPLICATION_ID**:\n```\n#!/bin/bash\n\nexport DEVICE_UUID=\"<the device uuid from the device dashboard>\"\nexport TOKEN=\"<the auth token from your preferences page>\"\nexport APPLICATION_ID=\"<the application id from the application dashboard>\"\n\ncurl -X PATCH \"https://api.resin.io/ewa/device?\\$filter=uuid%20eq%20'${DEVICE_UUID}'\" -H \"Authorization: Bearer ${TOKEN}\" \\\n     -H 'Content-Type: application/json;charset=UTF-8' -H 'Accept: application/json, */*' \\\n     --data-binary \"{\\\"application\\\": ${APPLICATION_ID}}\" --compressed\n```"
      },
      "name": "How to move devices between applications using the API, CLI, and SDK?",
      "slug": "scratchpad-entry-69b44114-7a3e-46b2-a229-6fbf91387d3b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.814Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6a1319d2-1b88-42aa-8587-c20f3b7bec7c",
      "data": {
        "Solution": "* Though the host rootfs is read-write, we configure our distro to not write to it as you usually would a rootfs. resinOS 2.0 actually now has the rootfs mounted read-only.\n* On devices running resinOS older than `version 1.2`, docker is renamed to `rce`, so you have to do thing like `rce images`, etc.\n* Adjusting network configuration on already-provisioned devices isn't easy, due to needing to mount the ext rootfs. Its also dangerous and can brick a device. In general users should be heavily cautioned when working with network config.\n* Images tagged jessie/wheezy/etc. at e.g. [resin/rpi-rasbian](https://hub.docker.com/r/resin/rpi-raspbian/) refer to the `:latest` version of the tag. So for example, at the time of writing, `resin/rpi-raspbian:jessie` is the same as `resin/rpi-raspbian:jessie-2015-06-24`.\n* The host OS for production devices has no valid login/password credentials.\n* The Raspberry Pi <2 which uses SD cards ignores the read-only physical switch. Micro SD cards appear to lack this switch altogether.\n* You use [this link](http://jenkins.dev.resin.io/securityRealm/addUser) to add a user to jenkins.\n* The only officially support wifi adapters are ones using the `Broadcom bcm43143 chipset`, however many others should work.\n* connmanctl can be used to control networking settings from within the container (but this requires access to the host OS dbus). In resinOS 2.x the network can be controlled via NetworkManager dbus API.\n* When an app gets killed, the container gets a `SIGTERM` which users can catch and react to. After a grace period, though, the app will get a `SIGKILL` which can't be caught.\n* Installing openssh via a Dockerfile causes ssh-keygen to be triggered in the build, however this will result in each device having the same keys across the fleet.\n* When you see `{\"message\":\"HTTP code is 500 which indicates error: ` entries in the supervisor logs, this `500` error refers to an error that docker is receiving from its daemon **NOT** an actual server. Any real server error will be described in the remainder of the error message.\n* This also goes for messages like `Failed to download application 'registry.resinstaging.io/testhummingboard/5a4f45244cb66724782b2ebf34e576fd8b4d553a' due to 'server error'` - when this error occurs the 'server' in question is the docker daemon running on the device not one of our network servers.\n* Ethernet will always work even if wifi is configured, so this is always an option for a user if wifi is not functioning.\n* eMMC devices can be provisioned with the same SD card with absolutely no changes required, just pop that sucka into the devices you want to configure."
      },
      "name": "Facts",
      "slug": "scratchpad-entry-6a1319d2-1b88-42aa-8587-c20f3b7bec7c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.826Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2628e300-659e-426b-b7a7-bd56dfc39674",
      "data": {
        "Problem": "`RUN apt-get update` fails with:\n\n```\n[main]     Get:14 http://deb.debian.org jessie/main armhf Packages [8898 kB]\n[main]     Fetched 23.6 MB in 13s (1703 kB/s)\n[main]     W: Failed to fetch http://deb.debian.org/debian/dists/jessie-updates/InRelease  Unable to find expected entry 'main/binary-armhf/Packages' in Release file (Wrong sources.list entry or malformed file)\n[main]     E: Some index files failed to download. They have been ignored, or old ones used instead.\n```",
        "Solution": "The reason for this is [removal of wheezy and jessie from mirrors](https://lists.debian.org/debian-devel-announce/2019/03/msg00006.html). User should migrate to [balenalib](https://www.balena.io/docs/reference/base-images/base-images/) images where this problem is fixed (see [base-images#532](https://github.com/balena-io-library/base-images/issues/532)).\n\nIf user can't migrate for whatever reason, workaround exists. Add following line to the `Dockerfile.template` ...\n\n```\nRUN sed -i '/jessie-updates/{s/^/#/}' /etc/apt/sources.list\n```\n\n... before running `apt-get`.",
        "severity": "low",
        "shareable": true
      },
      "name": "apt-get update fails on old resin images (Debian Jessie)",
      "slug": "support-issue-apt-get-update-fails-on-old-resin-images-ebian-essie-d27e578a-7122-4ef4-bd43-177e3e7ac03b",
      "tags": [
        "resin",
        "jessie",
        "apt-get",
        "debian"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T13:28:18.261Z",
        "support issue has attached support thread": "2019-05-08T20:38:18.624Z"
      },
      "created_at": "2019-04-23T13:28:17.649Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "61b5466e-1e16-4ae7-b647-453b3d895c23",
      "data": {
        "Problem": "Is there any way to switch from an older development OS to the production version without flashing the system from scratch?",
        "Solution": "Yes, but currently this requires the fleetOps team to do this for the user.\n\nManual way at the moment:\n```\nsource resin-vars\nhostapp-update -i \"resin/resinos:${VERSION/+/_}-${SLUG}\" -r\n```\n\nAnd we are working on adding first-class support to dev->prod and prod->dev updates",
        "category": "fleetops",
        "severity": "low",
        "mentionsUser": [
          "bd9c04aa-8bbe-40a1-8265-bd2957a7bb54",
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "Is there any way to switch from an older development OS to the production version without flashing the system from scratch",
      "slug": "support-issue-s-there-any-way-to-switch-from-an-older-development-to-the-production-version-without-flashing-the-system-from-scratch-64fdc56d-ef47-4309-a644-2ecd33ed6120",
      "tags": [
        "hup"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-09T09:16:02.560Z",
        "support issue has attached support thread": "2019-05-07T07:45:25.684Z"
      },
      "created_at": "2019-05-07T07:45:23.608Z",
      "updated_at": "2019-05-09T09:16:01.945Z",
      "capabilities": []
    },
    {
      "id": "1951ef6f-2d1b-4e27-879b-6ceabfb1adcb",
      "data": {
        "Problem": "Device has a 16GB drive but the FS expansion fails so the device only has 1GB accessible to the docker images. This manifests as a failure when they try download a new release and run out of space.\n\nSee on:\nIntel NUC with 16GB (Transcend’s JetFlash … (cat /sys/block/sda/device/vendor & friends) connected via USB (Bus 001 Device 003: ID 8564:1000 Transcend Information, Inc. JetFlash)",
        "Solution": "none yet. We need to get access to initramfs logs where the FS expansion occurs. On balenaOS 2.34, these logs will be part of dmesg",
        "category": "fs expansion",
        "severity": "medium"
      },
      "name": "Device only expands the data partition to 1G",
      "slug": "support-issue-evice-only-expands-the-data-partition-to-1-cebe67dc-3fdc-4eb5-acee-f91d718737e4",
      "tags": [
        "FS",
        "data",
        "expansion",
        "JetFlash",
        "Transcend"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-16T11:10:05.325Z",
        "support issue has attached support thread": "2019-05-15T18:15:04.146Z"
      },
      "created_at": "2019-05-15T18:15:02.558Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b4a7f15f-8c6f-4ed1-a73f-daf9dd5c2903",
      "data": {
        "Solution": "supervisor <=6.x.y works on resinos < 2.12.x; supervisor >=7.x.y works on >=2.12.x",
        "severity": "low"
      },
      "name": "Supervisor <--> OS compatibility",
      "slug": "scratchpad-entry-b4a7f15f-8c6f-4ed1-a73f-daf9dd5c2903",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-21T23:42:54.712Z"
      },
      "created_at": "2019-03-01T17:59:57.126Z",
      "updated_at": "2019-05-21T23:42:54.650Z",
      "capabilities": []
    },
    {
      "id": "67f0d6c1-eea7-4bc2-9309-cc21dbecdb63",
      "data": {
        "Problem": "The UI wouldn’t let the user connect to a container and the UI was showing the device running the wrong/previous release. After a refresh/reload of the browser things started working again.",
        "Solution": "Not sure what caused this, it could have been the API being unresponsive, but its hard to say. This issue is to keep an eye out for things like this.",
        "archived": false,
        "category": "web terminal",
        "severity": "low",
        "fixedInOSVersion": "none",
        "fixedInSupervisorVersion": "none"
      },
      "name": "Can't connect to container terminal because UI thinks no container running, but it is.",
      "slug": "support-issue-an-t-connect-to-container-terminal-because-thinks-no-container-running-but-it-is-9187db33-cf58-40b9-a4c8-01333d0e7698",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-18T08:35:57.657Z",
        "support issue has attached support thread": "2019-06-18T08:35:59.387Z"
      },
      "created_at": "2019-06-18T08:35:57.581Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8c526953-b794-4c53-a672-1194972d6b92",
      "data": {
        "Problem": "User had a device that was not logging anything. On inspection it seems like the one of the services were restarting over and over. That seemed related to a env var they set and was a red herring. We noticed that this 2.32.1 OS device was running supervisor 7.11.0, not sure how that happened as it should be running 9.11.1, i upgraded the supervisor manually and things worked correctly. Error in HUP logs:\n```\nError response from daemon: oci runtime error: container_linux.go:263: starting container process caused \"process_linux.go:261: applying cgroup configuration for process caused \\\"failed to write 11752 to cgroup.procs: write /sys/fs/cgroup/cpu,cpuacct/docker/c9e9884e7cc8122523d33de018ba93eaae705e5a0f965ba2f50b2386d75af8f5/cgroup.procs: invalid argument\\\"\"\n```\n",
        "Solution": "None yet, but doing a supervisor update to the correct version restored all functionality.",
        "category": "OS updates",
        "severity": "low"
      },
      "name": "balena engine: applying cgroup configuration for process caused failed to write cgroup.procs, invalid argument",
      "slug": "support-issue-balena-engine-applying-cgroup-configuration-for-process-caused-failed-to-write-cgroup-procs-invalid-argument-4cdc9cb8-4f43-4359-94e4-2a71f1c469fe",
      "tags": [
        "engine",
        "hup"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-18T08:53:58.725Z",
        "support issue has attached support thread": "2019-06-18T08:54:40.514Z"
      },
      "created_at": "2019-06-18T08:53:58.639Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a9c9be52-c5cb-4daa-91b6-d893571fa09d",
      "data": {
        "Problem": "`/resin-boot/config.txt` is not the correct file, the actual config.txt that is applied and read on boot is found in `/mnt/boot/config.txt`  and this one will get updated when things are updated on the dashboard. `/resin-boot/config.txt` is a file created when hup and potentially we shouldn’t even have it exposed there as it is confusing.",
        "Solution": "User should check `/mnt/boot/config.txt` as that is the active configuration",
        "archived": false,
        "category": "rpi configuration",
        "severity": "low"
      },
      "name": "/resin-boot/config.txt doesn't have the correct values",
      "slug": "support-issue-resin-boot-config-txt-doesn-t-have-the-correct-values-8028cfa5-158e-4849-b869-134674b987d0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-18T09:02:01.857Z",
        "support issue has attached support thread": "2019-06-18T09:02:04.101Z"
      },
      "created_at": "2019-06-18T09:02:01.704Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a54a2310-8920-455d-9311-600d71605cf2",
      "data": {
        "Problem": "one of the build servers was throwing a lot of uncaught exceptions, detailed here: https://sentry.io/organizations/balena/issues/1019528609/?query=is%3Aunresolved - this caused the git server to report \"builder unavailable\" to some users.\nIt's not clear what caused these errors, but I'm going to add some code to handle if this happens again in the future. Weirder still, these errors were only experienced by git pushes, and balena push seemed unaffected.\n",
        "Solution": "Things were \"fixed\" such as it were by replacing the misbehaving builders instance. Interestingly this was done by the ELB and not me, I just restarted the service, and it never came back up, so that's another data point. The misbehaving builders storage was at 92% so high, but shouldn't cause issues. Nothing else is clear",
        "archived": false,
        "category": "Incident",
        "severity": "medium"
      },
      "name": "Builder Incident 2019-06-10",
      "slug": "support-issue-uilder-ncident-2019-06-10-c8b308f2-3a72-4ba1-b012-6c652ca8f62b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-18T09:27:10.034Z",
        "support issue has attached support thread": "2019-06-18T09:27:11.930Z"
      },
      "created_at": "2019-06-18T09:27:09.967Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "07817cba-eddc-45ac-8838-9792d834bdc8",
      "data": {
        "Problem": "The device has a very flakey mobile data connection and the app updates keep failing and retrying. The device consumed over 2.5Gb trying to update.",
        "Solution": "Supervisor 9.7.0 adds some features to better backoff after failure when downloading. So potentially would limit  usge problem.",
        "archived": false,
        "category": "App Updates",
        "severity": "medium",
        "fixedInOSVersion": ">v2.30.0",
        "fixedInSupervisorVersion": "9.7.0"
      },
      "name": "Device failing to download application and consuming lots of mobile data",
      "slug": "support-issue-device-failing-to-download-application-and-consuming-lots-of-mobile-data-6c51b284-bb55-4c84-98ea-2004b138e82a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-28T09:27:18.312Z",
        "support issue has attached support thread": "2019-06-28T09:27:21.222Z"
      },
      "created_at": "2019-06-28T09:27:18.273Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3ab1cae4-fa54-44ec-be6c-0af149ce2bf6",
      "data": {
        "Problem": "Recent actions for reclaiming space on the git service (by git gc) caused permission issues on some git repo reference files, resulting in git push errors on a small number of applications.",
        "archived": false,
        "category": "git",
        "severity": "high"
      },
      "name": "Git service incident (21-06-2019)",
      "slug": "support-issue-git-service-incident-21-06-2019-ae3131c7-596e-4d74-92e5-9b57a4a83d49",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-28T12:36:30.196Z"
      },
      "created_at": "2019-06-28T12:36:29.469Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ebdb58d1-6833-43f6-9d86-90ba5245a6d3",
      "data": {
        "Problem": "Some OpenRov devices might not be able to connect, because their api key is not valid.\n\nThe problem was that a former employee (user id: 9894) left and wanted the be removed as a collaborator from the application:",
        "Solution": "We did set the `belongs to-user` field to NULL for the devices he still \"owned\", this should not be a problem, \nbecause the devices already have a `device-api-key` registered, but the functionality in the api to set the field to \nNULL was only added after the devices where created. In case they never received an update, the function to set the\nfield to NULL was probably never triggered.\n\nIn case we need to restore anything below is a list of the devices we modified, the user that owned the devices, and \nthe applications the devices belong to. This should be all that is needed to restore functionality in case of emergency.\nHere is also a link to the data in csv format: https://drive.google.com/open?id=1TTra4IL40u6NEMPyFzLPXwq14hsXeP4f\n\nThe user information:\n```\nid,created at,actor,username,password,email,first name,last name,company,account type,automatic login code,two factor key,is two factor protected,has disabled newsletter,jwt secret,owns-organization\n9894,2016-08-04 20:47:46.5508,114846,gh_spiderkeys,FILTERED VALUE,charles@missionrobotics.us,Charles,Cross,N/A,professional,FILTERED VALUE,FILTERED VALUE,0,0,FILTERED VALUE,27358\n```\n\nThe application info:\n```\nid,created at,organization,app name,actor,device type,VPN host,VPN port,slug,commit,depends on-application,application type,should track latest release,is accessible by support until-date\n202699,2017-01-05 18:37:55.98558,22762,rovImageResinDev,325373,raspberrypi3,vpn.resin.io,443,openrov_resin/rovimageresindev,27a3f6a2773795b9ccd5e666562baa3984b080e7,,1,0,2018-11-06 05:12:39.424\n```\n\nWe set the `belongs to-user` field to null on these devices:\n```\nid,created at,actor,uuid,device name,note,device type,belongs to-application,belongs to-user,is online,last connectivity event,is connected to vpn,last vpn event,latitude,longitude,custom latitude,custom longitude,location,logs channel,public address,vpn address,ip address,is on-commit,status,os version,os variant,supervisor version,should be managed by-supervisor release,provisioning progress,provisioning state,download progress,api port,api secret,is web accessible,is managed by-device,is managed by-service instance,should be running-release\n1148103,2018-06-11 17:07:02.302318,2966076,46b77bdc068e5a2913c178b3fee8b25588533c87d6a8d89d27629550774036,08-3XBASJD,0,raspberrypi3,202699,9894,0,2018-08-22 19:49:46.645,0,2018-08-22 19:49:46.645,37.9181,-122.0735,,,\"Walnut Creek, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.162,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2137,510607\n1148084,2018-06-11 16:53:48.460974,2966056,64d32c8d558edbd485ec51b37abb6b871e49fb9dd7ea316e14b86f0bf0acff,08-3RIBO3G,0,raspberrypi3,202699,9894,0,2018-10-02 16:36:24.031,0,2018-10-02 16:36:24.031,62.4723,6.1549,,,\"Ålesund, More og Romsdal fylke, Norway\",FILTERED VALUE,83.243.228.45,,10.1.1.243 192.168.1.59,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2230,510607\n1148211,2018-06-11 18:20:35.803464,2966187,1b95c767b92e9f45d1428d5fda67c9bcd824971481550246e6084225d0ab68,08-RULO0M6,0,raspberrypi3,202699,9894,0,2019-04-05 03:09:47.048,0,2019-04-05 03:09:47.048,3.1684,101.7033,,,\"Kuala Lumpur, Kuala Lumpur, Malaysia\",FILTERED VALUE,42.190.183.192,,10.1.1.125 192.168.1.190,4a9fdda33243b6576e95bb8ed470181973636036,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,97079,561900\n1148097,2018-06-11 17:02:24.964116,2966070,779010ce23a475ea3f4f9864c908ba25b5bace5a5e4f0ce1165e7a50684da0,08-ENAUXZ4,0,raspberrypi3,202699,9894,0,2018-08-22 20:08:58.655,0,2018-08-22 20:08:58.655,37.9181,-122.0735,,,\"Walnut Creek, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.96,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2138,510607\n1148955,2018-06-12 17:34:06.383912,2967557,c4063e2585e75b7448994e17035ce00f4cfd256a10ea695d111e7a92116d55,08-UAAVKJ7,0,raspberrypi3,202699,9894,0,2018-07-06 22:55:17.019,0,2018-07-06 22:55:17.019,37.5497,-121.9621,,,\"Fremont, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.169,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2128,510607\n1148956,2018-06-12 17:34:46.623983,2967558,55000e9d7a6bb05080df47ad22436ad64910521d46c74363af2cb5cf2cb538,08-QZOWYCS,0,raspberrypi3,202699,9894,0,2018-06-13 18:50:01.432,0,2018-06-13 18:50:01.432,,,,,,FILTERED VALUE,,,10.1.1.115,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,174,510607\n1148061,2018-06-11 16:22:52.598334,2966028,a52dc02e86fce07f53c5719b9923af655d6acd685cba551f39e9333eb4354e,08-TZCRWIL,0,raspberrypi3,202699,9894,0,2018-06-11 20:32:35.813,0,2018-06-11 20:32:35.813,,,,,,FILTERED VALUE,,,10.1.1.98,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,183,510607\n1148108,2018-06-11 17:10:26.390866,2966081,412221356201158db2bd5136e9de3c11fa1d6f4ae953a2dbf90955dfc021b7,08-LU9Q9QP,0,raspberrypi3,202699,9894,0,2018-06-11 21:54:19.64,0,2018-06-11 21:54:19.64,,,,,,FILTERED VALUE,,,10.1.1.77,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,174,510607\n1148420,2018-06-11 19:50:03.583181,2966527,db85e9d41e5ec749fcc3daea03e3c44a90288533a6805485bb8f1ea13b3f8e,08-BE0C8NG,0,raspberrypi3,202699,9894,0,2018-08-22 18:50:27.106,0,2018-08-22 18:50:27.106,37.9181,-122.0735,,,\"Walnut Creek, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.194,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2131,510607\n1148421,2018-06-11 19:50:43.115316,2966529,5416d4d11ff84a64e1b38f9ead4c13601794bdc6561e7b74e8e51e65a5d678,08-S7D6K4Y,0,raspberrypi3,202699,9894,0,2018-09-14 17:37:20.031,0,2018-09-14 17:37:20.031,37.5497,-121.9621,,,\"Fremont, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.150,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2164,510607\n1148082,2018-06-11 16:52:30.624843,2966054,b5efea00c4a358d92756305daaec0c20610b378420aee7cc8b3716dbe6deae,08-HH89DLY,0,raspberrypi3,202699,9894,0,2018-07-16 19:53:59.129,0,2018-07-16 19:53:59.129,47.8354,-122.3279,,,\"Edmonds, Washington, United States\",FILTERED VALUE,76.121.9.134,,10.1.1.102 192.168.0.106,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2123,510607\n1148077,2018-06-11 16:49:12.537456,2966048,d9bbf4b78aaa23578a37bcd812a663786520757df981a3fd405a894713778e,08-YDKT1Q3,0,raspberrypi3,202699,9894,0,2018-06-11 21:51:10.031,0,2018-06-11 21:51:10.031,,,,,,FILTERED VALUE,,,10.1.1.162,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,176,510607\n1148091,2018-06-11 16:58:21.857207,2966064,2c9ed5544d16be6609b43947380530ae2ce10acc082f42a0dcbe954d88bd3b,08-9YC8LAF,0,raspberrypi3,202699,9894,0,2018-06-11 22:22:59.137,0,2018-06-11 22:22:59.137,,,,,,FILTERED VALUE,,,10.1.1.89,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,175,510607\n1148104,2018-06-11 17:07:39.044244,2966077,6de0148238b6401c9238e32747ce3b77cb19885bb2eeb04360f847c8bd9543,08-TSOGO61,0,raspberrypi3,202699,9894,0,2018-06-11 22:49:29.135,0,2018-06-11 22:49:29.135,,,,,,FILTERED VALUE,,,10.1.1.25,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,184,510607\n1148074,2018-06-11 16:46:07.791573,2966044,08d5bf1f02ec5d8bdda5095d1a3a4d7438a3c01db7640ddc49163770d40cad,08-J1HFERC,0,raspberrypi3,202699,9894,0,2018-06-11 23:16:16.035,0,2018-06-11 23:16:16.035,,,,,,FILTERED VALUE,,,10.1.1.60,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,184,510607\n1148081,2018-06-11 16:51:49.461234,2966053,6f41a7c316e845c1bab4a56bca91b86dc8f9240b66d3b3aba38d6aeabca986,08-0EPJ9IV,0,raspberrypi3,202699,9894,0,2018-06-12 00:06:40.06,0,2018-06-12 00:06:40.06,,,,,,FILTERED VALUE,,,10.1.1.194,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,185,510607\n1148965,2018-06-12 17:42:30.94103,2967567,976ff0e74f6da6d6f796972053bf498f9b823b24bd081297f913294d98b0a5,08-WY42WE8,0,raspberrypi3,202699,9894,0,2018-06-13 18:12:38.322,0,2018-06-13 18:12:38.322,,,,,,FILTERED VALUE,,,10.1.1.63,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,185,510607\n1148079,2018-06-11 16:50:37.043801,2966050,c999437be9d23de77f89f1e91e8e52ebf20d1b6e65ca60a7ef8f352c0fdaff,08-NV148S5,0,raspberrypi3,202699,9894,0,2018-06-12 00:38:54.573,0,2018-06-12 00:38:54.573,,,,,,FILTERED VALUE,,,10.1.1.139,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,174,510607\n1148099,2018-06-11 17:04:09.264916,2966072,cf9086c08af631a4aeab4ada42bddbe65f9172e7b9dbbe4ca7252f754e37c7,08-VGK7LFY,0,raspberrypi3,202699,9894,0,2018-06-12 01:05:52.036,0,2018-06-12 01:05:52.036,,,,,,FILTERED VALUE,,,10.1.1.208,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,174,510607\n1146715,2018-06-07 20:09:40.809064,2952648,0e4d59ccafb35b05523d86e1b9cb586b53de5f7d2a20ad2778bc1437c19a90,08-B5AH4QD,0,raspberrypi3,202699,9894,0,2018-06-07 21:52:38.114,0,2018-06-07 21:52:38.114,,,,,,FILTERED VALUE,,,10.1.1.60,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,176,510607\n1148073,2018-06-11 16:45:32.873487,2966043,3b1f083cf7392a2010f08179f9061de4272e8ab75c2efe67bac4f5adc322e0,08-IATGD91,0,raspberrypi3,202699,9894,0,2019-02-27 09:22:58.71,0,2019-02-27 09:22:58.71,1.3667,103.8,,,Singapore,FILTERED VALUE,155.69.196.204,,10.1.1.112 192.168.137.184,4a9fdda33243b6576e95bb8ed470181973636036,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,97016,561900\n1148942,2018-06-12 17:04:26.355878,2967542,3e3f8ab058332ccc56568a496401e1581a6b95243f630e395ea13a5c3f67e9,08-B6YCH3I,0,raspberrypi3,202699,9894,0,2018-06-13 18:29:34.866,0,2018-06-13 18:29:34.866,,,,,,FILTERED VALUE,,,10.1.1.73,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,184,510607\n1148954,2018-06-12 17:30:19.740814,2967555,63258f4966412bf3e77f7d3888241877ebacaad0742ae5a2acc50a5d879262,08-48K8OZZ,0,raspberrypi3,202699,9894,0,2018-06-13 18:43:42.014,0,2018-06-13 18:43:42.014,,,,,,FILTERED VALUE,,,10.1.1.193,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,184,510607\n1148959,2018-06-12 17:37:00.529136,2967561,70e9bc08687cc47039e853c543931c22cdf21b1af4de20e517f2bbcad3d4ab,08-QEAAVSO,0,raspberrypi3,202699,9894,0,2018-06-13 21:04:42.733,0,2018-06-13 21:04:42.733,,,,,,FILTERED VALUE,,,10.1.1.39,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,184,510607\n1148078,2018-06-11 16:49:58.183239,2966049,4ec6097f699a54213e83c815058b1b10f5147eb0ffd98d997731b334fff06a,08-2XHMEDH,0,raspberrypi3,202699,9894,0,2018-06-12 23:50:48.045,0,2018-06-12 23:50:48.045,,,,,,FILTERED VALUE,,,10.1.1.78,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,181,510607\n1148094,2018-06-11 16:59:57.578587,2966067,adaa67555c3fa1673f0031d72205c4e06a8d1ddb82083d1de44ae19b9aaa4d,08-4O14XZG,0,raspberrypi3,202699,9894,0,2018-06-11 17:32:13.718,0,2018-06-11 17:32:13.718,,,,,,FILTERED VALUE,,,10.1.1.130,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,176,510607\n1148096,2018-06-11 17:01:49.174907,2966069,382a359109215b113f177b606be6efa2f0e3017b70bf5f5888de79c3736c1c,08-V4KEWVE,0,raspberrypi3,202699,9894,0,2018-08-22 20:21:11.612,0,2018-08-22 20:21:11.612,37.9181,-122.0735,,,\"Walnut Creek, California, United States\",FILTERED VALUE,12.145.29.94,,10.1.1.40,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2137,510607\n673517,2017-08-22 19:53:04.385113,1555343,6836d205d330421df06a5a1f59ea5c67,given-to-pasha-and-gil,0,raspberrypi3,202699,9894,0,2017-10-05 23:59:26.165,0,2017-10-05 23:59:26.165,37.867,-122.24,,,\"Berkeley, California, United States\",FILTERED VALUE,208.71.156.10,,192.168.1.208,b291639938aed0f98fe04fa61b2d065fab8abd44,Idle,Resin OS 2.2.0+rev1,prod,6.1.2,,,,,48484,FILTERED VALUE,0,,13,249344\n1148957,2018-06-12 17:35:24.988572,2967559,af676ce2c68a241538215b02ce4c43f8fa0e7114cf89dc54f05d07d2a742ed,08-AKXCFP0,0,raspberrypi3,202699,9894,0,2018-06-13 21:41:15.037,0,2018-06-13 21:41:15.037,,,,,,FILTERED VALUE,,,10.1.1.59,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,175,510607\n1148958,2018-06-12 17:36:04.33364,2967560,20fbfec8323021f98e713f58303f70c7b1dc6624fae09fef4c974f016062c1,08-F4PNSRT,0,raspberrypi3,202699,9894,0,2018-06-13 18:22:26.38,0,2018-06-13 18:22:26.38,,,,,,FILTERED VALUE,,,10.1.1.197,9e72e6afbbed015df0dde94137068c7c64cdcc8a,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,182,510607\n1148092,2018-06-11 16:59:09.908212,2966065,cac5f60b16e91794dc8f449453cee61c439d63417e307b4d3320f19834bd19,08-PZDDYGL,0,raspberrypi3,202699,9894,0,2019-04-05 09:16:28.087,0,2019-04-05 09:16:28.087,3.1684,101.7033,,,\"Kuala Lumpur, Kuala Lumpur, Malaysia\",FILTERED VALUE,42.190.183.192,,10.1.1.186 192.168.1.56,4a9fdda33243b6576e95bb8ed470181973636036,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,97074,561900\n1148106,2018-06-11 17:09:07.739707,2966079,44ce22e6cac08e96c8e2b080a6f22c40aac3ac560c9edbbd0d62e8e6f48bba,08-2CA37VF,0,raspberrypi3,202699,9894,0,2018-09-03 14:11:16.055,0,2018-09-03 14:11:16.055,42.8706,-71.6124,,,\"Amherst, New Hampshire, United States\",FILTERED VALUE,98.229.234.161,,10.1.1.108 192.168.1.223,4a9fdda33243b6576e95bb8ed470181973636036,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,2145,561900\n1148107,2018-06-11 17:09:51.47568,2966080,680df756d4f4f1863aabccd6e49e5e7adcebb8a56290879b092752e5fa1e81,08-9LEIGDN,0,raspberrypi3,202699,9894,0,2019-03-19 16:24:37.228,0,2019-03-19 16:24:37.228,3.1684,101.7033,,,\"Kuala Lumpur, Kuala Lumpur, Malaysia\",FILTERED VALUE,42.190.206.49,,10.1.1.204 192.168.1.169,4a9fdda33243b6576e95bb8ed470181973636036,Idle,Resin OS 2.9.7+rev1,prod,6.6.0,,,,,48484,FILTERED VALUE,0,,97026,561900\n```r",
        "category": "backend",
        "severity": "low"
      },
      "name": "Some OpenROV devices might not be able to connect",
      "slug": "support-issue-some-openrov-devices-might-not-be-able-to-connect-46b8d81a-4f45-4ba8-826f-fb5393bcb9e2",
      "tags": [
        "OpenRov",
        "device"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-01T10:22:12.357Z"
      },
      "created_at": "2019-07-01T10:20:22.574Z",
      "updated_at": "2019-07-01T10:22:12.206Z",
      "capabilities": []
    },
    {
      "id": "ec179e40-2f02-4465-84ef-b32ac2bb4306",
      "data": {
        "Problem": "RPi Zero W running resinOS 2.15.1+rev2 experienced a kernel Oops with the following logs:\n```\n[351724.081679] Unable to handle kernel paging request at virtual address 6d2e7074\n[351724.086483] Unable to handle kernel NULL pointer dereference at virtual address 000000f4\n[351724.086491] pgd = c0004000\n[351724.086496] [000000f4] *pgd=00000000\n[351724.086503] Internal error: Oops: 17 [#1] ARM\n[351724.086505] Modules linked in: ipt_REJECT nf_reject_ipv4 ipt_MASQUERADE nf_nat_masquerade_ipv4 br_netfilter nf_conntrack_netlink nfnetlink bnep hci_uart btbcm serdev bluetooth ecdh_generic i2c_dev spidev brcmfmac\n[351724.086532] Alignment trap: not handling instruction e2422020 at [<c071e7f4>]\n[351724.086535] Unhandled fault: alignment exception (0x011) at 0x0000021f\n```\n\nWe later were not able to connect to the device and there were no other balenaOS devices in the network to hop via.",
        "Solution": "No known solution",
        "archived": false,
        "category": "kernel oops",
        "severity": "medium",
        "affectedOSVersions": [
          "2.15.1+rev2"
        ]
      },
      "name": "rpi0 experiences kernel oops",
      "slug": "support-issue-rpi0-experiences-kernel-oops-0d466369-f47f-4e81-8936-f37b70cdc6ea",
      "tags": [
        "symptom",
        "kernel",
        "opps",
        "rpi0"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-02T10:30:02.421Z",
        "support issue has attached support thread": "2019-07-02T10:30:04.382Z"
      },
      "created_at": "2019-07-02T10:30:02.385Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "cec21c26-0c49-482a-9b4a-201c0761f2bc",
      "data": {
        "Problem": "Several container process are stuck in the \"D state\" which means uninterruptible sleep state and not even kill -9 can kill them. The device got into state from rapidly changing the environment variables. seen on raspberry pi 3 2.36.0+rev2, with a X-org gui program.",
        "Solution": "No known solution",
        "archived": false,
        "category": "uninterruptible sleep state",
        "severity": "medium",
        "affectedOSVersions": [
          "2.36.0+rev2"
        ],
        "fixedInSupervisorVersion": "uninterruptible sleep state"
      },
      "name": "container processes stuck in uninterruptible sleep state",
      "slug": "support-issue-container-processes-stuck-in-uninterruptible-sleep-state-073474ed-56ff-4a3b-a1c4-7b871e29f32a",
      "tags": [
        "corruption"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-02T10:45:05.488Z",
        "support issue has attached support thread": "2019-07-02T10:45:07.545Z"
      },
      "created_at": "2019-07-02T10:45:05.424Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6db0a150-2ca6-4ab5-8a0e-23775a399b36",
      "data": {
        "Problem": "User had an RPI3 running balena OS 2.32.0+rev1, supervisor 9.14.0. It was preloaded with a multicontainer app and  on provisioning not all of the services started correctly , supervisor logs a below:\n\n```\nJun 23 02:37:42 58b3032 balenad[744]: Event: Service started {\"service\":{\"appId\":1320453,\"serviceId\":213709,\"serviceName\":\"connectivity\",\"releaseId\":953067}}\nJun 23 02:37:43 58b3032 balenad[744]: time=\"2019-06-23T02:37:43.098433665Z\" level=error msg=\"a34c54f6fcf2b7ff4d3bde4cc2f08f631b11770c374ddd62f2ea0e12fd97484d cleanup: failed to delete container from containerd: no such container\"\n```\n\nThis worked fine on another 10 devices, so it seems like a racing issue? We couldn't get any logs as teh device was rebooted and worked correctly.",
        "Solution": "No known solution.",
        "archived": false,
        "category": "failed preload",
        "severity": "low",
        "affectedOSVersions": [
          "2.32.0+rev1"
        ],
        "affectedSupervisorVersions": [
          "9.14.0"
        ]
      },
      "name": "Failed to start some containers on preloaded provisioning",
      "slug": "support-issue-failed-to-start-some-containers-on-preloaded-provisioning-2cd0008a-6ea4-4fe2-a631-2412c62c6167",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-02T10:55:29.547Z",
        "support issue has attached support thread": "2019-07-02T10:55:31.816Z"
      },
      "created_at": "2019-07-02T10:55:29.468Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6a38a7cd-8fdf-469a-9bd6-4e2ecd800be0",
      "data": {
        "Problem": "In some cases during container updates, the files that are COPY-ed into the container file system exist but have zero content and therefore fail. One user has experienced this on the Intel UP board, OS: 2.12.7+rev2, supervisor 7.4.3. but shaun has seen the same behaviour on RPI3 with livepush.",
        "Solution": "No known solution",
        "archived": false,
        "category": "missing script contents",
        "severity": "medium",
        "affectedOSVersions": [
          "2.12.7+rev2"
        ],
        "affectedSupervisorVersions": [
          "7.4.3"
        ]
      },
      "name": "scripts missing their contents after update.",
      "slug": "support-issue-scripts-missing-their-contents-after-update-09e2c878-2667-4142-ba50-a92b244bea45",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-02T11:17:19.686Z",
        "support issue has attached support thread": "2019-07-02T11:17:21.446Z"
      },
      "created_at": "2019-07-02T11:17:19.589Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "acf40bed-07b3-429d-8a01-2eaa89518192",
      "data": {
        "Solution": "Our port requirements are as follows:\n\n* 443 TCP - This is the most fundamental requirement - it is used to connect to the VPN and the web terminal, as well as of course any web endpoints using TLS (https://.)\n* 123 UDP - For NTP time synchronisation.\n* 53 UDP - For DNS name resolution.\n\nEach of these should work with outward only (and inward once outward connection established) firewall settings."
      },
      "name": "Which ports does resin.io use?",
      "slug": "scratchpad-entry-acf40bed-07b3-429d-8a01-2eaa89518192",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-07-02T11:31:21.009Z"
      },
      "created_at": "2019-03-01T17:59:57.050Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8146609f-b833-42bd-80cd-9bf40ed97c01",
      "data": {
        "Problem": "User seeing the following errors when git pushing, there was no associated status page event \n```\nEnumerating objects: 15, done.\nCounting objects: 100% (15/15), done.\nDelta compression using up to 4 threads\nCompressing objects: 100% (10/10), done.\nWriting objects: 100% (10/10), 884 bytes | 884.00 KiB/s, done.\nTotal 10 (delta 8), reused 0 (delta 0)\n[Error] An error occured: It is necessary that each application that has a commit1 and owns at least 1 release that has a commit2 that is equal to the commit1, owns a release that has a commit3 that is equal to the commit1 and has a status that is equal to \"success\".\n[Error] Not deploying release.\n[Error] Upstream API server/DB error:\n```",
        "archived": false,
        "category": "incident",
        "severity": "high"
      },
      "name": "git service incident (26-06-2019)",
      "slug": "support-issue-git-service-incident-26-06-2019-ada9b004-b9be-4322-8786-02495193ab36",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-02T11:57:40.471Z",
        "support issue has attached support thread": "2019-07-02T13:28:43.179Z"
      },
      "created_at": "2019-07-02T11:57:40.408Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b66b6eab-40ae-4723-b605-923337f4b967",
      "data": {
        "Problem": "User wants to transfer device ownership to another user account",
        "Solution": "**Update (2019-07-04): this guide is outdated and may only apply to legacy devices that still have a link to a user. Most recent balenaCloud devices are just linked to the application they run (instead of having an owner), so there's no need to transfer their ownership and just moving them to a new application is enough. If the need is to transfer the application ownership instead, refer to [this issue](https://jel.ly.fish/1e8d65d7-ef77-48c7-a851-a003417215c3) for more information on how to do this.**\n\nBased on the conversations here:\n\n- https://www.flowdock.com/app/rulemotion/user_happiness/threads/7DnqwhtkQQvT6SmQ68k4LDEgBIa\n- https://www.flowdock.com/app/rulemotion/user_happiness/threads/kCTZF18FVFPakSMmmrtp-H77kEp\n\n1. The target user must temporarily be added as a collaborator to the app where the device currently belongs to.\n1. Make sure the device is supervisor 5.0.1+ or resinos 2.0.2+ and 4.4.2+ \n1. Enter the device's host os\n1. vi /mnt/boot/config.json, and change \"userId\": \"...\" to \"userId\": \"$newUserId\", \"username\":\"...\" to \"username\":\"$newUsername\" (username strictly optional as it's only used for mixpanel, but a username must be present)\n1. rm /mnt/data/resin-data/resin-supervisor/database.sqlite\n1. systemctl restart resin-supervisor\n1. Edit production database to change the device.belongs to-user field of the device to the new user id\n1. The target user can now be removed from the collaborator list of the application\n\nThe target user is now the owner of the device and can perform all device actions, like moving this device to an application they own.\n\n**Note** if transferring device ownership is not a requirement, a user1/app1 -> user2/app2 transfer can be done from the users themselves by following these steps:\n\n1. user2 temporarily adds user1 as a collaborator to app2\n2. user1 pushes the app devices are currently using to app2, to ensure that the same code will be pulled and run on the device\n3. user1 moves the device to app2 (The device is now part of app2 and owned by user1)\n4. user2 removes user1 from the collaborator list of app2\n\nWhere:\n* user1 is the original user and app owner\n* user2 is the new user and app owner\n* app1 is the app devices are currently using (owned by user1)\n* app2 is the app devices should start using (owned by user2)\n\n",
        "severity": "low"
      },
      "name": "Transferring ownership of devices between user accounts",
      "slug": "scratchpad-entry-b66b6eab-40ae-4723-b605-923337f4b967",
      "tags": [
        "needs-review"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-04T23:52:05.890Z"
      },
      "created_at": "2019-03-01T17:59:57.138Z",
      "updated_at": "2019-07-04T23:52:05.836Z",
      "capabilities": []
    },
    {
      "id": "131c311a-bc66-4adc-807a-46fb3aace1a1",
      "data": {
        "Problem": "Logs are full of errors like:\n\n```\nFailed to download image 'registry2.resin.io/v2/b999baabdd1687c3adfedb67098bc167@sha256:6c5f45f39752ed7779d817a0301d7f0c73a7309861d9755671e0c6034c5ae38f' due to 'failed to register layer:open /var/lib/docker/aufs/layers/dc6d91f8a1173f76ad23f39e8c4596cde3275697f8ad23d077b4b8cb0e811797: no such file or directory\n```\n\nHistory indicates that if you're getting this issue, and the disk is not full (there are other issues for that, but you'd be seeing errors about being out of space), this was likely a device that was either converted from local to production mode, or moved between apps. It's likely that there was power failure or something similar as part of this process.",
        "Solution": "Apply the solution at  [ https://balena-io.github.io/scratchpad/#5d93f760-3736-11e8-96e2-4fde4c6f937d ] ",
        "severity": "low"
      },
      "name": "failed to register layer:open /var/lib/docker/aufs/layers/: no such file or directory",
      "slug": "scratchpad-entry-131c311a-bc66-4adc-807a-46fb3aace1a1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-16T15:30:20.118Z"
      },
      "created_at": "2019-03-01T17:59:56.428Z",
      "updated_at": "2019-07-16T15:30:19.932Z",
      "capabilities": []
    },
    {
      "id": "ba56b859-2289-4d9a-a2ca-bb11b6eafdc1",
      "data": {
        "Solution": "We recommend Sandisk Extreme Pro (as recent as 2019 January) https://www.sandisk.co.uk/home/memory-cards/microsd-cards/extremepro-microsd-uhs-ii",
        "severity": "low",
        "shareable": true
      },
      "name": "What is the best SD Card to use?",
      "slug": "scratchpad-entry-ba56b859-2289-4d9a-a2ca-bb11b6eafdc1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-17T12:27:16.903Z"
      },
      "created_at": "2019-01-30T13:18:22.580Z",
      "updated_at": "2019-07-17T12:27:16.875Z",
      "capabilities": []
    },
    {
      "id": "f1dc0476-1b12-4873-a7df-b95549a55686",
      "data": {
        "Problem": "Since systemd recently changed the way interfaces are named: https://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/ , the users can no longer rely on `wlan0` always being called that. This can cause issues with code that relies on hardcoded names.\n\nIn one specific case the user was using our [creating a hotspot](https://www.balena.io/docs/reference/OS/network/2.x/#creating-a-hotspot) example which hardcodes the interface for wifi as `wlan0` , but the intel NUC wifi interfaces are not enumerated with that name, so it fails.\n\nThere is a detailed discussion about the issue for raspbian here https://www.raspberrypi.org/forums/viewtopic.php?p=1218420",
        "Solution": "The users need to ensure they know/detect the correct wifi interface name.",
        "archived": false,
        "severity": "low"
      },
      "name": "Device doesn't have predictable network interface names",
      "slug": "support-issue-evice-doesn-t-have-predictable-network-interface-names-a0275edd-40d9-4d19-bf31-2512d5524da2",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-08-06T23:10:23.814Z",
        "support issue has attached support thread": "2019-04-02T12:30:47.910Z"
      },
      "created_at": "2019-04-02T12:30:45.793Z",
      "updated_at": "2019-08-06T23:10:23.774Z",
      "capabilities": []
    },
    {
      "id": "65daa5bf-00ba-4818-93c2-c43c3a04ffa0",
      "data": {
        "Problem": "Occasionally users will open paid support tickets for issues in OpenBalena. ",
        "Solution": "Currently any OpenBalena issues should be handled exclusively in the forums (specifically, in this forum: https://forums.balena.io/c/open-balena ), so redirect any support there accordingly. ",
        "severity": "low"
      },
      "name": "OpenBalena issues should be redirected to the forums",
      "slug": "support-issue-openbalena-issues-should-be-redirected-to-the-forums-924d0e26-53eb-42d9-90cd-653bd480df73",
      "tags": [
        "openbalena",
        "open"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-08-13T18:56:02.738Z"
      },
      "created_at": "2019-08-13T18:55:13.392Z",
      "updated_at": "2019-08-13T18:56:02.694Z",
      "capabilities": []
    },
    {
      "id": "2d6a6556-9bea-4246-bc38-7da63f22b37b",
      "data": {
        "Problem": "The device fails to update and the following supervisor logs can be seen:\n```\nApr 17 06:59:19 e2e007e resin-supervisor[1177]: Supervisor API: GET /v1/healthy 200 - 12.479 ms\nApr 17 07:04:20 e2e007e resin-supervisor[1177]: Supervisor API: GET /v1/healthy 200 - 8.106 ms\nApr 17 07:09:20 e2e007e resin-supervisor[1177]: Supervisor API: GET /v1/healthy 200 - 7.996 ms\nApr 17 07:10:32 e2e007e resin-supervisor[1177]: [2019-04-17T07:10:32.901Z] Applying target state\nApr 17 07:10:32 e2e007e resin-supervisor[1177]: [2019-04-17T07:10:32.979Z] Scheduling another update attempt due to failure:  900000 { t: There was an error validating configuration input for key: persistentLogging, with value:\nApr 17 07:10:32 e2e007e resin-supervisor[1177]:     at t.checkValueDecode (/usr/src/app/dist/app.js:300:130397)\nApr 17 07:10:32 e2e007e resin-supervisor[1177]:     at /usr/src/app/dist/app.js:300:127019\nApr 17 07:10:32 e2e007e resin-supervisor[1177]:   message: 'There was an error validating configuration input for key: persistentLogging, with value: ',\nApr 17 07:10:32 e2e007e resin-supervisor[1177]:   name: 't' }\nApr 17 07:10:32 e2e007e resin-supervisor[1177]: [2019-04-17T07:10:32.982Z] Apply error t: There was an error validating configuration input for key: persistentLogging, with value:\n```",
        "Solution": "Possible caused by \nhttps://github.com/balena-io/balena-supervisor/issues/938\n\nTLDR: `/mnt/boot/config.json` has a `persistentLogging` value set to an empty string. Removing the key and rebooting the device should fix the issue.\n\nThe supervisor must be stopped before modifying config.json.\n\nThen, this can be done from the host OS with the following one liner:\n```\nsystemctl stop resin-supervisor && jq 'del(.persistentLogging)' /mnt/boot/config.json > /mnt/boot/config-new.json && mv /mnt/boot/config-new.json /mnt/boot/config.json && systemctl start resin-supervisor\n```\n*in the snippet above a temp file is used because writing back to the file you read from with `jq` empties the file*\n\n\nHere's a script to do the env var and config.json changes:\n```\nif [ -f /mnt/boot/config.json ]; then\n    CONFIGJSON=/mnt/boot/config.json\n    APIKEY=$(jq -r '.apiKey // .deviceApiKey' $CONFIGJSON)\n    DEVICEID=$(jq -r '.deviceId' $CONFIGJSON)\n    API_ENDPOINT=$(jq -r '.apiEndpoint' $CONFIGJSON)\n    systemctl stop resin-supervisor\n    PROBLEMATIC_ENV_VAR=$(curl --retry 10 --silent -X GET \"${API_ENDPOINT}/v5/device_config_variable?\\$filter=device%20eq%20${DEVICEID}\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer ${APIKEY}\" | jq -r '.d[] | select((.name == \"RESIN_SUPERVISOR_PERSISTENT_LOGGING\") and (.value == \"\")) | .id')\n    if [ -n \"${PROBLEMATIC_ENV_VAR}\" ]; then\n        echo \"Updating problematic RESIN_SUPERVISOR_PERSISTENT_LOGGING config variable\"\n        curl --retry 10 --silent -X PATCH \\\n            \"${API_ENDPOINT}/v5/device_config_variable(${PROBLEMATIC_ENV_VAR})\" \\\n            -H \"Content-Type: application/json\" \\\n            -H \"Authorization: Bearer ${APIKEY}\" \\\n            --data '{\n                \"value\": \"false\"\n            }' >> /dev/null\n        echo \"Updating config.json with sanitized '.persistentLogging' value.\"\n        tmpfile=$(mktemp -t configjson.XXXXXXXX)\n        jq '.persistentLogging=\"false\"' < \"${CONFIGJSON}\" > \"${tmpfile}\"\n        # 2-step move for atomicity\n        if cp \"${tmpfile}\" \"$CONFIGJSON.temp\" && sync && mv \"$CONFIGJSON.temp\" \"$CONFIGJSON\" && sync ; then\n            echo \"config.json copy worked.\" \n            cat \"$CONFIGJSON\" | jq .\n        else\n            echo \"config.json copy didn't work, pelase check file!\"\n        fi\n    fi\n    systemctl restart resin-supervisor\nelse\n    echo ERROR \"Don't know where config.json is.\"\nfi\n```",
        "archived": false,
        "severity": "medium",
        "shareable": true,
        "mentionsUser": [
          "6efc8ec6-82a2-4d7a-ad74-b3ce7f306838"
        ]
      },
      "name": "Device fails to update with supervisor error 'There was an error validating configuration input for key: persistentLogging, with value: '",
      "slug": "support-issue-evice-fails-to-update-with-supervisor-error-here-was-an-error-validating-configuration-input-for-key-persistent-ogging-with-value-a43e6b82-48a3-4f38-96b5-087af77b5b18",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-15T12:31:30.088Z",
        "support issue has attached support thread": "2019-08-15T12:07:32.910Z"
      },
      "created_at": "2019-04-17T07:24:57.429Z",
      "updated_at": "2019-05-15T12:31:29.101Z",
      "capabilities": []
    },
    {
      "id": "01bd37b5-2da2-4af9-aa37-2d2d19437689",
      "data": {
        "Solution": "In resinOS 2.x [a number of changes were introduced](https://docs.resin.io/runtime/migrate-to-2.0/), one of which is improved file system reliability. Moving to resinOS 2.x currently requires an SD card reflash; soon it will be possible to perform the hostOS update action remotely. As a last note, please make sure that your application is working as expected in resinOS 2.x in test environment before deploying it to a production setting."
      },
      "name": "Generic 1.x SD card corruption issues and suggesting a move to 2.x",
      "slug": "scratchpad-entry-01bd37b5-2da2-4af9-aa37-2d2d19437689",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.278Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "01a04ee7-6373-4eb8-887d-6f62340140b4",
      "data": {
        "Problem": "Recent actions for reclaiming space on the git service (by git gc) caused permission issues on some git repo reference files, resulting in git push errors on a small number of applications.",
        "archived": false,
        "category": "git",
        "severity": "high"
      },
      "name": "Git service incident (21-06-2019)",
      "slug": "support-issue-git-service-incident-21-06-2019-d19c225b-948d-4e49-a318-46fce582bd7c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-28T12:38:15.950Z",
        "support issue has attached support thread": "2019-06-28T12:38:23.830Z"
      },
      "created_at": "2019-06-28T12:38:15.894Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "003ecb81-fd40-44cf-8d94-bfe3b7f9717b",
      "data": {
        "Problem": "User described that the supervisor is reported \"unhealthy\" by \"balena ps\" and logs \"Failed to kill service 'camera ...' due to '(HTTP code 409) unexpected - You cannot remove a running container ... Stop the container before attempting removal or force remove\". On investigation, we found that \"balena stop\" also fails to stop the offending container, but \"balena rm -f\" succeeds and \"solves problem\".",
        "Solution": "Pablo found that log errors in the balena logs (Error running exec in container ... containerd: container not found) match a moby-repo issue that points to containerd: https://github.com/moby/moby/issues/35091\nThe findings were shared with user, including the present fix (balena rm -f) and the fact we are porting a new version of Docker/Moby (18.09) that includes the fix. The user was asked to let us know if the issue reoccurs and share the device with us for investigation.",
        "category": "balena-engine",
        "severity": "high",
        "fixedInOSVersion": "2.33.0"
      },
      "name": "Failed to kill service HTTP code 409",
      "slug": "support-issue-ailed-to-kill-service-code-409-14655121-f2a1-458f-97c4-57c6f4263752",
      "tags": [
        "supervisor",
        "balena-engine",
        "http-409"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:20:40.586Z",
        "support issue has attached support thread": "2019-05-07T08:18:50.836Z"
      },
      "created_at": "2019-05-07T08:18:45.439Z",
      "updated_at": "2019-05-07T08:20:40.214Z",
      "capabilities": []
    },
    {
      "id": "77e34ed6-07c5-4d99-b84f-c3bc66d73747",
      "data": {
        "Problem": "When an user wants to modify the config.json, they might not want to set this for the whole app. Or they might not have access to the device and have to do it remotely.",
        "Solution": "Setting the config.json though the dashboard is currently not possible though is part of our roadmap (https://github.com/balena-io/balena/issues/1611)\n\nWe can suggest the user to modify the config.json with configizer (https://github.com/balena-io/configizer) \nthey should first test on a lab device before modifying production devices.",
        "severity": "low"
      },
      "name": "Modifying config.json remotely",
      "slug": "support-issue-modifying-config-json-remotely-53f13636-eeb4-4689-9dda-837970b78b63",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-04-17T14:59:11.345Z",
        "support issue has attached support thread": "2020-04-17T15:00:23.749Z"
      },
      "created_at": "2020-04-17T14:59:11.175Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2feb4eb5-1e7f-4338-a7bc-0c42c4dd3fe7",
      "data": {
        "Problem": "Since tcpdump is not installed on the host OS, here is a simple recipe for running it from a host OS terminal.",
        "Solution": "1. Open a host OS terminal.\n\n2. Source os-release so that the device type appears in the environment variables:\n\n```bash\nsource /etc/os-release\n```\n\n3. Downlad and run an alpine container as it is tiny. This will also mount `/mnt/data` to a `/data` location since we need to store the packet capture:\n\n```bash\nbalena run --rm -ti -v /mnt/data:/data --privileged --network host balenalib/${SLUG}-alpine /bin/bash\n``` \n\n4. Install tcpdump and run a packet capture from the bash alpine instance opened above. Make sure to set the correct networking interface name first:\n\n```bash\nexport IFACE=wlan0\ncd /data\napk add --no-cache tcpdump\ntcpdump -w container.pcap -i ${IFACE}\n```\n\n5. After your testing is over exit tcpdump with `Ctrl+C` and then close the container with `exit`.\n\n6. Delete CAREFULLY the downloaded `balenalib/${SLUG}-alpine` container to clean it up when no longer carefully (`balena images` and `balena rmi <ID>`\n\n7. Save the packet capture online with a service like file.io so that you may download it to your computer\n\n```bash\ncd /mnt/data/\ncurl -F \"file=@container.pcap\" https://file.io\nrm container.pcap\n```\n",
        "category": "networking",
        "severity": "low"
      },
      "name": "Capturing packets with tcpdump",
      "slug": "support-issue-capturing-packets-with-tcpdump-afa8f270-0b3b-472d-9041-21c77ab718c3",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-04-16T10:26:34.733Z"
      },
      "created_at": "2020-04-16T10:25:35.954Z",
      "updated_at": "2020-04-16T10:26:34.697Z",
      "capabilities": []
    },
    {
      "id": "d66fe2c9-f313-43c3-8a03-cffd4f9f6503",
      "data": {
        "Problem": "When investigating an issue on a Jetson, I've noticed that the temperature for Zone 4 is 100C! This sounds like a potential cause for the problem, with the board overheating!",
        "Solution": "In fact, this is a red herring. For some obscure reason, nVidia decided that an 'example' value of 100C for Zone 4 was a good idea (Zone 4 is not actually read from the PMIC but is just a driver value): https://forums.developer.nvidia.com/t/thermal-zone4-reports-100-degree-celcius/44422\n\nYou can ignore this safely (although for different Jetson boards, it may be alternate zones hold this value).",
        "severity": "low"
      },
      "name": "Jetson Zone 4 PMIC is showing a temperature of 100 degrees C",
      "slug": "support-issue-jetson-zone-4-pmic-is-showing-a-temperature-of-100-degrees-c-ef1978dd-0215-4b75-886c-b24cd91b4e9d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-04-09T20:31:08.709Z"
      },
      "created_at": "2020-04-09T20:31:08.508Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9b1baffa-c518-4fb6-afc0-316a68c40316",
      "data": {
        "Problem": "On slow network when application updates take a long time we are seeing the following error in the log:\n```\nFeb 10 18:59:02 395a86d resin-supervisor[3311]: Event: Docker image download {\"image\":{\"name\":\"registry2.balena-cloud.com/v2/93d39315da8c313ff75e4691fe00dbcd@sha256:cd45475b381bcc917dca6315ceb1b01808e3590bcd78b1b6de367c93442a6afd\",\"appId\":1169020,\"serviceId\":308173,\"serviceName\":\"guru-cam\",\"imageId\":1936689,\"releaseId\":1249222,\"dependent\":0,\"dockerImageId\":null}}\nFeb 10 18:59:03 395a86d resin-supervisor[3311]: Internet Connectivity: OK\nFeb 10 18:59:04 395a86d resin-supervisor[3311]: Event: Service started {\"service\":{\"appId\":1169020,\"serviceId\":354287,\"serviceName\":\"voip\",\"releaseId\":1249222}}\nFeb 10 18:59:04 395a86d resin-supervisor[3311]: Event: Service kill {\"service\":{\"appId\":1169020,\"serviceId\":354287,\"serviceName\":\"voip\",\"releaseId\":1249222}}\nFeb 10 18:59:14 395a86d resin-supervisor[3311]: Supervisor API: POST /v2/applications/1169020/stop-service  -  ms\nFeb 10 18:59:16 395a86d resin-supervisor[3311]: Event: Service stop {\"service\":{\"appId\":1169020,\"serviceId\":354287,\"serviceName\":\"voip\",\"releaseId\":1249222}}\nFeb 10 18:59:16 395a86d resin-supervisor[3311]: Event: Service exit {\"service\":{\"appId\":1169020,\"serviceId\":354287,\"serviceName\":\"voip\",\"releaseId\":1249222}}\nFeb 10 19:03:53 395a86d resin-supervisor[3311]: Supervisor API: GET /v1/healthy 200 - 16.968 ms\nFeb 10 19:06:11 395a86d systemd[1]: resin-supervisor.service: Watchdog timeout (limit 3min)!\n```",
        "Solution": "Updating to 2.41.1+ should solve most of the problems or at the very least significantly reduce the issue.\n\nIf its absolutely not possible to update the OS to above 2.41.1, then a workaround to the problem, the timeout in the resin-supervisor service can be extended:\n```\nmount -o remount,rw /\nvi /lib/systemd/system/resin-supervisor.service\n```\nChange the following line to extend the timeout:\n```\nWatchdogSec=180\n```\nto\n```\nWatchdogSec=360\n```\nRestart the supervisor:\n```\nsystemctl daemon-reexec\nsystemctl restart resin-supervisor\n```\nCheck that the change has been applied with:\n```\nsystemctl show resin-supervisor --all | grep -i watchdog\n```",
        "category": "resin-supervisor",
        "severity": "low",
        "fixedInOSVersion": "2.41.1",
        "affectedOSVersions": [
          "2.31.5+rev1"
        ],
        "affectedSupervisorVersions": [
          "9.11.3"
        ]
      },
      "name": "Supervisor's being restarted by watchdog in the middle of application updates",
      "slug": "support-issue-supervisor-s-being-restarted-by-watchdog-in-the-middle-of-application-updates-cc0d965e-ed82-467a-b920-86d0869011fe",
      "tags": [
        "resin-supervisor"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-04-07T12:49:28.752Z",
        "support issue has attached support thread": "2020-04-03T20:09:31.540Z"
      },
      "created_at": "2020-02-10T19:24:09.400Z",
      "updated_at": "2020-04-07T12:49:28.706Z",
      "capabilities": []
    },
    {
      "id": "f7b4cbd0-408d-4e3e-b6b7-4d6cd8933bc9",
      "data": {
        "Problem": "User trying to push application code is getting the following error:\n\n[Error] Upstream API server/DB error: Too Many Requests\n\n",
        "Solution": "This is likely caused by reaching the limit of API requests per minute which at the moment is 750. This limit is not set in stone and it should not be made public. It is high enough and designed to stop abusive use.\nThere is an \"API count request by actor\" in logentries that can be checked to see the issued requests, assuming that you can find the actor ID from the user account somehow.",
        "severity": "low"
      },
      "name": "Too Many Requests to API server/DB error",
      "slug": "support-issue-too-many-requests-to-api-server-db-error-cb87b96d-78d8-488a-8a66-be43347ee3ff",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-26T17:43:42.806Z",
        "support issue has attached support thread": "2020-03-26T17:46:00.162Z"
      },
      "created_at": "2020-03-26T17:26:00.426Z",
      "updated_at": "2020-03-26T17:43:42.765Z",
      "capabilities": []
    },
    {
      "id": "8dfba893-f518-4a02-8103-ed5c5f7169c5",
      "data": {
        "Problem": "OStree looks like a great way to update OS systems, why don't we use it?",
        "Solution": "OStree is a great project and we follow it closely. Our number one goal for balenaOS was (and still is) unifying the way the host OS and containers are managed since they share a big area of requirements. They look and feel the same, they need to be distributed, follow a similar lifecycle, etc.\n\nSo any path towards ostree raises the question of how to run containers on OSTree. There are a lot of issues when trying to go down that path. They are not unsolvable, but it's a lot of work. The first issue is that OSTree does not have the concept of layers like Docker. This means that there has to be a conversion step between the result of docker build and what gets installed on the device. This is a problem not only because of the extra processing, but also because what gets on the device is not bit-identical to what the docker build was. This invariant is important when we start talking about container signatures. In this case the device must be able to verify that what it got is correct, and this raises the bar for the conversion to a flat layer.\n\nThe next issue is that OSTree works with so-called hard link farms. This means that identical files are hard linked together. This means that if you attempt to distribute an image that has many small files that have the same content (are empty for example) they will all be hard linked together. This subtly breaks the original semantics of the image and I'm not comfortable saying \"it's probably ok\". The docker issue tracker has had many cases historically of problems in programs caused by filesystem semantics changing due to aufs or whatnot.\n\nThe next issue has to do with the distribution mechanism. The equivalent OSTree pull command does a recursive decent on the root filesystem it wants to checkout, starting at the root and skipping common subtrees. At the time this meant one HTTP request per object, which is not only very slow but also has a lot of protocol overhead. This is now better because they have added support for HTTP/2 but I believe there is still low hanging fruit there.\n\nFinally on the delta front they are using a mixed mechanism where each file is diffed using librsync or bsdiff depending on which is better. The delta generation was pretty slow (mostly due to bsdiff) and (I'm not 100% on this one) I don't think it diffed everything with everything like balenaEngine does.\n\nNow, all of the above can be fixed with enough work but the conclusion is that it's not worth trying to make OStree fit our needs but instead make balenaEngine. The OSTree path would have an extra practical problem of being written in C which is both scary from a security perspective but also a language that I don't have deep expertise in.",
        "category": "OS updates",
        "severity": "low",
        "shareable": true
      },
      "name": "Why doesn't balenaOS use OStree for updates",
      "slug": "support-issue-why-doesn-t-balenaos-use-ostree-for-updates-bd2e7584-2c0b-4458-8512-7dfa12da4cf5",
      "tags": [
        "OStree"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-25T08:43:23.354Z"
      },
      "created_at": "2020-03-25T08:43:23.201Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "68addd7b-0e24-4993-97c4-ad2b828f032f",
      "data": {
        "Solution": "```\nssh terminal.balena-devices.com host $UUID journalctl -a > logs.txt\n```",
        "severity": "low"
      },
      "name": "Grab logs from a device",
      "slug": "support-issue-grab-logs-from-a-device-5b9cedc7-8dbb-4ef6-92eb-6776bf275217",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-29T21:27:04.633Z"
      },
      "created_at": "2019-10-29T21:27:04.397Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7240f35e-93cf-4024-ac25-21c988200fc3",
      "data": {
        "Problem": "The supervisor is in a restart loop with an error similar to:\n```\nError starting supervisor api\n   address already in use :::48484\n```\n",
        "Solution": "First run `balena ps -a` to ensure there are no \"phantom\" supervisor containers. If there are, ping the balena-engine maintainer.\n\nIf it is not, move on to checking if there is something listening on that port:\n```\nnetstat -nlt | grep 48484\n```\n\nIf there is, you can get the PID of the process from the same command, and run `ls -l /proc/<pid>/exe` to find the executable.\n`ls -l /proc/<pid>/cwd` will also tell you the current working directory (it will probably be inside an application container).\n\nIf the `netstat` command above does not give any output, run `fuser 48484/tcp` and look for something like:\n`localhost.localdomain:48484->localhost.localdomain:48484`\n\nThis means that the ephemeral port chosen for connections is the same as the port used for listening. The kernel will create\na sort of infinite socket loop and it causes several problems. The easiest method to get a device back up and running is to\nstop the user application containers and restart the supervisor, but it will likely happen again on reboot. To avoid it completely\nthe device should be updated to a version which supports: https://github.com/balena-os/meta-balena/issues/1726\n\nPing @CameronDiver to take a look if you're not sure what to do with it.\n\n",
        "severity": "high"
      },
      "name": "Supervisor won't start up due to address already in use",
      "slug": "support-issue-supervisor-won-t-start-up-due-to-address-already-in-use-18b19f02-4bc1-4678-82f7-933db98543b2",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-30T16:48:18.628Z"
      },
      "created_at": "2019-10-30T16:48:18.515Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7a7e2f43-51e3-4871-ae68-0a36d25a3ac5",
      "data": {
        "Problem": "The user reports that at random days/times the device time resets itself to (what seems like) the build time of the OS. \n\nExperienced on OS `2.26.0+rev1` on Raspberry Pi 2",
        "Solution": "Currently this is assumed to be related to device reboots. \n\n**WORK AROUND**\nThis can be run from the container or OS and will reset the time:\n`date -s \"$(curl --silent --head --insecure https://api.balena-cloud.com/ping | grep -i Date: | sed 's/[Dd]ate: //')\"`\n\n",
        "archived": false,
        "severity": "medium",
        "device-type": "Raspberry Pi 2",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "": {
              "type": "string"
            },
            "device-type": {
              "type": "string"
            }
          }
        }
      },
      "name": "Device Time randomly is incorrect.",
      "slug": "support-issue-evice-ime-randomly-is-incorrect-f8a87e75-5389-4fbd-a666-6996b323e281",
      "tags": [
        "NTP",
        "time"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:43:36.957Z",
        "support issue has attached support thread": "2019-11-13T20:41:56.938Z"
      },
      "created_at": "2019-04-02T10:43:36.543Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b3946dc7-dae8-4db8-8423-374be3a8c073",
      "data": {
        "Problem": "Some time the initial build dependencies for the build can take hours to build in localMode. The user would like to use the beefy cloud builder to do the initial build and then switch into localmode for quick development, unfortunately this is not very easy currently.",
        "Solution": "The current work around is to build a custom base images for the long build and then do a `FROM mydockername/mycustomimage` image. They can use the cloud builder to push to a app and then let the device download it. Then from the hostOS of the deivce you can do. `balena-engine login` and `balena-engine tag mydockeruser/mycustomimage <imageID>`. Then to publish it on dockerhub do `balena-engine push mydockeruser/mycustomimage`",
        "category": "devexp",
        "severity": "low"
      },
      "name": "User wants to use cloud builder for initial build and then switch to localMode",
      "slug": "support-issue-ser-wants-to-use-cloud-builder-for-initial-build-and-then-switch-to-local-ode-1fdba0d4-1b4b-4f29-967c-4b4dc5f2b66c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:02:07.526Z",
        "support issue has attached support thread": "2019-04-30T12:02:09.556Z"
      },
      "created_at": "2019-04-30T12:02:06.961Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "bfcc8e42-72f0-4824-9263-6248916014fa",
      "data": {
        "Problem": "if a use does `FROM balenalib/raspberrypi3-debian-node` , its not explicit what nodeJS version is included, how do you figure out what version on node is included in the container.",
        "Solution": "It depends on what balenalib base image are you using. You can check the documentation here:\n\nhttps://www.balena.io/docs/reference/base-images/base-images/\n\nIt contains supported node versions and it also contains description how to choose a different node version via balenalib image tag.",
        "category": "baseimage",
        "severity": "low"
      },
      "name": "How do I figure out what NodeJS version is installed in my container",
      "slug": "support-issue-ow-do-figure-out-what-ode-version-is-installed-in-my-container-577d4c9d-ea6a-4e25-a406-7401f7b1625b",
      "tags": [
        "nodejs"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:11:58.944Z",
        "support issue has attached support thread": "2019-04-30T12:14:43.904Z"
      },
      "created_at": "2019-04-30T12:11:58.625Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4855572e-7093-488f-8c2f-bc360b67c09d",
      "data": {
        "Problem": "The users device was not updating the app and the supervisor was logging:\n```\n Scheduling another update attempt due to failure:  256000 SyntaxError: Unexpected token ¨ in JSON\n```",
        "Solution": "The `RESIN_HOST_CONFIG_dtoverlay` variable needs to be an array of comma separated strings. e.g: `\"enpuntoTFT,rotate=90\",\"pi3-disable-bt\",\"i2c-rtc,ds3231\"`.\n\nIn the case above the user had used a different character for the `\"`",
        "category": "configuration",
        "severity": "low"
      },
      "name": "App update doesn't due to invalid RESIN_HOST_CONFIG variable",
      "slug": "support-issue-pp-update-doesn-t-due-to-invalid-variable-dcf467ea-7a27-4e1c-83ae-016fc7defb6d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:22:47.659Z",
        "support issue has attached support thread": "2019-04-30T12:22:49.374Z"
      },
      "created_at": "2019-04-30T12:22:47.143Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e14630d7-0c49-48c8-9e9b-1a03390a8eac",
      "data": {
        "Problem": "How much bandwidth does a OS update use approximately?",
        "Solution": "The typical size is about 100mb for the os and 25mb for the supervisor. In future releases we will be able to offer OS delta updates.",
        "category": "OS updates",
        "severity": "low"
      },
      "name": "How big are OS updates",
      "slug": "support-issue-ow-big-are-updates-06b85835-b23e-493c-881b-7fda03acab2e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:30:01.104Z",
        "support issue has attached support thread": "2019-04-30T12:30:03.895Z"
      },
      "created_at": "2019-04-30T12:30:00.729Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "14ffdd6c-df09-4712-a776-425e0e40b38b",
      "data": {
        "Problem": "What are the dangers of OS updates and how risky are they generally.",
        "Solution": "It is good strategy to try going with the latest OS version when possible (we are working on better changelog and feature/fixes announcements for people to be able to decide when to update). \n\nIt is also recommended toTest the new OS version on some testing/lab devices before updating the ones out in the field. The OS update itself is generally not risky as if the update fails, the device won't be modified (we are aiming proper atomic updates), also we have some safeguards that if the updated system behaves unhealthy it can be rolled back automatically (these are features for the current latest versions of the os 2.31.5). The riskiest part of the os update is if someone is not testing a device on the new OS version with their application before updating in the field, in our opinion.",
        "category": "OS updates",
        "severity": "low",
        "fixedInOSVersion": "2.31.5"
      },
      "name": "How risky are OS updates",
      "slug": "support-issue-ow-risky-are-updates-b1a2dff2-2c52-4b73-986b-0bdb482f7e19",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:32:35.271Z",
        "support issue has attached support thread": "2019-04-30T12:32:37.833Z"
      },
      "created_at": "2019-04-30T12:32:34.806Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "88493541-95c7-4031-b1e8-42e3c55c2b56",
      "data": {
        "Problem": "The App container can't update because the cellular (GSM) network is too poor to manage the download",
        "Solution": "Suggested work around is to enable delta updates ",
        "category": "App updates",
        "severity": "low"
      },
      "name": "App container doesn't update on cellular network",
      "slug": "support-issue-pp-container-doesn-t-update-on-cellular-network-618dcc8e-cac7-484b-bfaf-07d5f2419a02",
      "tags": [
        "cellular",
        "modem",
        "network",
        "poor-network"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:36:47.777Z",
        "support issue has attached support thread": "2019-04-30T12:36:49.718Z"
      },
      "created_at": "2019-04-30T12:36:47.382Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "cf0edb68-4e6e-4bd7-ba76-e1cdc80c3da7",
      "data": {
        "Problem": "User wants to create aa GUI or x11 server",
        "Solution": "We have two blogposts on then subject here:\nhttps://www.balena.io/blog/running-a-gui-application-with-balenacloud/\nhttps://www.balena.io/blog/running-a-desktop-manager-with-balena/",
        "category": "GUI",
        "severity": "low"
      },
      "name": "How do I use a GUI or x11 display in balenaOS",
      "slug": "support-issue-ow-do-use-a-or-x11-display-in-balena-28cf3b98-6141-4574-a14f-11dbad51e052",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T12:57:19.243Z",
        "support issue has attached support thread": "2019-04-30T12:57:25.012Z"
      },
      "created_at": "2019-04-30T12:57:18.594Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "05f2fb88-9153-479b-b793-486b7e63171a",
      "data": {
        "Problem": "device fails to boot, seeming while trying to load kernel.",
        "Solution": "unknown, suspected SD card corruption.",
        "category": "OS booting",
        "severity": "low"
      },
      "name": "device hangs on boot waiting to load kernel",
      "slug": "support-issue-device-hangs-on-boot-waiting-to-load-kernel-0b1fec61-24fb-4643-8327-9a0261524091",
      "tags": [
        "corruption",
        "sdcard"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T13:28:30.833Z",
        "support issue has attached support thread": "2019-04-30T13:28:32.737Z"
      },
      "created_at": "2019-04-30T13:28:30.303Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e20fda8f-c982-4d2d-bcd3-a573f61a2336",
      "data": {
        "Solution": "I managed to get it working like this:\n```\nFROM balenalib/amd64-python:2-stretch-run\n\nRUN apt-get update -qqy && apt-get install -qqy openssh-server\nRUN mkdir /var/run/sshd \\\n        && echo 'root:1234' | chpasswd \\\n        && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \\\n        && sed -i 's/UsePAM yes/UsePAM no/' /etc/ssh/sshd_config \\\n        && echo \".<(xargs -0 bash -c 'printf \"export %q\\n\" \"$@\"' -- < /proc/1/environ')\" >> /root/.profile\n\nCMD [\"/usr/sbin/sshd\", \"-D\", \"-e\"]\n```\nopenssh-server needed to be installed and run\nI had to change `s/PermitRootLogin prohibit-password/PermitRootLogin yes/` to `s/#PermitRootLogin prohibit-password/PermitRootLogin yes/`\n\nTo have it run service you could use something like supervisor or launch the sshd in the background.",
        "category": "ssh in app",
        "severity": "low"
      },
      "name": "How do I run ssh in my container on balenalib images",
      "slug": "support-issue-ow-do-run-ssh-in-my-container-on-balenalib-images-6141f785-f57b-43dd-ab1a-7ce8aac4b249",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-30T13:47:31.116Z",
        "support issue has attached support thread": "2019-04-30T13:47:33.238Z"
      },
      "created_at": "2019-04-30T13:47:30.720Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "19463ea3-d13c-487e-9ebe-4dbc1669e185",
      "data": {
        "Problem": "Several balena commands will just hang when targeting a specific container. When this was observed the supervisor was also being restarted by watchdog at fixed intervals of 20 minutes.\n\nAfter activating [debug logging for the docker daemon](https://success.docker.com/article/how-do-i-enable-debug-logging-of-the-docker-daemon) a similar message should show up in the logs\n\n```\nFeb 08 09:12:17 184ff57 balenad[860]: time=\"2019-02-08T09:12:17.715477355Z\" level=debug msg=\"Name To resolve: <faulty container name>.\"\nFeb 08 09:12:17 184ff57 balenad[860]: time=\"2019-02-08T09:12:17.715737979Z\" level=debug msg=\"[resolver] lookup for <faulty container name>.: IP [172.18.0.3]\"\n```\n\nSeems to be related to https://github.com/docker/for-linux/issues/543",
        "Solution": "Stopping and starting balena seems to fix this issue.\n\n```\nsystemctl stop balena\nsystemctl start balena\n```",
        "severity": "medium"
      },
      "name": "Balena inspect/kill/exec hangs",
      "slug": "support-issue-alena-inspect-kill-exec-hangs-0fff80e8-b3a9-435c-a553-9889c53e5484",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-06-13T20:42:12.643Z"
      },
      "created_at": "2019-02-08T09:55:20.240Z",
      "updated_at": "2019-06-13T20:42:12.528Z",
      "capabilities": []
    },
    {
      "id": "b893913a-c1e3-46bf-94cf-6c6b3340d24f",
      "data": {
        "Problem": "How can I transfer a file or set of files to my device(s) directly and not have to have them as part of my deployed code.",
        "Solution": "Well, glad you asked. :slight_smile: In the current state of play, it may require a few setting up steps, depending on exactly what needs to be achieved.\n\nThe standard `ssh`, `scp` and `rsync` tools can be used with balenaOS devices. It works with both [development and production balenaOS images](https://www.balena.io/docs/reference/OS/overview/2.x/#dev-vs-prod-images). In the case of a production image, a ssh key should be added to the config.json file – see [sshKeys section of the meta-balena README file](https://github.com/balena-os/meta-balena/blob/master/README.md#sshkeys). In the case of a development image, no keys are required. (Development images allow root login without a password or ssh keys, so should never be directly exposed to the public internet.)\n\nThe ssh server on a device (host OS) listens on TCP port number 22222. This port is not blocked by the device host OS, not even in production. If this port is blocked by a firewall or router on the device’s local network, or if the device has a private IP address, the `balena` tunnel command can be used as in the examples below.\n\nExample 1 (port 22222 not blocked in the device’s local network, and the device has a public / globally routable IPv4/v6 address)\n```\n# All these commands to be executed on your laptop/desktop\n$ ssh -p 22222 root@<device_ip_address>\n$ scp -P 22222 my_local_file root@<device_ip_address>:/mnt/data/\n$ export RSYNC_RSH='ssh -p 22222'\n$ rsync my_local_file root@<device_ip_address>:/mnt/data/\n```\n\nExample 2 (port 22222 is blocked in the device’s local network, or private IP address)\n```\n# All these commands to be executed on your laptop/desktop\n$ balena tunnel <deviceUUID> -p 22222:4321\n$ ssh -p 4321 root@127.0.0.1\n$ scp -P 4321 my_local_file root@127.0.0.1:/mnt/data/\n$ export RSYNC_RSH='ssh -p 4321'\n$ rsync my_local_file root@127.0.0.1:/mnt/data/\n```\n\nNote that the UUID argument for the `balena tunnel` commands should be the “long UUID”, not the “short UUID”. Using the “short UUID” may result in some counter-intuitive errors.\n\nThe examples above all transfer files between your laptop/desktop and a folder accessible via the device’s host OS – e.g. /mnt/data/. You you may be able to rely on [named volumes](https://www.balena.io/docs/learn/develop/runtime/#balenaos-v2120-and-above) to transfer files to app containers in this way. But with a bit more setting up, it’s possible to using rsync to transfer files directly into the app container:\n```\n# All these commands to be executed on your laptop/desktop\n$ balena tunnel <deviceUUID> -p 22222:4321\n$ export RSYNC_RSH=\"/home/user/rsync-shell.sh\" && chmod +x \"$RSYNC_RSH\"\n$ rsync my_local_file main_1_1:destination_folder/\n```\nWhere `'main_1_1'` is the name of the app container (as listed by `balena-engine ps` on the host OS).\n\nThe `export` line above mentions a `rsync-shell.sh` script. Here’s a basic version of it, with hardcoded values for port numbers and container names:\n\n**rsync-shell.sh**\n```\n#!/bin/bash\nCONTAINER_NAME='main_1_1'\nTUNNEL_OPTS='-p 4321 root@127.0.0.1'\nnew_args=()\nfor arg in \"$@\"; do\n  if [ \"$arg\" = \"$CONTAINER_NAME\" ]; then\n    new_args+=(\"$TUNNEL_OPTS\" balena-engine exec -i \"$CONTAINER_NAME\")\n  else\n    new_args+=(\"$arg\")\n  fi\ndone\necho original command: ssh \"$@\" >&2\necho modified command: ssh ${new_args[@]} >&2\nssh ${new_args[@]}\n```\n\nNotes:\n\n`rsync` needs to installed in the app container too. Typically it is a case of `apt-get update; apt-get install rsync`.\nThe `rsync-shell.sh` script can be improved to suit your use case. As given above, it prints its original and modified input arguments to stderr, so it’s easier to see what is going on when you run `rsync`.",
        "archived": false,
        "category": "configuration",
        "severity": "low"
      },
      "name": "How can I transfer files onto a device.",
      "slug": "support-issue-ow-can-transfer-files-onto-a-device-2ac63950-967f-4985-a0bf-69688611769e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T09:03:09.642Z",
        "support issue has attached support thread": "2019-05-06T09:03:11.184Z"
      },
      "created_at": "2019-05-06T09:03:09.227Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4a7c5c8c-a1dc-49a2-a881-30bcaf91dd1c",
      "data": {
        "Problem": "I no longer want to use the balena service and need to cancel my billing plan. How do I do this.",
        "Solution": "It is possible to  change your plan via https://dashboard.balena-cloud.com/billing/summary , you can downgrade to the Free plan, provided you first remove any additional members and devices from your account. TO move to the free plan, you have to have less than 10 devices  in all your apps combined.",
        "archived": false,
        "category": "billing",
        "severity": "low"
      },
      "name": "How can I cancel my billing plan",
      "slug": "support-issue-ow-can-cancel-my-billing-plan-13a34237-798d-4d11-8414-d722fb7e1785",
      "tags": [
        "billing",
        "cancel",
        "downgrade"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T10:19:01.739Z",
        "support issue has attached support thread": "2019-05-06T10:19:04.885Z"
      },
      "created_at": "2019-05-06T10:19:01.310Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8480b1a0-3b7b-4630-9783-d3fe472a8ceb",
      "data": {
        "Problem": "I have a internal network of devices connected via ethernet that my gateway needs to talk to. The gateway needs to connect to the inter via wifi , but when i plug in the ethernet, the default route is set to ethernet, which is wrong.",
        "Solution": "define a higher route-metric number for the default ethernet connection. You can create a default network connection like so:\n```\n[connection]\nid=my-ethernet\ntype=ethernet\ninterface-name=eth0\npermissions=\nsecondaries=\n\n[ethernet]\nmac-address-blacklist=\n\n[ipv4]\nnever-default=true\nroute-metric=2000\ndns-search=\n\nignore-auto-routes=true\nmethod=auto\n\n[ipv6]\naddr-gen-mode=stable-privacy\ndns-search=\nmethod=auto\n```",
        "archived": false,
        "category": "networkin",
        "severity": "low"
      },
      "name": "How can I use ethernet as an internal network and have wifi as my route to internet",
      "slug": "support-issue-ow-can-use-ethernet-as-an-internal-network-and-have-wifi-as-my-route-to-internet-e01102ae-793f-45e7-ac3b-2c430b1c18ad",
      "tags": [
        "product",
        "networking",
        "ethernet"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T10:04:02.124Z",
        "support issue has attached support thread": "2019-05-06T10:04:04.213Z"
      },
      "created_at": "2019-05-06T10:04:01.848Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ec46f4cf-5b0d-4250-8feb-3499719e39c9",
      "data": {
        "Problem": "How do I remove any previous wifi or network connections and only use ethernet?",
        "Solution": "From the hostOS you can remove all network config by removing all files from `/mnt/boot/system-connections` and `/etc/NetworkManager/system-connections` .\n\nthe reason you have to delete both is that `/mnt/boot/system-connections` are the pre-boot connection files, so on every boot, they are copied over into `/etc/NetworkManager/system-connections` folder applied. ",
        "archived": false,
        "category": "networking",
        "severity": "medium"
      },
      "name": "How do I delete all wifi connections from balenaOS",
      "slug": "support-issue-ow-do-delete-all-wifi-connections-from-balena-e0635365-5343-443f-b800-3d3d6bb7951e",
      "tags": [
        "wifi",
        "product-call"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T09:49:56.573Z",
        "support issue has attached support thread": "2019-05-06T09:49:58.296Z"
      },
      "created_at": "2019-05-06T09:49:56.162Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e527749d-96c3-40c6-9ae1-0ea36690c07a",
      "data": {
        "Problem": "I want to create a windows 10 bootable flash drive using etcher",
        "Solution": "Etcher does not support flashing Windows on USB sticks, as doing that correctly requires a Windows-specific procedure that is different from other bootable images. Please use Rufus or the official Windows flashing tool instead!",
        "archived": false,
        "category": "etcher",
        "severity": "low"
      },
      "name": "How can I flash windows 10 onto a usb drive using etcher?",
      "slug": "support-issue-ow-can-flash-windows-10-onto-a-usb-drive-using-etcher-466809fc-11fa-42a7-b1a1-be6b31a19ff4",
      "tags": [
        "windows",
        "etcher",
        "rufus"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T10:12:36.286Z",
        "support issue has attached support thread": "2019-05-06T10:12:38.532Z"
      },
      "created_at": "2019-05-06T10:12:35.785Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b968cf41-e7fa-4811-9c33-ade3b5889ce8",
      "data": {
        "Problem": "The device is not downloading pp updates and supervisor wont start up.",
        "Solution": "what happened, is that the supervisor on the device wasn't running correctly. For the application update locking feature it uses some folders in the /tmp temporary folder in the host OS. I see that these devices are very long running devices, uptimes of 54 days or so.\n\nOn this OS version, systemd unfortunately garbage-collects those folders after 7 days of uptime, and that can result the supervisor not finding the folder there that it expected, and thus cannot run. Now restarted the supervisor, and all 3 devices seem to be downloading.\n\nThe fix for this was in OS version 2.30.0 https://github.com/balena-os/meta-balena/blob/master/CHANGELOG.md#v2300 (Configure systemd tmpfiles to ignore supervisor tmp directories) and thus those versions and newer are not affected by this.\n\nSo either you can update devices on the newer OS version, or reboot them at least once a week, or in your application, if any file is being updated at least once a week in \"/tmp/balena\" (e.g. \"touch /tmp/balena/foo\" at least once a week), then those folders won't be garbage collected, and the device will function fine.\nAny of these 3 solutions should work, though we likely recommend the first one of these.",
        "archived": false,
        "category": "App Updates",
        "severity": "low",
        "fixedInOSVersion": "2.30.0"
      },
      "name": "App updates not applying and supervisor can't start",
      "slug": "support-issue-pp-updates-not-applying-and-supervisor-can-t-start-eec0dfdd-2142-4f41-ad3e-2d54433a486f",
      "tags": [
        "tmpfiles",
        "tmp",
        "supervisor",
        "lock"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T10:37:10.558Z",
        "support issue has attached support thread": "2019-05-06T10:36:07.813Z"
      },
      "created_at": "2019-05-06T10:36:03.367Z",
      "updated_at": "2019-05-06T10:37:10.148Z",
      "capabilities": []
    },
    {
      "id": "3bf130d6-8d5c-49ca-9904-efd20e9efaae",
      "data": {
        "Problem": "Users services are restarting over and over after upgrading to OS 2.32 ",
        "Solution": "Supervisor fix: https://github.com/balena-io/balena-supervisor/issues/970\n\nWhen an `EXPOSE` instruction is used in a `Dockerfile` , and an overlapping `expose` or `ports` instruction is also used in the `docker-compose.yml` file, the supervisor will restart the app container in a loop.\nThe temporary workaround is to remove the overlapping setting from either the `Dockerfile` or the `docker-compose.yml` file.\n\nWork around is to remove the `EXPOSE` from Dockerfile or upgrade supervisor.",
        "archived": false,
        "category": "App Updates",
        "severity": "medium",
        "fixedInOSVersion": "2.33",
        "fixedInSupervisorVersion": "9.14.5"
      },
      "name": "App restart loop in balenaOS 2.32.0+rev2 when overlapping expose / ports instructions are used",
      "slug": "support-issue-pp-restart-loop-in-balena-2-32-0-rev2-when-overlapping-expose-ports-instructions-are-used-3de28c0b-350b-4135-b8ef-d4a97af0f0a8",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T09:37:36.407Z",
        "support issue has attached support thread": "2019-05-06T09:51:28.326Z"
      },
      "created_at": "2019-05-06T09:37:36.064Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "340fbb4d-c8e0-4ad9-b047-95dce1668265",
      "data": {
        "Problem": "`balena envs --application myApp` doesnt work on openBalena",
        "Solution": "TLDR; there is some dissonance in how env vars are handled between open source and cloud API v5 because the cloud API has some additional functionality that allows it to translate a request and match the model that didn’t make it in openBalena (yet). The next openBalena release will include a fix for this issue, but until then using the API directly is the workaround. As per this thread https://forums.balena.io/t/support-for-device-environment-variables/4357/34",
        "archived": false,
        "category": "env vars",
        "severity": "low"
      },
      "name": "Setting Env vars via CLI on openbalena doesn't work",
      "slug": "support-issue-etting-nv-vars-via-on-openbalena-doesn-t-work-fc9490be-cf03-4d61-965a-5a2fd583bf3f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T09:29:12.810Z",
        "support issue has attached support thread": "2019-05-06T09:29:14.666Z"
      },
      "created_at": "2019-05-06T09:29:12.457Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "25043ac9-c951-4d44-bfe9-f39245ad2431",
      "data": {
        "Problem": "How do i know what application type I am running and if I have access to multicontainer or device URLs.",
        "Solution": "Documentation explains them here https://www.balena.io/docs/learn/manage/app-types/#new-applications",
        "category": "app types",
        "severity": "low"
      },
      "name": "How do I know what application type I have and what features it has?",
      "slug": "support-issue-ow-do-know-what-application-type-have-and-what-features-it-has-9e0dfce0-c8fa-4d24-a7cf-f8999c7ded18",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T07:54:24.992Z",
        "support issue has attached support thread": "2019-05-07T07:54:26.620Z"
      },
      "created_at": "2019-05-07T07:54:24.724Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b5ce8dd4-ef7b-4388-8055-bfbf9c75e195",
      "data": {
        "Problem": "A holding issue for all junk mail sent to support@balena.io",
        "severity": "low"
      },
      "name": "Spam email",
      "slug": "support-issue-pam-email-4e91a6b5-75ac-42d2-93f9-ed9dda133f62",
      "tags": [
        "spam",
        "junk",
        "mail"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T07:49:37.628Z",
        "support issue has attached support thread": "2019-05-07T07:49:40.720Z"
      },
      "created_at": "2019-05-07T07:49:37.162Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9c907168-f643-4e23-8b31-7de89d71bfba",
      "data": {
        "Problem": "User wants to have selected devices in an app/fleet run a defined set of services. They want to be able to only enable services on some devices if their customers have paid for them. Something similar to kubernetes labels",
        "Solution": "we don’t have a built in way to do that currently, but you can use ENV vars and a well designed entrypoint for you services as shown in this project here: https://github.com/tdicola/balena_logging_sensors_pt_3/blob/master/index.md . In that project you will see we use RUN_ON_DEVICES=collector-pi3 on a service to make it run on specific devices that have that env var set. The entrypoint script also has some more info on this here: https://github.com/tdicola/balena_logging_sensors_pt_3/blob/master/app/influxdb/balena_entrypoint.sh",
        "category": "feature enablement",
        "severity": "low"
      },
      "name": "How can I run only a set of services some devices and not others in an App?",
      "slug": "support-issue-ow-can-run-only-a-set-of-services-some-devices-and-not-others-in-an-pp-68cd1403-ef94-49b1-b557-2eff41477f7f",
      "tags": [
        "kubernetes"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:24:59.246Z",
        "support issue has attached support thread": "2019-05-07T08:25:00.990Z"
      },
      "created_at": "2019-05-07T08:24:58.851Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "029d9309-8953-4ab9-ba8e-694b0e60bdb6",
      "data": {
        "Problem": "User wants to query the state of NTP synchronisation of the OS from the container using dbus and python ",
        "Solution": "```Dockerfile\nFROM balenalib/raspberrypi3-python:3.6-build\n\nWORKDIR /src\n\nENV DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket\n\nRUN apt-get update && apt-get install -y \\\n    vim \\\n    && rm -rf /var/lib/apt/lists/*\n\nCOPY ./requirements.txt /src/requirements.txt\nRUN pip3 install -r /src/requirements.txt\nCOPY . /src/\n\n# Add path of common container package\nENV PYTHONPATH=\"$PYTHONPATH:/var/lib/common_package\"\n\nCMD [\"python\", \"monitor.py\"]\n```\n\nand the python3 script:\n```python\nimport python\nbus = dbus.SystemBus()\nproxy = bus.get_object('org.freedesktop.timedate1',\n                       '/org/freedesktop/timedate1')\ninterface = dbus.Interface(proxy, 'org.freedesktop.DBus.Properties')\nproperties = interface.GetAll('org.freedesktop.timedate1')\nprint(properties)\n```",
        "category": "NTP",
        "severity": "low"
      },
      "name": "How can I check NTP state with Python/dbus",
      "slug": "support-issue-ow-can-check-state-with-ython-dbus-c6f3007c-ea57-4ddb-8469-76eaa46c1531",
      "tags": [
        "NTP",
        "dbus",
        "time"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:09:12.784Z",
        "support issue has attached support thread": "2019-05-07T08:08:23.600Z"
      },
      "created_at": "2019-05-07T08:08:21.284Z",
      "updated_at": "2019-05-07T08:09:12.241Z",
      "capabilities": []
    },
    {
      "id": "78089d1b-896a-4b41-823b-b7e5186ec7c8",
      "data": {
        "Problem": "https://status.balena.io/incidents/t0mlz0ljtypp\n\nAs part of a routine builder deploy we encountered an issue where the existing builder instances were terminated and at the same time new instances were unable to start up, because of previously undetected errors in our 'etcd' discovery service. Whilst restoring the ability for new builder instances to start up, the git server was unable to handle git pushes or application creation attempts. \nThe incident was resolved by fixing the 'etcd' service errors and redeploying it to all affected cloud instances. We have also updated our deployment process documentation with more detailed steps for a few rare deployment actions, improving future reliability. \nIn total balena push was unavailable from 12:49-13:33 UTC, git push from 12:49-13:58 UTC, and application creation from 13:08-13:58 UTC.",
        "archived": false,
        "category": "incident",
        "severity": "medium",
        "shareable": true
      },
      "name": "Builder incident 26-04-2019",
      "slug": "support-issue-uilder-incident-26-04-2019-82e72e55-0267-4e07-a073-03e6ce37ca97",
      "tags": [
        "builder",
        "incident"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-06T08:55:23.748Z",
        "support issue has attached support thread": "2019-05-07T07:56:45.931Z"
      },
      "created_at": "2019-05-06T08:55:23.088Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ab1359d8-063b-4b52-8e0d-3867456144cc",
      "data": {
        "Problem": "How can I move a device from balenaCloud to openBalena or vice versa",
        "Solution": "Currently this is only possible if you have local ssh access to the device. Then you can run from the host OS `os-config join ' <contents of the config.json for the target app> ' .\n\nWe are working on making this work via `balena tunnel`",
        "category": "join/leave",
        "severity": "low"
      },
      "name": "Is it possible to move from balenaCloud to openBalena",
      "slug": "support-issue-s-it-possible-to-move-from-balena-loud-to-open-alena-2e9cccf3-bc77-4016-b52f-3fdd661811d8",
      "tags": [
        "openbalena",
        "join",
        "leave",
        "os-config"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:55:43.997Z",
        "support issue has attached support thread": "2019-05-07T08:55:46.298Z"
      },
      "created_at": "2019-05-07T08:55:43.659Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "614f936a-d01a-4e43-8edf-00602c27053a",
      "data": {
        "Problem": "How can I use WF101FSYFPLHGX winstar display with balena-wpe project",
        "Solution": "configuration for the display:\n```\nRESIN_HOST_CONFIG_hdmi_cvt = 1280 800 60 6 0 0 0\nRESIN_HOST_CONFIG_hdmi_drive = 1\nRESIN_HOST_CONFIG_hdmi_force_hotplug = 1\nRESIN_HOST_CONFIG_hdmi_group = 2\nRESIN_HOST_CONFIG_hdmi_mode = 87\nRESIN_HOST_CONFIG_max_usb_current = 1\nRESIN_HOST_CONFIG_start_x = 1\n```\nand to get the  screen working, use the following udev rule:\n```\nSUBSYSTEM==“input”, ATTRS{name}==“stmpe-ts”, ENV{DEVNAME}==“event”, SYMLINK+=“input/touchscreen”\n```",
        "category": "touchscreen",
        "severity": "low"
      },
      "name": "How can I use touchscreen X with balenaDash",
      "slug": "support-issue-ow-can-use-touchscreen-with-balena-ash-05280417-2dc1-43c4-89a6-987879837c4a",
      "tags": [
        "touchscreen",
        "display",
        "balena-dash",
        "balenaDash"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:50:03.502Z",
        "support issue has attached support thread": "2019-05-07T08:50:06.454Z"
      },
      "created_at": "2019-05-07T08:50:03.071Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6c1f1b55-a26b-4227-816c-eaad7fe17fc8",
      "data": {
        "Problem": "With the older `resin/`  base images , there were smaller images with the `-slim` tag, but for `balenalib/` baseimages I can't find them.",
        "Solution": "`-run` is the new `-slim`. \n\nFrom the balenalib announcement:\n\n>For each combination of distro and stack we have two variants called run and build . The build variant is much heavier as it has a number of tools preinstalled to help with building source code. You can see an example of the tools that are included in the Debian Stretch variant here. The run variants are stripped down and only include a few useful runtime tools, see an example here. If no variant is specified, the image defaults to run",
        "category": "baseimages",
        "severity": "low"
      },
      "name": "Why are there no slim images for balenalib?",
      "slug": "support-issue-hy-are-there-no-slim-images-for-balenalib-90b311f4-45b3-4e12-919b-41961d082bf7",
      "tags": [
        "balenalib",
        "slim",
        "run",
        "baseimages"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T09:27:37.647Z",
        "support issue has attached support thread": "2019-05-07T09:27:39.980Z"
      },
      "created_at": "2019-05-07T09:27:37.219Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "969c01fd-819a-4dd9-9f6c-1475f8e8462e",
      "data": {
        "Problem": "Full system outage",
        "Solution": "Postmortem - https://status.balena.io/incidents/82n6xqf0drb5\n\nflowdock thread: https://www.flowdock.com/app/rulemotion/pub/threads/Pa-EG6Sf8VbkWuPTVYQQHXpAIXw",
        "category": "incident",
        "severity": "high"
      },
      "name": "incident 02-05-2019",
      "slug": "support-issue-incident-02-05-2019-4229a9d8-f5bd-448c-bb94-23275a7aee14",
      "tags": [
        "incident",
        "API"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T11:51:41.006Z",
        "support issue has attached support thread": "2019-05-07T11:51:14.748Z"
      },
      "created_at": "2019-05-07T09:31:26.184Z",
      "updated_at": "2019-05-07T11:51:40.649Z",
      "capabilities": []
    },
    {
      "id": "fa469634-d507-46f0-a766-9d187ae6525f",
      "data": {
        "Problem": "User wants to change network settings, etc. on the hostOS using `nmcli` from the container.",
        "Solution": "Using the example repo (https://github.com/balena-io-playground/balenalib-systemd-example) I modified the Dockerfile to install the `network-manager` package, and masked out `NetworkManager.service`. I then added the label io.balena.features.dbus: 1 to the app container.\n\nWhen I then SSH into the container, if I run nmcli then it tells me that the service isn't running, but if I run `DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket nmcli` then I can see my interfaces just fine.\n\nI think this might be what you're missing, so try adding the label and also setting the `DBUS_SYSTEM_BUS_ADDRESS` env var for the process trying to use NetworkManager.",
        "category": "networking",
        "severity": "low"
      },
      "name": "How can I use nmcli from my container",
      "slug": "support-issue-ow-can-use-nmcli-from-my-container-e71cd09a-e395-4f40-8323-20b779d2d7f7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T08:02:33.281Z",
        "support issue has attached support thread": "2019-05-07T08:02:37.354Z"
      },
      "created_at": "2019-05-07T08:02:32.766Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "afb4c39a-8c94-4a10-a479-29ef42d540f5",
      "data": {
        "Problem": "Native ARM builders outage",
        "Solution": "https://status.balena.io/incidents/88wfwm1q2p3g",
        "category": "incident",
        "severity": "medium"
      },
      "name": "Builder Incident 01-05-2019",
      "slug": "support-issue-uilder-ncident-01-05-2019-c8211c87-83a5-4eaa-bd7b-a26e5e46caf0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-07T09:49:45.405Z",
        "support issue has attached support thread": "2019-05-07T12:05:33.863Z"
      },
      "created_at": "2019-05-07T09:49:44.849Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "dd961ab3-d4ae-4df9-a8ca-25b63523b267",
      "data": {
        "Problem": "Some cases we need to mass restart supervisors remotely.",
        "Solution": "How's it done:\nTake the application ID, then in the dashboard console get the online devices:\n```\nawait sdk.pine.get({\n    resource: 'device',\n    options: {\n        $select: ['uuid'],\n        $filter: { is_online: true, belongs_to__application : { id: 943304}},\n        $expand: ['device_tag', 'belongs_to__application']\n    }\n});\n```\nSave the output into a .json file, and then export the UUID,s like this, say from list.json\n```\njq -r '.[].uuid' list.json | uniq | sort  > batch\n```\nThen can use this project:  https://github.com/balena-io-playground/batch-supervisor-restart to restart the supervisors, using run.sh\nIf you wish to get all devices in a certain state (like \"updating\"), you can use [this](https://github.com/balena-io-playground/batch-supervisor-restart/blob/master/tools/getdevices.js) script.\n\nTo follow how many has been done, can tail the log, and number it too, such as:\n```\ntail -f -n 0 task.log | grep --line-buffered 'DONE\\|Fail:' | nl -bpDONE\n```",
        "severity": "low"
      },
      "name": "Mass restarting device supervisors",
      "slug": "support-issue-mass-restarting-device-supervisors-a0cca189-c828-4cdd-9405-42e4108ec783",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-11-26T10:23:04.731Z",
        "support issue has attached support thread": "2019-09-24T11:51:45.517Z"
      },
      "created_at": "2019-09-24T11:51:27.145Z",
      "updated_at": "2019-11-26T10:23:04.690Z",
      "capabilities": []
    },
    {
      "id": "d5a03b52-3138-4c4b-ae06-6510f2ee45e9",
      "data": {
        "Problem": "Supervisor wont start due to avahi-daemon failure:\n```\nApr 19 09:32:34 9e246a0 resin-supervisor[30602]: * Starting Avahi mDNS/DNS-SD Daemon: avahi-daemon\nApr 19 09:32:34 9e246a0 resin-supervisor[30602]: ...fail!\n```\n\nFound it on:\n\nDevice type: Samsung Artik 530s 1G (BETA)\nOS version: balenaOS 2.30.0+rev1\nSupervisor version: 9.8.6",
        "Solution": "One of the reasons I've seen this happen is when the data partition is full, so check for that with `df -h` - Cameron",
        "category": "symptom",
        "severity": "low"
      },
      "name": "supervisor not starting due to avahi-daemon failure",
      "slug": "support-issue-supervisor-not-starting-due-to-avahi-daemon-failure-bf72ffac-bf48-4efc-9b46-413d21f17175",
      "tags": [
        "symptom",
        "avahi",
        "supervisor"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-05-14T13:26:19.522Z",
        "support issue has attached support thread": "2019-12-02T22:48:29.513Z"
      },
      "created_at": "2019-04-30T13:20:50.361Z",
      "updated_at": "2019-05-14T13:26:19.189Z",
      "capabilities": []
    },
    {
      "id": "4a22e1fa-058b-4ec7-9219-82e64fb49daa",
      "data": {
        "Problem": "The user toggled the VPN to disable it, but the device stayed online. It seems from the supervisor logs that the config update notification was recieved but it never disabled the VPN service. After a few more tries it eventually worked as expected. They were on OS 2.31.2",
        "Solution": "I tried to reproduce this on os 2.44 but could never hit it, so perhaps a bug in the old os?",
        "category": "vpn",
        "severity": "medium",
        "affectedOSVersions": [
          "2.31.2"
        ]
      },
      "name": "Disable VPN toggle has no affect",
      "slug": "support-issue-disable-vpn-toggle-has-no-affect-22aefbfa-7124-48a7-a7bd-244676ec2684",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-12-02T23:44:49.442Z",
        "support issue has attached support thread": "2019-12-02T23:44:50.088Z"
      },
      "created_at": "2019-12-02T23:44:49.334Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a7a611a4-827b-4133-9f3b-48f6d7eb6857",
      "data": {
        "Problem": "A device with removable media (or drive) contains service volume data that needs recovering.",
        "Solution": "The following is a brief guide assuming a multicontainer application, and how to get the volume data off the SD card on a Linux machine. This can be applied to any media.\n\n1. CLONE THE MEDIA (eg SD card)! This ensures we don’t do anything destructive to the card\n2. Insert cloned SD card into Linux machine, in this example I’m using a USB convertor. Once inserted, a quick way to check what the SD card disk is called is to run dmesg:\n```\n$ dmesg\n[2492110.746490] scsi 6:0:0:0: Direct-Access     Generic- SD/MMC           1.00 PQ: 0 ANSI: 0 CCS\n[2492110.747284] sd 6:0:0:0: Attached scsi generic sg4 type 0\n[2492111.431717] sd 6:0:0:0: [sdd] 15523840 512-byte logical blocks: (7.95 GB/7.40 GiB)\n[2492111.431965] sd 6:0:0:0: [sdd] Write Protect is off\n[2492111.431973] sd 6:0:0:0: [sdd] Mode Sense: 03 00 00 00\n[2492111.432205] sd 6:0:0:0: [sdd] No Caching mode page found\n[2492111.433279] sd 6:0:0:0: [sdd] Assuming drive cache: write through\n[2492111.445551]  sdd: sdd1 sdd2 sdd3 sdd4 < sdd5 sdd6 >\n[2492111.448176] sd 6:0:0:0: [sdd] Attached SCSI removable disk\n```\nAs you can see, the SD card is /dev/sdd and it contains 6 partitions.\n3. We need to mount the data partition in the image, this requires an appropriate offset into the image and a mount point on the host machine to point the image at. The data partition is currently the last partition on the disk. We get the right partition by running disk on the image file:\n```\n$ fdisk -l /dev/sdd\nDisk /dev/sdd: 7.4 GiB, 7948206080 bytes, 15523840 sectors\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes\nI/O size (minimum/optimal): 512 bytes / 512 bytes\nDisklabel type: dos\nDisk identifier: 0x5bc7238a\nDevice     Boot   Start      End  Sectors  Size Id Type\n/dev/sdd1  *       8192    90111    81920   40M  c W95 FAT32 (LBA)\n/dev/sdd2         90112   729087   638976  312M 83 Linux\n/dev/sdd3        729088  1368063   638976  312M 83 Linux\n/dev/sdd4       1368064 15523839 14155776  6.8G  f W95 Ext'd (LBA)\n/dev/sdd5       1376256  1417215    40960   20M 83 Linux\n/dev/sdd6       1425408 15523839 14098432  6.7G 83 Linux\n```\nNow mount the data partition by using the offset. We want to create a new mount point on the local host to point the image at:\n```\n$ mkdir balena-data\n$ mount -o loop,offset=$(( 1425408 * 512 )) /dev/sdd balena-data\n```\n4. Now change to the /mnt/balena-data directory. This includes all the writable data from the SD card. We’ll need to navigate into the docker volumes directory to find the relevant volumes attached to services:\n```\n$ cd balena-data\n$ ls -l\ntotal 15\n-rw-r--r--  1 root root     3 Oct 28 14:42 apps.json\ndrwxr-xr-x 15 root root  1024 Sep 17 14:01 docker\ndrwx------  2 root root 12288 Aug 13 09:49 lost+found\ndrwxr-xr-x  3 root root  1024 Oct 28 14:42 resin-data\n$ cd docker/volumes\n$ ls -l \ntotal 27\ndrwxr-xr-x 3 root root  1024 Oct 28 14:42 1513354_datatest\ndrwxr-xr-x 3 root root  1024 Oct 28 14:42 1513354_twocontainer\n-rw-r--r-- 1 root root 32768 Oct 28 14:42 metadata.db\n```\nThe directory name suffixes correlate to the volumes defined in the docker-compose manifest (if a single service application, there should only be one, with a UUID name). Any data created in the service will exist in these directories (within another _data directory) ready to be copied off:\n```\nls -l 1513354_datatest/_data/\ntotal 1\n-rw-r--r-- 1 root root 7 Oct 28 14:47 testfile\n```\n5. Once you’re done copying data, remember to unmount the data partition from your local machine:\n```\n$ umount balena-data/\n```",
        "severity": "low",
        "shareable": true
      },
      "name": "Recovery data from a dead device",
      "slug": "support-issue-recovery-data-from-a-dead-device-1e5b4d2c-d986-4332-a794-d78e52d7f581",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-01-09T17:52:56.070Z"
      },
      "created_at": "2019-10-29T14:27:09.786Z",
      "updated_at": "2020-01-09T17:52:55.971Z",
      "capabilities": []
    },
    {
      "id": "4631f03c-71d6-4654-ad8c-a7d463b0b617",
      "data": {
        "Problem": "Customer asks about a \"build secrets\" or \"private docker registry\" feature, and whether/how/when it will be available with the `balena push` / `balena build` / `balena deploy` command. There are four (?) relevant and distinct features that sometimes get lumped together as \"build secrets\", and support agents need to be clear about the distinction in order to be most helpful in replying to customers.",
        "Solution": "Let's name and distinguish the features:\n* Build secrets (strictly) or build secret files\n* Build variables\n* Private docker registry authentication (ability to pull base images from private registries)\n* Docker's (18.09) own \"build secret information\" feature (docker build --secret)\n\n\n**Build secrets (strictly) or build secret files**\n\nThis is a feature implemented by Cameron and deployed to production around the second quarter of 2018. It was and continues to be considered \"beta\" and has not been publicly (widely) announced or documented. It has however been shared with customers who asked for it, by sending them a link to the following GitHub Gist of Cameron:\n\n[https://gist.github.com/CameronDiver/6d5964c0618a6154f89d73b883fb09b7](https://gist.github.com/CameronDiver/6d5964c0618a6154f89d73b883fb09b7)\n\nBriefly, the build secrets (strictly) feature consists of a `.resin/resin.yml` (or `.balena/balena.yml`) file and a set of arbitrary files created by users and placed under a folder named `.resin/secrets/` (or `.balena/secrets/`) in the root of their app, as described in the Gist. The secret files can contain anything the user wishes, including private keys and passwords, in any format. During an image build in balena's cloud builders, the files under `.resin/secrets/` are mounted and become available in the filesystem of the temporary containers used to generate the docker image, so they can be accessed for example through the Dockerfile RUN instruction:\n\n```\nRUN /bin/cat /run/secrets/my-recipe/super-secret-recipe | cmd_that_reads_secrets_from_stdin\n```\n\nImportantly, the `.resin` (or `.balena`) folder and all files and subfolders in it (including the secrets) are removed by the builders and thus NOT included in the final built image.\n\n\n**Build variables**\n\nThis is also a feature implemented by Cameron and described in the same GitHub Gist linked above. Briefly, it allows name-value pairs to be specified in the `.resin/resin.yml` (or `.balena/balena.yml`) file and then accessed during the build through the Dockerfile ARG instruction. \n\nAn important point about the build variables feature is that it is NOT meant to hold secrets like keys and passwords, because the Dockerfile ARG instruction is saved in the final image and can be inspected through the `docker history` command. The [Dockerfile documentation for the ARG instruction](https://docs.docker.com/engine/reference/builder/#arg) warns:\n\n> _**Warning:** It is not recommended to use build-time variables for passing secrets like github keys, user credentials etc. Build-time variable values are visible to any user of the image with the `docker history` command._\n\nThe reason for emphasizing this is that the build variables feature is described to users in the context of build secrets and in the same Gist page, so some users may be inadvertently led to design solutions where they place secrets in build variables, and then share the resulting images with untrusted third parties (like in the public Docker Hub). I have added a comment to the the Gist page, but it's good to point this out to users in pertinent support interactions.\n\n\n**Private docker registry authentication**\n\nThis feature was implemented by Paulo in Q4 2018 for the `balena push` command, and extended to the `balena build` and `balena deploy` commands in Feb 2019. ***Full feature support requires CLI version 9.14.1 or later.*** It allows a user to pull base images from a private docker registry that requires a password to be accessed, for example:\n\n```\n# Dockerfile\nFROM my-private-registry.com/my-private-image\n```\n\n```\n# docker-compose.yml\nversion: '2'\nservices:\n  secretservice:\n    image: my-private-reg.com/my-secret-image\n```\n\nUsernames and passwords should be added to a JSON or YAML file and specified through the `--registry-secrets` command-line option to the push / build / deploy CLI commands:\n\n```\n$ balena push test_app -s . --registry-secrets my_registry_secrets.yml\n...\n\n$ balena help push\n...\nThe --registry-secrets option specifies a JSON or YAML file containing private\nDocker registry usernames and passwords to be used when pulling base images.\nSample registry-secrets YAML file:\n\n\t'my-registry-server.com:25000':\n\t\tusername: ann\n\t\tpassword: hunter2\n\t'':  # Use the empty string to refer to the Docker Hub\n\t\tusername: mike\n\t\tpassword: cze14\n\t'eu.gcr.io':  # Google Container Registry\n\t\tusername: '_json_key'\n\t\tpassword: '{escaped contents of the GCR keyfile.json file}'\n```\n\nDocumentation for the CLI commands (and the `--registry-secrets` option) is also available on this page:\nhttps://www.balena.io/docs/reference/cli/\n\n_Note: a limitation regarding the docker-compose 'image' instruction was solved in Feb 2019 and no longer applies._\n\n\n**Docker's (18.09) own \"build secret information\" feature**\n\nRelease 18.09 of Docker introduced their own \"build secret information\" feature:\n\nhttps://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information\n\nIt uses a \"docker build --secret\" command-line option. Conceptually, it achieves something quite similar as balena's beta build secrets feature, but some implementation details and the interface (command-line options) are ***not*** compatible with balena's build secrets feature. We intend to achieve compatibility and work is planned for it: https://github.com/balena-io/balena-cli/issues/1063\n\n\n***Current production support for balena-cli and git-push commands***\n\n**Private docker registry authentication support**\n\n```\n ------------------------------------------------------------------------------------------------\n|    Command     | Cloud   | Laptop | Balena | Notes                                             |\n|                | Builder | Docker | device |                                                   |\n|----------------|---------|--------|--------|---------------------------------------------------|\n| git push       |   No    |   N/A  |   N/A  | Customers should be advised that `balena push` is |\n| balena push    |   Yes   |   N/A  |   Yes  | a drop-in replacement for `git push`.  `git push` |\n|                |         |        |        | support is planned for the long term, through a   |\n|                |         |        |        | cloud secrets store.                              |\n| balena build   |   N/A   |   Yes  |   Yes  | Requires balena CLI v9.14.1 or later              |\n| balena deploy  |   N/A   |   Yes  |   Yes  | Requires balena CLI v9.14.1 or later              |\n ------------------------------------------------------------------------------------------------\n```\n\n**Build secrets** support\n\n```\n ------------------------------------------------------------------------------------------\n|    Command     | Cloud   | Laptop | Balena | Notes                                       |\n|                | Builder | Docker | device |                                             |\n|----------------|---------|--------|--------|---------------------------------------------|\n| git push       |   Yes   |   N/A  |   N/A  | Requires 'git commit' of secrets (not good) |\n| balena push    |   Yes   |   N/A  |   Yes  | Does not require 'git commit' of secrets    |\n| balena build   |   N/A   |   No   |   Yes  |                                             |\n| balena deploy  |   N/A   |   No   |   Yes  |                                             |\n ------------------------------------------------------------------------------------------\n```\n\n**Build variables** support\n\n```\n --------------------------------------------\n|    Command     | Cloud   | Laptop | Balena |\n|                | Builder | Docker | device |\n|----------------|---------|--------|--------|\n| git push       |  Yes(1) |  N/A   |  N/A   |\n| balena push    |  Yes(1) |  N/A   | Yes(1) |\n| balena build   |   N/A   | Yes(2) | Yes(3) |\n| balena deploy  |   N/A   | Yes(2) | Yes(3) |\n --------------------------------------------\n```\n(1) Using `balena.yml` file\n(2) Using `--buildArg` command-line option\n(3) Using either `balena.yml` file or `--buildArg` option\n\n**Docker 18.09 \"build secret information\" (docker build --secret) support**\n\n```\n --------------------------------------------\n|    Command     | Cloud   | Laptop | Balena |\n|                | Builder | Docker | device |\n|----------------|---------|--------|--------|\n| git push       |   No    |   N/A  |   N/A  |\n| balena push    |   No    |   N/A  |   No   |\n| balena build   |   N/A   |   No   |   No   |\n| balena deploy  |   N/A   |   No   |   No   |\n --------------------------------------------\n```",
        "severity": "low"
      },
      "name": "Build secrets and variables (\"Cameron's Gist\", private registry authentication)",
      "slug": "scratchpad-entry-uild-secrets-and-variables-ameron-s-ist-private-registry-authentication-6abceeb3-61c5-42a5-b80a-661792b29fdb",
      "tags": [
        "build secrets",
        "build variables",
        "private registry",
        "docker authentication"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-19T00:30:44.401Z"
      },
      "created_at": "2019-01-07T11:52:27.303Z",
      "updated_at": "2019-09-19T00:30:44.346Z",
      "capabilities": []
    },
    {
      "id": "c55e8f67-f87e-4ac1-9759-997360b20f10",
      "data": {
        "Problem": "If a device is showing offline but you suspect it's the VPN not functioning or there is some other reason it appears offline, then you can gain access to it via a known working device in the same network as the affected device.\n",
        "Solution": "Please follow the guide at https://github.com/resin-io/process/blob/master/process/support/accessing_user_accounts_and_devices.md to run the \"hostvia\" command in the proxy.",
        "severity": "low",
        "shareable": true
      },
      "name": "Accessing Devices via Another Device",
      "slug": "scratchpad-entry-c55e8f67-f87e-4ac1-9759-997360b20f10",
      "tags": [
        "ssh",
        "hostvia",
        "hopping"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-16T14:49:11.288Z",
        "support issue has attached support thread": "2019-06-13T16:43:07.982Z"
      },
      "created_at": "2019-01-25T20:11:34.835Z",
      "updated_at": "2019-09-16T14:49:11.240Z",
      "capabilities": []
    },
    {
      "id": "6e22a72c-ae55-4153-b545-88c1a8eb3478",
      "data": {
        "Solution": "Do not use this anymore [#7a458ad0-b4ce-11e7-9eb3-fd5245afb1dd](https://resin-io.github.io/scratchpad/#7a458ad0-b4ce-11e7-9eb3-fd5245afb1dd) should be the current solution.\n\n⚠️ **See the solution section below for up to date method**\n\n1. Use the admin panel to log in as the user\n2. Go to the dashboard of the specific device\n3. From the supervisor drop-down select the desired version\n4. ssh to user's device\n5. `update-resin-supervisor -i resin/armv7hf-supervisor -t <desired_version>`\n\n#### Instructions (Legacy)\n\n1. Hotfix target devices to make sure they have the latest fixes (if you don't do this and they need them then bad bad things can happen), see https://bitbucket.org/rulemotion/hotfix/ and ask Lorenzo Stoakes for more details.  If the device is older (contains `/usr/bin/resin-device-update` then check with Pagan Gazzard to see if it requires any additional hotfixes added to the repo - no devices this old have been updated since the introduction of the hotfix repo).\n2. Add a supervisor release entry, eg INSERT INTO \"supervisor release\" (\"supervisor version\", \"image name\") VALUES ('v1.1.0', 'registry.resin.io/resin/rpi-supervisor') RETURNING \"id\";\n3. Update device's target supervisor release, eg UPDATE \"device\" SET \"supervisor release\" = 23 WHERE \"id\" IN (1, 2);\n4. Wait for the device to automatically check for updates and update the supervisor, 5min on older images, 24h on newer images.\n\nAlternatively manually ssh in and run the supervisor update script by hand, for older images: `crontab -l` and then either `/usr/bin/flock -n /tmp/rdu.lockfile /usr/bin/resin-device-update` or  `/usr/bin/flock -n /tmp/rdu.lcokfile /usr/bin/resin-device-update` based on the content.\n\nFor newer images: `systemctl start update-resin-supervisor.service`."
      },
      "name": "Updating supervisor",
      "slug": "scratchpad-entry-6e22a72c-ae55-4153-b545-88c1a8eb3478",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-13T12:56:34.926Z"
      },
      "created_at": "2019-03-01T17:59:56.846Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "35bf48bd-6629-4c40-9c68-fe17eb4716da",
      "data": {
        "Problem": "High cpu load due to dangling systemd sshd services that keep restarting.\n\nHappens when connection attempts fail.\n\nDanglish sshd services keep growing until they get too much for a device to handle and device stops accepting ssh connections first, then starts failing balena healthchecks and thus application.\n\nFull Detail here: https://github.com/balena-os/meta-balena/issues/1837",
        "Solution": "Cleanup to recover device, then ask user to update to 2.47.1+\n\nUse: `systemctl list-units --state=activating`\nYou may see a list of sshd services.\n\n```\nroot@22944d1:~# systemctl list-units --state=activating\nUNIT                                                LOAD   ACTIVE     SUB          DESCRIPTION                                      \nsshd@18-10.240.61.0:22222-52.4.252.97:49186.service loaded activating auto-restart OpenSSH Per-Connection Daemon (52.4.252.97:49186)\nsshd@21-10.240.61.0:22222-52.4.252.97:33860.service loaded activating auto-restart OpenSSH Per-Connection Daemon (52.4.252.97:33860)\n\nLOAD   = Reflects whether the unit definition was properly loaded.\nACTIVE = The high-level unit activation state, i.e. generalization of SUB.\nSUB    = The low-level unit activation state, values depend on unit type.\n\n2 loaded units listed.\n```\n\nCleaning up dangling services easily.\n\n```\nsystemctl stop sshd@* --state=activating\n```",
        "severity": "medium",
        "shareable": true,
        "fixedInOSVersion": "2.47.1",
        "affectedOSVersions": [
          "2.45.x",
          "2.46.x",
          "2.47.0"
        ]
      },
      "name": "High cpu load due to dangling systemd sshd services that keep growing",
      "slug": "support-issue-high-cpu-load-due-to-dangling-systemd-sshd-services-that-keep-growing-188a8170-d10b-4cfe-9798-384f1c91900d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-13T13:43:13.918Z",
        "support issue has attached support thread": "2020-04-14T13:13:24.772Z"
      },
      "created_at": "2020-02-13T13:43:13.740Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ef130c3c-4791-4c43-b135-4fba0a19ec19",
      "data": {
        "Problem": "A user (or we) want to determine the difference in size between what's currently on a device and what it needs to download to update to the latest version of an Application.",
        "Solution": "The following is a step-by-step guide to calculating the total download size for a device when an update to an Application has occurred. This guide assumes you are using either a JWT session token or API key tied to your account (go to `Preferences->Access tokens` and either use the `Session token` or create a new API key) and uses the REST API to make calls (using `curl`).\n\n1. Retrieve the resin release database identifier from the release identifier hash for the Application you are interested in (this can be found by going to the `Releases` section of an Application, selecting the latest release and then copying the value for the `RELEASE` property, use the copy icon; note that the hash displayed is shorter than the full string required, so needs to be copied). Then make the call to retrieve the database ID:\n    ```\n    curl -X GET \"https://api.resin.io/v4/release?\\select=id&\\$filter=commit%20eq%20%27<releaseHashFromDashboard>%27\" \\\n    -H \"Content-Type:application/json\" -H \"Authorization: Bearer <JWT/APIToken>\"\n    ```\n\n    This will return a similar JSON object to the below:\n    ```\n    {\"d\":[{\"id\":<databaseID>,\"__metadata\":{\"uri\":\"/resin/release(<databaseID>)\",\"type\":\"\"}}]}\n    ```\n\n    The important value here is the `id`, which is required for the next step.\n\n    For example, given the release hash `123ac7681fd1c3346fcf603513c0a510ae375123` and an API key of '123456789abcd':\n\n    ```\n    curl -X GET \"https://api.resin.io/v4/release?\\$select=id&\\$filter=commit%20eq%20%27123ac7681fd1c3346fcf603513c0a510ae375123%27\" \\\n    -H \"Content-Type:application/json\" -H \"Authorization: Bearer 123456789abcd\"\n\n    {\"d\":[{\"id\":488123,\"__metadata\":{\"uri\":\"/resin/release(488123)\",\"type\":\"\"}}]}\n    ```\n2. Given the database ID, retrieve an object detailing the list of images associated with it. For a single-container application, there will only be one returned image. For a multi-container application, there will be as many images as containers for the Application. Use the returned `id` from the previous call:\n    ```\n    curl -XGET \"https://api.resin.io/v4/image?%24expand=is_part_of__release(%24expand=release)&%24filter=is_part_of__release/release%20eq%20<id>\" \\\n    -H \"Content-Type:application/json\" -H \"Authorization: Bearer <JWT/APIToken>\"\n    ```\n    The JSON object returned is large, but the only required field is the value for the `is_stored_at__image_location` property. This should be a value of the type\n    `registry2.resin.io/<imageLocation>`, where for new Applications (post multi-container release) the `imageLocation` is of the form `v2/<hash>` and is of the form `<applicationName>/<hash>` for legacy and classic Applications.\n\n    For example, given a database ID of `488123` and the same previous API key:\n    ```\n    curl -XGET \"https://api.resin.io/v4/image?%24expand=is_part_of__release \\\n    (%24expand=release)&%24filter=is_part_of__release/release%20eq%20488123\" \\\n    -H \"Content-Type:application/json\" -H \"Authorization: Bearer 123456789abcd\"\n    ```\n    And filtering the returned JSON object for the values of `is_stored_at__image_location`, we might see three `imageLocation`s:\n    ```\n    v2/12362ae68367fb2470e375cd52732123\n    v2/1238b1a3f0569017bf388bf5c563f123\n    v2/1238b1a3f0569017bf388bf5c563f123\n    ```\n3. The rest of this guide assumes that the same process must be followed from Step 3 (this step) onwards for **each unique `imageLocation`** returned by Step 2. This will get you the total size for all container images associated with an Application.\n    Authenticate with the resin API to get a bearer token for the resin Registry. The JWT/API Key is passed along with the relevant `imageLocation` value:\n    ```\n    curl -XGET \"https:/api.resin.io/auth/v1/token?service=registry2.resin.io&scope=repository:<imageLocation>:pull\" -H \"Content-Type:application/json\" \\\n    -H \"Authorization: Bearer <JWT/APIToken>\"\n    ```\n    This will return a Registry token inside a JSON object:\n    ```\n    {token:\"<registryToken>\"}\n    ```\n\n    For example, using the first of our `imageLocation` values from Step 2:\n    ```\n    curl -XGET \"https:/api.resin.io/auth/v1/token?service=registry2.resin.io& \\\n    scope=repository:v2/12362ae68367fb2470e375cd52732123:pull\" \\\n    -H \"Content-Type:application/json\" -H \"Authorization: Bearer 123456789abcd\"\n\n    {\"token\":\"1234567890abcdef\"}\n    ```\n4. Use the `registryToken` to retrieve the manifest for the image associated with the `imageLocation`:\n    ```\n    curl -XGET \"https://registry2.resin.io/v2/<imageLocation>/manifests/latest\" \\\n    -H \"Content-Type:application/json\" \\\n    -H \"Authorization: Bearer <bearerTokenFromAPI>\"\n    ```\n    This will return a standard Docker manifest object. Each image is made up of a set of layer blobs, which are referenced in the manifest as values of the `blobSum` property. These values should be captured.\n\n    For example, again using the first `imageLocation` and the `registryToken` returned from the previous step, retrieve the manifest:\n    ```\n    curl -XGET \"https://registry2.resin.io/v2/v2/12362ae68367fb2470e375cd52732123/manifests/latest\" \\\n    -H \"Content-Type:application/json\" \\\n    -H \"Authorization: Bearer 1234567890abcdef\"\n\n    {\n        \"schemaVersion\": 1,\n        \"name\": \"v2/12362ae68367fb2470e375cd52732123\",\n        \"tag\": \"latest\",\n        \"architecture\": \"arm64\",\n        \"fsLayers\": [\n            {\n                \"blobSum\": \"sha256:123d95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b4123\"\n            },\n            {\n                \"blobSum\": \"sha256:1239e14b4c270ff27033cae53393fbb201275728b51715296a4772b9e7bbd123\"\n            },\n            ...\n            }\n        ...\n    }\n    ```\n\n    Collect the values of each `blobSum` entry:\n    ```\n    sha256:123d95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b4123\n    sha256:1239e14b4c270ff27033cae53393fbb201275728b51715296a4772b9e7bbd123\n    ...\n    ```\n5. The length of each layer blob for the image must now be acquired. This is a two-step operation which first locates the final resource location of the layer blob itself, and then requests the details for that blob. This must be carried out for each `blobSum` value collected in the previous step.\n    ```\n    curl -v -IHEAD \"https://registry2.resin.io/v2/<imageLocation>/blobs/<blobSum>\" \\\n    -H \"Authorization: Bearer <bearerTokenFromAPI>\"\n    ```\n    This `curl` command will print the headers for the layer blob, including a `Location:` header. Use the value of this field to retrieve the final information for the layer blob:\n    ```\n    curl -v -IHEAD \"<Location>\"\n    ```\n    The `curl` command will print the headers for the request, including the `Content-Length:` header. The value of this field is the size of the layer blob.\n\n    For example:\n    ```\n    curl -v -IHEAD \"https://registry2.resin.io/v2/v2/12362ae68367fb2470e375cd52732123/blobs/sha256:123d95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b4123\" \\\n    -H \"Authorization: Bearer 1234567890abcdef\"\n\n    ...\n    Location: https://resin-production-registry2.uri/a/b/c/v2/blobs/sha256/1e/123d95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b4123\n    ...\n\n    curl -v IHEAD \"https://resin-production-registry2.uri/a/b/c/v2/blobs/sha256/1e/123d95caeb02ffe68cdd9fd84406680ae93d633cb16422d00e8a7c22955b4123\"\n\n    ...\n    Content-Length: 1234567\n    ```\n\n    Make a note of the `Content-Length` for each layer blob in a list. This will be required for the final step.\n6. Finally, after retrieving the size of each layer blob, a device running an older version of the Application (ie. one that has not yet updated to the release we are testing) can be interrogated to determine the layer blobs it currently uses for each image associated with the Application:\n    1. SSH into the device using the Web Terminal in the resin Dashboard\n    2. Change to the `/mnt/data/docker/image/aufs/distribution/diffid-by-digest/sha256` directory (`cd /mnt/data/docker/image/aufs/distribution/diffid-by-digest/sha256`)\n    3. Compile a list of all the entries in that directory. Each entry that exists corresponds to one of the `blobSum` blob layers for each image.\n    4. For each blob entry that exists on both the device and the list of `blobSum`s for the image, remove it from the list compiled in step 5. Finally, you should end up with a list of blob layers that have been updated for the Application, but have not yet been downloaded. By totaling the sizes of all the blob layers that have not yet been downloaded, you can get an accurate download size for the update.\n\nAs a postscript, there's a better way to achieve step 6. if you don't have access to the device, or you want to write a script that does this based on two release tags:\n\nInstead of requiring access to the device, you can query the API on the release a current device is running, and then retrieve the details for that release as per the instructions above (ie. retrieving each image associated with the release, and each blob associated with the image), and then compare each image (by comparing its layer blobs) to the latest release you want the device to download. That way, the calculations can be performed server-side.\n\nYou can retrieve the information for which release a device is running with the following curl line:\n\ncurl -XGET \"https://api.resin.io/v1/device?$filter=uuid eq '<deviceUUID>%27\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer <JWT/APIToken>\"\n\nThe response is an object that will contain a commit property, the value of which is a release UUID.\n"
      },
      "name": "Determine the total download size required to update a device to a new version of an Application",
      "slug": "scratchpad-entry-ef130c3c-4791-4c43-b135-4fba0a19ec19",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.474Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7ad6e056-e957-4f49-96f0-26bbabb0ba8e",
      "data": {
        "Problem": "As a user mentioned\n\n> Zendesk login session timeout seems to be decreased dramatically - meaning I need to login every few minutes, and it deletes everything I wrote!",
        "Solution": "We talked with Zendesk support (https://support.zendesk.com/hc/en-us/requests/4095447) and this most likely is a browser issue.\n\n> [...] this is likely something to do with the enduser's specific browser set up. The most likely culprit would be a browser extension that kills cookies. We rely on cookies to identify a user session. If the enduser is using an extension that clears cookies then the session would be terminated."
      },
      "name": "Zendesk login session timeout for end users",
      "slug": "scratchpad-entry-endesk-login-session-timeout-for-end-users-dbbade9d-d19e-4a9b-a650-1d787d8a6641",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2018-12-18T15:24:50.638Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8bb0ef27-3352-460d-bbc9-08828a015b09",
      "data": {
        "Solution": "Running the below triggers the VPN's 'reset all' functionality which causes the API to retrieve the VPN addresses of all online devices and update the API database to reflect this.\n\n**Important: Only run this as a last resort and try to raise the issue with the team before going for it. This completely recreates this data and repeated runs could cause disruption.**\n```\ncurl -X POST 'https://api.resin.io/services/vpn/reset-all?apikey=ff4b1c65205943e16614773d47aea95056d086e3f682a319a1b76b7d69a5f74d'\n```\n**Note:** The API key listed here is the VPN service API key, it may change, and is privileged information."
      },
      "name": "Resetting VPN devices state",
      "slug": "scratchpad-entry-esetting-devices-state-8e0752cc-9fb2-4a74-80a6-c89952d56911",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.503Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8044bd78-86b4-4a83-87cf-850716890f32",
      "data": {
        "Problem": "Some devices are in a pickle, because their NTP access is blocked, and they cannot set the correct time. This might result in various errors, e.g. certificates not yet being valid.",
        "Solution": "A oneliner to set the time quite close to the correct current time is the following, done in the host OS (or in the user container, if it has the tools):\n\n```\ndate -s \"$(curl --silent --head --insecure https://api.balena-cloud.com/ping | grep -i Date: | sed 's/[Dd]ate: //')\"\n```\nThis will make a request to google, and gets the date from the reply header, which should be good within 1s.\n\nThis of course does not fix the underlying issue of not being able to synchronize time, but should be a hot fix, and recent resinOS versions (2.12.7+) should be better in keeping time between reboots.",
        "severity": "low"
      },
      "name": "Device couldn't sync with NTP and now the date is wrong",
      "slug": "scratchpad-entry-evice-couldn-t-sync-with-and-now-the-date-is-wrong-8ab90fea-d884-45b9-8c08-d050c2544e0e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2018-12-05T16:44:09.379Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "e89b87bd-3888-437d-9d7d-8bb396cb9fd7",
      "data": {
        "Problem": "Device is online but doesn't get updates and possibly device actions from the dashboard have no effect.\nRebooting the device seems to fix the issue though.",
        "Solution": "1. First ensure that the app/device is not pinned b/c of using stages releases. Use one of the following commands in your browser's console based on which ID/UUID you have on hand.\n```\nawait sdk.models.application.get(appId, { $expand: { owns__device: { $select: ['is_on__commit', 'should_be_running__release']}}, $select:['commit', 'should_track_latest_release'] });\n// or\nawait sdk.models.device.get(deviceUuid, { $expand: { belongs_to__application: { $select: ['commit', 'should_track_latest_release'] }}, $select: ['is_on__commit', 'should_be_running__release'] });\n```\nSideNote: until FF supports `await` in the console you will have to use a normal `.then(x => console.log(x))`.\n\nIf `should_be_running__release` has a value different than the latest, or `should_track_latest_release` is `false`, then the user has pinned that app/device. Give them a note.\n\n2. check the status endpoint\n\nConnect to the hostOS & get the deviceApiKey from `/mnt/boot/config.json`\n\n```\ncat /mnt/boot/config.json | jq '.deviceApiKey'\n```\n\nThen check the endpoint's result (even in your browser):\n```\nhttps://api.resin.io/device/v1/<uuid>/state?apikey=<deviceApiKey>\n```\n\nIf the reported commit/release is different than the one on the device, proceed to step 3\n\n3. Try restarting the supervisor\n\n```\nsystemctl restart resin-supervisor\n```\n\n4. If still no luck & the logs get stuck at `Starting pubnub logger`\n\n```\nsystemctl restart balena\n```\n\nthen\n\n```\njournalctl -f -u resin-supervisor -n 100\n```\nand search for logs that look like:\n\n> Updates are locked: EEXIST: file already exists, open '/mnt/root/tmp/resin-supervisor/services/${number}/${container_name}/resin-updates.lock'\n\nto get the paths of the lock files that cause errors.\n\n\nFor reference, the locks are at:\n```\n/tmp/resin-supervisor/services/${number}/${container_name}/resin-update.lock\n```\n\n\nFinally connect to the supervisor and list all those lock files\n\n```\nbalena exec -it resin_supervisor sh\nfind /mnt/root/tmp/resin-supervisor/services/ -name \"resin-updates.lock\"\n```\n\nand rm the files reported in the previous logs"
      },
      "name": "Device running v2.12.0 not getting updates",
      "slug": "scratchpad-entry-evice-running-v2-12-0-not-getting-updates-9a76f54b-9a30-482d-8ce3-1664e9f973b2",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.534Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "f782a1af-7b6d-4636-aa90-d04a13b04d82",
      "data": {
        "Problem": "Run `journalctl -u resin-supervisor -f` on the host OS.\n\nIf you see something like\n```\nFATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory\n<--- Last few GCs --->\n 1055446 ms: Mark-sweep 67.5 (54.7) -> 69.4 (54.7) MB, 58.5 / 0.0 ms [allocation failure] [GC in old space requested].\n 1055508 ms: Mark-sweep 69.4 (54.7) -> 71.3 (54.7) MB, 61.4 / 0.0 ms (+ 0.1 ms in 1 steps since start of marking, biggest step 0.1 ms) [allocation failure] [GC in old space requested].\n 1055565 ms: Mark-sweep 71.3 (54.7) -> 73.4 (53.7) MB, 57.9 / 0.0 ms [last resort gc].\n 1055623 ms: Mark-sweep 73.4 (53.7) -> 75.5 (53.7) MB, 57.9 / 0.0 ms [last resort gc].\n```\nsee the description / solution below.",
        "Solution": "Since balenaOS 2.18.0 (or supervisor 7.19.3) we've added some limits to the node process that runs the supervisor to limit its memory usage: `--max_old_space_size=50 --optimize_for_size --always_compact`.\n\nThis makes the supervisor crash on some large applications downloads.\n\nThis change has been reverted in supervisor 8.3.2 but no balenaOS releases use this supervisor version yet.\n\nThere is a way to remove the limits manually on a device:\n```\nbalena exec $(balena ps -q -f name=resin_supervisor) /bin/sed -i \"s/ --max_old_space_size=50 --optimize_for_size --always_compact//\" entry.sh\nbalena commit $(balena ps -q -f name=resin_supervisor) resin/amd64-supervisor:v8.0.0\nsystemctl restart resin-supervisor \n```\n(replace `resin/amd64-supervisor:v8.0.0` with the supervisor image name on the device)"
      },
      "name": "Application update download fails repeatedly",
      "slug": "scratchpad-entry-f782a1af-7b6d-4636-aa90-d04a13b04d82",
      "tags": [
        "supervisor update download crash memory gc"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.543Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "532dc70e-6796-4346-81a8-55e6c234ab33",
      "data": {},
      "name": "Test scratchpad entry",
      "slug": "scratchpad-entry-f830c172-a381-44c6-9c1e-1feccf300f15",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.553Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "fc42d70f-6065-466c-bd68-3b002d708a3f",
      "data": {
        "Problem": "1. User enters the ssh session and finds that the environment variables they've set in the app/device panels are not present.\n2. (Perhaps) notices that they are set in applications they run.\n3. The env vars are also expected to be set in the web terminal session.",
        "Solution": "Custom SSH sessions do not import existing environment variables meaning the user will not see them when using it. The following incantation will allow a user to have read access (check - how to get read/write? > to /proc/1/environ?) to environment variables:-\n\n`export $(xargs -0 -n1 < /proc/1/environ)`\n\nAn alternative is to ask the user to build a simple application to output the environment, e.g. in node:-\n`console.log(process.env);`\n\nThis acts as a replacement for the test the user was attempting to perform in the terminal and should give them confidence that the env vars are in fact available."
      },
      "name": "My environment variables aren't set?!!",
      "slug": "scratchpad-entry-fc42d70f-6065-466c-bd68-3b002d708a3f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.562Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "fd1f0b37-851d-48f6-b2bc-b97b97931c98",
      "data": {
        "Solution": "Log files are stored in `/var/log/journal` and can be read using the command `journalctl —file <file>`"
      },
      "name": "How to read logs generated by persistent logging",
      "slug": "scratchpad-entry-fd1f0b37-851d-48f6-b2bc-b97b97931c98",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.567Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "cc663f1d-883b-49aa-bf4d-8d2dac623724",
      "data": {
        "Problem": "Sometimes devices behave weird and we want a quick way to test for corruption issues",
        "Solution": "### Method 1\n\nThis method only checks the container passed as an argument. You can use it to check the user's container or the supervisor (in the example we check the supervisor container).\n\nIn theory you can do it for the host too but it's not straightforward for now.\n\nSee [this thread for reference](https://www.flowdock.com/app/rulemotion/public-s-premium/threads/ngDZ3o33iRphAUh5icbthSyn-fL)\n\n```\nroot@81b3c1f:~# balena save resin/armv7hf-supervisor:v7.4.3_logstream > /dev/null\nError response from daemon: file integrity checksum failed for \"usr/bin/node\"\n```\n\n**Note** that when a device has deltas enabled, the `balena save ... > /dev/null` check does NOT in fact check whether the image is corrupted or not, because this information is not preserved with deltas v2.  Also, the integrity check will ALWAYS fail and complain about the `seed` file. (see [this thread](https://www.flowdock.com/app/rulemotion/public-s-premium/threads/EmXjBdbG620nPs71PTR6C_qUidU) for more context)\n\n\n"
      },
      "name": "How to test if a device has file system corruption issues",
      "slug": "scratchpad-entry-ow-to-test-if-a-device-has-file-system-corruption-issues-12d61701-658f-41a4-8145-adc6d08a79d1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.587Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "151b305a-6972-43ef-ba97-9692c3302415",
      "data": {
        "Solution": "We want to let the user know that we are interested, and not be dismissive about the suggested device because of time constraints. A good method here is to switch the discussion to a. how we choose devices, b. a discussion about why they particularly want this device, and c. some additional details on how to add device yourself. Sometimes it may be the case that an existing device we support might do the job better, so based on their answer you can explore that too. Something like:\n\n>We are committed to choosing which devices to support based on what our users need, so are always open to suggestions. Could you give me some more information on how you plan to use the device? What of its features are particularly useful to you?\n\n>Alternatively, for ultimate control, we are proud to offer the ability to add custom device support on your own via a Yocto Linux layer. Let me know if you're interested, and I can connect you with someone who can give you some insights into the process. Also, there's more details on that over at our docs."
      },
      "name": "User wants new device/board supported on resin.io",
      "slug": "scratchpad-entry-ser-wants-new-device-board-supported-on-resin-io-2ad43c37-19e5-4caf-b75d-c7fde8f07677",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.602Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "490cb806-9912-49e5-ab0a-2ba3dab9a5ce",
      "data": {
        "Solution": "We authorise users via [JSON Web Tokens](https://en.wikipedia.org/wiki/JSON_Web_Token) (JWTs) - this is exposed to the user for interfacing with our API (via [our SDK](https://github.com/resin-io/resin-sdk)) using the 'Auth Token' shown in the [Account Details](https://dashboard.resin.io/preferences?tab=details) tab on the [Preferences page](https://dashboard.resin.io/preferences). The JWT is a base32 encoded, concatenated JSON header and signed JSON body which contains data in of itself. These can be deauthorised for sessions other than the users (by refreshing the JWT) using the 'Log me out from other sessions' button in the same preferences tab.\n\nDevices themselves use API keys which is simply a secret matched against one stored in the database for that device."
      },
      "name": "Authorisation Tokens",
      "slug": "scratchpad-entry-uthorisation-okens-cd65d054-a812-4543-a879-20b60c1745aa",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.631Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ef7766bc-1ae3-4f27-b8bb-0a9281b74d50",
      "data": {
        "Problem": "Placeholder for a partially understood and unresolved issue:\n\n* User upgraded the host OS from X to Y (X is for example 2.15.1, Y is for example 2.26 or 2.27)\n* A systemd service (`systemd-tmpfiles`, config file: `/usr/lib/tmpfiles.d/tmp.conf`) deletes the contents of /tmp/ that are older than 10 days, including `/tmp/resin-supervisor` and `/tmp/balena-supervisor` that then gets in a non-trivial-to-summarise web of interactions (?) with host OS upgrades and supervisor symlinks... (Please update this explanation if you understand it better.)\n* Logs show things like:\n```\nFailed to start service 'main sha256:<long_hash>' due to '(HTTP code 500) server error\n - error while creating mount source path '/tmp/balena-supervisor/services/485241/main':\n mkdir /tmp/balena-supervisor: file exists '\n```\n\nRelevant Front conversations:\nhttps://app.frontapp.com/open/cnv_17ddf3v\nhttps://app.frontapp.com/open/cnv_17pjksb",
        "Solution": "Work is being carried out on a permanent fix: https://github.com/balena-os/meta-balena/pull/1378/\nBut it may require upgrading the OS or a fleet deployment script that does not yet exist (?).\n\nMeanwhile, the only known workaround that covers all corner cases is to reboot the device every 9 days... But do not recommend this to customers. Please update this entry when a better workaround is known.\n\nI understand that the people most knowledgeable of this issue are Pablo and Andrei, and Gergely for a fleet solution.",
        "severity": "medium"
      },
      "name": "Failed to start service : mkdir /tmp/balena-supervisor: file exists",
      "slug": "support-issue-ailed-to-start-service-mkdir-tmp-balena-supervisor-file-exists-4924f06b-f77e-4295-8569-47478d6c7ccd",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-01-29T18:16:35.990Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "d19b0803-d49a-4c65-baac-140d63590ddc",
      "data": {
        "Problem": "A device is offline (disconnected from the VPN), but it might still be connected to the local network. If there's another balena device in the same network, we want to use the proxy to \"hop\" from one device to the other, so that we can get into the offline device and diagnose it.",
        "Solution": "See https://jel.ly.fish/#/c55e8f67-f87e-4ac1-9759-997360b20f10 - which itself points to https://github.com/resin-io/process/blob/master/process/support/accessing_user_accounts_and_devices.md",
        "severity": "low"
      },
      "name": "SSH to a device using another device in the same network",
      "slug": "support-issue-to-a-device-using-another-device-in-the-same-network-bac22e5b-8139-4fcb-80ea-841decf1bed8",
      "tags": [
        "hostvia",
        "hopping",
        "ssh"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-07-12T17:39:01.436Z"
      },
      "created_at": "2019-01-25T19:57:31.444Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "5ff23d71-fd40-4db3-8ae8-01eef48ec790",
      "data": {
        "Solution": "The FAT partition feature is under development and not yet deployed to production. In the meantime, a workaround is to access the EXT filesystem if the user can (write-access is a pain in Windows/OS X.)\nThere are boot and configuration partitions exposed as FAT for easy access from any OS (though in Windows these won't necessarily automount - some extra effort may be required to gain access to these TODO: How to do that?)\n\nThe `config.json` file controls specific manual configuration of resin (TODO: Parameters? What can be changed?), and for some systems their configuration is determined by the contents of configuration files in the boot partition:",
        "severity": "low"
      },
      "name": "Device Configuration",
      "slug": "scratchpad-entry-evice-onfiguration-bac40f54-19a0-48e5-93ee-64cb128512de",
      "tags": [
        "needs-review"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:57.526Z",
      "updated_at": "2019-03-08T11:59:16.179Z",
      "capabilities": []
    },
    {
      "id": "752417dd-c326-4228-93c8-7c0ae8f0b7f6",
      "data": {
        "Problem": "We occasionally get questions on how to run Avahi in a container, including how to publish services to the wider LAN.\n",
        "Solution": "The playground project [here](https://github.com/balena-io-playground/avahi-zoo-publisher) uses a `balenalib` base image which has `systemd` installed in it to run Avahi under Debian. It creates a dummy service and has a small Node script to act as the service published.\n",
        "severity": "low"
      },
      "name": "Running Avahi in a service container",
      "slug": "support-issue-unning-vahi-in-a-service-container-bd484144-8890-4657-b768-b9234742989c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-12T11:14:10.553Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c6701a61-88da-4124-bcc2-507b64fc979b",
      "data": {
        "Problem": "On a Fin, the Modem Manager can't find the SIM card and `mmcli -m 0` shows error `sim missing`.",
        "Solution": "This is due to a manufacturing fault present in a small number of early Fins. If you come across this issue, contact the hardware/fin team and ask them to follow up with the user",
        "archived": false,
        "severity": "low"
      },
      "name": "Fin can't find SIM card",
      "slug": "support-issue-in-can-t-find-card-ad878100-7b65-44a3-96e4-d245ace07d43",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-17T10:07:47.874Z",
        "support issue has attached support thread": "2019-04-17T10:07:49.099Z"
      },
      "created_at": "2019-04-17T10:07:47.258Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a3338410-04dd-4fd4-9c74-97a46ee34469",
      "data": {
        "Problem": "There is some corrupted balena state that causes the supervisor to be unable to start the new application container(s).",
        "Solution": "Run `balena ps -a` and look for dead containers. Clear them out, and restart the supervisor.\nYou can clear them out with `rm -r /var/lib/docker/containers/${CONTAINER}`",
        "severity": "low"
      },
      "name": "Unhandled rejection Error: (HTTP code 500) server error - can not get logs from container which is dead or marked for removal",
      "slug": "scratchpad-entry-a3338410-04dd-4fd4-9c74-97a46ee34469",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-19T13:28:17.183Z",
        "support issue has attached support thread": "2019-04-19T13:38:25.123Z"
      },
      "created_at": "2019-03-01T17:59:57.005Z",
      "updated_at": "2019-04-19T13:28:16.816Z",
      "capabilities": []
    },
    {
      "id": "734745b4-5360-4c29-8872-33aeb13d1b1c",
      "data": {
        "Problem": "The DB entered a 100% CPU state and didn't exit it. We observed an elevated processing time and number of requests served. Scaling up the DB and restarting the delta server mitigated the issue, but the root causes are still unclear.",
        "archived": false,
        "severity": "low"
      },
      "name": "DB load incident 22-04-2019",
      "slug": "support-issue-load-incident-22-04-2019-0c0d85ea-42ea-43a9-a99c-14b28b1dcf17",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-22T22:06:26.429Z",
        "support issue has attached support thread": "2019-04-22T22:10:45.690Z"
      },
      "created_at": "2019-04-22T22:06:25.758Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "73b1cca4-d0a6-4536-8955-5e77155b9ba7",
      "data": {
        "status": "open",
        "Problem": "It seems when a ticket is re-assigned in intercom (I assume because someone leaves the team and their tickets are transferred) the thread is re-opened due to the activity. This is just a issue to track those.",
        "Solution": "These can just be closed in JF for now.",
        "archived": false,
        "severity": "low"
      },
      "name": "intercom ticket re-assignment wakes up old thread",
      "slug": "support-issue-intercom-ticket-re-assignment-wakes-up-old-thread-cf25a505-5f6d-4949-b285-c10c8c109096",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T11:17:34.726Z",
        "support issue has attached support thread": "2019-04-23T11:19:40.093Z"
      },
      "created_at": "2019-04-23T11:17:34.191Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4526e61e-9fee-40b0-8a6b-06f7bd688c62",
      "data": {
        "Problem": "This is a collection issue where we link threads that we have followed up on once the issue or feature has been pushed to production. This issue is just here for tracking purposes.",
        "archived": false,
        "category": "follow-up",
        "severity": "low"
      },
      "name": "Follow up message once Bug or feature is released",
      "slug": "support-issue-ollow-up-message-once-ug-or-feature-is-released-581b2ebf-3d8b-4083-8542-7a197764cb63",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T11:22:47.269Z",
        "support issue has attached support thread": "2019-04-23T11:24:08.487Z"
      },
      "created_at": "2019-04-23T11:22:07.101Z",
      "updated_at": "2019-04-23T11:22:46.931Z",
      "capabilities": []
    },
    {
      "id": "0a575148-d533-4299-806b-f4c2ed168dd1",
      "data": {
        "Solution": "It's possible our builders to fail to push to one of the two Docker registries, while succeed with the other, and so they report success to our API. So (depending on Docker version on the device) when the device tries to pull the image it fails with `Failed to download application 'registry.resin.io/appname/c12345678b37bdeb5e30e17e3c41af19344aceee' due to 'Error pulling image (latest) from registry.resin.io/appname/c12345678b37bdeb5e30e17e3c41af19344aceee, HTTP code 400'`.\n\n1. docker pull registry2.resin.io/$appName/$commit\n2. docker tag registry2.resin.io/$appName/$commit registry.resin.io/$appName/$commit\n3. docker push registry.resin.io/$appName/$commit\n\n(step 3 requires login to our registry, which unless you're Page won't have access to, but you can run steps 1 and 2 only on the device and it should work).\n\n**Also, make sure to convey to the user that they should upgrade resinOS to at least 1.26**, in order to get a newer docker that will pull from registry v2."
      },
      "name": "Fixing http code 400 when pulling",
      "slug": "scratchpad-entry-0a575148-d533-4299-806b-f4c2ed168dd1",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-04-23T11:23:51.630Z"
      },
      "created_at": "2019-03-01T17:59:56.377Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "f63eabe2-0408-467c-9c22-caf9526726ff",
      "data": {
        "Problem": "Supervisor container appears up but is not bound to its port (48484) and also exhibits DNS errors. Symptoms include resin-supervisor systemd errors like \n\n- `FAILED to OOM protect supervisor container`\n- `EAI_AGAIN` errors\n- `Could not listen on /var/run/resin/gosuper.sock: listen unix /var/run/resin/gosuper.sock: bind: address already in use`\n\nThe problem has been identified as HostConfig corruption of the supervisor container.\n\nWe are currently looking into making HostConfig more resilient.\nrelated https://resin-io.github.io/scratchpad/#device-appears-online-but-is-unresponsive",
        "Solution": "This should temporarily mitigate the problem:\n\n```\nsystemctl stop resin-supervisor; \\\ndocker rm --volumes resin_supervisor; \\\nsystemctl start resin-supervisor\n```"
      },
      "name": "Supervisor malfunctioning with EAI_AGAIN errors",
      "slug": "scratchpad-entry-upervisor-malfunctioning-with-errors-84de7847-ab81-48e5-9e0d-3264238bd8ab",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-04-23T13:29:20.278Z"
      },
      "created_at": "2019-03-01T17:59:57.621Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "eefad263-d17f-43c6-bb4b-bc5aa5103c05",
      "data": {
        "Problem": "This is caused by a bug in some supervisor releases with deltas. [More info](https://app.frontapp.com/open/cnv_v6nalf)\n\nProblem verification:\n`journalctl -u resin-supervisor`\nshould look something like this:\n```\nJul 04 10:45:54 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:45:54.272Z] Event: Application delta download {\"app\":{\"appId\":\"APP_ID\",\"commit\":\"COMMIT_HASH\",\"imageId\":\"r\negistry2.resin.io/v2/e32d0265fcc6a5ba8cc82e7b1c6cdc77\",\"env\":\"{\\\"RESIN_APP_ID\\\":\\\"APP_ID\\\",\\\"RESIN_APP_NAME\\\":\\\"APP_NAME\\\",\\\"RESIN_APP_RELEASE\\\":\\\"COMMIT_HASH\\\",\\\"RESIN_\nDEVICE_UUID\\\":\\\"DEVICE_UUID\\\",\\\"RESIN_DEVICE_NAME_AT_INIT\\\":\\\"device_name\\\",\\\"RESIN_DEVICE_TYPE\\\":\\\"raspberrypi3\\\",\\\"RESIN_HOST_OS_VERSION\\\":\\\"Resin OS 2.7.5+rev1\\\",\\\"RESIN_SUPERVI\nSOR_ADDRESS\\\":\\\"http://127.0.0.1:48484\\\",\\\"RESIN_SUPERVISOR_HOST\\\":\\\"127.0.0.1\\\",\\\"RESIN_SUPERVISOR_PORT\\\":48484,\\\"RESIN_SUPERVISOR_VERSION\\\":\\\"6.3.6\\\",\\\"RESIN\\\":\\\"1\\\",\\\"USER\\\":\\\"root\\\"}\",\"config\":\"{\\\"RESIN_SUPERVISOR_DELTA\\\":\\\"1\\\",\n\\\"RESIN_SUPERVISOR_NATIVE_LOGGER\\\":\\\"false\\\",\\\"RESIN_DEVICE_RESTART\\\":\\\"09881612414984087\\\",\\\"RESIN_SUPERVISOR_POLL_INTERVAL\\\":\\\"600000\\\"}\",\"name\":\"APP_NAME\",\"markedForDeletion\":false}}\nJul 04 10:45:54 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:45:54.300Z] Using delta source registry2.resin.io/v2/1234567890abcde\nJul 04 10:47:26 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:47:26.498Z] Falling back to delta-from-empty\nJul 04 10:47:26 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:47:26.508Z] Using delta source resin/scratch\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:47:29.205Z] Event: Application download error {\"app\":{\"appId\":\"APP_ID\",\"commit\":\"COMMIT_HASH\",\"imageId\":\"r\negistry2.resin.io/v2/e32d0265fcc6a5ba8cc82e7b1c6cdc77\",\"env\":\"{\\\"RESIN_APP_ID\\\":\\\"APP_ID\\\",\\\"RESIN_APP_NAME\\\":\\\"APP_NAME\\\",\\\"RESIN_APP_RELEASE\\\":\\\"COMMIT_HASH\\\",\\\"RESIN_\nDEVICE_UUID\\\":\\\"DEVICE_UUID\\\",\\\"RESIN_DEVICE_NAME_AT_INIT\\\":\\\"device_name\\\",\\\"RESIN_DEVICE_TYPE\\\":\\\"raspberrypi3\\\",\\\"RESIN_HOST_OS_VERSION\\\":\\\"Resin OS 2.7.5+rev1\\\",\\\"RESIN_SUPERVI\nSOR_ADDRESS\\\":\\\"http://127.0.0.1:48484\\\",\\\"RESIN_SUPERVISOR_HOST\\\":\\\"127.0.0.1\\\",\\\"RESIN_SUPERVISOR_PORT\\\":48484,\\\"RESIN_SUPERVISOR_VERSION\\\":\\\"6.3.6\\\",\\\"RESIN\\\":\\\"1\\\",\\\"USER\\\":\\\"root\\\"}\",\"config\":\"{\\\"RESIN_SUPERVISOR_DELTA\\\":\\\"1\\\",\n\\\"RESIN_SUPERVISOR_NATIVE_LOGGER\\\":\\\"false\\\",\\\"RESIN_DEVICE_RESTART\\\":\\\"09881612414984087\\\",\\\"RESIN_SUPERVISOR_POLL_INTERVAL\\\":\\\"600000\\\"}\",\"name\":\"APP_NAME\",\"markedForDeletion\":false},\"error\":{\"mes\nsage\":\"Got 401 when requesting image from delta server.\",\"stack\":\"Error: Got 401 when requesting image from delta server.\\n    at s.<anonymous> (/usr/src/app/dist/app.js:74:4216)\\n    at emitOne (events.j\ns:96:13)\\n    at s.emit (events.js:188:7)\\n    at s.onRequestResponse (/usr/src/app/dist/app.js:343:43618)\\n    at emitOne (events.js:96:13)\\n    at ClientRequest.emit (events.js:188:7)\\n    at HTTPParser\n.parserOnIncomingClient (_http_client.js:472:21)\\n    at HTTPParser.parserOnHeadersComplete (_http_common.js:105:23)\\n    at TLSSocket.socketOnData (_http_client.js:361:20)\\n    at emitOne (events.js:96:1\n3)\\n    at TLSSocket.emit (events.js:188:7)\\n    at readableAd\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]: dChunk (_stream_readable.js:176:18)\\n    at TLSSocket.Readable.push (_stream_readable.js:134:10)\\n    at TLSWrap.onread (net.js:543:20)\"}}\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:47:29.222Z] Error: Error: Got 401 when requesting image from delta server.\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.<anonymous> (/usr/src/app/dist/app.js:74:4216)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.onRequestResponse (/usr/src/app/dist/app.js:343:43618)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at ClientRequest.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at HTTPParser.parserOnIncomingClient (_http_client.js:472:21)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at HTTPParser.parserOnHeadersComplete (_http_common.js:105:23)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.socketOnData (_http_client.js:361:20)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at readableAddChunk (_stream_readable.js:176:18)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.Readable.push (_stream_readable.js:134:10)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSWrap.onread (net.js:543:20) Error: Got 401 when requesting image from delta server.\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.<anonymous> (/usr/src/app/dist/app.js:74:4216)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.onRequestResponse (/usr/src/app/dist/app.js:343:43618)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at ClientRequest.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at HTTPParser.parserOnIncomingClient (_http_client.js:472:21)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at HTTPParser.parserOnHeadersComplete (_http_common.js:105:23)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.socketOnData (_http_client.js:361:20)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at emitOne (events.js:96:13)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.emit (events.js:188:7)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at readableAddChunk (_stream_readable.js:176:18)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSSocket.Readable.push (_stream_readable.js:134:10)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at TLSWrap.onread (net.js:543:20)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]: [2018-07-04T10:47:29.242Z] Scheduling another update attempt due to failure:  30000 Error: 1 error: Got 401 when requesting image from delta server.\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at /usr/src/app/dist/app.js:546:19226\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at r (/usr/src/app/dist/app.js:1:2393)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromiseFromHandler (/usr/src/app/dist/app.js:283:20446)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromise (/usr/src/app/dist/app.js:283:21246)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromise0 (/usr/src/app/dist/app.js:283:21945)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromises (/usr/src/app/dist/app.js:283:23272)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._fulfill (/usr/src/app/dist/app.js:283:22315)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s._resolve (/usr/src/app/dist/app.js:283:31316)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s._filter (/usr/src/app/dist/app.js:283:62689)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s._promiseFulfilled (/usr/src/app/dist/app.js:283:62341)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s._iterate (/usr/src/app/dist/app.js:283:31137)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at s.t (/usr/src/app/dist/app.js:283:30612)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromise (/usr/src/app/dist/app.js:283:21284)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromise0 (/usr/src/app/dist/app.js:283:21945)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._settlePromises (/usr/src/app/dist/app.js:283:23272)\nJul 04 10:47:29 9dc9e5f start-resin-supervisor[1056]:     at i._fulfill (/usr/src/app/dist/app.js:283:22315)\n```",
        "Solution": "One of the following:\n- Upgrade resin-os to latest\n- Disable deltas\n- Update resin-supervisor to 6.6.11+ or 7.4.2+",
        "severity": "low",
        "fixedInSupervisorVersion": ">7.4.2"
      },
      "name": "Device stuck in Downloading 100%",
      "slug": "scratchpad-entry-eefad263-d17f-43c6-bb4b-bc5aa5103c05",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T13:30:31.490Z",
        "support issue has attached support thread": "2019-04-23T13:28:37.308Z"
      },
      "created_at": "2019-03-01T17:59:57.466Z",
      "updated_at": "2019-04-23T13:30:30.854Z",
      "capabilities": []
    },
    {
      "id": "b117d4e0-f707-4cf9-aa2e-1fa56cadab94",
      "data": {
        "Problem": "VPN deployment caused devices to drop offline and we had to roll it back.",
        "archived": false,
        "severity": "low"
      },
      "name": "VPN incident (19-04-2019)",
      "slug": "support-issue-incident-19-04-2019-c21011b9-4f8c-46c7-85a4-4ad9de6c6686",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-23T13:50:12.939Z",
        "support issue has attached support thread": "2019-04-30T13:29:44.701Z"
      },
      "created_at": "2019-04-23T13:50:12.452Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "037d9bdc-9f87-4daa-93af-e282c79416eb",
      "data": {
        "Solution": "To do this you need to mount the partition containing config.json and edit it directly there. For the changes to take effect either connmand needs to be restarted or the device has to be restarted. **IMPORTANT:** This is very risky. Any mistake here can lead to a bricked device.\n\nYou can do this with something like:\n```\nconfigdev=$(blkid | grep \"resin-conf\" | awk '{print $1}' | tr -d ':')\nmount $configdev /mnt\n<edit /mnt/config.json with your favourite editor>\numount /mnt\n```"
      },
      "name": "How to remotely update config.json?",
      "slug": "scratchpad-entry-037d9bdc-9f87-4daa-93af-e282c79416eb",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.285Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7424afb1-088d-41c9-b9e8-3e862383b56a",
      "data": {
        "Problem": "The device gets stuck downloading a delta with errors like\n```\nFailed to download image 'registry2.balena-cloud.com/v2/ea0a6ae7522d573ccd1e2241f7441e35:latest http://registry2.balena-cloud.com/v2/ea0a6ae7522d573ccd1e2241f7441e35:latest' due to 'Got 404 when request image from delta server\n```\nand\n```\n27.03.19 13:20:50 (-0700) Delta still processing remotely. Will retry...\n```\n\nlogentries.com shows:\n```\nMar 27 21:24:55 f5f1b65 resin-supervisor[28103]: [2019-03-27T21:24:55.687Z] delta(registry2.balena-cloud.com/v2/85a491468c99ec3280a8a8f7cc01ce82@sha256:db31fd005cb38b1995b8fce379bb961a2777a471e1445375a33ab087832b905b): Delta failed with: t\n```",
        "Solution": "The cause of this issue is unknown, but submitting a new release appears to fix the issue",
        "archived": false,
        "severity": "low"
      },
      "name": "Delta fails with error 'Delta still processing remotely'",
      "slug": "support-issue-elta-fails-with-error-elta-still-processing-remotely-61a896f9-1422-46bc-92b6-c0b2f4dd4b05",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T14:50:37.582Z",
        "support issue has attached support thread": "2019-04-01T14:50:38.478Z"
      },
      "created_at": "2019-04-01T14:50:37.217Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "ec300127-8fa3-48f3-a944-aa1295e55499",
      "data": {
        "Problem": "It's not obvious what OS versions for what device types are available on the platform, and users are often waiting for something fixed to be released.",
        "Solution": "Check the releases for specific device types at https://balena-io-playground.github.io/balenaosversions/",
        "severity": "low"
      },
      "name": "User is waiting for a specific OS release that contains fixes/features for them",
      "slug": "support-issue-ser-is-waiting-for-a-specific-release-that-contains-fixes-features-for-them-77a00b1b-13fb-42d5-8222-bf6f48f7c8ce",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T16:02:05.278Z",
        "support issue has attached support thread": "2019-04-01T16:03:20.120Z"
      },
      "created_at": "2019-04-01T16:02:04.921Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "edc109dc-cdbe-4e75-a8d9-41099d8e74b1",
      "data": {
        "archived": false,
        "severity": "low"
      },
      "name": "test support issue",
      "slug": "support-issue-test-support-issue-34086eee-83d9-42c3-b8e7-6371c57c7e3c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T09:22:38.340Z",
        "support issue has attached support thread": "2019-04-02T09:22:39.360Z"
      },
      "created_at": "2019-04-02T09:22:37.704Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a0cb54f9-a9ff-4466-b900-d7c83d0dce45",
      "data": {
        "Problem": "How can I deploy code to an application without using the balenaCloud build server?",
        "Solution": "Its possible to deploy using `balena deploy` via the CLI. This will build all the images on the users laptop, create a release on the API and then upload the built images on the registry. This solution doesn't ever push any source code to the balenaCloud builders.\n\nNote that when using this, building ARM images will need to use QEMU emulation.",
        "archived": false,
        "severity": "low"
      },
      "name": "How to deploy code without using cloud builder",
      "slug": "support-issue-ow-to-deploy-code-without-using-cloud-builder-5c969ac5-4c95-41ad-8049-0d1e6e60e446",
      "tags": [
        "info"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T09:52:59.050Z",
        "support issue has attached support thread": "2019-04-02T09:53:00.403Z"
      },
      "created_at": "2019-04-02T09:52:58.372Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7c5712c8-202e-4734-b8f6-c36cb609762c",
      "data": {
        "Problem": "User reports device really slow (approx. 1 hour) to download updates on ethernet (last 2 deploys) but on wifi it takes 10 minutes. It appeared in OS 2.30.0+rev1 on Samsung Artik 530s 1G . \n",
        "Solution": "The user reported back that they are no longer experiencing the issue. It appears it is either faulting hardware or an ISP issue at this point.",
        "archived": false,
        "severity": "low",
        "device-type": "Samsung Artik 530s 1G ",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "device-type": {
              "type": "string"
            }
          }
        }
      },
      "name": "Device Extremely slow Update on Wifi",
      "slug": "support-issue-evice-xtremely-slow-pdate-on-ifi-24b4f4ed-3a56-45d5-bab5-97e7ce3f1e73",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:08:50.618Z",
        "support issue has attached support thread": "2019-04-02T10:08:51.677Z"
      },
      "created_at": "2019-04-02T10:08:49.958Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c85acd8b-4299-4409-aa18-22827734e369",
      "data": {
        "Problem": "API incident , no post mortem yet. https://www.flowdock.com/app/rulemotion/resin-devops/threads/lU2WBoqnM2fQNp7wMoVq8Wo2wvq",
        "archived": false,
        "severity": "high"
      },
      "name": "API incident (1 Apr. 2019)",
      "slug": "support-issue-incident-1-pr-2019-a7271dcc-61d3-4189-94a0-4eadb8d5bca5",
      "tags": [
        "incident"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:10:38.320Z",
        "support issue has attached support thread": "2019-04-02T10:47:26.377Z"
      },
      "created_at": "2019-04-02T09:28:56.588Z",
      "updated_at": "2019-04-02T10:10:37.930Z",
      "capabilities": []
    },
    {
      "id": "3f1b6880-8fa6-45bf-a8d2-41ac9ff955bd",
      "data": {
        "Problem": "API incident, no postmortem yet: https://www.flowdock.com/app/rulemotion/resin-devops/threads/lU2WBoqnM2fQNp7wMoVq8Wo2wvq ",
        "archived": false,
        "severity": "high"
      },
      "name": "API incident (01-04-2019",
      "slug": "support-issue-incident-01-04-2019-5a8405a0-6ef7-4296-a732-ce4bbe913451",
      "tags": [
        "incident"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:10:40.747Z"
      },
      "created_at": "2019-04-02T09:15:34.258Z",
      "updated_at": "2019-04-02T10:10:40.396Z",
      "capabilities": []
    },
    {
      "id": "f29de270-467b-4d8a-a8f4-af8578321507",
      "data": {
        "Problem": "User switches to `balenalib/` base images and the udev rules in their container stopped working. ",
        "Solution": "In the `balenalib` base images the udevd is defaulted to off. So the user needs to add `ENV UDEV=on` to their dockerfile or in the app env vars. Major changes in the base images are listed here: https://www.balena.io/docs/reference/base-images/base-images/#major-changes",
        "archived": false,
        "severity": "low"
      },
      "name": "Udev rules stopped working when switching to balenalib base images",
      "slug": "support-issue-dev-rules-stopped-working-when-switching-to-balenalib-base-images-349f2f51-cb04-4ae5-be68-4c0adf9cdb81",
      "tags": [
        "balenalib",
        "udev"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:20:39.593Z",
        "support issue has attached support thread": "2019-04-02T10:20:40.637Z"
      },
      "created_at": "2019-04-02T10:20:39.241Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3c380f89-0871-4d6a-91b5-a9deeacbb54a",
      "data": {
        "Problem": "User notices that the date/time on the device is incorrect, usually via logs.",
        "Solution": "There seems to be some flakiness with NTP, in theory, it ought to update on connection to the internet (via connman), and then every 2 hours, but appears to fail to do so sometimes altogether.\n\nA potential cause is the NTP port (123 UDP) being blocked on the network the device belongs to. Diagnosing this is difficult as the NTP package is not installed in the supervisor container (or user container of course) by default.\n\nOnce SSH'd into the host OS of the device, the following can be used to diagnose the issue:-\n```\nrce exec -it resin_supervisor /bin/bash\napt-get -y update\napt-get -y install ntp\n ntpq -p [ntp server address]\nIf the port is accessible, you should get a response like the below:-\n[~]$ ntpq -p 81.168.77.149\n remote refid st t when poll reach delay offset jitter\n==============================================================================\n*ntp1.exa-networ 135.81.191.59 2 u 460 1024 377 40.326 3.667 0.365\n+addtec10-tr3.ka 62.45.45.70 3 S 4971 128 176 40.964 3.854 0.582\n mx1.thompson-tr 81.168.77.149 4 S 143 1024 377 85.331 9.075 6.470\n LPuteaux-656-1- 81.168.77.149 4 S 2 256 377 44.158 6.857 1.816\n 87.83.215.50 (i 81.168.77.149 4 S 4971 1024 377 36.204 2.305 0.452\n jtdmltd.gotadsl 81.168.77.149 4 S 382 1024 176 47.512 2.144 0.553\n 82-69-242-34.ds 81.168.77.149 4 S 652 1024 346 41.127 3.130 1.305\n+host81-152-12-0 129.67.1.164 2 S 643 1024 376 41.007 -11.452 1.293\n 109.111.201.42 81.168.77.149 4 S 4971 16 177 38.141 0.623 11.045\n 109.111.201.42 81.168.77.149 4 S 4971 16 377 45.537 -6.498 5.196\n 105.210.64.244 130.88.212.143 3 S 10 64 2 251.130 -16.077 35.753\n 23.127.107.92.d 81.168.77.149 4 S 4971 1024 3 84.771 14.046 4.688\n 193.130.120.196 81.168.77.149 4 S 237 64 240 76.231 -184.51 7.418\n```\nIf not, you'll get a response complaining that it can't connect.",
        "severity": "low",
        "fixedInOSVersion": "2.0"
      },
      "name": "Why is my device showing the incorrect time?",
      "slug": "scratchpad-entry-3c380f89-0871-4d6a-91b5-a9deeacbb54a",
      "tags": [
        "1.x"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T10:34:39.405Z"
      },
      "created_at": "2019-03-01T17:59:56.620Z",
      "updated_at": "2019-04-02T10:34:38.973Z",
      "capabilities": []
    },
    {
      "id": "c39e3efe-2c7d-45be-82c3-ce5ee93e4a37",
      "data": {
        "Problem": "The user has a android phone that they want to use to provide cellular connectivity. The phone connects via USB and they currently have a container that uses `adb` to set up the connectivity. \n\nCurrently there isn't support for this in the OS.",
        "Solution": "The user has to setup the connectivity in the container using `adb` tool.",
        "archived": false,
        "severity": "low"
      },
      "name": "User wants to tether a device to an android cellphone for connectivity",
      "slug": "support-issue-ser-wants-to-tether-a-device-to-an-android-cellphone-for-connectivity-8626bb7e-a1d9-4148-8523-c058ff98fb72",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T11:00:44.327Z",
        "support issue has attached support thread": "2019-04-02T11:00:45.355Z"
      },
      "created_at": "2019-04-02T11:00:43.746Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "dd7149a6-1191-43a0-83cf-c3d163329194",
      "data": {
        "Problem": "Currently for any orgs that have support, we need to manually add their support privileges so they have access to the chat support widget. ",
        "Solution": "Ping the `@@customer_success` team to add the user. ",
        "archived": false,
        "category": "account management",
        "severity": "low"
      },
      "name": "User needs support chat access",
      "slug": "support-issue-ser-needs-support-chat-access-a7572aae-e285-4de6-a7b4-55706665937a",
      "tags": [
        "orgs",
        "account management"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T13:38:00.467Z",
        "support issue has attached support thread": "2019-04-02T11:13:15.146Z"
      },
      "created_at": "2019-04-02T11:13:08.714Z",
      "updated_at": "2019-04-02T13:38:00.195Z",
      "capabilities": []
    },
    {
      "id": "fde9a427-0c83-4320-80dc-c5f79b1e98c9",
      "data": {
        "Problem": "```\nroot@4fe08f2:~# chronyc tracking\nReference ID : CC0286A4 (propjet.latt.net)\nStratum : 3\nRef time (UTC) : Thu Mar 28 19:11:15 2019\nSystem time : 0.000233279 seconds slow of NTP time\nLast offset : -0.000235760 seconds\nRMS offset : 0.001228472 seconds\nFrequency : 0.635 ppm slow\nResidual freq : +0.015 ppm\nSkew : 0.442 ppm\nRoot delay : 0.147634357 seconds\nRoot dispersion : 0.010577974 seconds\nUpdate interval : 1036.7 seconds\nLeap status : Normal\n```",
        "archived": false,
        "category": "NTP",
        "severity": "low",
        "fixedInOSVersion": "2.13.1"
      },
      "name": "Check if chronyc is syncing",
      "slug": "support-issue-heck-if-chronyc-is-syncing-39215210-fcac-48c5-8ad7-87994d3827f0",
      "tags": [
        "NTP",
        "time",
        "handbook"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T13:39:20.157Z",
        "support issue has attached support thread": "2019-04-02T10:46:40.934Z"
      },
      "created_at": "2019-04-02T10:46:38.860Z",
      "updated_at": "2019-04-02T13:39:19.866Z",
      "capabilities": []
    },
    {
      "id": "1bf739bc-392f-4a47-9734-0100f36c94ba",
      "data": {
        "archived": false,
        "category": "transparency",
        "severity": "low"
      },
      "name": "User wants a Product Changelog or Release Notes",
      "slug": "support-issue-ser-wants-a-roduct-hangelog-or-elease-otes-bd2d6fa2-cfb8-4047-b73d-ca5794fb4ce4",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T13:46:53.840Z",
        "support issue has attached support thread": "2019-04-02T10:23:50.527Z"
      },
      "created_at": "2019-04-02T10:23:49.006Z",
      "updated_at": "2019-04-02T13:46:53.338Z",
      "capabilities": []
    },
    {
      "id": "9c367097-e546-4dca-9cf2-4b66702d7e5b",
      "data": {
        "Problem": "User reported a device experiences increased bandwidth usage on 03-31-2019 between 18:00 and 23:59 UTC. There was a API issue around that date, but unclear if things were caused by the incident.\n\nDevice type: Raspberry Pi 3\n\nOS version: balenaOS 2.29.2+rev2\n\nSupervisor version: 9.0.1",
        "archived": false,
        "severity": "low"
      },
      "name": "Device experiences random bandwidth increase",
      "slug": "support-issue-evice-experiences-random-bandwidth-increase-3372973e-f576-448f-831a-694872b9468c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-05T08:55:25.903Z",
        "support issue has attached support thread": "2019-04-05T08:55:26.862Z"
      },
      "created_at": "2019-04-05T08:55:25.514Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "49a4b55b-2e52-48f4-9e3a-9d8b8042dd52",
      "data": {
        "Problem": "User reported getting \"socket hang up\" on a public device URL. On investigation, we found that the their `'main'` container (in host networking mode) was binding to the local interface, i.e. `127.0.0.1:80` instead of `0.0.0.0:80`. \n\nDevice type: Intel NUC\n\nOS version: balenaOS 2.29.2+rev2\n\nSupervisor version: 9.0.1",
        "Solution": "changing the bind address should avoid the issue. We will see if there are future interventions we can add",
        "archived": false,
        "category": "networking",
        "severity": "low",
        "device-type": "Intel NUC",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "": {
              "type": "string"
            },
            "device-type": {
              "type": "string"
            },
            "affected OS version": {
              "type": "string"
            }
          }
        },
        "affected OS version": "2.29.2+rev2"
      },
      "name": "\"socket hang up\" on connecting to a public device URL",
      "slug": "support-issue-socket-hang-up-on-connecting-to-a-public-device-47c88629-2e8d-497f-8b33-63790ad0053d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-02T13:26:59.625Z",
        "support issue has attached support thread": "2019-04-02T11:28:41.064Z"
      },
      "created_at": "2019-04-02T11:28:39.754Z",
      "updated_at": "2019-04-02T13:26:59.339Z",
      "capabilities": []
    },
    {
      "id": "5239f418-9e95-4af0-a592-6e17875be3b2",
      "data": {
        "Solution": "Alt title: User wants to set some devices to run a specific app commit\n\nSolution:\nThe [staged-releases repo](https://github.com/resin-io-playground/staged-releases) is a collection of scripts that demonstrate some of the new API endpoints offered on resin.io to enable the more fine grained control of app updates across a fleet of devices. These scripts simply show how to use the available primitives and in the near future this functionality will be surfaced on the UI and via the CLI."
      },
      "name": "User wants staged releases to a fleet of devices",
      "slug": "scratchpad-entry-5239f418-9e95-4af0-a592-6e17875be3b2",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-04-02T10:50:58.075Z"
      },
      "created_at": "2019-03-01T17:59:56.735Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "617b9e61-a921-47e9-ac5d-ea8533474cde",
      "data": {
        "Problem": "Changing the hostname through Avahi / DBUS \"SetHostname\" results in the host being advertised as foo-2.local, foo-3.local, etc., where 'foo' is the hostname. This happens because of the following Avahi bug:\nhttps://github.com/lathiat/avahi/issues/117\n\nZubair's tl;dr: Avahi broadcasts SetHostName on multiple interfaces and basically confuses itself, thinking the hostname is already assigned and thus conflict.",
        "Solution": "The issue and workarounds are further described in the following closed meta-balena issue:\nhttps://github.com/balena-os/meta-balena/issues/1287\n\nIn order to change the hostname on balena devices with or without Avahi, the recommended procedure is to use the balena supervisor API \"PATCH /v1/device/host-config\" endpoint:\nhttps://www.balena.io/docs/reference/supervisor/supervisor-api/#patch-v1-device-host-config\n",
        "category": "networking",
        "severity": "low",
        "shareable": true
      },
      "name": "Avahi spurious name conflicts - change set hostname in local mDNS",
      "slug": "support-issue-vahi-spurious-name-conflicts-change-set-hostname-in-local-m-461f708f-3ce3-4209-a6f8-f9910602451d",
      "tags": [
        "avahi",
        "mDNS"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-04-01T15:23:01.539Z"
      },
      "created_at": "2019-01-30T20:54:57.404Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0a0514af-1da3-44f0-a6b7-d300937ee02f",
      "data": {
        "archived": false,
        "severity": "low"
      },
      "name": "Delta fails to download with ''Delta still processing remotely'",
      "slug": "support-issue-elta-fails-to-download-with-elta-still-processing-remotely-badb5df1-8129-4b3c-ac6a-2e88320b308d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T11:44:17.856Z"
      },
      "created_at": "2019-04-01T11:44:17.340Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "98fbad64-66be-4519-b5f7-dd83b697aba2",
      "data": {
        "Problem": "A device gets stuck downloading for a long time with the error `Delta still processing remotely`.",
        "Solution": "Resubmitting the release appears to fix the issue, but we need to investigate the actual cause of the issue",
        "archived": false,
        "severity": "low"
      },
      "name": "Device stuck downloading with 'Delta still processing remotely'",
      "slug": "support-issue-evice-stuck-downloading-with-elta-still-processing-remotely-ec2d2446-432f-4756-9fdc-944184368bb6",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T11:42:49.795Z"
      },
      "created_at": "2019-04-01T11:42:49.276Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "106edb02-fc33-4236-930e-2f92b8aa1d23",
      "data": {
        "Problem": "The device loses time sync after application update or restart. Time will sync up after a while when chrony wakes up.\n\nThis happens when 3 stars align.\n- A privileged container\n- udev enabled in the app container\n- A udev rule inside the base image that messed with rtc clocks",
        "Solution": "Check the base image for what hwclock rule is triggering, remove that rule in the docker file.\nFor more detail, please see https://github.com/balena-os/meta-balena/issues/1247#issuecomment-456353808",
        "severity": "low",
        "shareable": true
      },
      "name": "Time sync is lost when an application container is restarted or updated",
      "slug": "support-issue-ime-sync-is-lost-when-an-application-container-is-restarted-or-updated-2db3d9cc-0c7f-4f63-b1fa-755096fcc532",
      "tags": [
        "chrony",
        "ntp",
        "timesyncd"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T09:06:20.943Z"
      },
      "created_at": "2019-01-22T10:49:12.814Z",
      "updated_at": "2019-04-01T09:06:20.531Z",
      "capabilities": []
    },
    {
      "id": "56a8ac2c-e0e4-4310-a029-15f3ff107054",
      "data": {
        "Problem": "When you run `top` on a device, it might show a process `chronyc online` eating a lot of CPU percentage.\nThis is a bug in chrony. It has been fixed upstream\n\nThis load sometimes manifests in different ways e.g. application updates fail.",
        "Solution": "kill the `chronyc online` process.",
        "category": "OS",
        "severity": "medium",
        "fixedInOSVersion": "2.29.2"
      },
      "name": "chronyc online stuck on high cpu usage",
      "slug": "support-issue-chronyc-online-stuck-on-high-cpu-usage-9975e52a-1449-40cb-9f05-9bc380473dfe",
      "tags": [
        "chrony",
        "ntp",
        "timesyncd"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T09:06:03.290Z"
      },
      "created_at": "2019-01-16T17:48:51.022Z",
      "updated_at": "2019-04-01T09:06:02.895Z",
      "capabilities": []
    },
    {
      "id": "efe114fc-c3fb-4f25-a4ae-64f06558cd2d",
      "data": {
        "Problem": "An option `hwtimestamp *` was introduced in chrony.conf in v2.27+. This uses network time stamps for improving time sync speed.\nOlder versions of Yocto. e.g. rocko on tx2 has an old version of chrony that doesn't support that in the conf file. As a result, chronyd service fails to start.",
        "Solution": "`mount -o remount,rw / && sed -i '/^hwtimestamp.*$/d' /etc/chrony.conf && mount -o remount,ro /`",
        "severity": "low"
      },
      "name": "chronyd fails to start on balenaOS 2.27.0",
      "slug": "scratchpad-entry-chronyd-fails-to-start-on-balena-2-27-0-0c700368-9483-4401-8bcd-4acaf4ac3bf9",
      "tags": [
        "chrony",
        "ntp",
        "timesyncd"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T09:05:45.865Z"
      },
      "created_at": "2018-12-14T22:35:36.102Z",
      "updated_at": "2019-04-01T09:05:45.434Z",
      "capabilities": []
    },
    {
      "id": "ecaaa634-1c19-49a2-8375-7039f8cd26c2",
      "data": {
        "Solution": "We have encountered many situations where a device is showing 'offline' but is in fact online, but not correctly connecting to the VPN meaning the online/offline notification does not update (we've had this go the other way - an offline device going offline during a period when the VPN servers have been down and no reset having been applied meaning they show online, but it's far rarer since VPN resetting came into force.)\n\n#### Things to check\n\n1. To determine whether the device is actually online, first check the device dashboard logs - are logs currently displayed, or if the application isn't very noisy, have logs been displayed since last online time? If so this can be a strong indication the device is actually online.\n2. The next most useful check is to simply add a new environment variable to the device. If the device is in fact online, it should pick up the change and reset itself, generating logs as it does so. The poll time is customisable, but defaults to 1 minute.\n3. If these two don't work, it's highly likely the device really is offline (or at least unable to access resin servers), but a final check is to look at API logs via logentries (check with operations if you need access.) Search for the device UUID in the logs over a timespan past the time it is indicated as having gone offline. Logs of the device accessing the API will look like (replacing <DEVICE UUID> with the devices UUID and <DEVICE APP ID> with the device's app ID):\n```\n/ewa/application?$select=id,git_repository,commit&$filter=((commit%20ne%20null)%20and%20(device/uuid%20eq%20%27<DEVICE UUID>%27))&apikey=... and /environment?deviceId=115341&appId=<DEVICE APP ID>&apikey=...\n```\n\nIf you discover that the device is in fact online but not accessible via VPN, this means that SSH-ing into the device using the usual method will not work. See SSH to device without VPN for details on how to work around this!\n\nSee [this flowdock thread](https://www.flowdock.com/app/rulemotion/user_happiness/threads/_3bUmDGti9T1f-gDf47qc73tCfb) for more details and discussion of a device that these checks were run on."
      },
      "name": "Checking whether offline device is really offline",
      "slug": "scratchpad-entry-ecaaa634-1c19-49a2-8375-7039f8cd26c2",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-03-30T21:14:49.458Z"
      },
      "created_at": "2019-03-01T17:59:57.457Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "365780c6-9116-467c-b295-31af575cdf48",
      "data": {
        "Solution": "Users can clone https://github.com/resin-io-playground/kernel-module-build , modify it according to their needs (see README in the project) and use it to build OOT kernel modules using the `git push resin master` pipeline."
      },
      "name": "How to insert out-of-tree kernel modules on a device?",
      "slug": "scratchpad-entry-365780c6-9116-467c-b295-31af575cdf48",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-03-28T15:49:34.983Z",
        "support issue has attached support thread": "2019-03-28T15:36:34.494Z"
      },
      "created_at": "2019-03-01T17:59:56.600Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "939be7c2-1082-46a7-bcaf-8eedd4d3e299",
      "data": {
        "Solution": "As of by supervisor versions `>= v7.15.0`.\n`RESIN_SUPERVISOR_PERSISTENT_LOGGING` environment variable, can be set from `DEVICE CONFIGURATION` dashboard, for enabling persistent logging.\n\n**UPDATE** \n\nThis entry appears out of date. You should be able to SSH into the host resinOS and carry out the following:\n\n```\ncd /mnt/boot && cp config.json config.json.bak && cat config.json | jq \".persistentLogging=true\" -c > config.json.new && mv config.json.new config.json\n```\n\nThen `cat config.json | jq .`. The `persistentLogging` field should be set to `true`.\n\nA reboot needs to occur for this to take affect.\n\nThe logs are then bind mounted to the state partition, and can be found in the following directory: `/var/log/journal`.\n\nOld, deprecated entry follows:\n\n**DO NOT USE**\n\n>IMPORTANT: This currently does not work prior to a reboot. If you are going to use this right now, make sure to reboot the device (with permission and make sure it's safe to do so.) Theodor is working on fixing this.\n\nAs it stands now our images provide volatile logging for the system journal. If one needs to have persistent journal log on a device one can do so remotely.\n\nFirst create a bash script containing the following:\n\n```\n#!/bin/bash\n#Comment out the auto-mount of tmpf on volatile memory\nsed -i '/\\/var\\/volatile/ s/^#*/# /' /etc/fstab\nsed -i '/Storage=/c\\Storage=persistent' /etc/systemd/journald.conf\nsed -i '/SystemMaxUse=/c\\SystemMaxUse=16M' /etc/systemd/journald.conf\n\numount /var/volatile\nrmdir /var/volatile\nmkdir -p /mnt/data/volatile/log\ncd /var && ln -sf /mnt/data/volatile .\nsystemctl restart systemd-journald\n```\n\nThen run the local script that you have created (e.g. persistent-logging.sh) on the remote machine:\nssh resin -o Hostname=${UUID}.vpn \"bash -s\" < persistent-logging.sh",
        "severity": "low"
      },
      "name": "Persistent journal log",
      "slug": "scratchpad-entry-939be7c2-1082-46a7-bcaf-8eedd4d3e299",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-03-26T11:28:29.371Z"
      },
      "created_at": "2019-03-01T17:59:56.955Z",
      "updated_at": "2019-03-26T11:28:28.800Z",
      "capabilities": []
    },
    {
      "id": "04e3bb35-aedb-44d6-9e1f-570f939366d1",
      "data": {
        "Problem": "User does a pip install, and the builder seems to hang forever.",
        "Solution": "This can be confirmed by asking the user to run the pip install using the `-v` flag for verbose output, which will confirm that one of the dependencies of their desired install package is numpy or scipy.\n\nTo fix this, users can install the system package manager versions for numpy or scipy, for example in debian:\n```\napt-get install python-numpy python-scipy\nor\napt-get install python3-numpy python3-scipy\n```"
      },
      "name": "Build hangs because of pip install",
      "slug": "scratchpad-entry-04e3bb35-aedb-44d6-9e1f-570f939366d1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.289Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "051e61d9-30e5-4e09-bdc4-228a79f1b504",
      "data": {
        "Solution": "For the `wheezy` image, bluez v4 is available via the apt package manager. However, that image provides experimental support for systemd, and thus, we do not encourage users to enable systemd via their Dockerfile. This could lead to udevd problems, which in turn could lead to bluetooth problems.\nWe suggest users to use the `jessie` image and to enable systemd support in their container via their Dockerfile. In that distro, bluez v5 will be available via the apt package manager. In order for the bluetooth to be fully functional, the `bluez-utils` package must also be downloaded.\n\nIf for application-specific reasons, another version of bluez must be used, then:\n\n1. Get the preferred version sources\n2. Install dependencies: `sudo apt-get install -y libusb-dev libdbus-1-dev libglib2.0-dev libudev-dev libical-dev libreadline-dev`\n3. Enter bluez directory and type: `./configure && make && sudo make install`\n\nSince the bluez service runs with systemd:\n* `systemctl status bluetooth` # check status\n* `sudo systemctl start bluetooth` # start service\n* `sudo systemctl enable bluetooth` # to enable run at boot"
      },
      "name": "Bluez (Bluetooth protocol stack) support",
      "slug": "scratchpad-entry-051e61d9-30e5-4e09-bdc4-228a79f1b504",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.297Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "054934ad-a9ff-49af-8299-5083505ed5ad",
      "data": {
        "Solution": "If you are using an admin account, you gain access to all devices and applications. With the new `support agent` role, the account will be limited to only gain read access to devices and applications that are open for support. The customer can open a device for support in the UI.  The process for this, and the canned response to send the user is found here: [https://github.com/resin-io/process/blob/master/process/support/accessing_user_accounts.md](https://github.com/resin-io/process/blob/master/process/support/accessing_user_accounts.md)\n\nUntil we transition all support agents to the `support agent` role, we need a way for an admin account to check if a device or an application is open for support. This can be done with the following commands:\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/device\\(<DEVICEID>\\)\n```\nSearch for `support_expiry_date`, this date should be in the future! This date is UTC time!\n\nor with `jq`:\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/device\\(<DEVICEID>\\) --silent | jq .d[0].support_expiry_date\n```\n\nor\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/application\\(<APPLICATIONID>\\)\n```\nSearch for `support_expiry_date`, this date should be in the future! This date is UTC time!\n\nor with `jq`:\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/application\\(<APPLICATIONID>\\) --silent | jq .d[0].support_expiry_date\n```\n\nTo see all applications and devices (that are support accessible because support access to the application is granted, one can use this curl request with an admin account or a support account:\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/application\\?\\$filter\\=\\(support_expiry_date%20gt%20now\\(\\)\\)\\&\\$expand\\=device\n```\n\nTo see all devices that are open for support (only support access was granted on a device level), one can use this curl request with an admin account or a support account:\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/device\\?\\$filter\\=\\(support_expiry_date%20gt%20now\\(\\)\\)\n```\n\nTo see all devices that are open for support and your own devices ( but since you are not supposed to use the current admin account for projects, these should only be the devices open for support ;) ), one can use this curl request with a support account (**do not run this with your admin account, this would fetch ALL devices**):\n\n```\ncurl -H 'Authorization: Bearer <YOURADMINTOKEN>' https://api.resin.io/resin/device\n```"
      },
      "name": "Checking if an application or a device open for support",
      "slug": "scratchpad-entry-054934ad-a9ff-49af-8299-5083505ed5ad",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.301Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "057c2e72-f910-47d0-ac68-d973404ccf13",
      "data": {
        "Solution": "Our SDKs will automatically pick up the API token from the exposed `RESIN_API_TOKEN` env var if available, and use that for requests. In this case you don't need to login explicitly.\n\nOtherwise, you must make available to your application either your Auth Token (from prefs), or a username/password pair and use these to login:\n```\nresin.auth.login({ /* credentials */ });\n```\nor, with an Auth Token:\n```\nresin.auth.loginWithToken(authToken);\n```"
      },
      "name": "Authentication on the device with the SDK",
      "slug": "scratchpad-entry-057c2e72-f910-47d0-ac68-d973404ccf13",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.313Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "06912973-d3f2-4945-ab28-07f9dbb411ea",
      "data": {
        "Problem": "The device cannot update the application. It downloaded the application but fails to start application due to [object Object].\n\n\nYou might see an error: error=\"invalid character 'c' looking for beginning of value\" from containerd. This error actually hides the real problem. (The error might use any character, for example we've also seen \"rpc error: code = Unknown desc = invalid character 'e' looking for beginning of value\").\n\nBasically the user container cannot start, because the downloaded docker image is corrupt. This can surface through many different errors.\n\nFor example when trying to start the container manually, you might see something like this:\n\n```\ncontainer_linux.go:248: starting container process caused \"exec: \\\"/usr/bin/entry.sh\\\": stat /usr/bin/entry.sh: no such file or directory\"\ndocker: Error response from daemon: oci runtime error: container_linux.go:248: starting container process caused \"exec: \\\"/usr/bin/entry.sh\\\": stat /usr/bin/entry.sh: no such file or directory\".\nERRO[0005] error getting events from daemon: net/http: request canceled \n```",
        "Solution": "1. Stop the supervisor: `systemctl stop resin-supervisor`\n2. Remove the supervisor container volumes: `balena rm --volumes resin_supervisor`\n3. Find your app container: `balena container ls`\n4. Stop your app container: `balena stop <uuid>`\n5. Remove your app container image: `balena container rm <uuid>`\n6. Restart the supervisor: `systemctl start resin-supervisor`"
      },
      "name": "Device fails to update application, because of a corrupt docker image",
      "slug": "scratchpad-entry-06912973-d3f2-4945-ab28-07f9dbb411ea",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.326Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "07bf5b3d-c36d-4d49-be6f-667a096fc344",
      "data": {
        "Solution": "__NOTE:__ We are discussing moving away from on-the-fly compression for images so this might rapidly become redundant. Do check to see how image download currently works to be safe.\n\nAlthough the image size seems large, the actual data that you will have to download will be far less as the image is compressed and it is being decompressed on the fly by your browser, resulting to a transfer length of a few hundred MBs.\n\nIn addition, you might be interested in using our CLI tool: http://docs.resin.io/#/pages/tools/cli.md which has the ability to cache images and reuse them!"
      },
      "name": "User wondering why download is so big - 1.5GB?",
      "slug": "scratchpad-entry-07bf5b3d-c36d-4d49-be6f-667a096fc344",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.345Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0910e1bb-4acd-49f8-b682-1fbc13251d1c",
      "data": {
        "Solution": "If the issue isn't obvious, the first step here is almost always to ask the user to update their CLI, if they're not on the latest version.\n\nModern versions (5.6.1+) of the CLI should log any errors received to Sentry, which can provide further useful detail. You can browse these at https://sentry.io/resinio/cli/. More modern versions (5.10.0+) include user and full CLI argument information with all errors. For these, you can query by user with https://sentry.io/resinio/cli/?query=user%3Aid%3AUSERNAME to get the full trace for the issue the user is seeing, as well as every package version they're using, see previous errors they might've hit, and other debug data.\n\nMiscellaneous more specific resin CLI troubleshooting tips can be found in the [public troubleshooting doc](http://docs.resin.io/troubleshooting/cli-troubleshooting/).\n\nAsking the user to set the `DEBUG` env var (to any non-empty value) will also produce some extra output for the user locally, including a full stack trace (though that should also be available in Sentry) and background debug-level logging generally."
      },
      "name": "Debugging CLI issues",
      "slug": "scratchpad-entry-0910e1bb-4acd-49f8-b682-1fbc13251d1c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.353Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0a16ed0e-ab54-4d9b-8208-3f5ddc60db84",
      "data": {
        "Problem": "A file on the writable /data partition (in a container) cannot be removed because its ownership and permissions are bizarre. An example:\n\n```\n$ ls -lah\nd--------- 2 131072 39860 4.0K Jan  1  1970 out.log.1\n```\n\nNote that the 'file' is a directory (though it shouldn't be), and is owned by a seemingly random uid that doesn't exist in the system. Additionally, if you run `stat`:\n\n```\n$ stat out.log.1\n  File: 'out.log.1'\n  Size: 4096            Blocks: 8          IO Block: 4096   directory\nDevice: b30eh/45838d    Inode: 52702       Links: 2\nAccess: (0000/d---------)  Uid: (131072/ UNKNOWN)   Gid: (39860/ UNKNOWN)\nAccess: 1970-01-01 00:00:00.000000000 +0000\nModify: 1970-01-01 00:00:00.000000000 +0000\nChange: 1970-02-12 01:44:25.000000000 +0000\n Birth: -\n```\n\nYou see similarly bizare information, and also that there are 2 links to the file. This issue is likely caused by corruption to the file during power loss (or something similar), and symptoms may not be identical to the above.",
        "Solution": "The fix for this is to stop the supervisor and unmount /mnt/data and /resin-data on the host, and then remove the offending file using `debugfs`. `debugfs` is not installed on ResinOS, so you need to run it from inside a debian container:\n\n```\n$ systemctl stop resin-supervisor\n$ umount /mnt/data\n$ umount /resin-data\ndocker run -it --privileged resin/raspberrypi3-debian:latest bash\n# now inside the container\n$ debugfs -w /dev/mmcblk0p6\ndebugfs=> rm <file> # or rmdir for a directory\n# exit debugfs and debian container\nreboot\n```\n\n`debugfs` will bypass all fs checks on ownership. Remove the file/folder, exit and reboot the device. Note that it's still mounted for Docker, but this process appears to still work."
      },
      "name": "Unable to delete or remove file/folder",
      "slug": "scratchpad-entry-0a16ed0e-ab54-4d9b-8208-3f5ddc60db84",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.365Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0b610300-4182-4627-83b6-90ae82e9661c",
      "data": {
        "Solution": "This works well for dealing with a broken DHCP server which sends an invalid IPv6 DNS address even to IPv4 only devices.\n\nAs far as I can tell this needs to be done at the host OS level.  Essentially you are running:\n```\necho net.ipv6.conf.all.disable_ipv6=1 >/etc/sysctl.d/disableipv6.conf\necho net.ipv6.conf.eth0.disable_ipv6=1 >>/etc/sysctl.d/disableipv6.conf\necho net.ipv6.conf.default.disable_ipv6=1 >>/etc/sysctl.d/disableipv6.conf\n```\nHowever even without access to the host os this can be done within the device image by adding a file at `/etc/sysctl.d/disableipv6.conf` containing `net.ipv6.conf.all.disable_ipv6=1`.\n\nYou can however adjust this at runtime, though it won't affect the current `/etc/resolv.conf` (though that can be edited.) You do this by running:\n```\nsysctl -w net.ipv6.conf.all.disable_ipv6=1\nsysctl -w net.ipv6.conf.eth0.disable_ipv6=1\nsysctl -w net.ipv6.conf.default.disable_ipv6=1\n```\n\nAdditionally you have to adjust the connman settings (and in config.json too to persist it) to set `IPv6 = off` for the interface in question otherwise connman will switch IPv6 back on. Seriously.\nAlso ensure you update `/var/lib/connman/network.config` otherwise connman will overwrite any changes to `/etc/resolv.conf`.\n\nRestart connman to take these changes into account via:\n```\nsystemctl daemon-reload\nsystemctl restart connman\n```"
      },
      "name": "Disabling IPv6 on a device",
      "slug": "scratchpad-entry-0b610300-4182-4627-83b6-90ae82e9661c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.390Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0f9591c0-5ce0-40f0-8d75-f54feba44eb0",
      "data": {
        "Problem": "* Supervisor cannot be restarted, with errors like `balena: Error response from daemon: unknown service types.API.` in the logs\n* User container cannot be stopped properly\n....\n\n",
        "Solution": "Check if an `nsenter` process is present on the device (which is a leftover resin-proxy connection into the user container, should not happen anymore but might be still devices out there)\n\n```\n$ ps\n...\n23888 root      1732 T    nsenter --target 9687 --mount --uts --ipc --net --pid bash -c cd /usr/src/app;source <(xargs -0 bash -c 'printf \"export %q\\n\" \"$@\"' -- \n```\nIf it does, kill that process as `kill -9 <processid>` (such as `kill -9 23888` above). Probably need to restart the supervisor."
      },
      "name": "Balena/Supervisor misbehaving with errors like: Error response from daemon: unknown service types.API.",
      "slug": "scratchpad-entry-0f9591c0-5ce0-40f0-8d75-f54feba44eb0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.413Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "19e2b6e5-e19e-4532-aa41-aa82653b22b0",
      "data": {
        "Problem": "Customer wants to move paid billing from one account to another.",
        "Solution": "Copy everything from the current user to the target user, check it's ok, and then remove it from the current user.\n\nMore specifically, in the admin panel:\n* Find the personal org of the current & target billing users\n* Manually copy all subscription details from the current user's personal org to the personal org of the target user\n  * That includes both current subscription & historical ones\n  * Be careful to check for and copy prepaid addons, and dynamic addon discounts, if present\n* Add all members of the current user's personal org and the current user themselves as members in the target user's personal org\n* Copy the billing code from the current user's personal org to the target user's personal org\n* In Recurly, change the username attached to the recurly account to the target user's username\n* Log in as the target user, check that their billing page shows the correct data\n* Remove all subscriptions from the current user's personal org\n* Remove all org members from the current user's personal org\n* Remove the billing code from the current user's personal org"
      },
      "name": "Moving billing from one account to another",
      "slug": "scratchpad-entry-19e2b6e5-e19e-4532-aa41-aa82653b22b0",
      "tags": [
        "billing",
        "accounts"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.466Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "89fe76c4-ef0c-4904-b8f6-faa01340ae48",
      "data": {
        "Problem": "Might see issues like this on the device's supervisor log:\n```\nAug 30 13:00:20 6049b7a resin-supervisor[5673]: [2019-08-30T13:00:20.035Z] Unhandled rejection Error: The migration directory is corrupt, the following files are missing: 20190619152500-engine-snapshot.js, M00000.js, M00001.js, M00002.js, M00003.js, M00004.js\nAug 30 13:00:20 6049b7a resin-supervisor[5673]:     at A (/usr/src/app/dist/app.js:321:225656)\n```\n\nMaybe have multiple supervisor version sshown in `balena images`, and `balena ps` is showing an older supervisor than expected from the OS. \nAlso, no `/mnt/data/resinhup` logs. \nAlso, new device, just recently provisioned.\n\nIt can be iff the user recreates a device using a config.json just by adding it to a new OS image, if the same device was HUP'd before, then the supervisor is set in the API, and update-resin-supervisor will downgrade the supervisor at its first chance....\nhttps://github.com/balena-io/balena/issues/1741\n",
        "Solution": "To fix things up:\n\n* Use this scratchpad entry to set the supervisor in the API for the new supervisor version that the device *should be* running\nhttps://jel.ly.fish/view-all-support-issues/scratchpad-entry-23139ed6-e984-47dc-a133-69feb4b7ffa7/scratchpad-entry-88b558ac-dab9-42ea-a7e5-659d78ed68af (only the tagging step, the `update-resin-supervisor` won't run properly yet!)\n* delete that version with `balena rmi`\n* run `update-resin-supervisor`\n\nThe device should be running the right super, and all back to good. The device should not have any further issues.",
        "category": "supervisor",
        "severity": "medium"
      },
      "name": "Supervisor is not running / too low version of the supervisor is running",
      "slug": "support-issue-supervisor-is-not-running-too-low-version-of-the-supervisor-is-running-f4fa09d3-89c6-4e38-bd6e-04bc999c5a84",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-08-30T14:44:34.185Z",
        "support issue has attached support thread": "2020-08-20T20:02:38.567Z"
      },
      "created_at": "2019-08-30T14:44:33.954Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9cefa5be-c99b-469a-a7e7-019edae4fc5c",
      "data": {
        "Problem": "balenaOS versions 2.52.3 through 2.54.1 were removed from production on August 17, 2020.\n\nbalena Supervisor versions 11.9.1 through 11.12.3 had a bug where the supervisor API was exposed to devices on the local network.  Authentication is still required for the API endpoints, but this does open up the supervisor to denial-of-service attacks.\n\nFurther reading:\n\n- Retro doc: https://docs.google.com/document/d/1LDTZGwUPEGOJINKE7y9IMx2a7kcECr1UWSsNUyx94Wc/edit#\n- Flowdock thread: https://www.flowdock.com/app/rulemotion/resin-devops/threads/7XcCAGrBitsSbE7maitBIhYxCib\n- Github issue: https://github.com/balena-io/balena-io/issues/2255",
        "Solution": "Upgrade the supervisor to 11.12.4 or higher.\n\nAlternately, upgrade to balenaOS version 2.54.2, which contains a version of the supervisor with a fix for this issue.",
        "category": "balenaOS, removed, yanked",
        "severity": "medium",
        "shareable": true,
        "participants": [
          "74c63bbb-6e20-487a-a5ca-c513eeaaef2d"
        ],
        "fixedInOSVersion": "2.54.2",
        "affectedOSVersions": [
          "2.52.3",
          "2.52.4",
          "2.52.5",
          "2.52.6",
          "2.52.7",
          "2.53.0",
          "2.53.1",
          "2.53.2",
          "2.53.3",
          "2.53.4",
          "2.53.5",
          "2.53.6",
          "2.53.7",
          "2.53.8",
          "2.53.9",
          "2.53.10",
          "2.53.11",
          "2.53.12",
          "2.53.13",
          "2.53.14",
          "2.54.0",
          "2.54.1"
        ],
        "fixedInSupervisorVersion": "11.12.4",
        "affectedSupervisorVersions": [
          "11.9.1",
          "11.9.2",
          "11.9.3",
          "11.9.4",
          "11.9.5",
          "11.9.6",
          "11.9.7",
          "11.9.8",
          "11.9.9",
          "11.9.10",
          "11.10.0",
          "11.11.1",
          "11.11.2",
          "11.11.3",
          "11.11.4",
          "11.11.5",
          "11.11.6",
          "11.11.7",
          "11.12.0",
          "11.12.1",
          "11.12.2",
          "11.12.3"
        ]
      },
      "name": "balenaOS 2.52.3 through 2.54.1 removed from production; bug in Supervisor versions 11.9.1 through 11.12.3",
      "slug": "support-issue-balenaos-2-52-3-through-2-54-1-removed-from-production-0ea7fbc9-6f27-4290-a840-1cf34c2df919",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-17T17:06:15.292Z",
        "support issue has attached support thread": "2020-08-25T14:10:52.522Z"
      },
      "created_at": "2020-08-17T16:51:51.787Z",
      "updated_at": "2020-08-17T17:06:15.208Z",
      "capabilities": []
    },
    {
      "id": "03b34de6-17e9-4623-bafc-6a4d3e297135",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "We discovered a design issue that prevents balenaFins v1.1 from running reliably above 45-50°C ambient temperature (113°F). We estimate that around 90% of the devices are affected by this issue. Affected devices experience a sudden disconnection of the Ethernet interface and USB peripherals when the ambient temperature rises above that 45-50C threshold, resulting in potential connectivity loss. WiFi connectivity or any other non-USB based devices are unaffected. ",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "The solution requires some HW changes (switching two resistors for other two of different value). All v1.1 customers have been already informed that they can return their units to be repaired under warranty. \nHow to return the units: https://store.balena.io/pages/product-recall-announcement\nIn-depth technical explanation of the issue: https://www.balena.io/blog/usb-issue-rca/\nIf the above doesn't answer the question, please ping Nico (ntzovanis) or Carlo (curcuz).",
        "category": "fin",
        "severity": "high",
        "shareable": true,
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "USB disconnects when balena Fin gets too hot",
      "slug": "support-issue-usb-disconnects-when-balena-fin-gets-too-hot-4280c077-6b1e-4354-8069-0e07aca7ceae",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "user-g-andrea-sozzi-sabatini+org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-17T12:47:41.852Z",
        "support issue has attached support thread": "2020-07-21T14:36:49.083Z"
      },
      "created_at": "2020-07-21T14:36:47.657Z",
      "updated_at": "2020-08-17T12:47:41.807Z",
      "capabilities": []
    },
    {
      "id": "feb5c159-1073-46d8-b31a-4b800d3030c8",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "User wants to run a balenaOS device on Windows 10 using Hyper-V.",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "windows": "10",
        "Solution": "It seems to be successfully working for this user with the following steps:\n\n1. Download `qemu-img`, extract it to a folder, and place your balena image (NUC) in that folder\n2. Run `qemu-img.exe convert balena-image.img -O vhdx -o subformat=dynamic hyperv-balena-image.vhdx`\n3. Create a virtual machine in Hyper-V (I used the second generation setup), disable secure boot, and ensure it has network connectivity\n4. Create a new (empty) hard drive for your first drive, and load the `hyperv-balena-image.vhdx` for the second (the order is important, it doesn't work the other way around)",
        "category": "virtual machine",
        "severity": "low",
        "shareable": true,
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ],
        "$$localSchema": {
          "type": "object",
          "properties": {
            "windows": {
              "type": "string"
            }
          }
        }
      },
      "name": "Can I run balenaOS in a hyper-v virtual machine",
      "slug": "support-issue-can-i-run-balenaos-in-a-hyper-v-virtual-machine-46aab2e7-4ee1-4d39-b532-8183cf7fd35b",
      "tags": [
        "win10",
        "hyperV",
        "virtual device"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-13T10:31:29.982Z",
        "support issue has attached support thread": "2020-08-13T10:31:31.245Z"
      },
      "created_at": "2020-08-13T10:31:29.609Z",
      "updated_at": "2020-08-13T10:31:29.945Z",
      "capabilities": []
    },
    {
      "id": "f8232af4-a1a5-44aa-a435-df6948f51888",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "The user has either a USB drive or an additional onboard storage deivce (eg. `/dev/sda`) which is not used by balenaOS for anything. The user would like to mount that storage into their container so that it can be used to write data to during their application runtime. ",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "One solution is to add the following bash script to the ENTRYPOINT of the container, so it runs as it starts up;\n\n```\n#Define cleanup procedure\ncleanup() {\n    echo \"Container stopped, performing cleanup...\"\n\n#whatever cleanup is needed, eg bringing down daemons\n\n    if [ \"$EXTERNAL_DEVICE\" != \"none\" ]; then\n       echo \"unmounting /external...\"\n       umount /external\n    fi\n    exit 0\n}\n\n#Trap SIGTERM\ntrap 'cleanup' SIGTERM\n\nif [ \"$EXTERNAL_DEVICE\" != \"none\" ]; then\n  echo \"Mounting external storage...\"\n  echo \"mounting $EXTERNAL_DEVICE\"\n  mount $EXTERNAL_DEVICE /external\nfi\n\n#the rest of the inititalization here\n\n#exec the CMD in the background\n\"$@\" &\n\n#Wait\nwait $!\n\n#Cleanup\ncleanup\n```\n\nFor external USB type storage, this may need to be coupled with a custom udev rule to ensure the drive is always enumerated with the same `EXTERNAL_DEVICE` name.",
        "category": "storage",
        "severity": "low",
        "shareable": true,
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "How do I mount an additional drive into one of my containers",
      "slug": "support-issue-how-do-i-mount-an-additional-drive-into-one-of-my-containers-3eb6a459-722c-47cb-9574-3666d625ab3b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-13T10:22:25.636Z",
        "support issue has attached support thread": "2020-08-13T10:22:26.451Z"
      },
      "created_at": "2020-08-13T10:22:25.301Z",
      "updated_at": "2020-08-13T10:22:25.601Z",
      "capabilities": []
    },
    {
      "id": "4d13234a-7766-4884-b133-6204354c7ff7",
      "data": {
        "Problem": "The standard way of rotating screen using the config variable `display_hdmi_rotate` appears to have issues on RPI4. ",
        "Solution": "The following steps seem to do the trick\n\n- Make sure you have removed the display_hdmi_rotate variable. \n- Set the ROTATE_DISPLAY variable to one of left or right on the kiosk service\n- Set the WINDOW_SIZE variable for the kiosk service to the right resolution for the orientation, so if your display is 1920x1080, you should set it to 1080,1920\n",
        "category": "balenaDash",
        "severity": "low",
        "shareable": true,
        "participants": [
          "10321a7e-31cb-4ebc-bb40-991a6b9f684c"
        ]
      },
      "name": "BalenaDash rotate screen 90 degrees on RPI4",
      "slug": "support-issue-balenadash-rotate-screen-90-degrees-on-rpi4-81ce9057-8d3a-4946-86c1-9c6e3e59f4ba",
      "tags": [
        "balenaDash, display, rpi4"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-12T19:51:48.972Z",
        "support issue has attached support thread": "2020-08-12T19:53:30.570Z"
      },
      "created_at": "2020-08-12T19:51:48.534Z",
      "updated_at": "2020-08-12T19:51:48.912Z",
      "capabilities": []
    },
    {
      "id": "85298f1e-6cbe-412c-af0a-46d5830d63ce",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "User has signed up with their GH account and they have been asked enter a password they've never set",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "They are able to set up a password if they follow there instructions: \n> Navigate on the right top corner of your account, click on your avatar -> Preferences -> Account details, and then set your password on the password field.\nIn case you get any error message please try to logout, login, and then set a password.\n\nAfter that they'll be able to disable the 2FA as well. ",
        "severity": "low",
        "participants": [
          "360fb8db-c2a1-4ab2-a759-41908e789ee5"
        ]
      },
      "name": "Reset password when tried to disable the 2FA with GitHub",
      "slug": "support-issue-reset-password-when-tried-to-disable-the-2fa-with-github-d71d9fc1-c6e2-4096-a5b1-6dd8161549be",
      "tags": [
        "reset password",
        "disable 2FA"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-08-05T14:05:18.599Z",
        "support issue has attached support thread": "2020-08-05T14:05:18.977Z"
      },
      "created_at": "2020-08-05T14:05:18.155Z",
      "updated_at": "2020-08-05T14:05:18.549Z",
      "capabilities": []
    },
    {
      "id": "12f51309-3a8b-44bb-85e6-11d62f085652",
      "data": {
        "Problem": "A device reports that it has successfully updated it's supervisor during a HUP but after reboot the old supervisor is still running.",
        "Solution": "For a few days HUP had a malformed `curl` command when updating supervisor releases, so any devices HUPed from 6/25/2020 to 6/30/2020 will have failed to update. More information available in this thread: https://www.flowdock.com/app/rulemotion/r-fleetops/threads/noe-8-cOCFN1x3uW5a9ZL7qcoC_\n\nIntroduced in this commit: https://github.com/balena-os/balenahup/commit/6bca7ad9a4836842e4f3b133d251e683be8b4420\nFixed in this commit: https://github.com/balena-os/balenahup/commit/87c74c81a45ab2cb29536a68a0efce5e8bcd87f0",
        "severity": "low",
        "shareable": true,
        "participants": [
          "fc1d1745-ce0c-4402-ae19-4d9951ba34f0"
        ]
      },
      "name": "Supervisor fails to update during HUP",
      "slug": "support-issue-supervisor-fails-to-update-during-hup-12dea797-41f2-4d75-89b1-ed5e72ed6d1a",
      "tags": [
        "supervisor",
        "hup",
        "balenahup"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-09T12:31:50.691Z",
        "support issue has attached support thread": "2020-07-29T13:09:29.841Z"
      },
      "created_at": "2020-07-09T12:31:28.391Z",
      "updated_at": "2020-07-09T12:31:50.647Z",
      "capabilities": []
    },
    {
      "id": "f4dbae34-7f09-416e-b020-1dd1cb6066c0",
      "data": {
        "Problem": "On occasion a customer accidentally deletes a device, which we must recover manually. These device restores can lead to unexpected behavior.",
        "Solution": "The canonical way to confirm that is by comparing the `deviceId` on device with the `id` of the device with the same UUID in the backend:\n\non-device: `jq '.deviceId' < /mnt/boot/config.json` \nin the dashboard: `await sdk.models.device.get('{{uuid}}')`\n\nIf both ids are consistent, then the device _has not_ been restored. More information in https://github.com/balena-io/balena-io/issues/2227.",
        "category": "api, delete, deleted, restored, restore, device",
        "severity": "low",
        "shareable": true,
        "participants": [
          "fc1d1745-ce0c-4402-ae19-4d9951ba34f0"
        ]
      },
      "name": "Check if a device has been restored",
      "slug": "support-issue-check-if-a-device-has-been-restored-08b080ef-c5ea-42e4-b066-a3f6129605f5",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-28T13:10:48.906Z",
        "support issue has attached support thread": "2020-07-28T13:18:13.851Z"
      },
      "created_at": "2020-07-28T13:10:48.467Z",
      "updated_at": "2020-07-28T13:10:48.862Z",
      "capabilities": []
    },
    {
      "id": "d9a17e8b-7034-40c5-9c53-d52c1c449faf",
      "data": {
        "Problem": "Supervisor 11.9.4 in 2.52.7 has the issue https://github.com/balena-io/balena-supervisor/issues/1398 and thus the OS version including this had to be removed from production",
        "Solution": "There is no downgrade path, but we should be able to update the supervisor to the latest v11.9.9 for the affected users \nhttps://jel.ly.fish/88b558ac-dab9-42ea-a7e5-659d78ed68af",
        "severity": "high",
        "shareable": true,
        "participants": [
          "799d9dbd-ad8f-45ab-ad15-7342f15f4c6e"
        ]
      },
      "name": "balenaOS 2.52.7 removed from production",
      "slug": "support-issue-balenaos-2-52-7-removed-from-production-6980cc43-9c43-4f34-9f31-70415c01ee23",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-24T11:04:21.921Z",
        "support issue has attached support thread": "2020-07-24T09:38:43.197Z"
      },
      "created_at": "2020-07-22T09:50:33.745Z",
      "updated_at": "2020-07-24T11:04:21.853Z",
      "capabilities": []
    },
    {
      "id": "f5789e59-9c2b-401a-9a7b-8cce04c5e281",
      "data": {
        "hash": "Sup",
        "oauth": {},
        "status": {},
        "Problem": "In OS 2.57.2 the supervisor API fails with `failed to connect to 127.0.0.1 port 48484: Connection refused` if the service does **NOT** have `network_mode: host`. This is a breaking change, since in older version (tested on 2.50.1) the API works correctly regardless of the network_mode setting.",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "Current work around would be for the user to add `network_mode: host` to the service that needs supervisor API access. But we need to fix this ASAP and should remove OS version 2.52.7.\n\nCorresponding supervisor issue here: https://github.com/balena-io/balena-supervisor/issues/1401",
        "category": "supervisor api",
        "severity": "medium",
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ],
        "affectedOSVersions": [
          "2.52.7"
        ]
      },
      "name": "Supervisor API fails with failed to connect to 127.0.0.1 port 48484: Connection refused",
      "slug": "support-issue-supervisor-api-fails-with-failed-to-connect-to-127-0-0-1-port-48484-connection-refused-ac95d97b-8047-4f84-8bad-86eba8e342ca",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-21T17:41:48.878Z",
        "support issue has attached support thread": "2020-07-21T16:09:53.213Z"
      },
      "created_at": "2020-07-21T16:09:51.960Z",
      "updated_at": "2020-07-21T17:41:48.813Z",
      "capabilities": []
    },
    {
      "id": "25cb7822-3567-465f-af40-5dc52ddeb3f5",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "When I use the docker-compose field `depends_on` it doesn't guarentee my containers start up in the right order and that one won't try use the other before its ready.",
        "profile": {
          "name": {},
          "about": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "from what I know from the docker community and here at balena too, the `depends_on` is not recommended to be relied on. There is a great explanation and example here: https://docs.docker.com/compose/startup-order/ but the general idea it to make sure each of your containers is resilient the other ones disappearing at anytime or not being there when they start up. If two processes are so very intrinsically tied together that this is impossible, then that probably speaks to them needing to be in the same container.",
        "category": "depends_on",
        "severity": "low",
        "shareable": true,
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "depends_on doesn't prevent my container starting before the other one. ",
      "slug": "support-issue-depends-on-doesn-t-prevent-my-container-starting-before-the-other-one-ce6fc8e3-a785-4011-866e-171eef963bcb",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-21T17:36:53.947Z",
        "support issue has attached support thread": "2020-07-21T17:36:54.195Z"
      },
      "created_at": "2020-07-21T17:36:53.472Z",
      "updated_at": "2020-07-21T17:36:53.908Z",
      "capabilities": []
    },
    {
      "id": "501f9f4c-ffc6-4664-8ef0-75db42df4ac3",
      "data": {
        "Problem": "If I have a server/service running in a container, how do I make avahi announce it so others can discover it?",
        "Solution": "It should be possible to announce a server or service on the hostOS avahi using `avahi-publish`\nfirst you need to install avahi-publish, on debian it can be done like so:\n```\nRUN apt-get update && apt-get install avahi-utils\n```\nThen at run time you can run something like this:\n```\n# enable communication to hostOS dbus\nexport DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket\n\navahi-publish -s $HOSTNAME _xxx._tcp 1883 \"Status=Running\" \"Version=1.0\" &> /dev/null &\n```\n\nreplace `xxx` with whatever you want your service to be seen as and replace `1883` with the port you want it to tell other services it is listening on.",
        "severity": "low",
        "participants": [
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "How do I publish/announce my service via avahi on balenaOS",
      "slug": "support-issue-how-do-i-publish-announce-my-service-via-avahi-on-balenaos-ae28ac9b-aff1-4537-b777-09fac278a0ca",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-21T17:27:00.686Z",
        "support issue has attached support thread": "2020-07-21T17:27:01.613Z"
      },
      "created_at": "2020-07-21T17:26:59.955Z",
      "updated_at": "2020-07-21T17:27:00.610Z",
      "capabilities": []
    },
    {
      "id": "c4b34294-71d4-47e6-8777-8b0104a9a155",
      "data": {
        "archived": false,
        "severity": "low"
      },
      "name": "Delta download fails with  'Delta still processing remotely'",
      "slug": "support-issue-elta-download-fails-with-elta-still-processing-remotely-1b80ef91-be84-45dd-951e-6da668df97a9",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-04-01T11:48:03.619Z",
        "support issue has attached support thread": "2020-07-15T23:29:42.274Z"
      },
      "created_at": "2019-04-01T11:48:02.701Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "551dd61d-7c9c-4a16-929a-3fac90e03bd0",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "User is attempting to use a Surface Go 2, but wifi is not working properly. A view of dmesg shows the device, but it's apparently not supported in the current firmware.",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "Add Surface Go 2 wifi support to firmware.",
        "category": "board support",
        "severity": "medium",
        "participants": [
          "944b75ea-0a83-45c8-9504-7f4dd542cf7e"
        ]
      },
      "name": "Wifi firmware support for Surface Go 2",
      "slug": "support-issue-wifi-firmware-support-for-surface-go-2-9925a318-1a1d-45f1-8abe-3666bd6e0c11",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-15T16:43:33.908Z",
        "support issue has attached support thread": "2020-07-15T16:43:34.222Z"
      },
      "created_at": "2020-07-15T16:43:33.437Z",
      "updated_at": "2020-07-15T16:43:33.862Z",
      "capabilities": []
    },
    {
      "id": "d592b5c9-3151-4689-ae03-419547d4d9de",
      "data": {
        "Problem": "If the user has a device that is not sending logs and also have the following:\n\n* supervisor is below `v7.16.6`, and\n* supervisor on the device is running `vX.Y.Z` version, not `vX.Y.Z._logstream` (checked with `balena images` / `balena ps` or equivalent docker commands)\n\nIf these two requirements are not met, the logs are not working for other reason.\n\n\nThe complete PSA is in [Flowdock](https://www.flowdock.com/app/rulemotion/user_happiness/threads/ltdJPL2Iv6KWsOiEqmVqpODP99b).",
        "Solution": "Updating the supervisor on the device is done according to [this scratchpad entry](/#/3c0ca68c-92d6-4842-847a-0cd9735bf4ad/88b558ac-dab9-42ea-a7e5-659d78ed68af) - which details how to set a supervisor version in the API from the device, and also how to update the supervisor, also including some special cases for OS/supervisor combos that have issues.\n\nYou should take the existing version, such as `vX.Y.Z`, and use `TAG=vX.Y.Z_logstream` in the recipe above. Almost all main supervisor versions have logstream version. But not all! Will add a full list here later.\nOne more note, if supervisor is below v4.x.y, please ping `@imrehg`, those are old devices, usually more picky.\n\nAfter wards should refresh the dashboard page of the device (wait for supervisor to start), and should be logs coming soon. \n\nWe've also created a number of \"backported\" OS versions, where an OS revision was taken, that is preloaded with the updated supervisor. For example RPi3 2.13.6+rev2 is the same OS with 2.13.6+rev1 but with the new logstream supervsior. Thus another advice to the user is:\n\n* update to one of these versions, which would do a supervisor update for them\n* user these versions (or newer than 2.15.1 that has native logging) for newly provisoned devices.\n\n\nThe full list of backported versions per device types is maintained in this document.\nhttps://docs.google.com/spreadsheets/d/1Hjk7sTjEZkdqBPngZu2SvZndL2CCJCWokPEvsBNM1h4/edit"
      },
      "name": "Device no longer sends application logs",
      "slug": "scratchpad-entry-0e7077f2-438e-4a12-a147-9ff055b47cdc",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2020-07-08T15:58:28.741Z"
      },
      "created_at": "2019-03-01T17:59:56.405Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "d533b727-7332-4dca-8964-7826bd51e75f",
      "data": {
        "Solution": "Ping @georgiats, because this needs some admin Zendesk actions like:\n\n- Adding the actual user to the respective org\n- Creating a Zendesk org if there isn't one\n- Coordinate with commercial/sales if we need to upgrade their support plan (in cases where they surpass their allowed seats)\n- Check the org's currently allowed seats (usually 5, in some cases more, depending on their contract)\n- Grant Intercom access to the particular user if they don't already have that (through the admin panel)\n",
        "category": "access",
        "severity": "low"
      },
      "name": "User wants to add a member of their team to premium support (Zendesk)",
      "slug": "scratchpad-entry-d533b727-7332-4dca-8964-7826bd51e75f",
      "tags": [
        "access",
        "Zendesk"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-27T11:31:47.482Z",
        "support issue has attached support thread": "2020-07-07T15:27:32.808Z"
      },
      "created_at": "2019-03-01T17:59:57.329Z",
      "updated_at": "2020-05-27T11:30:42.456Z",
      "capabilities": []
    },
    {
      "id": "fe503827-0971-4071-902f-7cfb92f5aa6d",
      "data": {
        "Problem": "From the outside the device will appear to be offline (supervisor not running) and unable to run any user containers. Constantly \"crashing\" after a reboot (acutally even after `systemctl restart balena`, a simple service restart).\n\n\nthe following logs will be observed with `journalctl -u balena`\n\n```\nJun 02 15:27:09 4f064b4 systemd[1]: balena.service: Failed with result 'timeout'.\nJun 02 15:27:09 4f064b4 systemd[1]: Failed to start Balena Application Container Engine.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 1769 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 1771 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 16508 (exe) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 17449 (exe) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 17877 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 17886 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 17905 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 17951 (balena-engine-c) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 18300 (balena-engine-r) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 18346 (balena-engine) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 18348 (balena-engine) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:10 4f064b4 systemd[1]: balena.service: Found left-over process 18353 (balena-engine) in control group while starting unit. Ignoring.\nJun 02 15:27:10 4f064b4 systemd[1]: This usually indicates unclean termination of a previous run, or service implementation deficiencies.\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.426013809Z\" level=warning msg=\"Running experimental build\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.457332789Z\" level=debug msg=\"Listener created for HTTP on fd ()\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.462166786Z\" level=debug msg=\"Listener created for HTTP on unix (/var/run/balena.sock)\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.471846780Z\" level=debug msg=\"Listener created for HTTP on unix (/var/run/balena-engine.sock)\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.479703775Z\" level=warning msg=\"[!] DON'T BIND ON ANY IP ADDRESS WITHOUT setting --tlsverify IF YOU DON'T KNOW WHAT YOU'RE DOING [!]\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.482367773Z\" level=debug msg=\"Listener created for HTTP on tcp (0.0.0.0:2375)\"\nJun 02 15:27:15 4f064b4 balenad[18361]: time=\"2020-06-02T15:27:15.545800733Z\" level=info msg=\"libcontainerd: started new balena-engine-containerd process\" pid=18393\n```",
        "Solution": "The correct fix needs to happen in balenaOS, see https://github.com/balena-os/meta-balena/issues/1910#issuecomment-637605110\n\nUntil that the workaround would be to modify the OS like this:\n\n```\n$ mount -o remount,rw /\n$ systemctl edit balena.service\n# add the following:\n\n[Service]\nTimeoutStartSec=0\n\n$ mount -o remount,ro /\n$ systemctl daemon-reload && systemctl restart balena\n```",
        "severity": "high",
        "shareable": true,
        "participants": [
          "05c10b94-7cc6-4f3e-8de0-aee7e3aa7e01"
        ],
        "affectedOSVersions": [
          "<= 2.50.4"
        ]
      },
      "name": "balena-engine is terminated with result 'timeout'",
      "slug": "support-issue-balena-engine-is-terminated-with-result-timeout-4599b9ee-8805-41d1-a5ee-90d51bf148e8",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-07-02T15:28:58.857Z",
        "support issue has attached support thread": "2020-06-02T15:40:14.107Z"
      },
      "created_at": "2020-06-02T15:35:13.060Z",
      "updated_at": "2020-07-02T15:28:58.796Z",
      "capabilities": []
    },
    {
      "id": "5f1de9bc-d731-47dd-b0ad-6771afb33614",
      "data": {
        "Problem": "Occasionally a device will report disk usage values via tools like `df` and `du`. This has occurred specifically on the inactive partition in the context of a HUP, but is generally applicable.",
        "Solution": "In order to fix the issue, first unmount the partition if possible then `e2fsck` the partition until clean.",
        "category": "balenahup, fsck, du, df, inactive",
        "severity": "low",
        "shareable": true
      },
      "name": "`du` and `df` report different usage values",
      "slug": "support-issue-du-and-df-report-different-usage-values-ca1459fe-d49f-432c-9d4c-2ec0aae77f1b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-30T14:11:15.474Z",
        "support issue has attached support thread": "2020-06-30T16:22:46.267Z"
      },
      "created_at": "2020-06-30T14:11:15.431Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "0a34cbac-b155-4675-8296-9e6d732c10d1",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "What happens to all the device's persistent volume data ( often referred to as `/data` ) when the ownership is transferred from one user to another (or Org)?",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "When an app is transferred from one user to another (or Org) the Application ID is preserved and from the device's perspective nothing changes at all, it still receives the same state, so will continue to run the same set of containers and not remove or do anything to the data on the device. \n\nIts also interesting to note that the \"place holder\" app the receiving user creates will have a different App ID (obviously) but this will get deleted during the transfer and that receiving app is required to be empty in any case.\n\nIts also possible that app member role IDs may change as they're recreated for the new owning user/organization but devices don't care about those.",
        "category": "app transfers",
        "severity": "low",
        "shareable": true
      },
      "name": "What happens to device persistent data volumes (/data) when transferring app ownership",
      "slug": "support-issue-what-happens-to-device-persistent-data-volumes-data-when-transferring-app-ownership-e4f3a34e-4445-4c3b-8499-e9ff3d90824e",
      "tags": [
        "persistent",
        "data",
        "transfer",
        "application"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-25T17:52:07.132Z",
        "support issue has attached support thread": "2020-06-25T17:52:07.939Z"
      },
      "created_at": "2020-06-25T17:52:07.090Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "07c87e59-2187-43e5-adcd-b704c22f23e6",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "User reports that logs have stopped streaming to their laptop terminal while their device is in local Mode. This was previously working, but now the `balena push` command just tops at `Device Settled` and no logs from any services appear. This behaviour persists even after switching in and out of localMode or rebooting the device. \nThe following Error seen in supervisor logs:\n```\nError streaming local log output: InternalInconsistencyError: Trying to get service name with no apps: 553617\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at /usr/src/app/dist/app.js:14:39443\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at tryCatcher (/usr/src/app/dist/app.js:2:220284)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromiseFromHandler (/usr/src/app/dist/app.js:2:1708447)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromise (/usr/src/app/dist/app.js:2:1709730)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromise0 (/usr/src/app/dist/app.js:2:1710770)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromises (/usr/src/app/dist/app.js:2:1712478)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._fulfill (/usr/src/app/dist/app.js:2:1711266)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._resolveCallback (/usr/src/app/dist/app.js:2:1706630)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromiseFromHandler (/usr/src/app/dist/app.js:2:1708706)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromise (/usr/src/app/dist/app.js:2:1709730)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromise0 (/usr/src/app/dist/app.js:2:1710770)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromises (/usr/src/app/dist/app.js:2:1712478)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._fulfill (/usr/src/app/dist/app.js:2:1711266)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at MappingPromiseArray.PromiseArray._resolve (/usr/src/app/dist/app.js:2:1723475)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at MappingPromiseArray.init (/usr/src/app/dist/app.js:2:1722219)\nJun 25 16:14:38 03335c2 resin-supervisor[4806]: [error] at Promise._settlePromise (/usr/src/app/dist/app.js:2:1709797)\n```\n\nThis was first seen on:\nDevice type: Raspberry Pi 4\nOS version: balenaOS 2.50.1+rev1\nSupervisor version: 11.4.10",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "No known solution yet.",
        "category": "localMode",
        "severity": "medium",
        "shareable": true,
        "affectedOSVersions": [
          "2.50.1"
        ],
        "affectedSupervisorVersions": [
          "11.4.10"
        ]
      },
      "name": "Logs streaming stops working while in Local Mode",
      "slug": "support-issue-logs-streaming-stops-working-while-in-local-mode-e6075d52-2769-49ff-98d5-a9fff55d8c66",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-25T17:15:07.036Z",
        "support issue has attached support thread": "2020-06-25T17:15:07.600Z"
      },
      "created_at": "2020-06-25T17:15:06.994Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "565d83ef-1625-4c83-8d07-b6e8b6eb054c",
      "data": {
        "Problem": "This is a catch-all entry - please check for your specific error before running this, as it will require the re-download of the supervisor and all service images. Note that this is also for multicontainer devices only.\n\nIf the docker directory gets corrupted, e.g. because it expects layers to be there that are missing, SD card corruption, or balena/docker not starting up, you can use the following to reset docker/balena's internal state, and redownload everything. The data volume will remain.",
        "Solution": "## Note\n\nFor **balena devices, such that resinOS >=2.9.0** , *always* check first if this is a case of [/mnt/data/docker/aufs/diff is full](https://jel.ly.fish/7b57aa47-8d2f-46fd-b166-5381dc733374)\n\n---\n\nFor **balena devices, such that resinos >=2.9.0**:\n```\nsystemctl stop resin-supervisor\nsystemctl stop balena\nrm -rf /var/lib/docker/{aufs,overlay,containers,image,tmp}\nsystemctl start balena\nupdate-resin-supervisor\n```\nThe application images should then start to be downloaded.\n\nFor **docker devices, such that resinOS <2.9.0**:\n```\nsystemctl stop resin-supervisor\nsystemctl stop docker\nrm -rf /var/lib/docker/{aufs,overlay,containers,image,tmp}\nsystemctl start docker\nupdate-resin-supervisor\n```\n",
        "severity": "low"
      },
      "name": "Docker directory corruption",
      "slug": "scratchpad-entry-565d83ef-1625-4c83-8d07-b6e8b6eb054c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-04-14T04:03:25.293Z",
        "support issue has attached support thread": "2020-06-25T16:50:43.965Z"
      },
      "created_at": "2019-03-01T17:59:56.761Z",
      "updated_at": "2020-04-14T04:03:25.217Z",
      "capabilities": []
    },
    {
      "id": "19f8e773-1563-4e95-b1f6-3b21e4c1774a",
      "data": {
        "Problem": "Due to a change in the supervisor update logic, supervisors will restart and also restart any oneshot units (`restart: no`).\n\nFurther reading/reference:\nhttps://github.com/balena-os/meta-balena/commit/646e4ae809375f4abf35c55cd580e2c62a8812e2\nhttps://github.com/balena-os/meta-balena/pull/1917",
        "Solution": "Upgrade the host OS >2.51.3.",
        "category": "balenaOS, supervisor, oneshot",
        "severity": "low",
        "shareable": true,
        "fixedInOSVersion": "2.51.3",
        "affectedOSVersions": [
          "2.49.0",
          "2.50.0",
          "2.50.1",
          "2.50.2",
          "2.50.3",
          "2.50.4",
          "2.51.0",
          "2.51.1",
          "2.51.2"
        ]
      },
      "name": "Supervisor restarts every day",
      "slug": "support-issue-supervisor-restarts-every-day-6a6d10aa-ed83-4771-88fc-78d55e07f668",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-17T16:55:11.263Z",
        "support issue has attached support thread": "2020-06-17T16:55:49.327Z"
      },
      "created_at": "2020-06-17T16:55:11.016Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "315c07c8-0cba-4b7f-932c-458596be16e3",
      "data": {
        "Problem": "balenaFin v1.1 does not offer USB OTG capabilities at runitme. OTG is only used for the flashing process. \nThe reason it is not possible to use USB OTG at runtime is that it requires a port to be exposed directly from upstream in the usb root and balenaFin has a HUB+ETH controller in-between root and ports. The reason it works for flashing is that there is a switch that cuts off the HUB+ETH controller and routes directly the PRG microUSB port to upstream.",
        "Solution": "There is no solution that doesn't involve physical modification of the hardware (hack) that has the big drawbacks of voiding warranty and disabling both flashing and USB-A & ETH & mPCIE ports. That being said, if the user is willing to sacrifice the above for OTG capability, the hack is fairly simple to execute (and revert): desoldering R237 and R29 resistors.\nIf the user wants to revert the hack, the solution is just to solder back R237 and R29. Keep in mind that these 2 resistors are different (0 and 10K) so they are not interchangeable. ",
        "severity": "low",
        "affectedOSVersions": []
      },
      "name": "User wants to have USB OTG capability at runtime on balenaFin v1.1",
      "slug": "support-issue-user-wants-to-have-usb-otg-capability-at-runtime-on-balenafin-v1-1-c1ca3b2f-6eb0-44ca-b6f0-64fa22bf7728",
      "tags": [
        "balenaFin",
        "v1.1",
        "otg",
        "hack"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-17T03:53:13.487Z"
      },
      "created_at": "2020-06-12T19:24:17.389Z",
      "updated_at": "2020-06-17T03:52:55.194Z",
      "capabilities": []
    },
    {
      "id": "2f91971f-e71c-4814-8aad-8271239080a0",
      "data": {
        "Problem": "In this ticket: https://jel.ly.fish/12970785-7559-48f5-be6f-07ddb5235f55 DNS queries were randomly resolving to `172.16.0.1`. Worth pinging me or @xginn8 if you see that happening again as we're not sure why it happened in the first place.",
        "Solution": "Rebooting solved the problem, but probably just restarting `dnsmasq` (to clear the cache) could've solved it too.",
        "severity": "low"
      },
      "name": "DNS randomly resolving to a local address",
      "slug": "support-issue-dns-randomly-resolving-to-a-local-address-283bb2df-ec64-41dc-928e-ef5e3ce7d811",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-16T18:08:51.964Z",
        "support issue has attached support thread": "2020-06-16T18:09:23.800Z"
      },
      "created_at": "2020-06-16T18:08:51.661Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7df4b9a2-3798-4511-bfcb-280edd88c412",
      "data": {
        "Problem": "User wants to edit udev rules",
        "Solution": "As for being able to configure udev rules from the balenaCloud dashboard, this is not possible for now but it is on the product roadmap. \n\nFor the time being the user can use this tool https://github.com/balena-io/configizer from GitHub which provides a safe way to modify the config.json on a balenaOS device remotely",
        "severity": "low"
      },
      "name": "configure or edit udev rules",
      "slug": "support-issue-configure-or-edit-udev-rules-bb7fe323-d6fd-43f1-a276-e46ee314615f",
      "tags": [
        "udev rules",
        "udev"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-16T10:05:31.112Z",
        "support issue has attached support thread": "2020-06-16T10:06:03.624Z"
      },
      "created_at": "2020-06-16T10:05:30.821Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "86068821-b659-4279-8c1f-ac8f7c3e7fbd",
      "data": {
        "Problem": "A reporter sends us a vulnerability report",
        "Solution": "*  We get an email to security@balena.io regarding an issue that could be a potential vulnerability issue or security bug.\n*  The ops team is forwarding us this email and it pops up in JF marked as paid_support ticket. \n*  We send this answer to the reporter:\n\n*Dear {Insert Hacker Here},\nThank you for contacting us regarding your findings. Our engineering teams have investigated your report and will let you know.\nPlease bear in mind that we don't offer any monetary comprehension. In case these findings are valid, and we manage to reproduce them, we will send you over some of our swags.\nKind regards,\nThe Balena Security Team*\n\n*  We ping @richbayliss and ask for clarification if this is a valid issue\n*  In case this is a valid issue we give the following answer\n\n*Dear {Insert Hacker Here},\nThank you for contacting us regarding your findings. Our engineering teams have investigated your report and we have found the following:\n[…list of legit items we have fixed…]\nWe would like to thank you again for contacting us regarding these findings and we would like to offer you a token of our appreciation in the form of a balena T-shirt and sticker pack.\nWe'd need the following info to send you the swag:\nFull name / Address / Phone number / T-shirt size!\nPlease don't hesitate to contact us further if you feel you have any more issues you'd like brought to our attention.\nKind regards,\nThe Balena Security Team*\n\n*  In case this report is not legit\n\n*Dear {Insert Hacker Here},\nOur engineering teams have investigated your report and we have found the following:\n[…list of legit items that are not valid or we don’t consider them as bug… ]\nPlease don't hesitate to contact us further if you feel you have any more issues you'd like brought to our attention.\nKind regards,\nThe Balena Security Team*\n\n*  Notify the ops team regarding the delivery of the items.",
        "category": "security",
        "severity": "low"
      },
      "name": "Incoming vulnerability or security reports",
      "slug": "support-issue-incoming-vulnerability-or-security-reports-399c4833-efd5-40cc-9014-b1ca600d8745",
      "tags": [
        "security",
        "vulnerability"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-10T14:16:32.802Z",
        "support issue has attached support thread": "2020-06-22T08:09:47.737Z"
      },
      "created_at": "2020-06-10T13:51:59.100Z",
      "updated_at": "2020-06-10T14:16:32.742Z",
      "capabilities": []
    },
    {
      "id": "35339663-225e-4fcd-876b-567a70b2bb13",
      "data": {
        "Problem": "On some resinOS versions fingerprint check fails, and not just the expected couple of entries as mentioned in [another ticket](#903a2690-11ab-11e8-816a-95c68290123a), but a lot more:\n\nFor example on an Intel NUC resinOS 2.12.0+rev1:\n\n```\nroot@ce445fd:~# md5sum --quiet -c /resinos.fingerprint\n/etc/hostname: FAILED\n/etc/machine-id: FAILED\n/lib/ld-2.26.so: FAILED\n/lib/libc-2.26.so: FAILED\n/lib/libcap.so.2.25: FAILED\n/lib/libdl-2.26.so: FAILED\n/lib/libpthread-2.26.so: FAILED\n/lib/libresolv-2.26.so: FAILED\n/lib/librt-2.26.so: FAILED\n/lib/libsystemd.so.0.19.0: FAILED\n/usr/bin/balena: FAILED\n/usr/lib/liblzma.so.5.2.3: FAILED\nmd5sum: WARNING: 12 computed checksums did NOT match\n```\n\nSo far this seems to affect only the Intel NUC device type, but would expect in some other (mainly x86) device types as well. The Raspberry Pi series is *not* affected.\nNote that on certain version of balenaOS the checksum might crash the device, see https://jel.ly.fish/3c23530d-e308-44b6-b386-97d13c773924. This has been fixed in balenaOS 2.41.0 and up.",
        "Solution": "If suspecting system corruption (thus actual file changes), compare the file checksums for these files on the same resinOS version on a clean, newly provisioned device, or directly in the resinOS container.\n\nOtherwise these can be ignored.",
        "severity": "low",
        "mentionsUser": [
          "bd9c04aa-8bbe-40a1-8265-bd2957a7bb54",
          "fa2387ed-3053-4add-ac0d-99124588a2ae"
        ]
      },
      "name": "A handful of files fail fingerprint checks",
      "slug": "scratchpad-entry-handful-of-files-fail-fingerprint-checks-aca9e981-a3e3-429c-9542-ecc4f35b185a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-02T10:57:46.952Z"
      },
      "created_at": "2019-03-01T17:59:57.573Z",
      "updated_at": "2020-06-02T10:57:46.868Z",
      "capabilities": []
    },
    {
      "id": "702598f2-43de-49ab-ab94-9a2791741e8c",
      "data": {
        "Problem": "Do use UUID v4 to create a UUID or any other way. \n",
        "Solution": "New devices should be using 62char uuids anymore. This is an artifact of the past where we were issuing x.509 certificates whose CN field was the same as the device uuid, and the device uuid was 32 bytes back then (64 hex characters). But the CN field in x.509 needs to be NULL terminated so only 31 bytes could fit\nOur current uuids are 16 bytes long, and if we dropped 6 bits of randomness from them we could convert to standard uuid v4 ones.\n\nAlso read here : https://www.balena.io/docs/learn/more/masterclasses/advanced-cli/#52-preregistering-a-device on how to create a new UUID if you'd like to preregister a device. ",
        "severity": "low"
      },
      "name": "How are the UUIDs created ",
      "slug": "support-issue-how-are-the-uuids-created-358f8376-2a19-43ce-b713-25e784530632",
      "tags": [
        "UUID "
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-06-01T15:23:30.863Z",
        "support issue has attached support thread": "2020-06-01T15:24:07.956Z"
      },
      "created_at": "2020-06-01T15:23:25.220Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "aa8c0aff-e7f3-47ec-b187-5f05ffa24a04",
      "data": {
        "Problem": "A device is misbehaving and we suspect issues with the network. A packet capture can help debug this.",
        "Solution": "Props @majorz\n\n```\n# Run an Alpine container:\n\nsource /etc/os-release\nbalena run --rm -ti -v /mnt/data:/data --privileged --network host balenalib/${SLUG}-alpine /bin/bash\n\n# From the Alpine container:\n\ncd /data\napk add --no-cache tcpdump\ntcpdump -w container.pcap -i wwan0\nexit\n\n# From the host OS again:\n\ncd /mnt/data/\ncurl -F \"file=@container.pcap\" https://file.io\n```\n\nThis will capture anything on interface `wwan0` and at the end is uploaded to file.io. Afterwards one could open this packet capture file in wireshark.\n\nTo capture a specific port, replace the `tcpdump` line with:\n\n```\ntcpdump -w container.pcap -i any port 123\n```\n\nThat would run a packet capture on *all* interfaces for anything that involves port 123.",
        "severity": "low",
        "shareable": true
      },
      "name": "Generic packet capture on device",
      "slug": "support-issue-generic-packet-capture-on-device-c95eb602-db9f-4914-8c89-e7cfe31f11ee",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-26T13:03:47.012Z"
      },
      "created_at": "2020-05-22T08:39:34.285Z",
      "updated_at": "2020-05-26T13:03:46.925Z",
      "capabilities": []
    },
    {
      "id": "fae16611-a547-4a58-9f2d-51d71165fc26",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "Users want to change ODM data on their Nvidia TX2 to switch pcie lane configuration.",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "We developed a small arm binary tool which can be found in this dropbox: https://www.dropbox.com/s/0olwqj2pjxy9j9q/odmtool?dl=0 and the correct solution will be to include this functionality into the supervisor which is described here: https://github.com/balena-io/balena-supervisor/issues/1207",
        "category": "nvidia",
        "severity": "low"
      },
      "name": "How to manipulate ODM data on tx2",
      "slug": "support-issue-how-to-manipulate-odm-data-on-tx2-3d79d781-168a-4721-b5c1-16304395f27b",
      "tags": [
        "odm",
        "tx2",
        "pcie"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-21T09:51:35.171Z",
        "support issue has attached support thread": "2020-05-21T09:51:36.291Z"
      },
      "created_at": "2020-05-21T09:51:34.542Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "6952082e-ecae-4931-9bff-e492b410d2eb",
      "data": {
        "Problem": "A customer needs their invoices to be sent to a particular email address due to:\n\n* Change in address\n* Additional address (e.g. finance dept AND devOps dept)",
        "Solution": "1. Ping @@customer_success team on Flowdock and ask for the account manager for the customer.\n2. Ask the account manager to add/change the email address in recurly\n\nFYI: There is an open issue on the balena-ui repo here:\nhttps://github.com/balena-io/balena-ui/issues/1642 ",
        "severity": "low"
      },
      "name": "Customer needs invoices emailed to new/additional address",
      "slug": "support-issue-customer-needs-invoices-emailed-to-new-additional-address-3d11fe69-1fa6-4869-99ec-4abb54ff564f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-19T09:23:00.888Z"
      },
      "created_at": "2020-05-19T09:23:00.636Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "b41ce978-088e-420a-9176-8387c9108328",
      "data": {
        "Problem": "Device does not have space left on disk (or does not have enough space to download an update), and it's taken by unused `/var/lib/docker/(aufs|overlay2)` directories. Usually occurs when device downloads big images, and the engine gets killed by the watchdog periodically.\n\nAnother case with the same sympthom is when device uses deltas, and there are still aufs or overlay2 directories with the content of non-delta image layers.\n\nThe root cause is investigated in the scope of\nhttps://github.com/balena-os/balena-engine/issues/193\n\n**The root causee has been fixed in balena-engine v18.9.17 (balena-os v2.49.0)**\n\n### Diagnostics\nDisk usage by the engine-controlled objects (images/containers/volumes) can be reviewed with\n```\ndu -sh /var/lib/docker/*\n```\nIf the space is taken by the `volumes` directory, this solution is not what you need. Most likely, it's a porblem with the user app filling up the volume space.\nIf you see that the space is taken by `aufs` or `overlay2` directory, check this directory in details with\n```\ndu -sh /var/lib/docker/aufs/* # or /var/lib/docker/overlay2/*\n```\nIf you see some outstanding disk usage by directories with the same ID in name as a directory that ends with `-init` suffix (see example below), it may be a case of a bad container behaviour. Container may write a lot of data into its ephemeral layer which is stored in this directory.\n```\n3.4M\t0eeb0c202d6b6af389d12f5e5cb14bed0ac58cae3324c6d5abb8d314bf3900d9\n5G\t   0f8635d26e27d4e93175582877d0d2550b96a7b8aef2370bec2eabec88573976 <--- Bad container behavior: most likely, it's dumping a lot of temporary files into its ephemeral layer.\n12K\t  0f8635d26e27d4e93175582877d0d2550b96a7b8aef2370bec2eabec88573976-init\n1.6M\t13727a39a44290e51152940d1f65d0bee606eb81570ead4ef853076e92a2b843\n1.6M\t14ba16149590e583654db2ee78cf52645f1db1d04149c6fcafbc72e5581636cc\n```\nIn such case, it's the best to check with the user to this problem. Recreating the container (not stopping) will lead to this directory deletion. The following sequence of commands can be used to re-create all user app containers.\n```\nbalena rm -f $(balena ps -aq | grep -v $(balena inspect resin_supervisor | jq -r .[0].Id | head -c 12))\nsystemctl restart resin-supervisor\n```\nRemember to consult with the user before restarting their containers.\n\nFinally, if the situation is not as above, and the amount of taken space is distributed among other foldres (non-container ones), you should proceed to the solution below.",
        "Solution": "### 1. Delete unused directories\n\n#### AUFS Storage Driver\nUse the following steps if the device has `/var/lib/docker/aufs` directory.\n- Copy the following go program into your working directory:\nhttps://github.com/roman-mazur/engine-check/blob/e464a4c54be26246934438995d10ada70cff68d3/cmd/aufs-diff/diff.go\n- Create file `all` in your working directory and fill it with the output of the following command that was run on the affected device:\n```\nls -la /var/lib/docker/aufs/diff/\n```\n- Create file `used` in your working directory the output of the following command:\n```\n(cd /var/lib/docker/image/aufs/layerdb/sha256/ && ls | xargs -I {} cat '{}/cache-id' -n && echo)\n```\nIt should be a single line. Multiple lines are ok, but please **make sure new lines don't break the IDs**.\n- Run the go program and store its output in a separate file:\n```\ngo run diff.go > delete-commands\n2020/01/17 18:34:37 Number of non-container AUFS IDs: 153\n2020/01/17 18:34:37 Number of used AUFS IDs: 69\n2020/01/17 18:34:37 Count of directories to delete: 84\n```\nThe program will take the list of AUFS IDs from the `all` file, remove IDs that are used by conntainers (checking for `-init` suffix), and calculate the diff from the used IDs in in the `used` file.\nThe output file (`delete-commands`) will contain commands that will remove unused AUFS commands on the device.\n- Run the following command to delete the directories:\n```\ncat delete-commands | balena ssh <uuid>\n```\n\n#### OverlayFS Storage Driver\nThe current solution needs some space to be available on the device to download a tools that performs the unused layers analysis (~11M).\n-  Download the tool\n```\ncurl -L https://github.com/roman-mazur/engine-check/releases/download/v0.0.2/engine-check-arm > /mnt/data/engine-check && chmod 755 /mnt/data/engine-check\n```\n(see [the source code](https://github.com/roman-mazur/engine-check/tree/v0.0.2))\n- Run the tool to analyze the directories usage:\n```\nDOCKER_HOST=unix:///var/run/balena-engine.sock /mnt/data/engine-check -show-all -show-used\n```\nThe output of this command will contain information about what overlay2 directories are used by what engine objects (images or containers).\n- If you see layers under \"*Unused overlays*\" section, you can optionally confirm how much of disk space they take with\n```\ndu -sh /var/lib/docker/overlay2/{ID} # Take one of the IDs from the previous command output.\n```\n- Run\n```\nDOCKER_HOST=unix:///var/run/balena-engine.sock /mnt/data/engine-check -gen-rename\n```\n- The output of the command above will produce command to rename the unused directories. Copy and exxecute them on the device, then check if the user app and supervisor continue to run (check container state and logs).\n- If everything looks good, run\n```\nDOCKER_HOST=unix:///var/run/balena-engine.sock /mnt/data/engine-check -gen-remove\n```\nThe command output will contain commands to remove the previously renamed directories. Copy and execute them on the device.\n- After executing the `rm` commands, `df -h` should confirm you reclaimed the space.\n- Delete the `engine-check` tool from the device.\n```\nrm /mnt/data/engine-check\n```\n\n*Note: the curren soluion does not take care of cleaning up the `ovrelay2/l` directory that contains symlinks to all layers. But we haven't observed problems because of this.*\n\n### 2. (Optional) Disable balena-engine healthcheck and let big images download\nWhile the engine is busy with a big download, it fails the health checks. We can edit the healthcheck script to exit with successful result.\n- Remount the fs in rw mode:\n```\nmount -o remount,rw /\n```\n- Edit the healthcheck script\n```\nvi /usr/lib/balena/balena-healthcheck\n# Insert 'exit 0' line in the beginning\n```\n- Once the download is completed, revert your changed iin the healthcheck script and remount the FS in read-only mode\n```\nmount -o remount,ro /\n```",
        "severity": "medium"
      },
      "name": "Device is Out of Space - Leaked AUFS or OverlayFS Directories Cleanup",
      "slug": "support-issue-leaked-aufs-dirs-cleanup-5c75c693-7e0a-4766-a17c-77b48cd14af0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-18T11:07:45.515Z",
        "support issue has attached support thread": "2020-04-10T18:32:50.336Z"
      },
      "created_at": "2020-01-17T16:53:32.271Z",
      "updated_at": "2020-05-18T11:07:45.443Z",
      "capabilities": []
    },
    {
      "id": "da9c7226-88f8-4914-8a14-08a589cfaffd",
      "data": {
        "Problem": "",
        "Solution": "Both build on the same base. The generic image is newer.\n\n### Differences\n\n* more kernel modules / drivers enabled\n* bigger rootfsu\n* defaults to overlay2 storage driver (balena-engine)",
        "severity": "low",
        "shareable": true
      },
      "name": "What is the difference between the \"Generic x86_64\" and the \"Intel NUC\" images / device types",
      "slug": "support-issue-what-is-the-difference-between-the-generic-x86-64-and-the-intel-nuc-images-device-types-7ba0deba-e8a8-4a32-a7e2-08fbe86d3c1c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-18T09:46:06.771Z",
        "support issue has attached support thread": "2020-05-18T09:47:06.844Z"
      },
      "created_at": "2020-05-18T09:46:06.584Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "9b3615fb-afc1-467c-a5af-5e257c1dddad",
      "data": {
        "oauth": {},
        "status": {},
        "Problem": "With the newer versions of chrome browser BalenaCam Connection Always Fails, ValueError: … does not appear to be an IPv4 or IPv6 address",
        "profile": {
          "name": {},
          "sendCommand": "shift+enter",
          "viewSettings": {}
        },
        "Solution": "It appears this is due to the new feature where chrome will Anonymize local IPs exposed by WebRTC. Which is used to conceal local IP addresses with mDNS hostnames. This results in the setup of the webRTC link failing because balena cam can't find your browser. \n\nTo fix this you need to go to chrome://flags/ in you chrome browser and disable the flag called: `Anonymize local IPs exposed by WebRTC.` and then reload your browser to apply that setting. ",
        "category": "balena-cam",
        "severity": "low",
        "shareable": true,
        "$$localSchema": {
          "type": "object",
          "properties": {
            "cam": {
              "type": "string"
            }
          }
        },
        "fixedInOSVersion": "-"
      },
      "name": "Balena-cam IP address does not appear to be an IPv4 or IPv6 address",
      "slug": "support-issue-balena-cam-ip-address-does-not-appear-to-be-an-ipv4-or-ipv6-address-74c39050-7c3b-416f-822b-92a16fc501bb",
      "tags": [
        "cam",
        "IPv4",
        "IPv6"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-15T08:50:09.995Z",
        "support issue has attached support thread": "2020-05-15T08:50:10.816Z"
      },
      "created_at": "2020-05-15T08:50:09.704Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "238bee5a-2ed9-40d7-99a4-fa5106c144e2",
      "data": {
        "Problem": "Error: 1 error: rsync exited. code: 12 signal: null",
        "Solution": "Fetch the corrupted delta id from the dashboard using the following:\n* First get the origin/destination images\n```\nawait sdk.pine.get({ resource: 'image', options: {$filter: {is_stored_at__image_location: 'registry2.balena-cloud.com/v2/$hash'},$top: 2} })\n```\nwhere the `is_stored_at__image_location` can be found via the supervisor log for the target image and `balena images` for the origin image.\n* Then use that info to get the delta:\n```\nawait sdk.pine.get({ resource: 'delta', options: {$filter: {originates_from__image: $fromImageId, produces__image: $toImageId, status: 'success'}, $top: 2} })\n```\n* Then delete the corrupted delta\n\nThis can only be done from the device itself, due to the API permissions. The command for this would be:\n```\ncurl -Ss -X DELETE \"https://api.balena-cloud.com/v5/delta($deltaId)\" -H \"Authorization: Bearer $(cat /mnt/boot/config.json | jq -r .deviceApiKey)\"\n```\n\n> NOTE: This issue has been seen to be unresolved by this fix, resulting it having to disable delta updates for a device to get it back to working.",
        "severity": "low"
      },
      "name": "Corrupt delta",
      "slug": "support-issue-corrupt-delta-58e21f81-a044-4dbd-bd5d-7c819e5b8a1d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-16T22:34:33.206Z",
        "support issue has attached support thread": "2020-05-14T13:58:25.145Z"
      },
      "created_at": "2019-09-24T20:25:09.903Z",
      "updated_at": "2019-10-16T22:34:33.176Z",
      "capabilities": []
    },
    {
      "id": "a41fb175-6c73-4cbb-b08a-fdc8f9fae1ac",
      "data": {
        "Problem": "User has lost access to 2FA and wants to confirm account ownership to regain control of account. User needs to prove their identity",
        "Solution": "First ask the user if they have access to their recovery codes. The file is called \"Recovery Codes yyyy-mm-dd h_m_s\" \n\n__Note:__ replace `CHANGE_ME` with a unique string. You can generate one by running:\n```\nopenssl rand -hex 32\n```\nIn the canned response, add the output of `openssl rand -hex 32` as `CHANGE_ME`\n\n**Canned response:**\n>By choosing to enable two-factor authentication, you have made it clear to us that security is as an important concern for you as it is for us. It also means you do not completely trust authenticating with just a password.\n\n>Therefore you will understand that we need to take extra measures to be sure that we are not disabling two-factor authentication for an attacker who learned your password.\n\n>We would like to verify that you're in possession of the SSH key you have provided to us. To do this you'll have to run the following command and send us the output from the email account associated with your balena account, to support@balena.io. After we validate the signature we'll disable 2FA on your account and you'll be able to login with just your password.\n```\necho CHANGE_ME | openssl rsautl -sign -inkey ~/.ssh/id_rsa | base64\n```\n>If the command doesn't work, it may be that your SSH keys are stored elsewhere, you can edit the command to point to where your SSH keys are. Please let us know if you have trouble with these instructions.\n\n**Verifying Users Response via SSH Challenge**\n__Note:__ You'll need a GNU version of openssl to run this.\n\n1. Go to their ssh key tab in preferences (an admin will need to login as the user to be able to do this, currently these are: @page- , @petrosagg and @shaunmulligan): https://dashboard.resin.io/preferences?tab=sshkeys\n2. For each key, copypasta into a local file with a name like `userskey.pub`.\nOpen Terminal, run file as:\n```\nssh-keygen -f userskey.pub -e -m pem > userskey.pem\n```\n\nIn Finder, there's a new file called userskey.pem.\n\n3. Next, you have to convert that to a PEM encoded (plain? not sure what this format is called) public key using this command:\n```\nopenssl rsa -in userskey.pem -RSAPublicKey_in -pubout > userskey.plain.pem\n```\n4. Now you're ready to verify whatever the user sent you\nSay they sent you this response:\n```\no7+ga4dl8cNB+O/9kxvEZj6UP5r3Tx3bno1ukYNdBd/hd0zNk7y153qxHfj9MOlmG6+VuaqXLZmJ\n8rEOUjsGxqq377SSV9OEs0PkvvVhKyjtYxb3Vm2apJLal9Mfhktr/QW3pht1kX4XgZmzo8CcbL5q\n5EWMVVuXttSbjcZY2hDB3lYU9OElggkOxKNO/jug9X0mOc6XeUM7+aSd12LDHTydpgQ0MZxgNfHv\nKQnkCHcP50rbIqnhcbjBFzeOWFcAVcpKCuUumnKuQv7k2SRjUEIIZEXVWqiXAeEl2jpblYsDUmKV\njQLi+rLohLBZDlsBxtQuxBYK4NVhnj01wzkThw==\n```\nYou put this in a file, say `response.base64` and then do:\n```\ncat response.base64 | base64 -d | openssl rsautl -verify -inkey userskey.plain.pem -pubin\n```\nThis should print the original random challenge you sent him. i.e if you sent `echo foobarfoobar`, then the above command should print `foobarfoobar`\n\nIf the user's key doesn't match, you'll see something like:\n```\nRSA operation error\n4546639296:error:0406706C:rsa routines:rsa_ossl_public_decrypt:data greater than mod len:crypto/rsa/rsa_ossl.c:545:\n```\nThey may have another SSH key to try, so try each of these until you can verify the passphrase.\nIf not, it means we don't have a unique way to confirm the account. Here's a potential canned response that ensures the user knows why we can't disable 2FA and hopefully reduces frustration.\n\n> At Resin we believe that security is one of the cornerstones of a reliable service. As such, we need to be absolutely sure that in cases where users have mislaid their credentials we can authenticate them using other means.\n>\n> Where Two Factor Authentication (2FA) is involved, we need to ensure that the account does belong to you. To allow us to do this we ask you to sign a unique passphrase with the private key associated with your account; this enables us to validate your ownership of the account.\n>\n> Unfortunately, in this case, without the ability to verify your ownership we cannot disable 2FA for the account.\n>\n> However, there is nothing stopping (and we actively encourage!) you to create a new account to continue using the Resin service.\n>\n> Thank you for your understanding, and please let us know if we may assist you any further.\n\nIf the key does match, and there's reason to believe that the computer is compromised, the next challenge is to ask the user to confirm private information about their account.\n>Thank you for sending the key. We think it's prudent to ask you one more security question. Please reply with both the name and device type for an application associated with your account.\n\nIf the key does match, and there's no reason to believe the computer is compromised, 2FA can be disabled. The process currently requires directly editing the database, and this action can be performed by (and *only* by):\n\n- @page-\n- @petrosagg\n\n>Thank you for confirming. I've disabled two-factor authentication for your account.\n\n\n**IT IS REALLY IMPORTANT TO VERIFY THE WHOLE STRING**\n\nOnce you're __sure__ that it's safe to remove the 2fa, someone with production database access (Page or Petros) need to run the following SQL in the database:\n\n```\nUPDATE \"user\"\nSET \"is two factor protected\" = 0\nWHERE id=<user_id>\n```\n\n",
        "severity": "low"
      },
      "name": "Disabling 2FA to recover user account",
      "slug": "scratchpad-entry-a41fb175-6c73-4cbb-b08a-fdc8f9fae1ac",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-14T11:43:41.819Z",
        "support issue has attached support thread": "2020-05-18T10:52:11.873Z"
      },
      "created_at": "2018-08-23T16:12:57.001Z",
      "updated_at": "2020-05-14T11:43:40.334Z",
      "capabilities": []
    },
    {
      "id": "0030e0d5-f0a0-4e43-86a9-f584e09fed69",
      "data": {
        "Solution": "We do this via the systemd DBUS API:\n```\nDBUS_SYSTEM_BUS_ADDRESS=unix:path=/host_run/dbus/system_bus_socket dbus-send --system --print-reply --dest=org.freedesktop.systemd1 /org/freedesktop/systemd1 org.freedesktop.systemd1.Manager.StopUnit string:'wpa_supplicant.service' string:'fail'\n```\n(same with StartUnit to re-enable it)."
      },
      "name": "Disable wpa_supplicant in the host",
      "slug": "scratchpad-entry-0030e0d5-f0a0-4e43-86a9-f584e09fed69",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.269Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "310d6ddc-779c-4092-abc3-caeea8181963",
      "data": {
        "Problem": "**DO NOT USE! ** The correct method to update the supervisor is desribed here: https://jel.ly.fish/88b558ac-dab9-42ea-a7e5-659d78ed68af\n\n\nsome of you may notice when doing support that there is a banner presented on the dashboard for certain devices. These devices have a supervisor version that is going to be problematic for @xginn8\n's work on self healing devices which will be rolled out soon. If you see this banner while working with a user's device, it would be best to upgrade it as it will stop working once the self healing API side is out. This means that the more we upgrade now, the fewer issues we have in support in the future. Obviously we will need to get a user's permission to do this in case of a cellular network etc but in general we want to strongly advise an upgrade as it will be necessary eventually. If you're in the situation where you need to perform some downloads of images to fix up a device, please just add a supervisor update into the mix (for example in those semi common situations where removing `/var/lib/docker` sorts everything out).\n\nTo upgrade the supervisor, use:\n```\nupdate-resin-supervisor -t v10.7.0\n```\nThe range of versions which have this problem are `>= 10.0.0 && < 10.7.0`. We have a product issue here: https://github.com/balena-io/balena/issues/2099\n\nPlease don't hesitate to ping Matt or I if you have any questions",
        "Solution": "",
        "severity": "low",
        "affectedSupervisorVersions": [
          "v10.0.0 <= x < v10.7.0"
        ]
      },
      "name": "Upgrading problematic supervisor versions on device",
      "slug": "support-issue-upgrading-problematic-supervisor-versions-on-device-3bc48d32-0c61-4c0b-8205-8c1a51054d8c",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-05-14T08:41:08.628Z"
      },
      "created_at": "2020-02-20T06:55:57.541Z",
      "updated_at": "2020-05-14T08:41:08.513Z",
      "capabilities": []
    },
    {
      "id": "1187f10a-c8d2-4e3f-ae05-7e8c51efa8a6",
      "data": {
        "Problem": "1. User pushes node project.\n2. When pushing user encounters 'Error: Couldn't satisfy node version 0.X.Y'",
        "Solution": "This is either 1 of 2 issues. Ask the user which device they're using, then load the docker hub registry tags page for the appropriate architecture:-\n\n* Raspberry Pi <2 - https://hub.docker.com/r/resin/raspberrypi-node/tags/\n* Raspberry Pi 2 - https://hub.docker.com/r/resin/raspberrypi2-node/tags/\n* Beaglebone Black - https://hub.docker.com/r/resin/beaglebone-node/tags/\n* etc. 😄\n\nCheck whether a tag exists for the specified node version, both `[arch]-node:0.X.Y` and `[arch]-node:0.X.Y-onbuild` - the former is used when preinstall, install and/or postinstall scripts are present, the latter when there aren't ([ref 1](https://bitbucket.org/rulemotion/resin-builder/src/0700ef812357d53d2cc090554b67a0c5c6ae6579/src/project-types/nodejs.coffee?at=master#cl-55), [ref 2](https://bitbucket.org/rulemotion/resin-builder/src/0700ef812357d53d2cc090554b67a0c5c6ae6579/src/project-types/nodejs.coffee?at=master#cl-64).)\n\nIf no tag exists, this is the issue. Upload the missing tags, making sure to consider the issue discussed below, uploading too many tags could result in it recurring and breaking all images. Note that caching of hub images means a delay of up to an hour before the updated images will be available to use.\n\nIf the tags page fails to load (i.e. the tag page shows a loading animation which never completes), then it's a bug with docker hub, see https://www.flowdock.com/app/rulemotion/resin-frontend/threads/Dcfo3--9uF5O2ifDGaCMuMvI4Rp for the discussion on this. The solution is to trim existing tags so we avoid this rather serious bug :/"
      },
      "name": "Couldn't satisfy node version 0.X.Y",
      "slug": "scratchpad-entry-1187f10a-c8d2-4e3f-ae05-7e8c51efa8a6",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.421Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7f3e1fa7-0618-42fa-a3d5-320d0b43bf11",
      "data": {
        "severity": "low"
      },
      "name": "Test issue",
      "slug": "support-issue-est-issue-805e1f4d-2b66-4254-b860-c379a4a0e257",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "issue has attached support thread": "2019-04-02T14:40:13.075Z"
      },
      "created_at": "2019-03-11T14:29:43.873Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "45c41751-91b1-468d-bee8-50956115c30c",
      "data": {
        "Problem": "WARNING: You should probably NEVER need to do this.\n\nI'd recommend always pinging @@os and fleetops to tell why you had to manually HUP and the dashboard way didn't work.",
        "Solution": "There is no straight forward list of steps to run. This is a bit complicated, surgical and depends on the specific device/OS version. Especially for old OS versions which is probably what this issue will be needed for.\n\nThe dashboard button is validated using balena-hup-action-utils\nSee https://github.com/balena-io-modules/balena-hup-action-utils/blob/master/lib/config.ts#L19\n\nDepending on device OS version, the proxy runs these scripts https://github.com/balena-io/balena-proxy/tree/master/src/services/actions-backend/actions/scripts\n\nThe original source of the scripts is here\nhttps://github.com/balena-os/resinhup\n\nNow it is possible to download a script from https://github.com/balena-os/resinhup to /tmp on a device. And then manually run it.\n\nNote: The path of the logs for these scripts was /tmp/ in 1.x to 2.x scripts. Recent scripts using the /mnt/data/resinhup path.\n\n**Updating 1.x to 2.x**\nTo write example\n**Updating 2.x to 2.12.7**\nTo write example\n**Updating 2.12.7 onwards**\nTo write example",
        "category": "hup",
        "severity": "low"
      },
      "name": "Manually run a Host OS Update (HUP)",
      "slug": "support-issue-manually-run-a-host-os-update-hup-4d174ea3-7d58-4afd-8fb4-75df08cb868a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-24T14:30:49.875Z"
      },
      "created_at": "2020-03-24T14:29:57.340Z",
      "updated_at": "2020-03-24T14:30:49.824Z",
      "capabilities": []
    },
    {
      "id": "f22184fa-f061-419a-ace8-8bf2230bf60c",
      "data": {
        "Problem": "If the supervisor fails to start up because of the database, it may throw an error saying something similar to \"not a sqlite database\".",
        "Solution": "Ping @CameronDiver and wait for a response. If for some reason it cannot wait, the followings things can be checked;\n1. For the supervisor version, you can create a database file which references the volumes which the device should have. This will make sure that the supervisor does not remove the volumes before retrieving another target state. The easiest way to do this would be to download the state endpoint, and format it in such a way that the supervisor can read it. It's not an easy process, and you're best to wait for @CameronDiver\n2. If the user is not worried about losing data on device, you can happily remove the database, and it will be recreated",
        "severity": "low"
      },
      "name": "Invalid supervisor database",
      "slug": "support-issue-invalid-supervisor-database-b8869289-2dc4-4585-9497-6568efe01fec",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-20T15:26:30.415Z"
      },
      "created_at": "2020-03-20T15:26:30.267Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7f083686-8537-4278-8989-b770d0568bb7",
      "data": {
        "Problem": "The customer wants a device downgraded from one OS version to a previous version.",
        "Solution": "Do not downgrade devices unless there is a ***serious*** reason to do this. There are several problems that can occur from downgrade, including Supervisor and OS incompatibilities. As an aside, it also sets an extremely bad precedent that we as a company do not want to follow. If one customer starts getting regular downgrades, other may follow suit, and this puts us in a very precarious position.\n\nShould a customer require a downgrade, get as much information from them as possible including the reason why they believe this is required. This will probably include device/hardware support issues, which will require discussion with the devices team. Absolutely ping alert @@support_help in the relevant JF thread to assist you.",
        "severity": "high"
      },
      "name": "How to downgrade a device for a customer",
      "slug": "support-issue-how-to-downgrade-a-device-for-a-customer-22363614-ba2c-4752-92bb-93f5e5a513ac",
      "tags": [
        "hup",
        "downgrade",
        "os"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-06T19:49:57.262Z"
      },
      "created_at": "2020-03-06T19:49:39.478Z",
      "updated_at": "2020-03-06T19:49:57.228Z",
      "capabilities": []
    },
    {
      "id": "3c09bdbd-3b3b-49ad-8094-b2c3dd55b881",
      "data": {
        "Problem": "A customer will complain that the time on their device is reverting to the build time of balenaOS and not being updated and that `/var/lib/chrony/drift` either doesn't exist or has not recently been modified.",
        "Solution": "The `/var/lib/chrony/drift` file stores the current clock skew of that from the correct time. However, its last modification time is also used to set the default time on systems without a hardware RTC (such as the Raspberry Pi family). A customer might state that the file either doesn't exist, or that the last modification time is far in the past.\n\nIn v2.46.0 and below of balenaOS where `chronyd` is used for NTP instead of `systemd-timesyncd`, the drift file was updated every hour. If a system is not reliably powered for an hour, or NTP across the network is blocked, it is possible that this file will not get created (or will not be updated). This could cause issues such as that described, where the date reverts to that of the build date/time of the version of balenaOS being run.\n\nIn v2.46.1 onwards, the drift file polling time was increased to approximately every 270 minutes (4.5 hours). Be sure of which version you're operating on when determining the issue. \n\nThe best solution is to ensure that the device is both powered longer than the polling time *and* that NTP is not blocked and is able to correctly function.",
        "severity": "low"
      },
      "name": "chrony driftfile isn't being updated",
      "slug": "support-issue-chrony-driftfile-isn-t-being-updated-57258ac2-2ce0-4f38-b9a7-fb26706a2ebf",
      "tags": [
        "chrony",
        "ntp",
        "timesyncd"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-03T18:29:06.952Z"
      },
      "created_at": "2020-03-03T18:27:50.588Z",
      "updated_at": "2020-03-03T18:29:06.911Z",
      "capabilities": []
    },
    {
      "id": "44b19d2b-47fe-4c99-8e1d-4307f842bc66",
      "data": {
        "Problem": "For a while (couple of weeks, 2017 end of Nov/beginning of Dec), resinHUP was doing updates from non-hostapp to hostapp enabled (>=2.5.1, most often use 2.7.x) resinOS versions in a way that it wasn't actually running the system in hostapp mode. That was fixed and now the update is run properly, but there are some devices that need special considerations for their next resinHUP to get onto a proper hostapp-enabled system.\n\nUnfortunately the balena migration introduced some bugs in resinHUP which results in the device not being able to update, with this at the end of the log (at  `/mnt/data/resinhup/upgrade-2.x.sh.<date of update>.log`):\n\n```\n...\n[ERROR]docker-host did not come up before check timed out...\n```\n\nThe system has not been modified yet at this stage.",
        "Solution": "The solution relies on pulling in a pending (partial) fix, and running this routine:\n\n* reboot the device (to start from a clean state)\n* log in the Host OS in the web terminal or ssh\n* get the `VERSION` value from `/etc/os-release` (e.g. 2.7.5+rev1)\n* run a resinHUP to \"update\" to the same system the device is running, with a patched HUP:\n\n```\ncurl -o /tmp/upgrade-2.x.sh https://raw.githubusercontent.com/resin-os/resinhup/08cbbcf8799096e9cd7369b24eafa8113ec5b377/upgrade-2.x.sh\nchmod +x /tmp/upgrade-2.x.sh\n/tmp/upgrade-2.x.sh --hostos-version VERSION\n```\n\n* after this update is done and the device rebooted back, normal update will work, and can use e.g. the dashboard to initiate a hostOS update to the desired version\n\n\n(Note, this is a workaround, resinHUP is getting a fix so this will be a transparent process for the users soon)",
        "category": "hup",
        "severity": "low"
      },
      "name": "Host OS update (HUP) fails with docker-host did not come up",
      "slug": "scratchpad-entry-ost-cannot-update-with-docker-host-did-not-come-up-cd05bd22-4cf6-4ea1-a9ee-29735d23dd2e",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:16:44.746Z"
      },
      "created_at": "2019-03-01T17:59:57.582Z",
      "updated_at": "2020-02-28T20:16:44.709Z",
      "capabilities": []
    },
    {
      "id": "38f48bdd-427b-45d6-91b6-d2f75f4dbaea",
      "data": {
        "Problem": "resinHUP fails on a device with a flakey network, as evidenced by logs resembling the following (located in `/mnt/data/resinhup`):\n\n```\n2.29.0_rev1-raspberrypi3: Pulling from resin/resinos\n0636a9ade0db: Pulling fs layer\n0636a9ade0db: Ready to download\nunexpected EOF\n[000000263][ERROR]hostapp-update has failed...-\n```\n\nHost OS updates is not yet capable enough to retry this failure.",
        "Solution": "Just retry the update.\n\n* Clear the os update status if still shows \"OS Update Failed\" by restarting the supervisor with `systemctl restart resin-supervisor`\n* start the self-service update again (preferably the user should start it themselves) in the dashboard.",
        "category": "hup",
        "severity": "low",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "#needs-review": {
              "type": "string"
            }
          }
        }
      },
      "name": "Host OS Update (HUP) fails with unexpected EOF",
      "slug": "support-issue-resin-fails-with-unexpected-eb7a6b7c-7471-4208-acc5-f9f57c181ed7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T20:14:13.122Z",
        "support issue has attached support thread": "2020-02-07T18:40:26.627Z"
      },
      "created_at": "2019-01-17T23:42:51.552Z",
      "updated_at": "2020-02-28T20:14:13.078Z",
      "capabilities": []
    },
    {
      "id": "df6628fe-a91b-4dab-a273-1efd50fe0f43",
      "data": {
        "Problem": "Device type: Raspberry Pi (v1 / Zero / Zero W)\nOS version: balenaOS 2.32.0+rev1\nSupervisor version: 9.14.0\n\nbalena engine is unresponsive and many simple commands, even the fingerprint test hangs. In `dmesg` the kernel shows an error like:\n```\n[ 5814.405028] Unable to handle kernel paging request at virtual address 0d4547f8\n[ 5814.405055] pgd = dcd70000\n[ 5814.405064] [0d4547f8] *pgd=00000000\n[ 5814.405082] Internal error: Oops: 5 [#1] ARM\n[ 5814.405093] Modules linked in: ip6t_REJECT nf_reject_ipv6 ipt_REJECT nf_reject_ipv4 ip6table_filter ip6_tables dummy ipt_MASQUERADE nf_nat_masquerade_ipv4 nf_conntrack_netlink nfnetlink br_netfilter bnep hci_uart btbcm serdev bluetooth ecdh_generic xt_owner i2c_dev spidev sr_mod cdrom uas huawei_cdc_ncm cdc_wdm cdc_ncm brcmfmac usbnet option brcmutil mii usb_wwan usbserial cfg80211 rfkill snd_bcm2835(C) snd_pcm snd_timer snd i2c_bcm2835 spi_bcm2835 uio_pdrv_genirq uio fixed sch_fq_codel\n[ 5814.405242] CPU: 0 PID: 4103 Comm: balena Tainted: G         C      4.14.98 #1\n[ 5814.405250] Hardware name: BCM2835\n[ 5814.405260] task: dcb3a9a0 task.stack: dd958000\n[ 5814.405278] PC is at au_plink_test+0x3c/0x7c\n[ 5814.405304] LR is at au_cpup_attr_nlink+0xe0/0xf0\n[ 5814.405313] pc : [<c0358538>]    lr : [<c0341878>]    psr: 20000013\n[ 5814.405321] sp : dd959e48  ip : dd959e60  fp : dd959e5c\n[ 5814.405330] r10: 00000000  r9 : 00000001  r8 : dca4e400\n[ 5814.405339] r7 : 00000000  r6 : dd623d70  r5 : dd63d028  r4 : 51eb851f\n[ 5814.405348] r3 : 4c2815ce  r2 : 00000032  r1 : dca4f0c0  r0 : dd63d028\n[ 5814.405359] Flags: nzCv  IRQs on  FIQs on  Mode SVC_32  ISA ARM  Segment user\n[ 5814.405369] Control: 00c5387d  Table: 1cd70008  DAC: 00000055\n[ 5814.405378] Process balena (pid: 4103, stack limit = 0xdd958188)\n[ 5814.405387] Stack: (0xdd959e48 to 0xdd95a000)\n[ 5814.405402] 9e40:                   00000001 dd63d028 dd959e84 dd959e60 c0341878 c0358508\n[ 5814.405417] 9e60: dd63c770 c11c1028 dca4e400 dd63d028 dd959f20 00000001 dd959ecc dd959e88\n[ 5814.405432] 9e80: c0352100 c03417a4 00000001 00000000 00000200 c0dff390 dd63c330 969761d9\n[ 5814.405447] 9ea0: c016bba4 c0351f84 dd959f20 dc482a08 00000000 dd63d028 dd958000 00000000\n[ 5814.405462] 9ec0: dd959ef4 dd959ed0 c01704c8 c0351f90 dc482a00 00000000 dc482a00 dd959f20\n[ 5814.405476] 9ee0: 000007ff dd958000 dd959f1c dd959ef8 c0170544 c0170464 c11c1028 beaf63c0\n[ 5814.405492] 9f00: b6f55fe0 000000c5 c0010444 dd958000 dd959fa4 dd959f20 c0170fdc c0170504\n[ 5814.405506] 9f20: 000007ff 000081ed 00000001 00000400 00000000 00000000 00000874 00000000\n[ 5814.405520] 9f40: 00000266 00000000 0b300002 00000000 00000000 00000000 000065b0 00000000\n[ 5814.405534] 9f60: 5c8fd3ac 00000000 5c8fd3ac 00000000 5ccc557c 00000000 00000000 00000000\n[ 5814.405547] 9f80: 00000032 00000000 00000003 969761d9 00000004 00000000 00000000 dd959fa8\n[ 5814.405562] 9fa0: c00102a0 c0170fb0 00000004 00000000 00000004 beaf63c0 beaf63c0 b6f5a8f0\n[ 5814.405575] 9fc0: 00000004 00000000 b6f55fe0 000000c5 00000000 00000001 00000000 beaf644c\n[ 5814.405590] 9fe0: b6f59fa4 beaf6344 b6f2ebb0 b6f42ad8 60000010 00000004 00000000 00000000\n[ 5814.405621] [<c0358538>] (au_plink_test) from [<c0341878>] (au_cpup_attr_nlink+0xe0/0xf0)\n[ 5814.405655] [<c0341878>] (au_cpup_attr_nlink) from [<c0352100>] (aufs_getattr+0x17c/0x1cc)\n[ 5814.405682] [<c0352100>] (aufs_getattr) from [<c01704c8>] (vfs_getattr_nosec+0x70/0x84)\n[ 5814.405702] [<c01704c8>] (vfs_getattr_nosec) from [<c0170544>] (vfs_statx_fd+0x4c/0x78)\n[ 5814.405721] [<c0170544>] (vfs_statx_fd) from [<c0170fdc>] (SyS_fstat64+0x38/0x70)\n[ 5814.405750] [<c0170fdc>] (SyS_fstat64) from [<c00102a0>] (ret_fast_syscall+0x0/0x28)\n[ 5814.405769] Code: e28110c0 e0833103 e0833103 e0423103 (e7913103) \n[ 5814.405803] ---[ end trace 2687c984073d5289 ]---\n```\n\nThis seems to indicate that the RAM page memory is corrupt. I believe devices with less ram are more susceptible to this.\n",
        "Solution": "I believe in most of these cases rebooting will fix the device as it will allow the kernel to fix the page memory on boot, but it might get back into this case again and again with out a root cause.",
        "category": "RAM corruption",
        "severity": "medium",
        "shareable": true,
        "fixedInOSVersion": "--",
        "affectedOSVersions": [
          "2.32.0+rev1"
        ]
      },
      "name": "Unable to handle kernel paging request at virtual address",
      "slug": "support-issue-unable-to-handle-kernel-paging-request-at-virtual-address-89dfa355-2523-4273-9f59-ebfd6b232b49",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-28T19:47:24.243Z",
        "support issue is attached to issue": "2020-02-28T14:47:09.917Z",
        "support issue has attached support thread": "2020-02-27T15:28:52.734Z"
      },
      "created_at": "2020-02-27T15:28:51.949Z",
      "updated_at": "2020-02-28T19:47:24.207Z",
      "capabilities": []
    },
    {
      "id": "073dc2e6-539e-4589-be93-b57bd3996070",
      "data": {
        "Problem": "Docker might be failing to create a network bridge at startup.\n\nYou might see logs like the following:\n\n* ```\nError starting daemon: Error initializing network controller: Error creating default \"bridge\" network: failed to allocate gateway (X.X.X.X): Address already in use\n```\n\n* ```\nError starting daemon: Error initializing network controller: error obtaining controller instance: failed to get bridge network configurations from store: error while populating kmap: meta1 error: checksum error\n```\n\n* ```\nError starting daemon: Error initializing network controller: could not delete the default bridge network: unknown network bridge id <sha>\n```\n\nIn order to fix it, delete the network files:\n\n```sh\nrm -rf /var/lib/docker/network/files/*\n```\n\nStart docker:\n\n```sh\nsystemctl restart balena\n```\n\nStart the supervisor:\n\n```sh\nsystemctl restart resin-supervisor\n```\n",
        "severity": "low"
      },
      "name": "Docker won't start with network controller errors",
      "slug": "scratchpad-entry-073dc2e6-539e-4589-be93-b57bd3996070",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-21T14:32:14.843Z",
        "support issue has attached support thread": "2020-02-21T14:28:45.179Z"
      },
      "created_at": "2019-03-01T17:59:56.337Z",
      "updated_at": "2020-02-21T14:32:14.816Z",
      "capabilities": []
    },
    {
      "id": "7ee6d6a4-491f-43cd-8ac0-33731de110dd",
      "data": {
        "Problem": "The device/supervisor stops logging to the api after some time, the logs on the supervisor don't indicate any errors.",
        "Solution": "nothing yet.",
        "category": "logging",
        "severity": "low",
        "affectedOSVersions": [
          "2.41.1"
        ],
        "affectedSupervisorVersions": [
          "10.2.2"
        ]
      },
      "name": "Device/supervisor stopped logging after some time",
      "slug": "support-issue-device-supervisor-stopped-logging-after-some-time-a62ded95-4028-45c1-a85f-f1fe00f11754",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-20T14:30:57.251Z",
        "support issue has attached support thread": "2020-02-20T14:30:57.838Z"
      },
      "created_at": "2020-02-20T14:30:57.109Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "c8565388-a938-4d35-95db-9937862b13bf",
      "data": {
        "Problem": "The supervisor cannot update the user's application because of such errors:\n\n```\nMar 21 09:32:33 049e3cf balenad[603]: [2018-03-21T09:32:33.158Z] Knex:warning - Can't take lock to run migrations: Migration table is already locked\nMar 21 09:32:33 049e3cf healthdog[2370]: [2018-03-21T09:32:33.158Z] Knex:warning - Can't take lock to run migrations: Migration table is already locked\nMar 21 09:32:33 049e3cf balenad[603]: [2018-03-21T09:32:33.168Z] Knex:warning - If you are sure migrations are not running you can release the lock manually by deleting all the rows from migrations lock table: knex_migrations_lock\nMar 21 09:32:33 049e3cf healthdog[2370]: [2018-03-21T09:32:33.168Z] Knex:warning - If you are sure migrations are not running you can release the lock manually by deleting all the rows from migrations lock table: knex_migrations_lock\nMar 21 09:32:33 049e3cf balenad[603]: [2018-03-21T09:32:33.178Z] Unhandled rejection MigrationLocked: Migration table is already locked\nMar 21 09:32:33 049e3cf healthdog[2370]: [2018-03-21T09:32:33.178Z] Unhandled rejection MigrationLocked: Migration table is already locked\n```\n\nSee https://github.com/balena-io/balena-supervisor/issues/598",
        "Solution": "## Updated instructions\n\nIf the supervisor container is running (albeit in a broken state), you can follow the instructions from https://jel.ly.fish/#/13b9dcfa-8276-4447-b012-68fe16537023 to run commands on the sqlite database using node, and run this command once you're in:\n\n```\ndb.all('UPDATE knex_migrations_lock SET is_locked = 0;', console.log)\n```\n\n## Old instructions\n\n(These are the instructions to modify the supervisor DB by downloading an alpine container that has sqlite installed. They may be a useful alternative to the new instructions if the supervisor container is down so you can't balena exec)\n\nA workaround is posted in the GH issue, but to simplify, we need to get sqlite3 on the device and remove the lock:\n\n```\nsystemctl stop resin-supervisor\n```\nLoad the device type from `/etc/os-release`, stored in the `SLUG` variable, and start the fixing container:\n\n```\nsource /etc/os-release\nbalena run --rm -ti -v /resin-data/resin-supervisor:/db resin/${SLUG}-alpine /bin/bash\n```\nthen in the running alpine container run:\n```\napk add --no-cache sqlite\nsqlite3 /db/database.sqlite\n```\nIn there then\n```\nUPDATE knex_migrations_lock SET is_locked = 0;\n.exit\n```\nExit the container, and restart the supervisor and clean up: \n```\nsystemctl start resin-supervisor\nbalena rmi resin/${SLUG}-alpine\n```\n\nOr, if you'd rather not type that all in, there's a one-liner you can use in the terminal:\n\n```\nsystemctl stop resin-supervisor && source /etc/os-release && balena run --rm -ti -v /resin-data/resin-supervisor:/db resin/${SLUG}-alpine /bin/bash -c 'apk add --no-cache sqlite && sqlite3 /db/database.sqlite \"UPDATE knex_migrations_lock SET is_locked = 0;\" && exit' && systemctl start resin-supervisor && balena rmi resin/${SLUG}-alpine\n```\n ",
        "severity": "low",
        "mentionsUser": [
          "user-shaunmulligan",
          "user-robertgzr"
        ],
        "affectedOSVersions": [
          "< v2.12.6"
        ],
        "affectedSupervisorVersions": [
          "< 7.1.19"
        ]
      },
      "name": "Supervisor internal lock prevents application update with \"Migration table is already locked\"",
      "slug": "scratchpad-entry-c8565388-a938-4d35-95db-9937862b13bf",
      "tags": [
        "hard"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-20T14:03:34.850Z",
        "support issue is attached to issue": "2020-02-20T13:51:35.320Z",
        "support issue has attached support thread": "2020-02-20T13:39:56.435Z"
      },
      "created_at": "2019-03-01T17:59:57.281Z",
      "updated_at": "2020-02-20T14:03:35.088Z",
      "capabilities": []
    },
    {
      "id": "d908072f-126b-4671-ab95-abeafa7f1963",
      "data": {
        "Problem": "When trying to flash a newer balenaOS onto at TX2 the user gets `irq: type mismatch, failed to map hwirq-30 for /interrupt-controller@3881000!` error.",
        "Solution": "This happens because the TX2 stores dtbs and firmwares on the emmc, and when you flash the board you load from sd-card the new and incompatible kernel at L4T 32.2 against the L4T 28.x firmwares. The kernel crashes due to these incompatibilities.\n\nTo overcome this you can either hostOS update to the new 2.47 release, or you can download the L4T Driver Package (BSP) from https://developer.nvidia.com/embedded/linux-tegra-r322, unpack it, put the board in recovery mode and execute sudo ./flash.sh jetson-tx2 mmcblk0p1. This will write the firmwares and dtbs to the emmc. After flashing is done, you can reboot the board with the SD-card inserted. You only need to perform this process once.\n\nThis is also being improved in the docs here: https://github.com/balena-io/docs/issues/1363",
        "category": "flashing device",
        "severity": "low",
        "affectedOSVersions": [
          ">2.47.0"
        ]
      },
      "name": "TX2 irq: type mismatch, failed to map hwirq-30 for /interrupt-controller@3881000!",
      "slug": "support-issue-tx2-irq-type-mismatch-failed-to-map-hwirq-30-for-interrupt-controller-3881000-9402d4bf-72f6-451c-a706-4d3aff78bcea",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-20T14:00:48.817Z",
        "support issue has attached support thread": "2020-02-20T14:00:49.485Z"
      },
      "created_at": "2020-02-20T14:00:48.596Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "5328bb50-5009-48fa-b420-8a48f784f30d",
      "data": {
        "Problem": "```\nError cleaning up sha256:d74fa334677643bb38d6cbd2ecdde476cd18f3aad9187237aa34611ff7163b56: (HTTP code 409) conflict - conflict: unable to delete d74fa3346776 (cannot be forced) - image has dependent child images - will ignore for 1 hour\n```",
        "Solution": "This is harmless, and doesn't affect the device. It is because the supervisor delete by ID and not by tag, and one fleetops image is not possible to delete like that.\n```\nbalena rmi resin/armv7hf-supervisor:foobar\n```\nworks if results in \"Untagged: ....\n\nAfter that restart balenaEngine like so:\n```\nsystemctl restart balena\n```",
        "severity": "low",
        "shareable": true,
        "affectedOSVersions": [
          "raspberrypi3@v2.12.3+rev1"
        ],
        "affectedSupervisorVersions": [
          "v7.1.14_logstream"
        ]
      },
      "name": "Supervisor cannot clear up image",
      "slug": "support-issue-upervisor-cannot-clear-up-image-b8fe3f3d-94ce-4edd-bbcf-7ca3383601b6",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-03T12:51:12.919Z",
        "support issue is attached to issue": "2019-09-03T13:02:34.532Z",
        "support issue has attached support thread": "2019-09-03T12:52:45.095Z"
      },
      "created_at": "2019-05-15T10:46:55.434Z",
      "updated_at": "2019-09-03T12:51:12.855Z",
      "capabilities": []
    },
    {
      "id": "23139ed6-e984-47dc-a133-69feb4b7ffa7",
      "data": {
        "Problem": "How to notice when the underlying system is corrupted? How can we see what files have changed compared to the released state?",
        "Solution": "### RootFS integrity test\n\nUse the supplied `resinos.fingerprint` to check rootfs corruption. Log into the device and\n\n```\nmd5sum --quiet -c /resinos.fingerprint\n```\n⚠️**DO NOT DO THIS ON balena OS >= 2.34.1 || < 2.41**⚠️\nIf you are doing fingerprint checks on balenaOS devices >=2.34.1 | < 2.41.0, the regular check crashes and reboots the device when reading one of the files. If you do fingerprint check and device goes offline, this is the thing you hit.\n\nTo work around it on these devices, do the following, to skip the file that triggers the issue\n```\ngrep -v \"/var/cache/ldconfig/aux-cache\" /resinos.fingerprint | md5sum --quiet -c -\n````\nRelevant [issue](https://github.com/balena-os/meta-balena/pull/1620) and [PR in 2.41.0 that should be safe](https://github.com/balena-os/meta-balena/pull/1620).\n\nA working device should only have these catches, at most (due to the nature of how these files are managed in resinOS): \n```\nbash-4.3# md5sum --quiet -c /resinos.fingerprint\n/etc/hostname: FAILED\n/etc/machine-id: FAILED\n/home/root/.rnd: FAILED\nmd5sum: WARNING: 3 computed checksums did NOT match\n```\n\nOn legacy devices (1.x) the fingerprint file should be `/resin-root.fingerprint`, and might list other files as `FAILED` as well, that are normal (such as `supervisor.conf`)\n\nA shortcut way to check can be also this function:\n````\nfingerprint_check() {\n    # Check fingerprint and ignore lines that are known to change, or output by md5sum anyways\n    local status=\"OK\"\n    local IGNORE_LIST=\"md5sum|/etc/hostname|/etc/machine-id|/etc/resin-supervisor/supervisor.conf|/etc/systemd/timesyncd.conf|/home/root/.rnd\"\n    checksum=$(md5sum -c --quiet /resinos.fingerprint 2>&1 | grep -v -E \"$IGNORE_LIST\")\n    if [ -n \"$checksum\" ] ; then\n        status=\"ERROR\"\n    fi\n    echo \"${status}\"\n}\n```\nPaste this in the host OS console, and then run `fingerprint_check`. It runs the checks and ignores known changing files. If it returns `ERROR`, run the check as above manually to see what files have changed and check what besides the ignore list has changed.\nThis just works on 2.x devices, though, and might catch cases when things are okay but not normally expected. So exercise common sense and caution.\n\n### Boot Partition Integrity Check\n\nThis should compare the boot partition's fingerprint file:\n```\ncat /mnt/boot/resinos.fingerprint | sed 's/ \\// \\/mnt\\/boot\\//' | md5sum --quiet --check -\n```\nThese should not return failures, except in `config.txt`, `cmdline.txt`, which are normal modifications under most circumstances.\n\n\n### Caveats\n\nFingerprint checks work for resinOS 1.x >=1.8.0, the name it might be that the fingerprint file is called differently slightly (need some checking).\n\nFor resinOS >=2.12.0 there are some device types (notably Intel NUC), that have a number of extra files failing fingerprint tests. See [this other note](#ba481de0-8526-11e8-b2aa-a784bd1de77f) regarding that case.\n\nFor Intel NUC and RPi using  `v2.34.1+rev1 <= OS version < v2.41.0`, when running this check it will crash the kernel, resulting in a board getting stuck or rebooted.",
        "severity": "low"
      },
      "name": "Checking for resinOS corruption / modifications",
      "slug": "scratchpad-entry-23139ed6-e984-47dc-a133-69feb4b7ffa7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-06T05:24:25.803Z"
      },
      "created_at": "2019-03-01T17:59:56.538Z",
      "updated_at": "2019-09-06T05:24:25.774Z",
      "capabilities": []
    },
    {
      "id": "f3451382-9a32-4cb6-9dc0-0137f89969a3",
      "data": {
        "Problem": "Poor video performance and chromium crashing (With the “aww snap, something went wrong message”) when I try and load any pages that are somewhat video / GPU intense",
        "Solution": "Drivers are correctly installed for the \"intel integrated graphics\", but chromium is looking for them in the wrong direction, symlinking the drivers fixes the issue:\n```\n apt install libgl1-mesa-dri && \\\n  # Symlink drivers into /usr/lib/dri (if not exists)...\n  ln -s /usr/lib/x86_64-linux-gnu/dri /usr/lib/dri\n```",
        "severity": "low"
      },
      "name": "Poor video performance/chromium crashing on intel NUC compute stick",
      "slug": "support-issue-poor-video-performance-chromium-crashing-on-intel-nuc-compute-stick-6b7cd884-24d1-4f71-953f-caf974dc35c1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-16T10:03:21.468Z",
        "support issue has attached support thread": "2019-09-16T10:03:22.149Z"
      },
      "created_at": "2019-09-16T10:03:21.382Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "174f17f1-52fd-408d-843e-c0ddfe132627",
      "data": {
        "Problem": "Device can't connect to our backend, suspect that the network is blocking key domains or ports",
        "Solution": "The user can run the following two tests from a laptop in the same network as the device:\n\ncheck API: `curl https://api.balena-cloud.com/ping`\n\ncheck VPN: `nmap -p 443 vpn.balena-cloud.com`\n\nthis is related to the network requirements state here: https://docs.resin.io/deployment/network/2.x/#network-requirements ",
        "severity": "high"
      },
      "name": "Check if API and VPN is accessible in a network",
      "slug": "scratchpad-entry-174f17f1-52fd-408d-843e-c0ddfe132627",
      "tags": [
        "needs-review"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-19T19:03:19.362Z"
      },
      "created_at": "2019-03-01T17:59:56.451Z",
      "updated_at": "2019-09-19T19:03:19.335Z",
      "capabilities": []
    },
    {
      "id": "7f42d78a-a931-4937-8793-0b1cc32127f8",
      "data": {
        "Problem": "Currently it is not possible via the supervisor or other mechanism to edit some `config.json` values (like udev rules or ssh keys). Additionally, editing `config.json` by hand can be **dangerous** if the JSON is malformed, and potentially can brick the device. In order to provide a safe workaround, we have two sample projects that allow these values to be safely updated remotely (and also restart any necessary processes):\n\nFor udev rules: https://github.com/balena-io-playground/udev-rule-insert\nFor ssh keys: https://github.com/balena-io-playground/ssh-key-insert",
        "severity": "low",
        "shareable": true
      },
      "name": "Updating/adding ssh keys or udev rules remotely",
      "slug": "support-issue-updating-adding-ssh-keys-or-udev-rules-remotely-62eeddc3-9760-4620-a183-284211281c93",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-25T15:21:57.118Z"
      },
      "created_at": "2019-09-25T15:21:28.662Z",
      "updated_at": "2019-09-25T15:21:57.090Z",
      "capabilities": []
    },
    {
      "id": "913c680e-2955-4451-b09e-2578a0414c1c",
      "data": {
        "Problem": "Whilst customers can clone from the git repository (for example git clone <user>@git.balena-cloud.com:<user>/<application>.git), they absolutely should not. The reason is that these repositories are transient and essentially used as caches for our Builders. As such, there are no guarantees that the code in these repositories will not be removed as part of disk space cleanup. We state here that ‘Warning: The balenaCloud git repository is not intended as a code hosting solution, and we cannot guarantee the persistence of data in balenaCloud git remotes. We recommend you use a service like Github to manage and share your code.’.\n\nCustomers absolutely should use an alternative service as their main git repository, which is then used as the source for pushes to our git repositories.\n\nYou should encourage them to remove the use of git push to our repositories completely and move to using the balena-cli balena push command. The use of git push is now considered deprecated, and we will not be adding any more functionality to it (whereas balena push has a wealth of remote and local development and build options).\n\n`balena push` has a page here: https://www.balena.io/docs/reference/cli/#push-applicationordevice\n",
        "severity": "low",
        "shareable": true
      },
      "name": "Can I clone from balena git repositories?",
      "slug": "support-issue-can-i-clone-from-balena-git-repositories-f7aa038d-9c99-44aa-8383-ffb33beb4552",
      "tags": [
        "balena",
        "repositories",
        "repository",
        "git push"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-27T14:17:14.549Z"
      },
      "created_at": "2019-09-27T14:17:14.388Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3c7ee027-a8d0-45bb-9aff-2d8d000536d8",
      "data": {
        "Problem": "There's two possible errors:\n\nCase 1:\n\n```\nFailed to update application 'registry2.resin.io/...' due to 'container already stopped'\n```\nor possibly a similar message that says \"No such container\".\n\n\nCase 2:\n\n```\nUpdates are locked: EEXIST: file already exists, open '/mnt/root/tmp/resin-supervisor/.../resin-updates.lock'\n```\n\nCan be a symptom of moving a device between apps while an update lock was present.",
        "Solution": "In both cases, after applying the fix recommend the user to update the resinOS version to one above 2.12.5.\n\nFor case 1:\n\n```\nsystemctl restart resin-supervisor\n```\n\nshould be enough. If this doesn't work, clear the supervisor db:\n\n```\nsystemctl stop resin-supervisor\nrm /resin-data/resin-supervisor/database.sqlite\nsystemctl start resin-supervisor\n```\n\nFor case 2:\n\nAs noted in https://github.com/resin-io/hq/issues/1007 , follow the instructions found in https://github.com/resin-io/resin-supervisor/issues/348. Alternatively, look for the *old* appId in `/resin-data`, and remove the resin-updates.lock file there.\n"
      },
      "name": "Device not getting updates after moving between apps",
      "slug": "scratchpad-entry-3c7ee027-a8d0-45bb-9aff-2d8d000536d8",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "support issue has attached support thread": "2019-09-27T16:07:24.776Z"
      },
      "created_at": "2019-03-01T17:59:56.624Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "a6919207-7667-4f4d-9ee8-f3d5e01b4941",
      "data": {
        "Problem": "The device is \"offline\" and not connected to our vpn, but it is still sending logs to the dashboard and is connected to the internet.\n\nYou can manually attempt a connection using openvpn on a local device to check if it's a network issue, eg:\n\n````\nYou can test the VPN connection manually from your laptop by using openvpn, to do that you'd need to install openvpn and then run `openvpn --config openvpn.conf` with `openvpn.conf` containing\n\n```\nclient\nremote vpn.balena-cloud.com 443\nresolv-retry infinite\n\nremote-cert-tls server\nca ca.crt\nauth-user-pass\nauth-retry none\nscript-security 2\nup-restart\n\ncomp-lzo\ndev resin-vpn\ndev-type tun\nproto tcp\nnobind\n\npersist-key\npersist-tun\nverb 3\n\nreneg-bytes 0\nreneg-pkts 0\nreneg-sec 0\n\n```\n\nand `ca.crt` containing\n\n```\n-----BEGIN CERTIFICATE-----\nMIICWDCCAcGgAwIBAgIJAPSxvaHnsjuiMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTMxMjEyMTQ0NzU2WhcNMjMxMjEwMTQ0NzU2WjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKB\ngQDlMvQ2juZrzXRqWpX7t4FXXLl4G8ncNT1v2MmT3pp6uF4nkVGuR4YtW3bipCKa\nTXFvyhZuxE/7fJYGhafMWZs26kPt7vsmiTREEGC+BHqNQb0wImrLZOK2W97GduSe\ne8nZcWSC3Z8UCXRBH7Zks4zaFwhtcggvdJ/Pw9w12tNIzQIDAQABo1AwTjAdBgNV\nHQ4EFgQUU4WqX2fLx7gU2QpQvVH0nZNQsRYwHwYDVR0jBBgwFoAUU4WqX2fLx7gU\n2QpQvVH0nZNQsRYwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOBgQAYhTMd\nPsCCxHlqBjOuswP6PYOg5Mz5Aqg70ZZfhLjEWyoSEsrVJM4es+xrtHAItT28Axky\nRPN7rzLsd3GiH9a6WzaeNdpWdYMSi3+NrNbkOSvnNhGxu/QHb0LtmetxpD6SDFfP\nJ11EnN34vWG1JBYHv5Sov+E993rRJvE4UEulZQ==\n-----END CERTIFICATE-----\n```\n\nThat should be able to connect and prompt you for user/password (you can use anything to test) and then go through to a\n```\nAUTH: Received control message: AUTH_FAILED\nSIGTERM[soft,auth-failure] received, process exiting\n```\nresponse\n````\n\nif you need to take it further you can use a device uuid as the username and its device api key as the password",
        "Solution": "No known solution yet.",
        "severity": "high"
      },
      "name": "Device not connected to VPN but still able to push logs to API",
      "slug": "support-issue-evice-not-connected-to-but-still-able-to-push-logs-to-1537e550-3524-430c-88e5-046840e4267e",
      "tags": [
        "symptom"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-01T18:27:49.956Z"
      },
      "created_at": "2019-03-11T14:24:35.639Z",
      "updated_at": "2019-10-01T18:27:49.906Z",
      "capabilities": []
    },
    {
      "id": "9e0d50fa-4375-4e25-9973-7ad9a77e4776",
      "data": {
        "Problem": "A container with a HEALTHCHECK keeps restarting over and over even when the HEALTHCHECK is rewritten to constantly pass. Example: `HEALTHCHECK --interval=2m --timeout=3s CMD exit 0 || exit 1`",
        "Solution": "On lower powered devices like raspberry pi 0 or IOT2000, if the `--timeout` is too short, the balena-engine can not execute the test fast enough, so it timesout and fails. The suggestion to the user is to increase the timeout to something more reasonable. In the example above it was to suggest using `--timeout=120s`",
        "category": "healthcheck",
        "severity": "low",
        "shareable": true,
        "fixedInOSVersion": "-",
        "fixedInSupervisorVersion": "all"
      },
      "name": "container continually restarts when HEALTHCHECK is defined",
      "slug": "support-issue-container-continually-restarts-when-healthcheck-is-defined-2539cf18-d9c3-468d-b2b3-ede6d3080f82",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-25T14:06:14.818Z",
        "support issue has attached support thread": "2019-10-25T14:06:16.114Z"
      },
      "created_at": "2019-10-25T14:06:14.460Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "eb23bf0d-6eb5-46bf-8c57-21b4c34e6993",
      "data": {
        "Problem": "Sometimes need to find containers (by path) and match them to the service name, to extract any further info. If the engine is down, cannot use `balena ps` and have to use data extraction from the local config.",
        "Solution": "```\ncd /mnt/data/docker/containers\n find .  -exec bash -c 'echo {} | grep config.v2.json && jq .Name {}' \\;\n```\nwill print each container ID (as part of a path) and the name of the container if extracted properly\n\nFor example:\n```\nroot@ATHOS_Hub_b827eba902d1:/mnt/data/docker/containers# find .  -exec bash -c 'echo {} | grep config.v2.json && jq .Name {}' \\;\n./56d386875cfca8509142b6736ead1732370deffe0e47727a5826f991eea29773/config.v2.json\n\"/resin_supervisor\"\n./856ad346539944cfd24429080328f3db536bdef77ee0e7594edfc1171dbaff52/config.v2.json\n\"/client_1258916_966334\"\n./856ad346539944cfd24429080328f3db536bdef77ee0e7594edfc1171dbaff52/.tmp-config.v2.json425559320\n./8a0278db3c5e96674f1b4c7fba05dbae6d5fad3740d3a4c608d606395835c758/config.v2.json\n\"/andromeda-rpi_1258914_966334\"\n./48e22cdbe224dcda8146430b6eef47abe003a0dc979ea93aa6d27e6d98fa5e08/config.v2.json\n\"/data-uploader_1258917_966334\"\n./f8d93068c9c4b4a904741c6cb7c9b6be729675e9f7460dadf3332f41977f744c/config.v2.json\n\"/log-uploader_1258918_966334\"\n./d8619c0608770624b88fdbd8c8a7d9dfd33818c918f8ce363ee50d4465f89fbe/config.v2.json\n\"/monitor_1258919_966334\"\n./d4bdc590912cc962b76155d68688b8c20db660ffdea9e864fea1cd23caa26ec7/config.v2.json\n\"/common_1258915_966334\"\n./d4bdc590912cc962b76155d68688b8c20db660ffdea9e864fea1cd23caa26ec7/.tmp-config.v2.json722486070\n```",
        "severity": "low"
      },
      "name": "Matching container to local storage when balena engine is not running",
      "slug": "support-issue-matching-container-to-local-storage-when-balena-engine-is-not-running-761ae3e8-6ea5-4cf8-ae9e-16ee9730d665",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-10-28T17:43:00.638Z"
      },
      "created_at": "2019-10-28T17:43:00.529Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "411e395a-70fe-4684-9920-e467b60c8b23",
      "data": {
        "Problem": "Customer asks about a \"build secrets\" or \"private docker registry\" feature, and whether/how/when it will be available with the `balena push` / `balena build` / `balena deploy` command. There are four (?) relevant and distinct features that sometimes get lumped together as \"build secrets\", and support agents need to be clear about the distinction in order to be most helpful in replying to customers.",
        "Solution": "Let's name and distinguish the features:\n* Build secrets (strictly) or build secret files\n* Build variables\n* Private docker registry authentication (ability to pull base images from private registries)\n* Docker's (18.09) own \"build secret information\" feature (docker build --secret)\n\n\n**Build secrets (strictly) or build secret files**\n\nThis is a feature implemented by Cameron and deployed to production around the second quarter of 2018. It was and continues to be considered \"beta\" and has not been publicly (widely) announced or documented. It has however been shared with customers who asked for it, by sending them a link to the following GitHub Gist of Cameron:\n\n[https://gist.github.com/CameronDiver/6d5964c0618a6154f89d73b883fb09b7](https://gist.github.com/CameronDiver/6d5964c0618a6154f89d73b883fb09b7)\n\nBriefly, the build secrets (strictly) feature consists of a `.resin/resin.yml` (or `.balena/balena.yml`) file and a set of arbitrary files created by users and placed under a folder named `.resin/secrets/` (or `.balena/secrets/`) in the root of their app, as described in the Gist. The secret files can contain anything the user wishes, including private keys and passwords, in any format. During an image build in balena's cloud builders, the files under `.resin/secrets/` are mounted and become available in the filesystem of the temporary containers used to generate the docker image, so they can be accessed for example through the Dockerfile RUN instruction:\n\n```\nRUN /bin/cat /run/secrets/my-recipe/super-secret-recipe | cmd_that_reads_secrets_from_stdin\n```\n\nImportantly, the `.resin` (or `.balena`) folder and all files and subfolders in it (including the secrets) are removed by the builders and thus NOT included in the final built image.\n\n\n**Build variables**\n\nThis is also a feature implemented by Cameron and described in the same GitHub Gist linked above. Briefly, it allows name-value pairs to be specified in the `.resin/resin.yml` (or `.balena/balena.yml`) file and then accessed during the build through the Dockerfile ARG instruction. \n\nAn important point about the build variables feature is that it is NOT meant to hold secrets like keys and passwords, because the Dockerfile ARG instruction is saved in the final image and can be inspected through the `docker history` command. The [Dockerfile documentation for the ARG instruction](https://docs.docker.com/engine/reference/builder/#arg) warns:\n\n> _**Warning:** It is not recommended to use build-time variables for passing secrets like github keys, user credentials etc. Build-time variable values are visible to any user of the image with the `docker history` command._\n\nThe reason for emphasizing this is that the build variables feature is described to users in the context of build secrets and in the same Gist page, so some users may be inadvertently led to design solutions where they place secrets in build variables, and then share the resulting images with untrusted third parties (like in the public Docker Hub). I have added a comment to the the Gist page, but it's good to point this out to users in pertinent support interactions.\n\n\n**Private docker registry authentication**\n\nThis feature was implemented by Paulo in Q4 2018 for the `balena push` command, and extended to the `balena build` and `balena deploy` commands in Feb 2019. ***Full feature support requires CLI version 9.14.1 or later.*** It allows a user to pull base images from a private docker registry that requires a password to be accessed, for example:\n\n```\n# Dockerfile\nFROM my-private-registry.com/my-private-image\n```\n\n```\n# docker-compose.yml\nversion: '2'\nservices:\n  secretservice:\n    image: my-private-reg.com/my-secret-image\n```\n\nUsernames and passwords should be added to a JSON or YAML file and specified through the `--registry-secrets` command-line option to the push / build / deploy CLI commands:\n\n```\n$ balena push test_app -s . --registry-secrets my_registry_secrets.yml\n...\n\n$ balena help push\n...\nThe --registry-secrets option specifies a JSON or YAML file containing private\nDocker registry usernames and passwords to be used when pulling base images.\nSample registry-secrets YAML file:\n\n\t'my-registry-server.com:25000':\n\t\tusername: ann\n\t\tpassword: hunter2\n\t'':  # Use the empty string to refer to the Docker Hub\n\t\tusername: mike\n\t\tpassword: cze14\n\t'eu.gcr.io':  # Google Container Registry\n\t\tusername: '_json_key'\n\t\tpassword: '{escaped contents of the GCR keyfile.json file}'\n```\n\nDocumentation for the CLI commands (and the `--registry-secrets` option) is also available on this page:\nhttps://www.balena.io/docs/reference/cli/\n\n_Note: a limitation regarding the docker-compose 'image' instruction was solved in Feb 2019 and no longer applies._\n\n\n**Docker's (18.09) own \"build secret information\" feature**\n\nRelease 18.09 of Docker introduced their own \"build secret information\" feature:\n\nhttps://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information\n\nIt uses a \"docker build --secret\" command-line option. Conceptually, it achieves something quite similar as balena's beta build secrets feature, but some implementation details and the interface (command-line options) are ***not*** compatible with balena's build secrets feature. We intend to achieve compatibility and work is planned for it: https://github.com/balena-io/balena-cli/issues/1063\n\n\n***Current production support for balena-cli and git-push commands***\n\n**Private docker registry authentication support**\n\n```\n ------------------------------------------------------------------------------------------------\n|    Command     | Cloud   | Laptop | Balena | Notes                                             |\n|                | builder | docker | device |                                                   |\n|----------------|---------|--------|--------|---------------------------------------------------|\n| git push       |   No    |   N/A  |   N/A  | Customers should be advised that `balena push` is |\n| balena push    |   Yes   |   Yes  |   Yes  | a drop-in replacement for `git push`.  `git push` |\n|                |         |        |        | support is planned for the long term, through a   |\n|                |         |        |        | cloud secrets store.                              |\n| balena build   |   N/A   |   Yes  |   Yes  | Requires balena CLI v9.14.1 or later              |\n| balena deploy  |   Yes   |   Yes  |   Yes  | Requires balena CLI v9.14.1 or later              |\n ------------------------------------------------------------------------------------------------\n```\n\n**Build secrets** and **Build variables** support\n\n```\n ------------------------------------------------------------------------------------------\n|    Command     | Cloud   | Laptop | Balena | Notes                                       |\n|                | builder | docker | device |                                             |\n|----------------|---------|--------|--------|---------------------------------------------|\n| git push       |   Yes   |   N/A  |   N/A  | Requires 'git commit' of secrets (not good) |\n| balena push    |   Yes   |   No   |   No   | Does not require 'git commit' of secrets    |\n| balena build   |   N/A   |   No   |   No   |                                             |\n| balena deploy  |   No    |   No   |   No   |                                             |\n ------------------------------------------------------------------------------------------\n```\n\n**Docker 18.09 \"build secret information\" (docker build --secret) support**\n\n```\n --------------------------------------------\n|    Command     | Cloud   | Laptop | Balena |\n|                | builder | docker | device |\n|----------------|---------|--------|--------|\n| git push       |   No    |   N/A  |   N/A  |\n| balena push    |   No    |   No   |   No   |\n| balena build   |   N/A   |   No   |   No   |\n| balena deploy  |   No    |   No   |   No   |\n --------------------------------------------\n```\n",
        "severity": "low"
      },
      "name": "Build secrets and variables (\"Cameron's Gist\", private registry authentication)",
      "slug": "support-issue-uild-secrets-and-variables-ameron-s-ist-private-registry-authentication-cc4eef5e-5d32-43ec-8540-5719e2f76ad7",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-12T11:13:06.778Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "7b57aa47-8d2f-46fd-b166-5381dc733374",
      "data": {
        "Problem": "Devices run low in space, and often several components of the device (e.g. the application, or balena engine) fail with errors related to insufficient space. For instance, you may see `no space left on device` errors when downloading new container. An example of error messages that are encountered in the logs is:\n\n```\nFailed to start application 'registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746' due to '(HTTP code 404) no such image - no such image: registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746: No such image: registry2.resin.io/v2/24459e995dd95f14f8e428209e4d8746:latest\nFailed to download application 'registry2.resin.io/v2/5b05d6a9f91cce28262265aa3b3833f7' due to 'failed to register layer: Error processing tar file(exit status 1): write /usr/lib/jvm/jdk-8-oracle-arm32-vfp-hflt/src.zip: no space left on device'\n```\n\nThis situation has two possible causes:\n\n### Cause 1: User error\n\nThe first thing we should check for, is if the diffs folder is filling up due to a misbehaving container, which in many case is because of a user error. In order to do this, please follow these steps:\n\n- When you go in the `/mnt/data/docker/aufs/diff` directory, there are a few directories that are suffixed with `-init`\n-For every `-init` layer, there is also a corresponding layer with the same uuid but without the `-init` suffix. Those are the writeable container layers\n- If you run `du -sh *` in the `diff` directory and see that those directories are the bulk of the size, then some container is leaking storage.\n- Then, you can use trial and error to find which container it was specifically.\n\nExample: An application container has mount script, which attempts to mount an sd card at /sd (most likely, to write application data). The mount operation failed in a single device that belonged to a fleet of identical devices (which were also running the same app release), but the application code started writing data anyway. As a result, all the data ended up in the container's filesystem, which caused `/mnt/data/docker/aufs/diff` to fill up. Check an example case here: [https://forums.resin.io/t/mnt-data-docker-aufs-diff-is-full/3271/16](https://forums.resin.io/t/mnt-data-docker-aufs-diff-is-full/3271/16)\n\n### Cause 2: Possible balena directory corruption, related to dangling diff containers\n\n**If the investigation didn't determine a user error, we should keep an eye for possible balena issues, so please bring the support thread to the attention of the OS team.**\n",
        "Solution": "First of all, make sure that we've let the user know if this is an error from their side (e.g. failing mount script, as described above)\n\n\nYou can perform a full [docker clean up](https://resin-io.github.io/scratchpad/#5d93f760-3736-11e8-96e2-4fde4c6f937d-solution)\n\n```\nsystemctl stop resin-supervisor\nsystemctl stop balena\nrm -rf /var/lib/docker/{aufs,overlay,containers,image,tmp}\nsystemctl start balena\nupdate-resin-supervisor\n```\n\n#### INCORRECT solution\n\nThis change was also proposed, but **seems dangerous, and do not use!!** Saving here for future review\n\nIn either case, in order to clean up balena space and bring the device back to a running state, you can do:\n\n```\nsystemctl stop resin-supervisor\nbalena rm -vf $(balena ps -a -q)\nsystemctl stop balena\nrm -rf /var/lib/docker/aufs/diff\nsystemctl start balena\nsystemctl restart resin-supervisor\n```\n\nThat should clean up all the leftover diffs. If, after trying this method, you get errors like\n\n```\nopt_add:832:balenad[3650]: lookup failed /var/lib/docker/aufs/diff/243a4da8471aac8a2773b0e201d491178c051f58d674024a72c6326c481a13bb (-2))\n```",
        "severity": "low"
      },
      "name": "/mnt/data/docker/aufs/diff is full",
      "slug": "scratchpad-entry-2759bab1-a57c-4d1d-a653-d821d49170ed",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-09-17T16:38:04.441Z",
        "support issue has attached support thread": "2020-08-03T16:47:51.325Z"
      },
      "created_at": "2019-03-01T17:59:56.553Z",
      "updated_at": "2019-09-17T16:38:04.384Z",
      "capabilities": []
    },
    {
      "id": "debd21e9-da99-4a81-bb92-bafbe49ab6cc",
      "data": {
        "inbox": "S/Paid_Support",
        "status": "open"
      },
      "name": "cardName",
      "slug": "support-issue-cardname-30fe2d74-91d9-4735-8a76-21247d9a2099",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-11-29T10:41:02.935Z"
      },
      "created_at": "2019-11-29T10:41:02.804Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "5ae8a384-bfd9-4163-94b2-c90eab2f2a74",
      "data": {
        "Problem": "User signs up to balena using a mailing list address or similar (maybe university email) and the welcome email gets rejected by an automatic response. ",
        "Solution": "No action needs to be taken. Close the ticket explaining this situation. ",
        "category": "mailing, signup, email, autoresponse",
        "severity": "low"
      },
      "name": "Mailing list automatic responses to balena signup welcome email",
      "slug": "support-issue-mailing-list-automatic-responses-to-balena-signup-welcome-email-c91e6902-32e3-46d0-87d6-23035a8ebcce",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-02-20T19:00:08.390Z"
      },
      "created_at": "2020-02-20T19:00:08.248Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1aafe99d-7fe9-41cf-a1b9-e9311028f3f9",
      "data": {
        "Problem": "There are two main reasons why users want to change their username:\n\n1. They are not happy with the username that has been auto-assigned to them\n2. They want to transfer the account to a third party. The mechanism to transfer accounts is still a WIP and the current workaround involves changing the username of the original owner (more details in the solution section)\n\nThe API endpoint that enables username changes is not surfaced/advertised to the users because it had some mixpanel/analytics related issues",
        "Solution": "**Update (2019-07-04): for most cases when transferring between two users, just transferring the application ownership can be enough. Refer to [this issue](https://jel.ly.fish/1e8d65d7-ef77-48c7-a851-a003417215c3) for more information on how to transfer applications between the two users.**\n\nFor username changes related to account transfers, three stakeholders are involved: the user, the support agent and the sales team. For simple username change requests that are not tied to account transfers you can skip to the support agent part, step 2.\n\n**The user** will have to change a few account preferences from their side, as they can be summarized from the canned response:\n\n```\nTo hand over your account we will first need you to clarify whether we should remove the current billing information from it, or if it should be transferred to the new owner. Not removing them will mean that the same credit card/bank/paypal account will continue to be charged after transferring the account.\n\nAfter we complete this step on our side, you will need to change the following properties of the account to reflect the new owner by visiting https://dashboard.resin.io/preferences/details :\n\n1. Change the email of the account\n2. Change Profile details (First name, Last name, company)\n3. Remove your SSH keys (the new owner can add new ones later on)\n4. Disable 2FA (this will have to be re-enabled by the new account owner)\n5. Change account password\n\nAfter changing these properties, we will change the username of the account to the new username for you, because this cannot be performed from the dashboard.\n\nThe last step, after we change the username, is for you to hand over the credentials (username and password) to the new account owner. Then, they can review the information in https://dashboard.resin.io/preferences/details (e.g. Profile information and email address), set another password and re-enable 2FA. Our sales team will handle updating the billing information to match new account owner as well.\n\nIf you need more help with this process we will be happy to help you.\n\n```\n\n**The sales team** will have to:\n* remove the current billing info (credit card/bank account/paypal) except if the user wants to preserve them after the transfer\n* update the billing account info (company name, address etc) in the respective Recurly account to reflect the new owner of the account (or create a new Recurly account if the new username represents a completely new customer)\n\nFinally, the **support agent** will then have to perform these actions:\n\n1. [Optional, for account transfers] If the user account is linked to a social account (e.g. github) the account must be unlinked by performing\n\n```\nGet the ID with:\n\ncurl -X GET -H 'Authorization: Bearer <accountJWT>' https://api.resin.io/v4/social_service_account\n\nThe response of this request is similar to {\"d\":[{\"__metadata\":{\"uri\":\"/resin/social_service_account(4524)\",\"type\":\"\"}}]} , where '4524' is the required ID.\n\n\nDelete the associated resource with:\n\ncurl -X DELETE -H 'Authorization: Bearer <JWT>' https://api.resin.io/v4/social_service_account\\(<ID>\\)\n```\n\n2. Change the username with\n\n```\n#!/bin/bash\n\nTOKEN='jwtAuthToken' #Auth token from user preferences page\n\ncurl 'https://api.resin.io/user/username' \\\n    -X PATCH \\\n    -H \"Authorization: Bearer $TOKEN\" \\\n    -H 'Content-Type: application/json;charset=UTF-8' \\\n    --data-binary '{\"username\":\"newUsername\"}' \\\n    --compressed\n```\n\n\n- See: https://www.flowdock.com/app/rulemotion/user_happiness/threads/8POp8GVOBWPbzW4icrS8OUmsKPq\n- See: https://www.flowdock.com/app/rulemotion/resin-devops/threads/rRpspQBO_WN-efIHBU8YTkK209g\n",
        "severity": "low"
      },
      "name": "User wants to change their username or transfer their account",
      "slug": "scratchpad-entry-1aafe99d-7fe9-41cf-a1b9-e9311028f3f9",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-04T23:48:12.519Z"
      },
      "created_at": "2019-03-01T17:59:56.480Z",
      "updated_at": "2019-07-04T23:48:12.403Z",
      "capabilities": []
    },
    {
      "id": "1e8d65d7-ef77-48c7-a851-a003417215c3",
      "data": {
        "Problem": "As in [the issue about account transfers](https://jel.ly.fish/1aafe99d-7fe9-41cf-a1b9-e9311028f3f9) and [the one about transferring device ownership](https://jel.ly.fish/b66b6eab-40ae-4723-b605-923337f4b967) there are cases when a user wants to transfer all of their apps to someone else. Now that we have a \"Transfer application\" feature, there is generally no need to do the full account transfer/rename. The transfer of device ownership described in [the device transfer issue](https://jel.ly.fish/b66b6eab-40ae-4723-b605-923337f4b967) might still be useful if the user has legacy devices, if they want to remove the old account owner from the team members. But for all other cases, transferring app ownership should be enough to give control of a group of devices to a new user.",
        "Solution": "Keep in mind that, to this date (July 4th 2019), only the user that has a billing plan associated to their account should own applications. This means that before transferring the apps, support agents should let the user know about this condition, and contact the customer success team to change the subscription details in the Admin panel and Recurly to point to the new username. This will change once new organizations features are released, so if in doubt please check with the customer success team to see if this is still the case.\n\nIf there’s only one or few apps, the user can usually do the transfer themselves following the steps described in [the docs](https://www.balena.io/docs/learn/manage/actions/#transfer-application-ownership)\n\nIf there’s many applications, [this script in GitHub](https://github.com/balena-io-playground/balena-app-ownership-transfer) can be a useful way to speed up the process. It requires auth tokens for the source and target users, which can be obtained by an admin using the “login as” feature of the admin panel, or by the users themselves providing them through a secure channel. **Make sure to get consent from both users before proceeding to do the transfer**.\n\nTo use that script, just clone the repo, get the two tokens, then run this (optionally setting `export DRY_RUN=true` first to see what the script will do before doing it):\n\n```\nexport SOURCE_TOKEN=<token from the source user that currently owns the apps>\nexport TARGET_TOKEN=<token from the target user account>\nnode transfer-apps.js\n```",
        "severity": "low"
      },
      "name": "Transfer applications to another user",
      "slug": "support-issue-transfer-applications-to-another-user-dad314fc-0d4e-470e-ba7e-f3482a1a7014",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2019-07-04T23:46:24.330Z"
      },
      "created_at": "2019-07-04T23:46:24.286Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1569d495-2987-4e9e-9771-e85c55b7892e",
      "data": {
        "Problem": "Given the new application types, users often have questions about the limits and billing. The following canned response can be useful:",
        "Solution": "Hi there, the current limitation is on total devices, so the Prototype plan is limited to 20 total devices (not including any devices in Starter apps - you always have 10 free Starter devices).\n\nWe don't currently enforce hard limits on the plans in the dashboard, though that will be changing as we introduce automated billing for devices in the next few months (we'll give you plenty of warning before that happens). For now, if you go over the limit, we'll reach out and ask you to increase your plan, or you can go ahead and increase your plan directly from the billing page in the dashboard.\n```\nWhen we introduce automated billing, we will also be introducing a feature that will allow you to \"deactivate\" devices for a small fee. We would not count these towards your device total. This is meant for offline devices that are, for example, sitting in a warehouse waiting to be sent to customers. They will reactive the moment they come online again.\n\nIn the meantime, if you have any truly \"inactive\" devices that we shouldn't count towards your total, such as the warehouse example above, let us know, and we can come up with a solution.\n\nLet us know if you'd like to set up time to talk with our team about upgrading your plan! Happy to chat in more detail.\n```"
      },
      "name": "Billing queries",
      "slug": "scratchpad-entry-1569d495-2987-4e9e-9771-e85c55b7892e",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.432Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "15f59a51-d5ab-44ed-8ac6-390d2d796c58",
      "data": {
        "Solution": "`registry.resin.io/<app name>/<commit>`"
      },
      "name": "What is the registry image name format?",
      "slug": "scratchpad-entry-15f59a51-d5ab-44ed-8ac6-390d2d796c58",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.438Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "161439e5-54b4-407b-9e97-785c5ae15f0b",
      "data": {
        "Solution": "It can be useful, especially when working around the git/qemu issue, to be able to manually add npm modules to a project rather than npm install them which might invoke git clone. The steps are as follows:\n\n1. Enter the vendor module parent directory (where its package.json file is)\n2. Run [npm pack](https://docs.npmjs.com/cli/pack) to create a tarball (e.g. private-module-1.0.0.tgz)\n3. Copy the .tgz file in a folder in your resin project (e.g. vendor/private-module-1.0.0.tgz)\n4. Run 'npm install --save vendor/private-module-1.0.0.tgz'\n5.Include the `vendor/` folder in your application docker image by using the following `COPY` Dockerfile instruction:\n```\nCOPY vendor ./vendor\n```\nThis `COPY` command must precede the 'npm install' `RUN` Dockerfile instruction.\n6. 'git add/commit' the vendor/ directory, the updated package.json and the Dockerfile of your application.\n7. Run 'git push resin master' to initiate the build."
      },
      "name": "Use npm vendor (i.e. local) modules",
      "slug": "scratchpad-entry-161439e5-54b4-407b-9e97-785c5ae15f0b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.445Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "176be17a-7602-46d2-8803-b2e9def57d18",
      "data": {
        "Solution": "At the moment each application is tied to a specific device type. So, for example, if you have created an application by specifying an Rpi2 device, then only Rpi2 devices will be able to join this application's fleet.\n\nHowever, you can easily add multiple remotes to your git repository, each pointing to a different resin.io application. You can then use `Dockerfile.template`s (http://docs.resin.io/deployment/docker-templates/) to keep a single codebase and push to multiple device types."
      },
      "name": "Is it possible to have different device types in an application / Is it possible to keep a single codebase between applications?",
      "slug": "scratchpad-entry-176be17a-7602-46d2-8803-b2e9def57d18",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.457Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1a8f7adb-2549-49a3-adf5-cbda869a7597",
      "data": {
        "Problem": "1. `/dev` is missing device files the user expects to see.\n2. Alternatively, a **library** that relies on a `/dev` file fails reporting a missing file error or perhaps something more general about the device not being available.\n\n__Important Note:__ this is obsolete since we trigger udevd, but this issue may be encountered in custom base images, or if users are use non-resin base images in general.",
        "Solution": "Simply execute the udev (https://en.wikipedia.org/wiki/Udev) daemon inside the container and use `udevadm trigger` (http://linux.die.net/man/8/udevadm) to replay the udev events which occurred on host OS startup to pick up any devices added on startup to the container's `/dev` directory, e.g.:-\n\n```\n#!/bin/bash\nmount -t devtmpfs none /dev\nudevd &\nudevadm trigger\n```"
      },
      "name": "Device files not populating in /dev a.k.a. Why isn't my device working?",
      "slug": "scratchpad-entry-1a8f7adb-2549-49a3-adf5-cbda869a7597",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.473Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1b9036f7-f2ad-4366-acb7-c08e47c6448d",
      "data": {
        "Problem": "Bluetooth device not available.",
        "Solution": "Run the following on startup:\n`hciconfig hci0 reset && hciconfig hci0 up`\nOn the Raspberry Pi 3 you can point them to this example project: https://github.com/resin-io-projects/rpi3-bluetooth\n"
      },
      "name": "Bluetooth not working",
      "slug": "scratchpad-entry-1b9036f7-f2ad-4366-acb7-c08e47c6448d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.501Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1d99e074-4c86-4eb8-af07-48cbca580537",
      "data": {
        "Solution": "The stream object resolved by [resin.models.os.download()](https://github.com/resin-io/resin-sdk/blob/master/DOCUMENTATION.md#resin.models.os.download) contains the original `node-request` response as a `.response` property. User can check the HTTP headers in `stream.response.headers` to determine the size, before deciding to pipe to a location."
      },
      "name": "Get image download size with the Resin SDK",
      "slug": "scratchpad-entry-1d99e074-4c86-4eb8-af07-48cbca580537",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.515Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1e2ad748-6868-458e-9098-1ee570b6f96f",
      "data": {
        "Solution": "Docker has a guide at https://docs.docker.com/articles/using_supervisord/ which gives a lot of detail on this. Ignore the `EXPOSE` part of the Dockerfile as by default all ports are exposed in resin containers.\n\nGenerally you need to copy in the supervisord configuration and then execute supervisord via the CMD:\n```\nCOPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf\nCMD [\"/usr/bin/supervisord\"]\n```"
      },
      "name": "Using supervisord",
      "slug": "scratchpad-entry-1e2ad748-6868-458e-9098-1ee570b6f96f",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.518Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "1e7a1a29-9429-401f-a17e-2bbca8298665",
      "data": {
        "Solution": "* Firstly install Fuse for OS X -https://osxfuse.github.io/.\n* Next, install fuse-ext2 (this covers ext3 also) - http://sourceforge.net/projects/fuse-ext2/.\n* Use the fuse-ext2 too to gain access to the boot-raspi partition (this is FAT) and a disk2s2 (or similar name) drive appear - this latter drive (well, partition) is what you need and you will be able to access whatever has been stored in /data in the /resin-data/[app id] directory."
      },
      "name": "Accessing EXT3 partitions (and /data) in OS X",
      "slug": "scratchpad-entry-1e7a1a29-9429-401f-a17e-2bbca8298665",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.525Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "21b18599-cc26-4a7a-8072-7d9f2795fdf1",
      "data": {
        "Problem": "Sometimes users keep a single thread to report many issues. The problem is that the threads grow to an unmanageable big size, have multiple github issues connected, and therefore makes the process very hard for both us an the user",
        "Solution": "Canned response(props to Sonya) to politely ask the user start a new thread:\n\n> If you have a new question, could you please [start a fresh email/create a new ticket/start a new Intercom thread] to us instead of replying to this thread? It helps us keep context of each issue separate (which we track with our support tool). We can see all of the messages, so you don't have to worry we won't know your context,"
      },
      "name": "Support thread has grown too big ( > 80-100 messages) with multiple issues reported",
      "slug": "scratchpad-entry-21b18599-cc26-4a7a-8072-7d9f2795fdf1",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.536Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3ec09c15-f33e-4b37-9c4b-7b8d20d9d28a",
      "data": {
        "Solution": "X will default to blanking the screen after a certain period of time. This is pertinent to graphical applications on devices which use X and can be disabled via:\n```\nxset -dpms\nxset s off\nxset s noblank\n```\nThe [Arch wiki article on DPMS](https://wiki.archlinux.org/index.php/Display_Power_Management_Signaling#Prevent_screen_from_turning_off) has more details on this!"
      },
      "name": "Disable screen blanking in X",
      "slug": "scratchpad-entry-3ec09c15-f33e-4b37-9c4b-7b8d20d9d28a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.633Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2409f7fb-0565-4d3e-b28a-34ffdf797694",
      "data": {
        "Solution": "Now this can be done via the CLI and the SDK also (from an [intercom conversation](https://app.intercom.io/a/apps/yg02r5dz/inbox/all/conversations/1382657966)):\n\nYou can install the tool with the following command (given that you have NodeJS and NPM installed):\n```\n$ npm install -g resin-cli\n```\nYou can check the version to confirm it was installed correctly (the device move command was introduced in v2.2.0, so make sure you're running the latest one!):\n```\n$ resin version\n```\nYou will need to log in to your account with the following command:\n```\n$ resin login\n```\nYou can try listing your applications to see you were logged in successfully:\n```\n$ resin apps\n```\nOnce everything it set up, you can move a device with the following command:\n```\n$ resin device move <uuid>\n```\nThe command will interactively prompt you to select an application that you own that matches the device type of the device you're trying to move.\n\nAlternatively, if you want to accomplish this programatically, this functionality was implemented on our NodeJS SDK as well (https://github.com/resin-io/resin-sdk).\n\nIf so, you can find extensive documentation in the following file: https://github.com/resin-io/resin-sdk/blob/master/DOCUMENTATION.md.\n\nThe one that you might be interested in is `resin.models.device.move()`: https://github.com/resin-io/resin-sdk/blob/master/DOCUMENTATION.md#resin.models.device.move."
      },
      "name": "CLI and SDK",
      "slug": "scratchpad-entry-2409f7fb-0565-4d3e-b28a-34ffdf797694",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.542Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "271d8aa8-25cb-4e96-8072-332a0b5460eb",
      "data": {
        "Problem": "Pushing an older commit results a working app but making a seemingly innocent change result a broken app.",
        "Solution": "When pushing the old working commit, the device will try to fetch a cached container from our registry (or some layers of it). So, the situation that the app runs when pushing an older commit but errors/loops with a new one, with seemingly innocent change, could be a sign that some of the dependencies that are installed/used got updated and might be responsible for the issue."
      },
      "name": "New app commit doesn't work",
      "slug": "scratchpad-entry-271d8aa8-25cb-4e96-8072-332a0b5460eb",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.546Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2739dff4-a746-45d0-bac3-119e17b1f4de",
      "data": {
        "Solution": "Set `RESIN_SUPERVISOR_LOG_CONTROL` env var to `false`, see https://resin.io/blog/device-bandwidthdata-usage-how-low-can-we-go/ for more details."
      },
      "name": "Disabling Logs",
      "slug": "scratchpad-entry-2739dff4-a746-45d0-bac3-119e17b1f4de",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.550Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2bab7b47-80a3-4173-b15f-3321181c2d86",
      "data": {
        "Problem": "On push user encounters the following error:\n\n`Error while processing push: Error: stat /var/lib/docker/btrfs/subvolumes/56d4f782ac53b2b3f858c0c64caaf31208a3be1552e57e864f10d5f7f41ce76f/app/package.json: not a directory`\nWhen running a statement like:\n\n`COPY package.json /app`",
        "Solution": "This is simply a terrible error message for a simple problem - the `COPY` command happily copies a file over the `/app` directory rather than in to it. The solution is simple:\n```\nCOPY package.json /app/\n```\n\nThe trailing slash forces Docker to recognise 'app' as a directory."
      },
      "name": "Dockerfile COPY fails with alarming btrfs subvolume error",
      "slug": "scratchpad-entry-2bab7b47-80a3-4173-b15f-3321181c2d86",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.565Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2c00a9a2-9a9d-4da1-8ee0-78ffd2e11b1a",
      "data": {
        "Problem": "Due to changes in the behaviour of the `read` tool, the `update-resin-supervisor` script does not work properly on some OS versions,",
        "Solution": "Need to patch `update-resin-supervisor` and then try to update:\n\n```\nsed 's/read tag image_name <<<$data/read tag <<<\"$(echo \"$data\" | head -n 1)\" ; read image_name <<<\"$(echo \"$data\" | tail -n 1)\"/' /usr/bin/update-resin-supervisor > /tmp/fixed-update-resin-supervisor && \\\nchmod +x /tmp/fixed-update-resin-supervisor && \\\nmount -o bind /tmp/fixed-update-resin-supervisor /usr/bin/update-resin-supervisor\n```\nafter which, running `update-resin-supervisor` will succeed, until the device is rebooted."
      },
      "name": "update-resin-supervisor cannot update the supervisor",
      "slug": "scratchpad-entry-2c00a9a2-9a9d-4da1-8ee0-78ffd2e11b1a",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.571Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2c9a0ab3-73bc-4a9c-84d6-9cb65bacfd87",
      "data": {
        "Problem": "Screen freezes when trying to run a GPU-accelerated application, this can include 2D accelerated applications or video playback as well as obviously 3D applications. Generally the app runs without error but as soon as it tries to show video/render something in 3D/etc. the image freezes and often all inputs appear to freeze too. Sometimes a few frames of playback/rendering will be displayed before the freeze occurs, but not always.",
        "Solution": "We've created a workaround for the underlying bug which causes this - in short, userland processes that use the GPU communicate with it ultimately via a messaging system called VCHIQ - this uses Process IDs (PIDs) to uniquely identify each 'service' associated with a given userland process, however under a PID namespace (which is established when a docker container is running), the PIDs as far as the kernel is concerned vs. as far as the container-run userland process is concerned vary, meaning that the messages do not get routed correctly. The fix adjusts the raspberry pi userland tools to use VCHIQ's own API for determining the global identifier and using that instead of the container namespaced one.\nBase images are now adjusted to include the fix and the patch is upstream."
      },
      "name": "EGL Bug/Screen freezes when using GPU-accelerated features",
      "slug": "scratchpad-entry-2c9a0ab3-73bc-4a9c-84d6-9cb65bacfd87",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.575Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2d198d79-5b7f-4a62-90c3-f42ebb33eb07",
      "data": {
        "Solution": "* https://github.com/lifeeth/ResinBeacon\n* https://github.com/craig-mulligan/re-eddy\n* https://github.com/lifeeth/ResinBeaconScanner"
      },
      "name": "Example iBeacon Projects",
      "slug": "scratchpad-entry-2d198d79-5b7f-4a62-90c3-f42ebb33eb07",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.582Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "2ee6a0ed-75b3-4080-a141-6681f84aa5be",
      "data": {
        "Solution": "The state endpoint can be queried using the following command:\n```\ncurl https://api.resin.io/device/v2/<uuid>/state?apikey=<deviceApiKey>\n```\n\nIf you don't have the api key for whatever reason you can add your admin key as a header bearer token too"
      },
      "name": "Query the state endpoint",
      "slug": "scratchpad-entry-2ee6a0ed-75b3-4080-a141-6681f84aa5be",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.586Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "35344d5f-398f-43ec-90aa-dd168e5b2a5d",
      "data": {
        "Solution": "The only data we **guarantee** to be persisted across reboot, shutdown and device update/container restart is the contents of the `/data` folder.\n\nHowever at the time of writing, when a device is restarted or power cycled the container is not recreated, meaning all the data that was present in the container's filesystem before, remains. There is a pull request changing that behaviour here: https://github.com/resin-io/resin-supervisor/pull/138\n\nIt's very important not to rely on this behaviour, as containers are recreated on application updates, when environment variables are changed in the UI or API, or when an application restart is requested."
      },
      "name": "Which data is persisted on devices across updates/power cycles?",
      "slug": "scratchpad-entry-35344d5f-398f-43ec-90aa-dd168e5b2a5d",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.590Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "363b920c-14cf-42c1-9f48-c3932ab4eec3",
      "data": {
        "Solution": "To enable separate displays (i.e. not mirrored) create a script `script.sh` and add the following, modifying parameters accordingly:\n```\nxrandr --output HDMI-0 --auto --primary --output DisplayPort-0 --auto --left-of HDMI-0\n<command to run your application>\n```\nIn your Dockerfile specify this script as part of your CMD:\n```\nCMD [\"xinit\", \"./script.sh\"]\n```"
      },
      "name": "Multiple displays support",
      "slug": "scratchpad-entry-363b920c-14cf-42c1-9f48-c3932ab4eec3",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.595Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3c10288b-0c88-49b7-9ee0-cd582103f1ed",
      "data": {
        "Solution": "We currently use qemu to emulate and compile packages for device type architecture. Unfortunately there are some known bugs that cause qemu to hang, one of them being git clone, how ever there are a few other edge cases that can hang up qemu. We are currently working on moving our build servers onto arm servers which would mean we wouldn't have to use qemu, which would mitigate these issues."
      },
      "name": "Build Hanging",
      "slug": "scratchpad-entry-3c10288b-0c88-49b7-9ee0-cd582103f1ed",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.605Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3c2d497a-5964-4c02-b212-b8281e4e2a87",
      "data": {
        "Problem": "For debugging networking issues it is often needed to enable verbose logging level for `NetworkManager`. Provided is a solution that elevates the logging level and collects the NetworkManager logs in the data partition of the device. It persists across device reboots.",
        "Solution": "Install the NetworkManager Debug Logs Collector script: https://github.com/resin-io-playground/nm-debug-logs"
      },
      "name": "NetworkManager debug logs",
      "slug": "scratchpad-entry-3c2d497a-5964-4c02-b212-b8281e4e2a87",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.610Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3c33dfc4-082b-46a7-a548-ac0899980728",
      "data": {
        "Problem": "Bugs in the API deletion system exist where when a device is moved, leftover `image_install` resources will be present, which stops the application being deleted due to foreign key constraints.\n\nThis should be fixed soon, but a solution is documented below.",
        "Solution": "Open up the javascript console on the dashboard, make a note of the application ID\n\nRun the following: \n\n```\n> id = <appID>\n> sdk.pine.get({ \n\tresource: 'release', \n\toptions: { \n\t\t$filter: { \n\t\t\tbelongs_to__application: id \n\t\t}, \n\t\t$expand: { \n\t\t\tprovides__image_install: { \n\t\t\t\t$select: 'id' \n\t\t\t} \n\t\t} \n\t}\n})\n.then((releases) => {\n\treturn releases.map((r) => r.provides__image_install);\n})\n.then(_.flatten).then(console.log)\n\nsdk.pine.get({ \n\tresource: 'release', \n\toptions: { \n\t\t$filter: { \n\t\t\tbelongs_to__application: id \n\t\t}, \n\t\t$expand: { \n\t\t\tprovides__image_install: { \n\t\t\t\t$select: 'id' \n\t\t\t} \n\t\t} \n\t}\n})\n.then((releases) => {\n\treturn releases.map((r) => r.provides__image_install);\n})\n.then(_.flatten)\n.then((iis) => { \n\treturn Promise.all(iis.map((ii) => sdk.pine.delete({ resource: 'image_install', id: ii.id }) )) \n})\n.then(() => console.log('done'))\n```\n"
      },
      "name": "App cannot be deleted",
      "slug": "scratchpad-entry-3c33dfc4-082b-46a7-a548-ac0899980728",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.614Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3f17da16-38d8-4261-88fe-ba7baa4c7044",
      "data": {
        "Solution": "There are cases where a user would like to update their OS or supervisor agent, but want to keep the UUID of their device(s) the same as it currently is. This can be achieved fairly easily. All they need do is:\n\n1. download a new OS\n2. extract the config.json out from the current SD card ( not sure how this would be achieved on eMMC based devices)\n* In the config.json there are three fields that are device specific: deviceId, uuid and registered_at\n*these are what identify the device on resin.io\n3. if the user copies either just those 3 fields or the entire config.json the device with the new hostOS will join the fleet as the device with the same UUID."
      },
      "name": "Provision a new device, but keeping the same UUID",
      "slug": "scratchpad-entry-3f17da16-38d8-4261-88fe-ba7baa4c7044",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.636Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "3fc58bf0-4f9a-4278-9c8f-7c4257c85a02",
      "data": {
        "Problem": "Build gets stuck for ages and the output just repeats `\"still working...\"` over and over. Usually this is during an NPM install or RUN git clone step.",
        "Solution": "Refer to the two canned responses below:canned responses below:\nTODO: add links here.\n* Use npm vendor (i.e. local) modules\n* User wants to git clone from Github, but build keeps hanging"
      },
      "name": "Build Hangs and Never completes",
      "slug": "scratchpad-entry-3fc58bf0-4f9a-4278-9c8f-7c4257c85a02",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.643Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4018788f-1c9b-4718-bdc4-ff3b9abaf620",
      "data": {
        "Solution": "The user's specific settings will vary, but the following gives a general case:\n```\nName=<ssid name>\nEAP=peap\nIdentity=<login>\nPassphrase=<pass phrase>\nPhase2=MSCHAPV2\n```\nNote that the 'Phase2' setting will vary depending on the network. See the references below for more details on these settings. Also see this [intercom thread](https://app.intercom.io/a/apps/yg02r5dz/inbox/conversation/1844228437) for a case where settings were applied successfully.\n\nIn order to set this, you'll need to modify your config.json file either inside the device image, or on the SD card once mounted (we are going to add the ability to specify this before image download too.)\nIf you follow the steps for setting a static IP at http://docs.resin.io/#/pages/deployment/wifi.md#set-static-ip then, rather than locating the ethernet configuration, find the wifi one and adjust the entry to use these settings everything should work correctly.\n\nKeep in mind this string is JSON-encoded, and it's important to insert '\\n's as needed, also note that connman key values are case-sensitive.\n**Refs:** See the [Arch Wiki](https://wiki.archlinux.org/index.php/WPA2_Enterprise#connman) page on this, and [this page](https://github.com/aldebaran/connman/blob/master/doc/config-format.txt) is also useful. Connman seem to not like to explain their settings very clearly"
      },
      "name": "User wants to use WPA Enterprise",
      "slug": "scratchpad-entry-4018788f-1c9b-4718-bdc4-ff3b9abaf620",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.651Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "403b6f62-c4fe-4bce-9726-6e77460ea514",
      "data": {
        "Problem": "In terminal during git push:\n\n```\n-----> Uploading image to registry...\nRetrying due to 'Error: HTTP code 409 while uploading metadata: \"{\\\"error\\\": \\\"Cannot set this image checksum\\\"}\"'\n       Image uploaded successfully\n```\n\nOn device during image download:\n\n```\nServer error: 400 trying to fetch remote history for 89839ddbec51e95ea4f4659c91f1efd7ad357c9760153fd5033fb4f7d7dc6dc7\n```",
        "Solution": "None. This is a known issue with registry v1, solved in v2. Fixing in v1 is\nnon-trivial to the point of not being worth it."
      },
      "name": "409 While Uploading Metadata",
      "slug": "scratchpad-entry-403b6f62-c4fe-4bce-9726-6e77460ea514",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.660Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "41689a7f-21de-4173-a4c9-bc8e3d9a8d88",
      "data": {
        "Solution": "Since ResinOS 1.2.1 we have docker 1.10.3 on the device, the docker pull of layers now happen in parallel which is great, but sometime if a power cut or something interupts it the device gets into an ugly state with the following error:\n```\n28.06.16 18:46:00 +0100 Failed to download application 'registry.resin.io/figurestandalone/ae57b59a3304f4b4bb58f69cf0052d754bc8c6cd' due to 'Error pulling image (latest) from registry.resin.io/figurestandalone/ae57b59a3304f4b4bb58f69cf0052d754bc8c6cd, failed to register layer: rename /var/lib/docker/image/btrfs/layerdb/tmp/layer-710701705 /var/lib/docker/image/btrfs/layerdb/sha256/61baa2539f1a2255c8cebe9ab6ba2ab9228a96a060e2cad7cde63268d5a2f38b: directory not empty'\n```\n\nThis can be treated by first running:\n```\ndu --exclude=tar-split.json.gz -s /var/lib/docker/image/btrfs/layerdb/sha256/* | grep '^0'\n```\nit finds all directories in `/var/lib/docker/image/btrfs/layerdb/sha256/` that have a total size of `0`. This is just to check. We can now delete them using:\n```\nrm -rf $(du --exclude=tar-split.json.gz -s /var/lib/docker/image/btrfs/layerdb/sha256/* | grep '^0' | cut -f2)\n```"
      },
      "name": "Failed to register layer: rename, directory not empty",
      "slug": "scratchpad-entry-41689a7f-21de-4173-a4c9-bc8e3d9a8d88",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.667Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "84872636-a37c-4235-9adf-5a6c761743b0",
      "data": {
        "Solution": "We save the environment variables in `/etc/docker.env`.\n\nIf users want to inherit the environment variables in the custom systemd service, we need to add this line to systemd service file.\n```\nEnvironmentFile=/etc/docker.env\n```"
      },
      "name": "Pass environment variables to custom systemd service",
      "slug": "scratchpad-entry-84872636-a37c-4235-9adf-5a6c761743b0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.898Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "43d0a4a1-1f4c-44ae-a5e4-555c90adf47b",
      "data": {
        "Problem": "Dashboard v1.80 no longer exposes the DeviceID and only shows the Device UUID.",
        "Solution": "We should update most of our components to use the device UUID but until we are 100% ready, suggest the user to use the CLI, SDK or API directly.\nEg:\n> In the meantime, the best thing I can propose is to use the resin-CLI to retrieve the device ID.\nSpecifically `$ resin device <deviceUuid>` should retrieve all the device information.\nAdditionally, let me share with you a link to the respective documentation page of the CLI: https://docs.resin.io/tools/cli/#device-60-uuid-62-\n> \n> An alternative would be to use the API directly to retrieve the same information like this: \n`curl \"https://api.resin.io/v1/device?\\$filter=uuid%20eq%20'<the_device_uuid>'\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer <your_auth_token>\"`\n> Here is also the documentation page for our API https://docs.resin.io/runtime/data-api/"
      },
      "name": "User want's to find the Device ID",
      "slug": "scratchpad-entry-43d0a4a1-1f4c-44ae-a5e4-555c90adf47b",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.678Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "43e13d74-9d0c-461f-80ef-fe9f5bdad508",
      "data": {
        "Solution": "**WARNING**: This was encountered during experimental work on the ubuntu-supervisor,\nand should not be applied to a customer's device without talking to the device/supervisor\nteams.\n\nWe used to bind-mount the Docker socket in on `/run/docker.sock`, but at some point\nswitched to `/var/run/docker.sock`. This can cause problems with deltas depending on\nthe library version in use.\n\nSample output:\n\n```\n17.11.16 15:52:54 [-0800] Failed to download application 'registry.resin.io/jenkinsgateway/<hash>' due to 'connect ENOENT /var/run/docker.sock'\n```\n\nSolution(s):\n\n* Change the bind-mount to the newer version (`/var/run/docker.sock`)\n* OR: Try symlinking the socket inside the supervisor\n\n**"
      },
      "name": "ENOENT on docker.sock",
      "slug": "scratchpad-entry-43e13d74-9d0c-461f-80ef-fe9f5bdad508",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.683Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4647462c-d5e8-400e-bb8e-76cfa9a321e3",
      "data": {
        "Problem": "Device logs error:\n\n> Failed to download application 'registry.resin.io/appname/commithash' due to 'Error pulling image (latest) from registry.resin.io/appname/commithash, HTTP code 400'.\n\nThis appears on devices that pull from registry 1, meaning all device having resinOS <1.26 and all pre-release resinOS 2 (for example 2.0.0-rc6).",
        "Solution": "Steps to fix:\n\n```\ndocker pull registry2.resin.io/$appName/$commit\ndocker tag registry2.resin.io/$appName/$commit registry.resin.io/$appName/$commit\ndocker push registry.resin.io/$appName/$commit\n```\n\n(step 3 requires login to our registry, which unless you're Page won't have access to, but you can run steps 1 and 2 only on the device and it should work).\n\nAlso, make sure to convey to the user that they should upgrade resinOS to at least 1.26, in order to get a newer docker that will pull from registry v2.\n\nPossible source of the issue is our builders to fail to push to one of the two Docker registries, while succeed with the other, and so they report success to our API.\n"
      },
      "name": "Fixing http code 400 when pulling",
      "slug": "scratchpad-entry-4647462c-d5e8-400e-bb8e-76cfa9a321e3",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.693Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4c75fe88-adbd-4c55-8c04-e95be1609670",
      "data": {
        "Problem": "",
        "Solution": "⚠️**THIS ENTRY IS NOW OUTDATED**⚠️\n\nUse the setup described at [\"Accessing User Accounts\" doc](https://github.com/resin-io/process/blob/master/process/support/accessing_user_accounts_and_devices.md)\n\nDo not use the method below, as not going to work, due to scaled VPN.\n\n***\n\n\n1. Add your SSH key to [resin-ssh-keys\n   project](https://github.com/resin-io/resin-ssh-keys), at\n   `systemd/services/add_ssh_keys_[your_flowdock_handle].service`, using one of the\n   existing files as a template.\n2. Add an ExecStart line in `add_ssh_keys.service`\n   (located in the same directory), using another line as a template.\n3. PR these changes, have them merged in and ask the appropriate people (currently Jack) to deploy\n   them to the server,\n4. Grab the key files from `resin-containers` at\n   `cloud_formation/ssh/resin_devices*` and copy them to your `~/.ssh` folder.\n   This key is password-protected, and the key is available from passpack. Ask @apostolism\n   for access.\n\n1. Make sure your ssh agent knows about the key you've added to the resin-containers `cloud_formation/systemd/services` folder, if it isn't your default key, by running:\n\n  ```\n  ssh-add /path/to/private/key\n  ```\n\n2. Find the UUID of the device you want to access.\n3. Ensure the key is loaded into your ssh agent by running `ssh-add ~/.ssh/resin_devices`.\n  * If you are on mac, the old ssh installed will fail on the previous step complaining of a bad keyphrase even if it's correct. To get around this update your version:\n\n    ```\n    brew install homebrew/dupes/openssh\n    ```\n\n    This will install binaries into `/usr/local/bin`, symlinked into entries in `/usr/Cellar/openssh/[version]/bin`.\n    As of 16th December 2015, the version installed by default in /usr/bin/ssh is OpenSSH_6.9p1, LibreSSL 2.1.8 - this is the version that *does not work*.\n\n    After installing via openssh, /usr/local/bin/ssh reports version OpenSSH_7.1p1, OpenSSL 1.0.2e 3 Dec 2015. To determine version run `ssh -V`, and if you want to compare between these locations specify the whole path, e.g. `/usr/local/bin/ssh -V` (this will be what 'ssh' defaults unless your path has been edited unusually.)\n\n    You may need to look at how ssh-agent starts/runs but experiments locally suggest it works out of the box .\n\n    Another issue with ssh on mac is that the ssh-agent sometimes refuses to use the correct key if many keys are already loaded (ssh-add -l shows a list). Temporarily removing some keys (with ssd-add -d <key>) until there are only a few left (3 or 4, maybe less) mitigates the problem. When this problem arises, even forcing a specific key with the '-i' option will not work. This issue has been seen in version OpenSSH_7.1p2, OpenSSL 1.0.2e 3 Dec 2015.\n\n5. Set up aliases in ~/.ssh/config as follows:\n\n  ```\n  Host resin\n    User root\n    Port 22222\n    ProxyCommand ssh -A core@manager.resin.io 'ssh $(fleetctl list-machines | grep vpn | head -n 1 | cut -f 2) \"sudo nsenter --target \\$(docker inspect --format {{.State.Pid}} resin-vpn) --mount --net nc %h %p\"'\n    StrictHostKeyChecking no\n    UserKnownHostsFile /dev/null\n    \n  Host resinstaging\n    User root\n    Port 22222\n    ProxyCommand ssh -A core@manager.resinstaging.io 'ssh $(fleetctl list-machines | grep vpn | head -n 1 | cut -f 2) \"sudo nsenter --target \\$(docker inspect --format {{.State.Pid}} resin-vpn) --mount --net nc %h %p\"'\n    StrictHostKeyChecking no\n    UserKnownHostsFile /dev/null\n  ```\n\n  Note: Even if you can think of other, more fun ways of setting up your\n  aliases, please use the form above, since some of our tooling you may use\n  while on support assumes aliases set up in the manner above. If you've got\n  good ideas to improve them, raise it in the devops channel on Flowdock.\n\n6. You can then log in to a users device using `ssh resin -o Hostname=${UUID}.vpn`\n\nIf your key and the device key are configured correctly but you are unable to log in and seeing errors like the following:\n\n```\nsign_and_send_pubkey: signing failed: agent refused operation\n```\n\nyou may need to disable any keychain manager you have running in your desktop environment and restart the ssh-agent.  An example of this for a default Ubuntu GNOME environment is here: http://askubuntu.com/a/861328/349 but short instructions are:\n\n1. Remove gnome-keyring from startup applications\n2. `killall ssh-agent ; killall gnome-keyring-daemon`\n3. `eval $(ssh-agent -s)`\n4. Re-add keys (`ssh-add ; ssh-add ~/.ssh/resin_devices`) and verify they are there (`ssh-add -l`)\n\nYou should now be able to ssh to devices.\n\nIf you are seeing errors like the following:\n\n```\n1234567.vpn: forward host lookup failed: Unknown server error : Invalid argument\n```\nThen this is because you are not using the full UUID.  If you use the clipboard link by the UUID field then the full UUID will be put on your clipboard, and should work in the command above.\n\nCheck `/var/volatile/vpnfile` - this should contain the UUID of the device you are looking at, check this to ensure that a stale VPN IP address or some other issue hasn't occurred (that might land you in an unrelated device.)\n\nOnce on the (non-systemd, before resinOS 1.2) device, `/var/logs/*` is your friend. `rce` should be running, which is the `resin container engine`, i.e. our fork of docker.\nCheck  `/var/log/supervisor-log/resin_supervisor_stdout.log` for supervisor output.\n\nOn resinOS 1.2+ device you can use `journalctl` to look at the logs. To get the last 100 logs for the supervisor:\n```\njournalctl -u resin-supervisor -n100\n```",
        "Troubleshooting": ""
      },
      "name": "Accessing User Devices",
      "slug": "scratchpad-entry-4c75fe88-adbd-4c55-8c04-e95be1609670",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.703Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4ea2c76b-4528-458f-8d00-462beee002a7",
      "data": {
        "Problem": "The error `Conflict. The name \"/resin_supervisor\" is already in use by container` can happen when docker removed the name from its layerdb without actually removing the layers. You can't remove the container because it said no container existed with that name, and you can't start one with that name because it says it already exist.",
        "Solution": "Make sure that the user's app container is running and supervisor is indeed dead:\n\n```\ndocker ps -a\n```\n\nIf the above command says for the supervisor STATUS is \"Removal In Progress\" and it has been like this for a sensible while, then you have the bug https://github.com/docker/docker/issues/22312.\n\nTo fix this, stop docker, stop resin-supervisor, delete the supervisor container, start docker, start resin-supervisor:\n\n```\n# systemctl stop docker\n# systemctl stop resin-supervisor\n# rm -r /var/lib/docker/containers/<CONTAINER ID as reported by \"docker ps -a\">\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\nHere's a complete script that you can copy-paste and run inside the hostOS to automate this:\n\n```\nCONTAINER=$(docker ps -a --no-trunc | grep Removal |  grep resin_supervisor | awk '{ print $1 }')\nif [ ! -z \"$CONTAINER\" ]; then\n echo \"Found removal in progress supervisor: ${CONTAINER}\";\n systemctl stop resin-supervisor\n systemctl stop docker\n rm -r /var/lib/docker/containers/${CONTAINER}\n systemctl start docker\n systemctl start resin-supervisor\nfi\n```\n\nAfter this, the supervisor container should start correctly. If not, read below for other info if any, it means you are not this lucky :)\n\n-----\n\n**Either way, make sure to convey to the user that they should upgrade resinOS to at least 1.26**, otherwise the issue is likely to happen again. Here's a canned response to use:\n\n> We have issued a fix for this particular bug in resinOS 1.26, so if you wish to avoid this issue in the future, you can upgrade this device to resinOS 1.26. This can be done by navigating to the devices \"Actions\" page and clicking on the action that says \"ResinOS Update\", this will give you an interactive prompt and you can select resinOS 1.26 from the list.\n\nCheck journalctl for the error:\n\n```\n# journalctl -u resin-supervisor -n20\nNov 09 18:58:25 raspberrypi3 systemd[1]: Started Resin supervisor.\nNov 09 18:58:25 raspberrypi3 bash[1353]: docker: Error response from daemon: Conflict. The name \"/resin_supervisor\" is already in use by container 2055f64ab1fc2526fc383e5daeb0ee76717d427d3585af7a24ba13f6800cbd41. You have to remove (or rename) that container to be able to reus\ne that name..\nNov 09 18:58:25 raspberrypi3 bash[1353]: See '/usr/bin/docker run --help'.\nNov 09 18:58:25 raspberrypi3 systemd[1]: [[1;39mresin-supervisor.service: Main process exited, code=exited, status=125/n/a[[0m\nNov 09 18:58:26 raspberrypi3 docker[1384]: Failed to stop container (resin_supervisor): Error response from daemon: No such container: resin_supervisor\nNov 09 18:58:27 raspberrypi3 docker[1394]: Failed to remove container (resin_supervisor): Error response from daemon: No such container: resin_supervisor\n```\n\nFirst, try restarting Docker:\n\n```\n# systemctl stop docker\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\n**IMPORTANT** `systemctl restart docker` does **NOT** work.\n\nSee if that fixes the issue (give 30 or more seconds to the supervisor to start up):\n\n```\n# docker ps -a | grep resin_supervisor\n911d82302435  resin/armv7hf-supervisor  \"/sbin/init\"  46 minutes ago  Up 46 minutes  resin_supervisor\n```\n\nIf that didn't work, stop services, unmount Docker filesystem, mount again and start services:\n\n```\n# systemctl stop docker\n# systemctl stop var-lib-docker.mount\n# systemctl start var-lib-docker.mount\n# systemctl start docker\n# systemctl start resin-supervisor\n```\n\nIf that still didn't work, ask the user to reboot the device. Remember to disconnect from the device before the reboot.\n\nIf that still didn't work, ping Petros, it's his kind of thing :)"
      },
      "name": "The name \"/resin_supervisor\" is already in use by container",
      "slug": "scratchpad-entry-4ea2c76b-4528-458f-8d00-462beee002a7",
      "tags": [
        "hard"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.716Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "4efe4a9e-2793-4869-b161-18eb3e01d9c7",
      "data": {
        "Solution": "## Checking disk space usage\nFree space is difficult to determine correctly in btrfs due to nature of how\nit is architected.\n\nThe [btrfs faq][faq-free-space] goes into a lot of detail, but in short, for\nbtrfs 3.18 and beyond (this seems to be tied to kernel version 3.18 and later),\nthe appropriate tool to use to determine free space is `btrfs fi usage <mount>`.\n\nBTRFS is always mounted at `/var/lib/docker`, so this is a good mount to use as\na parameter to the `btrfs` tool.\n\nLet's take a look at some sample output:\n\n```\nroot@raspberrypi3:~# btrfs fi usage /var/lib/docker\nOverall:\n Device size: 14.42GiB\n Device allocated: 2.59GiB\n Device unallocated: 11.82GiB\n Device missing: 0.00B\n Used: 1.10GiB\n Free (estimated): 13.14GiB (min: 7.23GiB)\n Data ratio: 1.00\n Metadata ratio: 2.00\n Global reserve: 32.00MiB (used: 0.00B)\nData,single: Size:2.23GiB, Used:932.32MiB\n /dev/mmcblk0p6 2.23GiB\nMetadata,DUP: Size:179.19MiB, Used:98.52MiB\n /dev/mmcblk0p6 358.38MiB\nSystem,DUP: Size:8.00MiB, Used:16.00KiB\n /dev/mmcblk0p6 16.00MiB\nUnallocated:\n /dev/mmcblk0p6 11.82GiB\n```\n\nThe value to look at here is `min: 7.23GiB` - this is all that can be\n_guaranteed_ to actually be available.\n\nNote that btrfs pre-allocates disk space and allocates more as needed, so `df`\nwill provide misleading information. `btrfs fi usage` takes this into account.\nPre-3.18\nIn a pinch on a pre-3.18 system, you can _roughly_ determine minimum free space\nby running `btrfs fi show /var/lib/docker`, subtracting used from size, then\nrunning `btrfs fi df /var/lib/docker`, and subtracting Data, single used from\ntotal, summing the two numbers and dividing that result by 2.\nClearing Down Space\nFirstly it's useful to determine what kind of situation the device is in -\nout of space errors will be reported as `No space left on device`, but\n__importantly__, so will out of metadata errors.\n\nTo determine which situation you have - check available free space as described\nabove - if it is at or close to 0 then it's a genuine out of space, otherwise it\nis out of metadata space.\n\nGenerally it seems that metadata usage of 75% or above is problematic. See the\n`Metadata,DUP` line in the `btrfs fi usage /var/lib/docker` or `btrfs fi df\n/var/lib/docker` output to check this.\nUsing btrfs-fix\nThe [btrfs-fix tool](https://github.com/resin-os/btrfs-fix) can be used to automate\nthe steps mentioned in the next sections (fixing inability to delete files, clearing\ndown space, remove orphaned subvolumes and returning back to normal) in one big swoop.\n\n[btrfs-fix](https://github.com/resin-os/btrfs-fix) addresses the image/container ID mismatch mentioned in the\n'Removing orphaned subvolumes' section and should work in both older and newer (>=1.10) docker versions.\n`./fix.sh [device uuid]` will run diagnostics on specified production device, while\nrunning `./fix.sh --fix [device uuid]` will attempt to fix the space issues on the device.\n\nPlease link the front ticket to https://github.com/resin-io/hq/issues/251 to keep track of instances where this fix has been used.\nFixing the Inability to Delete Files\nRegardless of the case you are faced with, you may find the system is so broken\nyou are unable to even delete files.\n\nTo workaround the issue, you can create a block of space on the tmpfs device\n(i.e. RAM-backed storage) and use btrfs's ability to add capacity to a device\nlive:\n\n```bash\n# Add extra (temporary) space to btrfs\ndd if=/dev/zero of=/tmp/btrfs bs=1M count=100\nloopdev=$(losetup -v -f --show /tmp/btrfs)\nbtrfs device add $loopdev /var/lib/docker\n```\n\nOnce you've performed the steps detailed below to free space, you can remove\nthis temporary addition via:\n\n```bash\nbtrfs device delete $loopdev /var/lib/docker\nbtrfs balance start -v -dusage=1 -musage=1 /var/lib/docker\nlosetup -D\nrm /tmp/btrfs\n```\n2.1 Clearing Down Space\nFirstly, make sure the user is ok with the application not running briefly. In\nmany cases the out of space issue will actually prevent proper operation of the\napplication so this won't be necessary, but otherwise do ensure you have\npermission.\n\nA good first step is to check whether the user's `/data` directory is taking up\nundue space, to see combined usage of all apps and the supervisor sqlite\ndatabase run:\n\n```bash\ndu -hs /mnt/data/resin-data\n```\n\nIf there is serious space usage here, talk to the user about this as they will\nneed to authorise removal of any data here.\n\nNext, check whether the supervisor is currently running. This may interfere with\nremoving images/containers and start them up again while you are trying to\ndelete things:\n\n```\ndocker ps                                    # Shows whether it's running.\ndocker stop resin_supervisor                 # Stop the supervisor.\nsystemctl stop update-resin-supervisor.timer # Prevent a timer event from restarting it.\n```\n\nNext, run `docker images --all` to get a list of all images on the\nsystem. Remove the users' images via `docker rmi`, once the supervisor is\nrunning again it'll update them.\n\nAdditionally, run `docker ps --all` to see if there are any stale containers\nleft hanging around, and delete those too, via `docker rm --volumes`.\n2.2 Removing Orphaned Subvolumes\n__IMPORTANT:__ image/container IDs no longer map to subvolumes as of docker 1.10\nand newer, so the below will __not__ work for newer devices, make sure you don't\ndelete subvolumes based on the below incorrectly on these! (see\n[Docker and btrfs in practice][docker-btrfs-practice] for more details.)\n\nAt this point you should have cleared up a decent amount of space. However,\nthere is an issue, in particular for supervisor versions prior to v1.3, whereby\nbtrfs subvolumes are present which are not used by docker (this can occur from\nimproper cleanup from an old container.)\n\nTo see whether any exist, run the following:\n\n```bash\nbtrfs subvolume list /var/lib/docker/btrfs/subvolumes | awk '{print $9}' | sed 's|docker/btrfs/subvolumes/||' | grep -v init | sort -u\n```\n\nStore this list - it's a list of all possibly docker btrfs subvolumes on the device.\n\n```bash\n(docker ps -a --no-trunc | tail -n+2 | awk '{print $1}'; docker images -a --no-trunc | tail -n+2 | awk '{print $3}') | sort -u\n```\n\nAlso store this list - this is the list of unique subvolumes used by docker.\n\n\nCompare the two lists - if there are entries in the former list that are not in the latter list, then these are orphaned and ought to be removed.\n\nTo remove orphaned subvolumes run the below for each `<id>` discovered above:\n\n```bash\nbtrfs subvolume delete -C /var/lib/docker/btrfs/subvolumes/<id>\n```\n2.3 Removing Dangling Volumes [Note: needs review]\nref: https://lebkowski.name/docker-volumes/\n\n> Now, since there is no tool to list volumes and their state, it’s easy to leave them on disk even after all processes exited and all containers are removed. The following command inspects all containers (running or not) and compares them to created volumes, printing only the paths that are not referenced by any container:\n\n```\nfind '/var/lib/docker/volumes/' -mindepth 1 -maxdepth 1 -type d | grep -vFf <(\n  docker ps -aq | xargs docker inspect | jq -r '.[]|.Mounts|.[]|.Name|select(.)'\n)\n```\n> What it does, step by step:\n\n> - List all created volumes\n> - List all containers and inspect them, creating a JSON array with all the entries\n> - Format the output using jq to get all the names of every mounted volume\n> - Exclude (grep -vFf) mounted volumes form the list of all volumes\n\n> The command doesn’t remove anything, but simply passing the results to xargs -r rm -fr does so.\n> For >= docker 1.9 this is equivalent to\n\n```\ndocker volume ls -qf dangling=true | xargs -r docker volume rm\n```\nGetting Back to Normal:\nFinally, you can get the device back to normal by simply restarting it.\n\nIf this is not appropriate, you can start the resin supervisor up again by\nrunning `systemctl start resin-supervisor.service`. In this case, if you stopped\nthe `update-resin-supervisor` timer above, start it again via `systemctl start\nupdate-resin-supervisor.timer`."
      },
      "name": "Checking Disk Space Usage (btrfs)",
      "slug": "scratchpad-entry-4efe4a9e-2793-4869-b161-18eb3e01d9c7",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.722Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "51e3274f-733f-44a8-ba9b-589484991ab0",
      "data": {
        "Problem": "Sometimes we need to know what's the latest version of the OS release in production for a given device type.",
        "Solution": "```\ncurl -s https://img.resin.io/api/v1/image/$SLUG/versions | jq .latest\n```\nfor example\n```\ncurl -s https://img.resin.io/api/v1/image/raspberrypi3/versions | jq .latest\n```",
        "$$localSchema": {
          "type": "object",
          "properties": {
            "": {
              "type": "string"
            }
          }
        }
      },
      "name": "Find the latest resinOS release for a given device type",
      "slug": "scratchpad-entry-51e3274f-733f-44a8-ba9b-589484991ab0",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.730Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "554f9894-5aaf-4ae2-a04c-ab8c978401aa",
      "data": {
        "Problem": "resinOS 2.9+ upgrades NetworkManager 1.10. NetworkManager 1.10+ triggers a `D-Bus get 'org.freedesktop.NetworkManager.AccessPoint'::'Flags' property failed on '/org/freedesktop/NetworkManager/AccessPoint/1'` error in WiFi Connect in versions 3.0.0-3.0.6.",
        "Solution": "Ask the user to upgrade to latest available WiFi Connect release - version 4+."
      },
      "name": "WiFi Connect stopped working after upgrading to resinOS 2.9+ exiting with a D-Bus error",
      "slug": "scratchpad-entry-554f9894-5aaf-4ae2-a04c-ab8c978401aa",
      "tags": [
        "non-shareable"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.743Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "5553fa2b-0f12-4a9b-8d0d-710e8cc79540",
      "data": {
        "Solution": "The delta size (along with other interesting info) can be retrieved from the API. If you need to determine the size of a *regular* update via docker pull, please read entry \"[Determine the total download size required to update a device to a new version of an Application](https://resin-io.github.io/scratchpad/#998513a0-58f4-11e8-a3a1-b35287006dfb)\".\n\nA delta is unique between any combination of (delta version, source image ID, destination image ID), so you'll need to determine the appropriate values before querying the API.\n\nIf you've got the version (it's almost always 2 (int)) and image IDs, the query is straightforward:\n\n```\nawait sdk.pine.get({\n  resource: 'delta',\n  options: {\n    $filter: {\n      status: 'success',\n      version: DELTA_VERSION,\n      originates_from__image: SRC_ID,\n      produces__image: DST_ID\n    }\n  }\n})\n```\n\nThe equivalent `curl` request is:\n\n```\n$ curl \\\n  -H \"Authorization: Bearer ${TOKEN}\" \\\n  'https://api.resin.io/v4/delta?$filter=((status%20eq%20%27success%27)%20and%20(version%20eq%20'${DELTA_VERSION}')%20and%20(originates_from__image%20eq%20'${SRC_ID}')%20and%20(produces__image%20eq%20'${DST_ID}'))'\n  | jq .d[0]\n```\n\nIf you've got the names of the images involved, the query becomes:\n\n```\nawait sdk.pine.get({\n  resource: 'delta',\n  options: {\n    $filter: {\n      status: 'success',\n      version: DELTA_VERSION,\n      originates_from__image: {\n        $any: {\n          $alias: 'source',\n          $expr: {\n            source: {\n              is_stored_at__image_location: SRC_NAME\n            }\n          }\n        }\n      },\n      produces__image: {\n        $any: {\n          $alias: 'destination',\n          $expr: {\n            destination: {\n              is_stored_at__image_location: DST_NAME\n            }\n          }\n        }\n      }\n    }\n  }\n})\n```\n\nAnd the equivalent `curl` request:\n\n```\ncurl \\\n   -H \"Authorization: Bearer ${TOKEN}\" \\\n  'https://api.resin.io/v4/delta?$filter=((status%20eq%20%27success%27)%20and%20(version%20eq%20'${DELTA_VERSION}')%20and%20(originates_from__image/any(source:source/is_stored_at__image_location%20eq%20%27'${SRC_NAME}'%27))%20and%20(produces__image/any(destination:destination/is_stored_at__image_location%20eq%20%27'${DST_NAME}'%27)))'\n  | jq .d[0]\n```\n\nTo get a list of all the services and the size of the delta updates for each between two release IDs, run the following from the browser console, release IDs can be found easily in the URL of the releases page of the app:\n\n```\nrelease1 = <OLD_RELEASE_ID>\nrelease2 = <NEW_RELEASE_ID>\n\nsdk.pine.get({\n    resource: 'release',\n    options: {\n        $filter: {\n            id:{ $in: [ release1, release2 ]},\n        },\n        $orderby: 'id asc',\n        $expand: {\n            image__is_part_of__release: {\n                $select: 'id',\n                $expand: {\n                    image: {\n                        $select: [\n                            'id'\n                        ],\n                        $expand: {\n                            is_a_build_of__service: {\n                                $select: 'service_name'\n                            }\n                        }\n                    }\n                }\n            }\n        }\n    }\n}).then(([r1, r2]) => {\n    r1services = { }\n    _.each(r1.image__is_part_of__release, (ipr) => {\n        r1services[ ipr.image[0].is_a_build_of__service[0].service_name] = ipr.image[0].id;\n    })\n    r2services = { }\n    _.each(r2.image__is_part_of__release, (ipr) => {\n        r2services[ ipr.image[0].is_a_build_of__service[0].service_name] = ipr.image[0].id;\n    })\n\n    deltaSizes = { }\n    return Promise.all(_.map(r1services, (id, name) => { \n        return sdk.pine.get({ resource: 'delta', options: { $filter: { originates_from__image: id, produces__image: r2services[name] }, $select: 'size' } }).then(([ img ]) => { if (img != null) { deltaSizes[name] = img.size } else { deltaSizes[name] = 0 }});\n    })).then(() => console.log(deltaSizes))\n})\n```\n"
      },
      "name": "Retrieve delta information (size, duration, etc)",
      "slug": "scratchpad-entry-5553fa2b-0f12-4a9b-8d0d-710e8cc79540",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.754Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "8bb53079-5832-45b2-a993-2cf615381d92",
      "data": {
        "Problem": "Errors occurring like:\n```\nFailed to download application 'registry.resin.io/nvraspiclientdev/e6b722e6f4082c164dd61abaeb89f987014aa997' due to 'Error pulling image (latest) from registry.resin.io/nvraspiclientdev/e6b722e6f4082c164dd61abaeb89f987014aa997, ApplyLayer exit status 1 unexpected EOF'\n```\n\nAnd the download repeatedly failing.",
        "Solution": "This is thought to be due to a problem with the device connection resulting in an early termination of the download of an image layer and is usually caused by network connectivity issues. Unfortunately docker will restart the entire image download again if it encounters this.\n\nDeltas will strongly mitigate this issue, as explained in this snippet that can be passed on to a user:\n> To mitigate this issue, you can set `RESIN_SUPERVISOR_DELTA` in the Fleet Configuration menu to a value of `1`. This will enable binary delta updates, download size should be significantly reduced on update and devices will have the ability to resume layer downloads that have failed. In the future DELTA updates will become the default update method.\n\nIf you bump into this during support, please link the Front ticket to [this issue](https://github.com/resin-io/hq/issues/712)\n\n*[26 May 2017] Note: while we still don't know the underlying cause of this, we suspect that it might have to do with registry v1 as opposing to registry v2. If you bump into this you can attempt to pull from a registry v2 by following these teardown instructions from https://app.frontapp.com/open/cnv_5aacrv :*\n\n> In the end I checked Docker on the device is >=1.6, pulled the image from registry v2, tagged it as a registry1 image and started the supervisor. I probably cheated and that \"fix\" only kicked the can down the road, it's possible the device will hit the same issues again on next update. we'll have to see.\n\nIf you do attempt to pull from v2 please update the relevant ticket at https://github.com/resin-io/hq/issues/712 with the results."
      },
      "name": "ApplyLayer Error",
      "slug": "scratchpad-entry-8bb53079-5832-45b2-a993-2cf615381d92",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.917Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "888ac13d-1af0-49e9-8bcd-fffa97ce8f97",
      "data": {
        "Problem": "```\nAug 17 17:55:09 9577a79 healthdog[6148]: [2018-08-17T17:55:08.981Z] Error reporting initial configuration, will retry { t: Unique key constraint violated\nAug 17 17:55:09 9577a79 healthdog[6148]:     at /usr/src/app/dist/app.js:403:260783\nAug 17 17:55:09 9577a79 healthdog[6148]:     at u (/usr/src/app/dist/app.js:9:71769)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromiseFromHandler (/usr/src/app/dist/app.js:321:107643)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromise (/usr/src/app/dist/app.js:321:108543)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromise0 (/usr/src/app/dist/app.js:321:109242)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromises (/usr/src/app/dist/app.js:321:110569)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._fulfill (/usr/src/app/dist/app.js:321:109612)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at s._resolve (/usr/src/app/dist/app.js:321:118526)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at s._promiseFulfilled (/usr/src/app/dist/app.js:321:118867)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at s._iterate (/usr/src/app/dist/app.js:321:118347)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at s.t [as _init] (/usr/src/app/dist/app.js:321:117568)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromise (/usr/src/app/dist/app.js:321:108581)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromise0 (/usr/src/app/dist/app.js:321:109242)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._settlePromises (/usr/src/app/dist/app.js:321:110569)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at A._fulfill (/usr/src/app/dist/app.js:321:109612)\nAug 17 17:55:09 9577a79 healthdog[6148]:     at U._callback (/usr/src/app/dist/app.js:118:47247)\nAug 17 17:55:09 9577a79 healthdog[6148]:   message: 'Unique key constraint violated',\nAug 17 17:55:09 9577a79 healthdog[6148]:   statusCode: 404,\nAug 17 17:55:09 9577a79 healthdog[6148]:   name: 't' }\n```\n\nLikely at this time `RESIN_HOST_LOG_TO_DISPLAY` is set on the device. If it is set, then this is the issue you are looking for.",
        "Solution": "Log in as user (needs admin), and remove the `RESIN_HOST_LOG_TO_DISPLAY` env var."
      },
      "name": "Supervisor cannot start up with \"Unique key constraint violated\" error in the logs",
      "slug": "scratchpad-entry-888ac13d-1af0-49e9-8bcd-fffa97ce8f97",
      "tags": [],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [
        "org-balena"
      ],
      "version": "1.0.0",
      "requires": [],
      "linked_at": null,
      "created_at": "2019-03-01T17:59:56.909Z",
      "updated_at": null,
      "capabilities": []
    },
    {
      "id": "faccf884-366a-40af-bd3e-5bd9db149c90",
      "data": {
        "Problem": "The device is offline from the VPN but it is still connected to internet and can push logs to the dashboard. Noticed on 2.29.x devices so far.",
        "Solution": "none yet",
        "category": "VPN",
        "severity": "high"
      },
      "name": "Device off VPN but logging still to dashboard",
      "slug": "support-issue-evice-off-vpn-but-logging-still-139648b1-3784-4bad-ae71-dc0db649e32b",
      "tags": [
        "symptom"
      ],
      "type": "support-issue@1.0.0",
      "links": {},
      "active": true,
      "markers": [],
      "version": "1.0.0",
      "requires": [],
      "linked_at": {
        "has attached element": "2020-03-02T08:25:36.480Z",
        "support issue has attached support thread": "2019-04-19T12:48:46.426Z"
      },
      "created_at": "2019-03-11T14:51:50.525Z",
      "updated_at": "2019-04-02T13:48:18.345Z",
      "capabilities": []
    }
  ]

  export default data;