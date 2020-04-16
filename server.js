require('dotenv').config();
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var portNumber = 5000;
//var code = 0;
var mCodes = new Map();
const DELETE_INTERVAL = 86400000;  //  One day of milliseconds.  How often to delete old games
const OLD_GAMES = 30;   //  how many days back to delete

server.listen(process.env.PORT || portNumber);
console.log("server is up and running, listening on port: " + portNumber);

//  for database
var pg = require('pg');
//var conString = "postgres://[username]:[password]@[URL]:[port]]/[database name]"
var connectionString = "postgres://"+ process.env.DATABASE_USER + ":" + process.env.DATABASE_PASSWORD + "@" + process.env.DATABASE_NAME + ":" + process.env.DATABASE_PORT ;   //  AWS testing
var pgClient = new pg.Client(connectionString);
pgClient.connect();


//  ***************************   Create Code   ***************************
function getCode() {
  console.log("\tget Code()");
  let done = true;
  let c = 0;
  do {
    c = Math.floor(Math.random() * Math.floor(10000));
    done = mCodes.has(c);
  }
  while (done)
  let aPlayerInfo = new Array();
  mCodes.set(c, aPlayerInfo);
  console.log("\tleaving get Code()")

  return c;
}

//delete games that are older than OLD_GAMES
//  *****************   Delete Old Games   *****************
function deleteOldGames() {
  let then = new Date();
  then.setDate(then.getDate() - OLD_GAMES);
  let deleteDate = then.getFullYear() + "-" + then.getMonth() + "-" + then.getDay();
  let deleteString = "DELETE FROM games WHERE game_date < \'" + deleteDate + "\';"
  console.log("Delete String: " + deleteString);
  pgClient.query(deleteString)
    .then(res => console.log("Deleted old games"))
    .catch(e => console.error(e.stack))
}
let timerID = setInterval(() => deleteOldGames(), DELETE_INTERVAL);

//  *****************   Log Output Message   *****************
function logOutputMessge(foo, room, socketID){
let playerInfo = mCodes.get(room);
let tmpColor = ""
for (i = 0; i < 2; i++) {
  if (playerInfo[i].Socket == socketID) {
    if (playerInfo[i].red)
      tmpColor = "red";
    else
      tmpColor = "green";
  }
}
console.log("Function: " + foo + ", From: " + tmpColor + ", Room: " + room);
}

