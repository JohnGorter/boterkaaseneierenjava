var express = require('express');
var app = express(); 
var http = require('http');
var websocketserver = require('websocket').server;
const uuidv1 = require('uuid/v1');


var server = http.createServer(app); 
app.use(express.static('.'));
server.listen(8085, () => { console.log("listening")});

var websocket = new websocketserver({httpServer:server});

let status = [];
let currentplayer;

// we need to players
let player1 = undefined;
let player2 = undefined;

websocket.on('request', function(request) {
    console.log("request accepted");
    var connection = request.accept();
    connection.name = uuidv1(); 
    connection.on('message', function(message) {
        processMessage(connection, message);
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.user || connection.remoteAddress + ' disconnected.');
        player1 = undefined;
        player2 = undefined;
        status = [];
    });
});

function processMessage(connection, message) {
    let messagedata = message.utf8Data;
    if (messagedata.startsWith("TURN:")){
        let position = parseInt(messagedata.replace("TURN:", ""));
        console.log("player sent position ", position, "for field: " + status);
        if (position > -1 && position < 9) {
            if (!status[position]) {
                status[position] = currentplayer == player1 ? "X" : "O";
                currentplayer = currentplayer == player1 ? player2 : player1;
                console.log("broadcasting status", status);
                broadcast("STATUS:" + JSON.stringify(status));
            }
        }
        let gameover = true;
        let winner = "";
        for (let i = 0; i < 9; i++) {
            if (!status[i]) gameover = false;
        }
        if (status[0] != undefined && status[0] == status[1] && status[0] == status[2]) { winner = status[0]; gameover = true;}
        if (status[3] != undefined && status[3] == status[4] && status[3] == status[5]) { winner = status[3];gameover = true;}
        if (status[6] != undefined && status[6] == status[7] && status[6] == status[8]) { winner = status[6];gameover = true;}
        if (status[0] != undefined && status[0] == status[3] && status[0] == status[6]) { winner = status[0];gameover = true;}
        if (status[1] != undefined && status[1] == status[4] && status[1] == status[7]) { winner = status[1];gameover = true;}
        if (status[2] != undefined && status[2] == status[5] && status[0] == status[8]) { winner = status[2];gameover = true;}
        if (status[0] != undefined && status[0] == status[4] && status[0] == status[8]) { winner = status[0];gameover = true;}
        if (status[2] != undefined && status[2] == status[4] && status[2] == status[6]) { winner = status[2];gameover = true;}

        if (gameover) {
            console.log("GAMEOVER " + winner + " has won!", status); 
            broadcast("GAMEOVER " + winner + " has won!");
        } else {
            if (currentplayer) {
                console.log("sending turn to next player", currentplayer.user);
                currentplayer.sendUTF("TURN");
            }
        }
    }
    if (messagedata.startsWith("USER:")){
        let user = messagedata.replace("USER:", ""); 
        connection.user = user;
        if (player1 == undefined) player1 = connection;
        else if (player2 == undefined) player2 = connection;
        if (player1 && player2) { 
            broadcast("START");

            currentplayer = player1;
            player1.sendUTF("TURN");
        }
    }
}
function broadcast(message){
    console.log("sending start");
    if (player1) player1.sendUTF(`${message}`);
    if (player2) player2.sendUTF(`${message}`);
}
