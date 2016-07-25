/********** Generic Require's **********/
var fs          = require('fs');
var http        = require('http');
var querystring = require('querystring');
var util        = require('util');
/********** Global Settings **********/
var LISTEN_IP = '127.0.0.1'; // Only IP we are listening to
var LISTEN_PORT = 1337;      // Port Bot Listens on
var BOT_ID = 1;              // Hard Coded BOT_ID, Unique!
var VERSION = '0.2';         // Bot Version
var API_VERSION = '1.0';     // API Version of Site
var STEAM_API_DOMAIN = 'csgotavern.com'; // Domain Used to Grab an API-Key from Steam
var IDENTITY_SECRET = 'CHANGE_THIS';
var SHARED_SECRET = 'CHANGE_THIS';
var SECRET_KEY = '[WwlIb}N,y^+'; // Secret Key Used to Auth with Server, NO UNDERSCORES ALLOWED!!
/********** Command Server **********/
/* Parse Requests from LISTEN_IP on LISTEN_PORT */
var app = http.createServer(function ( request, response ) {
    if( request.method == 'POST' ){
        var body = '';
        request.on('data', function( data ){
            body += data;
            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function(){
            var post = querystring.parse(body);
            if( typeof post['Command'] == 'undefined' ) {
                console.log('Command Not Defined');
            } else {
                console.log( post['Command'] );
                switch( post['Command'] ){
                    /* Knock-Knock, anyone Home? */
                    case 'ping':
                        response.write('OK');
                        response.end();
                        break;
                    /* Receives an Item from a User (Syntax: [1]id64, [2]itemID, [3]token,[4]msg) */
                    case 'receive':// (Syntax: [1]id64, [2]itemID, [3]token,[4]msg)
                        if( typeof post['id64'] == 'undefined' ||  typeof post['itemID'] == 'undefined' || typeof post['token'] == 'undefined' || typeof post['msg'] == 'undefined' || typeof post['marketID'] == 'undefined' ){
                            response.write( 'BAD' );
                            response.end();
                        } else {
                            response.write( 'OK' );
                            response.end();
                            console.log( JSON.stringify( post ) );
                            receiveItem( post['id64'], post['itemID'], post['token'], post['msg'], post['marketID'] );
                        }
                        break;
                    /* Receive Multiple Items From a user */
                    case 'receiveMulti':// (Syntax: [1]id64, [2]token, [3]msg, [4]numOfItems, [5...] itemID#'s
                        if( typeof post['id64'] == 'undefined' || typeof post['token'] == 'undefined' || typeof post['msg'] == 'undefined' || typeof post['numOfItems'] == 'undefined' ){
                            console.log('malformed command');
                        } else {
                            var itemArr = [];
                            var loopNum = parseInt( post['numOfItems'] ); // I think the for loop re-does the parseInt function every interation
                            for( var i = 0; i < loopNum; i++ ) {
                                itemArr[i] = post[ '' + i ];
                                console.log('itemArr[' + i + '] == ' + itemArr[i]);
                            }
                            receiveItemMulti( post['id64'], post['token'], post['msg'], itemArr );
                        }
                        break;
                    /* Sends an Item to a User */
                    case 'send':// (Syntax: id64, itemID, token, msg, marketID )
                        if( typeof post['id64'] == 'undefined' ||  typeof post['itemID'] == 'undefined' || typeof post['token'] == 'undefined' || typeof post['msg'] == 'undefined' || typeof post['marketID'] == 'undefined' ){
                            //console.log('malformed command');
                            response.write( 'BAD' );
                            response.end();
                        } else{
                            // console.log('Sending itemdID: ' + post['itemID'] + ' to: ' + post['id64'] + ' with token: ' + post['token'] + ' and msg: ' + post['msg'] );
                            response.write( 'Sending itemdID: ' + post['itemID'] + ' to: ' + post['id64'] + ' with token: ' + post['token'] + ' and msg: ' + post['msg'] );
                            response.end();
                            sendItem(  post['id64'], post['itemID'], post['token'], post['msg'], post['marketID'] );
                        }
                        break;
                    /* Send Multiple Items to a User */
                    case 'sendMulti':// (Syntax: [1]id64, [2]token, [3]msg, [4]numOfItems, [5...] itemID#'s
                        if( typeof post['id64'] == 'undefined' || typeof post['token'] == 'undefined' || typeof post['msg'] == 'undefined' || typeof post['numOfItems'] == 'undefined'){
                            // console.log('malformed command');
                            response.write( 'BAD' );
                            response.end();
                        } else {
                            var itemArr = [];
                            var loopNum = parseInt( post['numOfItems'] ); // I think the for loop re-does the parseInt function every interation
                            for( var i = 0; i < loopNum; i++ ) {
                                itemArr[i] = post[ '' + i ];
                                console.log('itemArr[' + i + '] == ' + itemArr[i]);
                            }
                            sendItemMulti( post['id64'], post['token'], post['msg'], itemArr );
                        }
                        break;
                    /* Sends a JSON'd Version of the Bot's Full CSGO Inventory */
                    case 'jsonInventoryDump': // None
                        manager.loadInventory( 730, 2, false, function( err, inventory ){
                            if( err ) {
                                response.write( 'ERROR: ' + err );
                                response.end();
                            } else {
                                response.write( JSON.stringify( inventory ));
                                response.end();
                            }
                        });
                        break;
                    /* Sends Info about a TradeOffer by tradeID -- Direct Response Command */
                    case 'lookup':
                        if( typeof post['tradeID'] == 'undefined' ){
                            response.write( 'BAD' );
                            response.end();
                        } else {
                            manager.getOffer( post['tradeID'], function ( err, offer ) {
                                if (err) {
                                    response.write( 'ERROR: ' + err );
                                    response.end();
                                } else {
                                    response.write( util.inspect(offer, false, null) );
                                    response.end();
                                }
                            });
                        }
                        break;
                    /* Cancels a TradeOffer by tradeID -- Direct Response Command */
                    case 'cancel':
                        if( typeof post['tradeID'] == 'undefined' ){
                            //console.log('malformed command');
                            response.write( 'BAD' );
                            response.end();
                        } else {
                            manager.getOffer( post['tradeID'], function ( err, offer ) {
                                if (err) {
                                    // throw err;
                                    response.write( 'ERROR: ' + err );
                                    response.end();
                                } else {
                                    offer.cancel( function(){
                                        if( err == null ){
                                            response.write( 'CANCELED' );
                                            response.end();
                                        } else {
                                            response.write( 'NOT CANCELED' );
                                            response.end();
                                        }
                                    });
                                }
                            });
                        }
                        break;
                    /* Kills the Bot */
                    case 'shutdown': // None
                        response.write('GOODBYE');
                        response.end();
                        process.exit(1);
                        break;
                    default:
                        response.write('INVALID');
                        response.end();
                        break;
                }
            }
        });
    } else { // Not a POST Req.
        response.write('BAD');
        response.end();
    }
}).listen( LISTEN_PORT, LISTEN_IP );

/********** Steam Code Begins! **********/
var Steam            = require('steam');
var SteamWebLogOn    = require('steam-weblogon');
var getSteamAPIKey   = require('steam-web-api-key');
var TradeOfferManager= require('steam-tradeoffer-manager');
var SteamTotp        = require('steam-totp');
var SteamComm   = require('steamcommunity');

var steamClient   = new Steam.SteamClient();
var steamUser     = new Steam.SteamUser( steamClient );
var steamFriends  = new Steam.SteamFriends( steamClient );
var steamWebLogOn = new SteamWebLogOn( steamClient, steamUser );
var SteamCommunity= new SteamComm();

/********** Account Credentials **********/
var logOnOptions = {
    account_name: 'CHANGE_THIS', // Bot Login Name
    password: 'CHANGE_THIS',       // Bot Login Password
    two_factor_code: SteamTotp.generateAuthCode( SHARED_SECRET )
};
console.log( '2F Auth Code: ' + logOnOptions.two_factor_code );
/********** Offer Manager Settings **********/
var manager = new TradeOfferManager({
    steam:       steamUser,
    domain:      STEAM_API_DOMAIN,
    language:    "en",  // English
    pollInterval: 2500, // 2.5 sec poll
    cancelTime: 300000,  // 5 minute expiration
    pendingCancelTime: 300000, // 5 Minutes for us to Confirm on "Mobile"
});
/********** Cache File Checks **********/
if ( fs.existsSync('servers') ) {
    Steam.servers = JSON.parse( fs.readFileSync('servers') );
}
if( fs.existsSync( 'polldata.json' ) ) {
    try {
        manager.pollData = JSON.parse( fs.readFileSync( 'polldata.json' ) );
    } catch( err ){
        console.log('Error reading polldata.json: ' + err);
    }
}

steamClient.connect(); // Connect to the Steam Network
steamClient.on('connected', function() {
    steamUser.logOn(logOnOptions); // Login to Steam
});
/********** steamClient Listeners **********/
steamClient.on('logOnResponse', function( logonResp ) {
    if ( logonResp.eresult == Steam.EResult.OK ) {
        console.log( 'Logged in!' );
        steamFriends.setPersonaState( Steam.EPersonaState.Online );
        steamFriends.setPersonaName( 'Braun Kong' );
        steamWebLogOn.webLogOn(function(sessionID, newCookie){
            console.log( 'Cookies: ' + newCookie );
            SteamCommunity.setCookies( newCookie);
            SteamCommunity.startConfirmationChecker( 10000, IDENTITY_SECRET );
            getSteamAPIKey({
                sessionID: sessionID,
                webCookie: newCookie
            }, function( err, APIKey ) {
                if ( err ) {
                    // throw err;
                    sendServerLoop( {
                        'Command': 0,
                        'Message': 'Could not get API key'
                    });
                }
                manager.setCookies( newCookie, function( err ) {
                    if( err ) {
                        sendServerLoop( {
                            'Command': 0,
                            'Message': 'Could not get API key'
                        });
                        return;
                    }
                    console.log( 'API Key: ' + manager.apiKey );
                });
            });
        });
    } else {
        console.log('Not Logged In! RESULT: ' + logonResp.eresult );
        sendServerLoop( {
            'Command': 0,
            'Message': 'Unable to Login'
        });
    }
});
steamClient.on( 'servers', function(servers ) {
    fs.writeFile( 'servers', JSON.stringify(servers) );
});
steamClient.on( 'accountLimitations', function (limited, communityBanned, locked, canInviteFriends ) {
    if ( limited ) {
        // https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663
        sendServerLoop( {
            'Command': 0,
            'Message': 'Account Limited'
        });
    }
    if ( communityBanned ){
        // https://support.steampowered.com/kb_article.php?ref=4312-UOJL-0835
        sendServerLoop( {
            'Command': 0,
            'Message': 'Account Banned'
        });
    }
    if ( locked ){
        // http://forums.steampowered.com/forums/showpost.php?p=17054612&postcount=3
        sendServerLoop( {
            'Command': 0,
            'Message': 'Account Locked'
        });
    }
});
/********** Confirmation Listeners **********/
SteamCommunity.on('confKeyNeeded', function( tag, callback ) {
    var time = Math.floor(Date.now() / 1000);
    callback(null, time, SteamTotp.getConfirmationKey(IDENTITY_SECRET, time, tag));
});
//SteamCommunity.on('newConfirmation', function( confirmation ){
//    console.log( 'New "Mobile" Confirmation Detected!' );
//    console.log( 'confirmation.receiving = ' + confirmation.receiving );
//    if( confirmation.receiving === '' ){
//        console.log('This is not a Trade!');
//        var nonTradeTime = Math.floor( Date.now() / 1000 );
//        var nonTradeCancelKey = SteamTotp.getConfirmationKey( IDENTITY_SECRET, nonTradeTime, 'cancel' );
//        confirmation.respond( nonTradeTime, nonTradeCancelKey, false, function( err ){
//           if( err ){
//               console.log( 'Error Canceling Non-Trade Confirmation' + err );
//           }
//        });
//        return;
//    }
//    var lookupOfferTime = Math.floor( Date.now() / 1000 );
//    var lookupOfferKey = SteamTotp.getConfirmationKey( IDENTITY_SECRET, lookupOfferTime, 'details' );
//    confirmation.getOfferID( lookupOfferTime , lookupOfferKey, 'details', function( err, offerID ){
//        if( err ){
//            console.log( 'Error Getting OfferID from New Confirmation!' + err );
//        } else {
//            manager.getoffer( offerID, function( err, offer ){
//                if( err ){
//                    console.log ('Error Getting Offer Object from OfferID in New Confirmation!' + err );
//                    return;
//                }
//                if( offer.isOurOffer === true ){ // ACCEPT the Trade
//                    var acceptOfferTime = Math.floor( Date.now() / 1000 );
//                    var acceptOfferKey = SteamTotp.getConfirmationKey( IDENTITY_SECRET, acceptOfferTime, 'allow')
//                    confirmation.respond( acceptOfferTime, acceptOfferKey, true, function( err ){
//                        if( err !== null ){
//                            /* Error Accepting the Trade !! */
//                            console.log(' Error Accepting Trade #' + offer.id + ' Err: ' + err )
//                        } else {
//                            console.log( 'Accepted Trade # ' + offer.id );
//                        }
//                    });
//                } else { // DECLINE the Trade
//                    var declineOfferTime = Math.floor( Date.now() / 1000 );
//                    var declineOfferKey = SteamTotp.getConfirmationKey( IDENTITY_SECRET, declineOfferTime, 'cancel')
//                    confirmation.respond( declineOfferTime, declineOfferKey, false, function( err ){
//                        if( err !== null ){
//                            /* Error Declining the Trade !! */
//                            console.log(' Error Declining Trade #' + offer.id + ' Err: ' + err )
//                        } else {
//                            console.log( 'Declined Trade # ' + offer.id );
//                        }
//                    });
//                }
//            });
//        }
//    });
//});
/********** manager Listeners **********/
manager.on('pollData', function( pollData ){
    fs.writeFile('polldata.json', JSON.stringify( pollData ));
});
manager.on('pollFailure', function( err ){
    sendServerLoop( {
        'Command': 0,
        'Message': 'Could not Poll for Trade offers' // Steam May be down
    });
});
manager.on('newOffer', function( offer ) {
    offer.decline();
});
manager.on('sentOfferChanged', function( offer, oldState ){
    console.log( 'Trade #' + offer.id + ' ' + TradeOfferManager.getStateName(offer.state));
    /***** Sent Item/s Offer Changed *****/
    if( offer.itemsToGive.length > 0 ){
        if( offer.itemsToGive.length == 1 ){ // Was a Single Item Send
            sendServerLoop({
                'Command': 3,
                'tradeID': offer.id,
                'state': offer.state
            });
        } else { // Multi Item Send

        }
        // sendServerMessage( 'offerChanged,' + offer.id + ',state,' + offer.state, 'send' );
    }
    /***** Received Item/s Offer Changed *****/
    else {
        if( offer.itemsToReceive.length == 1 ) { // Single Item Receive
            if( offer.state == 3 ) { // if this was an accepted trade, we need to send the new assetID
                offer.getReceivedItems( function( err, items ){
                    if ( err ) {
                        sendServerLoop({
                            'Command': 1,
                            'tradeID': offer.id,
                            'error': 'Error getting info on Recv\'d Items: ' + err
                        });
                    } else {
                        sendServerLoop({
                            'Command': 1,
                            'tradeID': offer.id,
                            'assetID': items[0].id,
                            'state': 3
                        });
                    }
                });
            } else {
                sendServerLoop({
                    'Command': 1,
                    'tradeID': offer.id,
                    'state': offer.state // Can be anything from Denied to Pending Email Conf
                });
            }
        } else { // Multi Item Receive

        }
        ////// Send Server New AssetID and Trade #
        //if( offer.state == 3 ){ // if this was an accepted trade.
        //    offer.getReceivedItems( function( err, items ){
        //        if ( err ) {
        //            //throw err;
        //            console.log( err );
        //            sendServerMessage( 'offerChanged,' + offer.id + ',error,' + err , 'receive' );
        //            return;
        //        }
        //        // console.log( items[0].id );
        //        // sendServerMessage( 'offerChanged,' + offer.state + ',newID,' + items[0].id, 'receive' );
        //        if ( items.length > 1 ){ // if it is a multi-item trade
        //            console.log('offerChanged,' + offer.id + ',state,' + offer.state + ',newMultiID,' + JSON.stringify(items) );
        //            sendServerMessage('offerChanged,' + offer.id + ',state,' + offer.state + ',newMultiID,' + JSON.stringify(items), 'receive');
        //        } else { // Single Item Trade
        //            console.log( 'offerChanged,' + offer.id + ',state,' + offer.state + ',newID,' + items[0].id );
        //            sendServerMessage('offerChanged,' + offer.id + ',state,' + offer.state + ',newID,' + items[0].id, 'receive');
        //        }
        //    });
        //} else {
        //    console.log( 'offerChanged,' + offer.id + ',state,' + offer.state );
        //    sendServerMessage('offerChanged,' + offer.id + ',state,' + offer.state, 'receive' );
        //}
    }
});
/********** Functions **********/
function receiveItem( id64, itemID, token, msg, marketID ){ // Steam64ID, assetID, Trade Offer Url Token, trade offer msg
    manager.getEscrowDuration( id64, token, function( err, daysTheirEscrow, daysYourEscrow ){
        if( err != null ){
            /* Couldn't get escrow Duration */
            return;
        }
        if( daysTheirEscrow > 0 || daysYourEscrow > 0 ){
            console.log('Escrow Duration Detected(receiveItem)! \n TheirEscrow: ' + daysTheirEscrow + '\n YourEscrow: ' + daysYourEscrow );
        }
    });
    var itemOffer = manager.createOffer( id64 );
    var item = {
        assetid: itemID,
        appid: 730,
        contextid: 2,
        amount: 1
    };
    itemOffer.addTheirItem( item );
    itemOffer.send('$wagB0t: ' + msg, token, function(err, status){
        if( err ) {
            // throw err; // Tell Server we couldn't send the Trade Request
            console.log( 'Error Sending Trade Request(receiveItem): ' + err );
            sendServerLoop({
                'Command': 1,
                'error': 'Error Sending Trade Request: + err'
            });
        } else {
            //console.log('Trade offer ' + '#' + itemOffer.id + ': ' + status); // status should always be 'sent'
            // Send Server itemOffer.id was sent
            console.log( 'sent,' + itemOffer.id + 'receive' ) ;
            sendServerLoop({
                'Command': 1,
                'marketID': marketID,
                'tradeID': itemOffer.id
            });
        }
        SteamCommunity.checkConfirmations();
    });

}
function receiveItemMulti( id64, token, msg, itemIDarr ){ // Steam64ID, Trade Offer Url Token, Trade Offer Msg, Array of itemID's
    manager.getEscrowDuration( id64, token, function( err, daysTheirEscrow, daysYourEscrow ){
        if( err != null ){
            /* Couldn't get escrow Duration */
            return;
        }
        if( daysTheirEscrow > 0 || daysYourEscrow > 0 ){
            console.log('Escrow Duration Detected! \n TheirEscrow: ' + daysTheirEscrow + '\n YourEscrow: ' + daysYourEscrow );
            return;
        }
    });
    var itemOffer = manager.createOffer( id64 );
    for( var i = 0; i < itemIDarr.length; i++ ){
        var item = {
            assetid: itemIDarr[i],
            appid: 730,
            contextid: 2,
            amount: 1
        };
        itemOffer.addTheirItem( item );
    }
    itemOffer.send('$wagB0t: ' + msg, token, function( err, status ){
        if( err ){
            sendServerMessage( 'error,' + err, 'receive' );
        } else {
            sendServerMessage( 'sent,' + itemOffer.id, 'receive' );
        }
        SteamCommunity.checkConfirmations();
    });

}
function sendItem( id64, itemID, token, msg, marketID ) { // Steam64ID, assetID, Trade Offer Url Token, trade offer msg
    manager.getEscrowDuration( id64, token, function( err, daysTheirEscrow, daysYourEscrow ){
        if( err != null ){
            /* Couldn't get escrow Duration */
            return;
        }
        if( daysTheirEscrow > 0 || daysYourEscrow > 0 ){
            console.log('Escrow Duration Detected! \n TheirEscrow: ' + daysTheirEscrow + '\n YourEscrow: ' + daysYourEscrow );
            return;
        }
    });
    var itemOffer = manager.createOffer( id64 );
    var item = {
        assetid: itemID,
        appid: 730,
        contextid: 2,
        amount: 1
    };
    itemOffer.addMyItem( item );
    itemOffer.send('$wagB0t: ' + msg, token, function( err, status ){
        if( err ){
            //throw err; // Tell Server we couldn't send the Trade Request
            sendServerLoop({
                'Command': 3,
                'error': 'Error Sending Trade Request(sendItem): ' + err ,
            });
        } else {
            sendServerLoop({
                'Command': 3,
                'marketID': marketID,
                'tradeID': itemOffer.id
            })
        }
        // console.log( 'Trade offer ' + '#' + itemOffer.id + ': ' + status ); // status should always be 'sent'
        // Send Server itemOffer.id was sent
        SteamCommunity.checkConfirmations();
    });
}
function sendItemMulti( id64, token, msg, itemIDarr ){
    manager.getEscrowDuration( id64, token, function( err, daysTheirEscrow, daysYourEscrow ){
        if( err != null ){
            /* Couldn't get escrow Duration */
            return;
        }
        if( daysTheirEscrow > 0 || daysYourEscrow > 0 ){
            console.log('Escrow Duration Detected! \n TheirEscrow: ' + daysTheirEscrow + '\n YourEscrow: ' + daysYourEscrow );
            return;
        }
    });
    var itemOffer = manager.createOffer( id64 );
    for( var i = 0; i < itemIDarr.length; i++ ){
        var item = {
            assetid: itemIDarr[i],
            appid: 730,
            contextid: 2,
            amount: 1
        };
        itemOffer.addMyItem( item );
    }
    itemOffer.send('$wagB0t: ' + msg, token, function( err, status ){
        if( err ){
            sendServerMessage( 'error,' + err , 'send' );
        } else {
            sendServerMessage( 'sent,' + itemOffer.id , 'send' );
        }
        SteamCommunity.checkConfirmations();
    });
}
function sendServerError( errorDetails, warningLevel ){ // String, 1-5 warning level #
    if( typeof warningLevel === 'undefined' ) {
        warningLevel = 1;
    }
    console.log( errorDetails );
    // Build the post string from an object
    var post_data = querystring.stringify({
        'output_format': 'json',
        'warning_level' : warningLevel,
        'data' : BOT_ID + ': '+ errorDetails
    });

    // An object of options to indicate where to post to
    var post_options = {
        host: 'api.vionox.com',
        port: '80',
        path: '/' + API_VERSION + '/steambot/' + VERSION + '/error',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };
    console.log(post_options['path']);

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            // console.log('Response: ' + chunk);
        });
    });
    // post the data
    post_req.write(post_data);
    post_req.end();
}
function sendServerMessage( data, consoleResponse ){ // Post-Data Array EX: swag { yolo: 420, swag: 360 };
    if( typeof consoleResponse === 'undefined' ) {
        consoleResponse = false;
    }
    var post_data = querystring.stringify( data );
    console.log( 'RawPOSTdata: ' + data );
    console.log( 'POSTing: ' + post_data );
    // An object of options to indicate where to post to
    var post_options = {
        host: 'csgotavern.com',
        port: '80',
        path: '/steambot/dispatch',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength( post_data ),
            'User-Agent': BOT_ID + '_' + SECRET_KEY
        }
    };
    var post_req = http.request( post_options, function( res ) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            if ( consoleResponse ){
                console.log('Response: ' + chunk);
            }
        });
    });
    // post the data
    post_req.write( post_data );
    post_req.end();
}
/* Keep Sending Data to the Server if it isn't responding */
function sendServerLoop( data, consoleResponse ) {
    if( typeof consoleResponse === 'undefined' ) {
        consoleResponse = true;
    }
    var post_data = querystring.stringify( data );
    console.log( 'POSTing: ' + post_data );
    // An object of options to indicate where to post to
    var post_options = {
        host: 'csgotavern.com',
        port: '80',
        path: '/steambot/dispatch',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength( post_data ),
            'User-Agent': BOT_ID + '_' + SECRET_KEY
        }
    };
    var post_req = http.request( post_options, function( res ) {
        res.setEncoding('utf8');
        var resData = '';
        res.on('data', function (chunk) {
            if ( consoleResponse ){
                console.log('Response: ' + chunk);
            }
            resData += chunk;
        });
        res.on('end', function(){
            if( resData != 'OK' ){ // if there isn't a good response
                console.log('recursion');
                sendServerLoop( data, consoleResponse ); // call 'er up again
            }
        });
    });
    // post the data
    post_req.write( post_data );
    post_req.end();
}
