//  ***********************************************************************
//  **************************   On Connection ****************************
//  ***********************************************************************
io.on('connection', function (socket) {
  console.log("on Connection");
  socket.emit('err', {
    text: 'Connected to server',
    time: new Date().getTime()
  });

  //  ***************************   Create Game   ***************************
  socket.on('createGame', function (data) {
    console.log("on create Game");

    code = getCode(); //  get new code
    console.log("\tRoom: " + code + "\t Socket ID: " + socket.id);
    let playerInfo = { Socket: socket.id, name: data.name, red: true };
    let aPlayerInfo = mCodes.get(code);
    aPlayerInfo.push(playerInfo);   //  put socket id into array associated with that code
    mCodes.set(code, aPlayerInfo);
    socket.join(code.toString());

    //  send message back to user
    let now = new Date().getTime();
    let iCount = mCodes.size;
    socket.emit('newGame', {
      name: data.name,
      room: code,
      time: now,
      count: iCount
    });

    console.log("leaving create Game - " + code);
  });

  //  ***************************   Join Game   ***************************
  socket.on('joinGame', function (data) {
    console.log("Join Game - Room: "+  data.room + "Socket: " +socket.id);
    let now = new Date().getTime();

    code = parseInt(data.room);
    console.log("\tRoom: " + code + "\t Socket ID: " + socket.id);

    //  check to see if the code they sent is in mCodes
    let exist = mCodes.has(code);
    if (!exist) {
      socket.emit('err', {
        text: 'That code does not exist, please enter a valid code.',
        time: now
      });
      return;
    }

    let aPlayerInfo = mCodes.get(code);  //  get the array of sockets associated with the code
    //  check if there are more than two sockets already associated with this code
    if (aPlayerInfo.length > 2) {
      socket.emit('err', {
        text: 'Sorry, The room is full!',
        time: now
      });
      return;
    }
    let playerInfo = { Socket: socket.id, name: data.name, red: false };
    mCodes.get(code).push(playerInfo);  //  add the new socket to the array

    let room = io.nsps['/'].adapter.rooms[code];
    if ((room && room.length == 1) || (2 > mCodes.get(code))) {
      socket.join(code.toString());
      //console.log(io.nsps['/'].adapter.rooms[code]);
      let msg = data.name + " has joined the game";
      let now = new Date().getTime();
      //console.log("broadcasting joined message");
      socket.broadcast.to(code).emit('joined', {
        text: msg,
        time: now
      });
      socket.emit('player2', {
        code: code,
        time: now
      });
    } else {
      socket.emit('err', {
        text: 'Sorry, The room is full!',
        time: now
      });
    }
    console.log("leaving Join Game - " + data.rooom);
  });

  //  ***************************   Message   ***************************
  socket.on('message', function (data) {
    logOutputMessge("Message", data.room, socket.id);

    let now = new Date().getTime();
    socket.emit('message', {
      name: data.name,
      text: data.text,
      color: data.color,
      time: now
    });

    socket.in(data.room).emit('message', {
      name: data.name,
      text: data.text,
      color: data.color,
      time: now
    });
    console.log("leaving Message - " + data.room);
  });

  //  ***************************   Turn   ***************************
  socket.on('turn', function (data) {
    logOutputMessge("Turn", data.room, socket.id);
    console.log("\tMove: " + data.id);
    //socket.broadcast.to(data.room).emit('message', { name:data.name, text: data.text, color: data.color, time: now});
    //socket.emit('message', {  name:data.name, text: data.text, color: data.color, time: now});
    socket.broadcast.to(data.room).emit('turn', {
      name: data.name,
      id: data.id,
      room: data.room
    });
    console.log("leaving Turn - " + data.room);
  });

  //  ***************************   Play Again   ***************************
  socket.on('playAgain', function (data) {
    logOutputMessge("Play Again", data.room, socket.id);
    socket.broadcast.to(data.room).emit('playAgain');
    console.log("leaving Play Again - " + data.room);
  });


  function rowExist(result) {
    if (result)
      console.log('\tSetting UPDATE string');
    else
      console.log('\tSetting INSERT string');
  }

  //  ***************************   Save Game   ***************************
  socket.on('save', function (data) {
    logOutputMessge("Save", data.room, socket.id);

    if (undefined == mCodes.get(parseInt(data.room))) {
      let now = new Date().getTime();
      socket.emit('err', {
        text: 'Please start a game before saving',
        time: now
      });
      return;
    }

    let p1Name = mCodes.get(parseInt(data.room))[0].name;
    let p2Name = mCodes.get(parseInt(data.room))[1].name;


    //await pgClient.connect();
    console.log("Saving Game");
    let moves = data.moves;
    let movesArray = new Array();
    let playersArray = new Array();
    for (i = 0; i < moves.length; i++) {
      movesArray[i] = moves[i].id;
      playersArray[i] = moves[i].player;
    }

    let existString = "select exists(select 1 from games where room_id= " + data.room + ");";
    pgClient.query(existString, (err, res) => {
      if (err) {
        console.log(err.stack)
      } else {
        console.log("callback: " + res.rows[0].exists)
        let queryString = "";
        if (res.rows[0].exists) {
          console.log("\tCode already exist,  Need to UPDATE");
          queryString = "UPDATE games SET moves_id= ARRAY[" + movesArray + "],moves_player=ARRAY[" + playersArray + "] WHERE room_id=" + data.room + ";"
        }
        else {
          console.log("\tCode DOESN'T exist,  Need to INSERT");
          queryString = "INSERT INTO games(game_date, room_id,moves_id,moves_player,p1_name,p2_name) VALUES(CURRENT_DATE," + data.room + ",ARRAY[" + movesArray + "],ARRAY[" + playersArray + "], '" + p1Name + "', '" + p2Name + "');"
        }
        pgClient.query(queryString, (err, res) => {
          if (err) {
            console.log("ERROR Updating / Saving game: " + err.stack)
          } else {
            console.log("\tRecord was updates/saved Successfully")
            let now = new Date().getTime();
            socket.emit('saved', { time: now });  // send a message to the socket on which it was called
            socket.in(data.room.toString()).emit('saved', { time: now }); // sends message to all sockets in the given room  (not working like I think it should)
          }  //  end of update / save
        })
      }  //  end of exist
    })

    console.log("leaving Save  - " + data.room);
  }); //  end save

  //  *****************   success load   *****************
  function successLoadData(result, isRed) {
    console.log("In successLoadData");

    if (undefined == result.rows[0]) {
      let now = new Date().getTime();
      socket.emit('err', {
        text: 'Please enter a valid code',
        time: now
      });
      return;
    }

    let p1 = result.rows[0].p1_name;
    let p2 = result.rows[0].p2_name;
    let code = result.rows[0].room_id;
    let aMoves = result.rows[0].moves_id;
    let aPlayerMoves = result.rows[0].moves_player;

    let gameData = new Array();
    for (i = 0; i < aMoves.length; i++) {
      let player = aPlayerMoves[i];
      let move = aMoves[i];
      gameData[i] = { player, move };
      console.log("\tPlayer: " + player + " move: " + move)
    }

    //  determine if this is the first person to load game, or second
    let aPlayerInfo = mCodes.get(parseInt(code));
    let playerInfo = "";
    if (undefined == aPlayerInfo) {  //  the first time loading this game
      aPlayerInfo = new Array();
      playerInfo = { Socket: socket.id, name: p1, red: isRed };
      aPlayerInfo.push(playerInfo);
      mCodes.set(parseInt(code), aPlayerInfo);
    }
    else {  //second time loading this game
      let currentPlayerInfo = mCodes.get(code);
      let now = new Date().getTime();
      if (currentPlayerInfo[0].red == true && isRed) {  //  check if we already have a red player
        socket.emit('err', {
          text: 'the other player has already loaded the game as the RED player',
          time: now
        });
        return;
      }
      playerInfo = { Socket: socket.id, name: p2, red: isRed };
      aPlayerInfo.push(playerInfo);
      mCodes.set(parseInt(code), aPlayerInfo);
      //  send message to first play that I have joined
      let tmpColor = "";
      if (isRed)
        tmpColor = "red"
      else
        tmpColor = "green";
      socket.in(code).emit('message', {
        name: "SERVER",
        text: p2 + " has joined the game",
        color: tmpColor,
        time: now
      });
    }//  end of second time this has been called 
    socket.join(code.toString());

    let playerName = "";
    if (isRed)
      playerName = p1;
    else
      playerName = p2;

    socket.emit('load', {
      game: gameData,
      red: isRed,
      name: playerName
    });
    console.log("leaving successLoadData");

  }  //  end of successLoadData

  //  *************   failure to  load   *****************
  function failureLoadData(error) {
    console.error("Error retrieving data from database: " + error.stack);
    socket.emit('err', {
      text: 'Something went wrong loading the game from the database',
      time: now
    });
  }

  //  ***************************   Load   ***************************
  socket.on('load', function (data) {
    logOutputMessge("Load", data.room, socket.id);

    let selectString = "SELECT room_id,p1_name,p2_name, moves_id,moves_player FROM games WHERE room_id = " + data.room + " ;"
    pgClient.query(selectString)
      .then(result => successLoadData(result, data.red))
      .catch(e => failureLoadData(e))

    console.log("leaving Load - " + data.room);
  }); //  end load

  //  ************   Log Map Elements   ************
  function logMapElements(value, key, map) {
    console.log(`m[${key}] = ${value}`);
  }
  //  ***************************   Close   ***************************
  socket.on('close', function (data) {
    console.log("on Close - Room: "+  data.room + "Socket: " +socket.id);
    let code = parseInt(data.room)

    if (!mCodes.has(code))
      return;

    //  send a message to your opponent that you left
    let now = new Date().getTime();
    socket.in(code).emit('message', {
      name: "SERVER",
      text: "Your opponent has left the game",
      color: "black",
      time: now
    });

    //  remove the room from mCodes and disconnect all associated sockets
    let aPlayerInfo = mCodes.get(code);
    for (x = 0; x < aPlayerInfo.length; x++) {
      if (io.sockets.sockets[aPlayerInfo[x].Socket] != undefined)
        io.sockets.connected[aPlayerInfo[x].Socket].disconnect();
    }
    mCodes.delete(code);
    //        console.log("Codes AFTER delete: ");
    //        mCodes.forEach(logMapElements);

    console.log("leaving Close - " + data.room);
  });
}) //  end io.on  connection
