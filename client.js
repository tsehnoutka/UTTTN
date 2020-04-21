////  List of socket functions:
//  https://stackoverflow.com/questions/10058226/send-response-to-all-clients-except-sender
//***************************************************************
//                           Socket stuff
//***************************************************************

const INPUT = $('#input');
const STATUS = $('#status');
const CONTENT = $('#content');
const NEW = document.querySelector("#new");
const NAMENEW = document.querySelector("#nameNew");
const JOIN = document.querySelector("#join");
const NAMEJOIN = document.querySelector("#nameJoin");
const ROOM = document.querySelector("#room");
const CB_PLAYSOUND = document.querySelector("#playSound");
const MSG_SOUND = new Audio("./sounds/MsgNudge.wav");
const PLAY_SOUND = new Audio("./sounds/Notify.wav");
const BONK_SOUND = new Audio("./sounds/bonk.wav");

var code = -1;
var name = "";
var color = "";

// if user is running mozilla then use it's built-in WebSocket
window.WebSocket = window.WebSocket || window.MozWebSocket;
// if browser doesn't support WebSocket, just show
// some notification and exit
if (!window.WebSocket) {
  CONTENT.html($('<p>', {
    text: 'Sorry, but your browser doesn\'t support WebSocket.'
  }));
  // disable inout and buttons
  NEW.disabled = "disabled";
  NAMENEW.disabled = true;
  JOIN.disabled = true;
  NAMEJOIN.disabled = true;
  ROOM.disabled = true;
}

function disableInput() {
  INPUT.removeAttr('disabled'); //  enable the message box
  // disable inout and buttons
  NEW.disabled = "disabled";
  NAMENEW.disabled = true;
  JOIN.disabled = true;
  NAMEJOIN.disabled = true;
  ROOM.disabled = true;
}

jQuery(document).ready(function($) {
  //  handle web page envents
  //Create a new game.
  //  ***************     Create Game     ***************
  $('#new').on('click', function() {
    console.log("New game clicked");
    name = $('#nameNew').val().escape();
    color = PLAYER1_COLOR;
    if (!name) {
      const playPromise = BONK_SOUND.play();
      if (playPromise !== null) {
        playPromise.catch(() => { BONK_SOUND.play();})
      }
      alert('Please enter your name.');
      return;
    }
    socket.emit('createGame', {
      name: name,
      type: GAME_TYPE
    });
  }); //  end new game

  //Join an existing game
  //  ***************     Join Game     ***************
  $('#join').on('click', function() {
    console.log("Join clicked");

    name = $('#nameJoin').val().escape();
    color = PLAYER2_COLOR;
    let roomID = $('#room').val().escape();
    if (!name || !roomID) {
      const playPromise = BONK_SOUND.play();
      if (playPromise !== null) {
        playPromise.catch(() => { BONK_SOUND.play();})
      }
      alert('Please enter your name and game code.');
      return;
    }
    socket.emit('joinGame', {
      name: name,
      room: roomID,
      type: GAME_TYPE
    });
  }); //  end join

  //Save a game
  //  ***************     Save Game     ***************
  $('#save').on('click', function() {
    console.log("Save clicked");
    alertMsg = "";
    if (code == -1) {
      alertMsg = "Please start a game before attempting to save";
    } else if (0 == boxesTaken) {
      alertMsg = "You cannot save an empty game, please make a move before saving";
    } else {
      alertMsg = "Saving game....Your game will be saved for 30 days\nPlease remember your code:  " + code + "  and your color: " + color;

      socket.emit('save', {
        room: code,
        moves: moves
      });
    }

    const playPromise = BONK_SOUND.play();
    if (playPromise !== null) {
      playPromise.catch(() => { BONK_SOUND.play();})
    }
    alert(alertMsg);
  }); //  end save

  //Load a game
  //  ***************     Load Game     ***************

  $('#load').on('click', function() {
    console.log("Load clicked");
    let loadCode = $('#loadID').val().escape();
    if ("" == loadCode) {
      const playPromise = BONK_SOUND.play();
      if (playPromise !== null) {
        playPromise.catch(() => { BONK_SOUND.play();})
      }
      alert("Please enter a code");
      return;
    }

    socket.emit('load', {
      room: loadCode,
      player1: document.getElementById("P1CB").checked
    });
  }); //  end load

}); //  end document ready function


// handle xss
//  ***************
String.prototype.escape = function() {
  let tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  };
  return this.replace(/[&<>]/g, function(tag) {
    return tagsToReplace[tag] || tag;
  });
};

//  ***************     Send message     ***************
INPUT.keydown(function(e) {
  if (e.keyCode === 13) {
    console.log("Messsage entered");

    let msg = $(this).val().escape();
    if (!msg) {
      return;
    }
    // send the message as an ordinary text
    socket.emit('message', {
      name: name,
      text: msg,
      color: color,
      room: code
    });
    $(this).val('');
    // disable the INPUT field to make the user wait until server
    // sends back response
    INPUT.attr('disabled', 'disabled');
  }
});

//  ***************     Send Turn     ***************
function SendTurn(id) {
  console.log("Send Turn");

  socket.emit('turn', {
    name: name,
    id: id,
    room: code
  });
  yourTurn = false;
}

//  ***************     Send Play Again     ***************
function sendPlayAgain() {
  console.log("Send Play Again");

  socket.emit('playAgain', {
    room: code
  });
}

//  ***************
window.onbeforeunload = function() {
  //console.log("in On Before unload");
  socket.emit('close', {
    room: code
  });
  socket.onclose = function() {}; // disable onclose handler first
  socket.close();
};

//***************************************************************
//  responses from server
//***************************************************************
//New Game created. Update UI.
socket.on('newGame', function(data) {
  console.log("On new game - " + data.room);
  let message = 'Ask your friend to enter Game ID: ' +  data.room + '. Waiting for player 2...';
  addMessage("SERVER", message, "Black", data.time);
  console.log("System - The count is: " + data.count)
  code = data.room;
  yourTurn = true;
  disableInput();
});

//  ***************     Recieved Join     ***************
socket.on('joined', function(data) {
  console.log("On joined" - " + data.room");
  addMessage("SERVER", data.text, "Black", data.time);
  gameOn = true;

});

//  ***************     Recieved Message     ***************
socket.on('message', function(data) {
  console.log("On message");
  addMessage(data.name, data.text, data.color, data.time);
  INPUT.removeAttr('disabled'); //  enable the message box
  TXT_INPUT.focus();
});

//  ***************     Recieved Error     ***************
socket.on('err', function(data) {
  console.log("On error");
  addMessage("SERVER", data.text, "black", data.time)
  //CONTENT.prepend(data.message);
});
//Joined the game, so player is player 2
//  ***************     Recieved Player 2     ***************
socket.on('player2', function(data) {
  console.log("On player 2 - " + data.code);
  addMessage(name, " has joined the game.", color, data.time);
  INPUT.removeAttr('disabled'); //  enable the message box
  STATUS.text('Message: ');
  code = data.code;
  disableInput();
  gameOn = true;
});

//  ***************     Recieved Turn     ***************
socket.on('turn', function(data) {
  console.log("On turn");
  let p = data.id.substring(0, 1);
  let y = data.id.substring(1, 2);
  let x = data.id.substring(2);
  let id = p + "" + y + "" + x;
  let box = parseInt(y + "" + x);

  yourTurn = (yourTurn == false) ? true : false;
  //console.log("Server responded from turn, should be your turn: " + yourTurn);
  makeMove(p - 1, id, box, false);
  if (displayMessage)
    PopUpMessage(outputMessage);
  displayMessage = false;
  if (CB_PLAYSOUND.checked)
    PLAY_SOUND.play();
});

//  ***************     Recieved Play Again     ***************
socket.on('playAgain', function(data) {
  console.log("Onplay again");
  recievedPlayAgain = true;
  onPlayAgain();
});

//  ***************     Recieved Save     ***************
socket.on('saved', function(data) {
  console.log("On save");
  addMessage("SERVER", "The game has been saved", "black", data.time);
});

//  ***************     Recieved Load     ***************
socket.on('load', function(data) {
  console.log("on lLoad");
  checkCurrentGame = false;
  for (i = 0; i < data.game.length; i++) {
    let temp = data.game[i].move.toString();
    let p = temp.substring(0, 1);
    let y = temp.substring(1, 2);
    let x = temp.substring(2);
    let id = p + "" + y + "" + x;
    let box = parseInt(y + "" + x);
    gameOn = true;
    makeMove(p - 1, id, box, false)
  } //  end for
  checkCurrentGame = true;
  let whoWentLast = data.game[data.game.length - 1].player;

  //  variable youtTurn is set when create game returns
  // if who went last is 0, and you are player1, it is NOT your turn
  yourTurn = true;
  if (0 == whoWentLast) { //  its player 2's turn
    if (data.player1) //  are you player1?
      yourTurn = false;
  } else if (1 == whoWentLast) { //  it's player1's turn
    if (!data.player1) //  are you NOT player1?
      yourTurn = false;
  }

  let now = new Date().getTime();
  name = data.name;
  if (data.player1) {
    color = PLAYER1_COLOR;
    addMessage("SERVER", name + ": You're the color: " + PLAYER1_COLOR, "black", now);
  } else {
    color = PLAYER2_COLOR;
    addMessage("SERVER", name + ": You're the color: " + PLAYER2_COLOR, "black", now)
  }
  disableInput();
}); //  end load

function addMessage(author, message, color, now) {
  console.log("Add message");
  let dt = new Date(now);
  CONTENT.prepend('<p><span style="color:' + color + '">' +
    author + '</span> @ ' + (dt.getHours() < 10 ? '0' +
      dt.getHours() : dt.getHours()) + ':' +
    (dt.getMinutes() < 10 ?
      '0' + dt.getMinutes() : dt.getMinutes()) +
    ': ' + message + '</p>');
  if (CB_PLAYSOUND.checked) {
    const playPromise = MSG_SOUND.play();
    if (playPromise !== null) {
      playPromise.catch(() => {
        MSG_SOUND.play();
      })
    }
  }

} //  end add message
