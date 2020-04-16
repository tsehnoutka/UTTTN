//****************************************************************************
//                           Game stuff
//****************************************************************************
const PLAYER1_COLOR = "red";
const PLAYER1_SHADE = "lightpink";
const PLAYER2_COLOR = "green";
const PLAYER2_SHADE = "lightgreen";
const PLAYER1 = 0;
const PLAYER2 = 1;
const OUTERGAME = 9;
const gameLocation = [11, 12, 13, 21, 22, 23, 31, 32, 33];
const TXT_INPUT = document.querySelector("#input");
const CB_RED = document.querySelector("redCB");

var playerScore = new Array(); //  player, game, array of squares
for (p = 0; p < 2; p++) {
  playerScore[p] = new Array();
  for (g = 0; g < 10; g++)
    playerScore[p][g] = new Array();
}
var catsGame = new Array();  //  This array holds the subgames that are Cats
var currentGameNumber = -1;
var boxesTaken = 0;
var player = PLAYER1;
var done = false;
var yourTurn = false;
var recievedPlayAgain = false;
var outputMessage = ""
var displayMessage = false;
var gameOn=false;
var checkCurrentGame = true;

//  for Save / Load feature
var moves = new Array();  //  this holds the player # and the move that player made
var moveIndex =0;

jQuery(document).ready(function($) {
  //  create the event handlers for each box of the game
  for (p = 1; p <= 9; p++)
    for (y = 1; y <= 3; y++)
      for (x = 1; x <= 3; x++) {
        let eleID = "#" + p + "" + y + "" + x;
        let tempEle = $(eleID);
        $(eleID).on("click", function(event) {
          let p = this.id.substring(0, 1);
          let y = this.id.substring(1, 2);
          let x = this.id.substring(2);
          let id = p + "" + y + "" + x;
          let box = parseInt(y + "" + x);

          makeMove(p - 1, id, box, true);
          if (displayMessage)
            PopUpMessage(outputMessage);
          displayMessage = false;
        }); //  end of creating click function
      } //  end of for x
}); //  end document ready function

function is_iPhone_or_iPod() {
  return navigator.platform.match(/iPad/i) ||
    navigator.platform.match(/iPhone/i) ||
    navigator.platform.match(/MacIntel/i)
}

/*******************************************************************************
 **    Make move
 *******************************************************************************/
//  game -string -  1-9 location of the sub gameLocation
//  id - string - 111 -033  <game<y><x>
//  box - integer - <y><x>
//  Ckech Whose Turn - Boolean -we don't want to check whose turn it is if it
//                     a message from the server
function makeMove(game, id, box, checkWhoseTurn) {
  if (!gameOn)
    return;
  //addMessage("System", navigator.platform, "red", new Date().getTime());
  //console.log(navigator.platform);
  if (!is_iPhone_or_iPod())
    TXT_INPUT.focus(); //  give the text box the focus

  if (boxesTaken > 80) { // game over
    outputMessage = "Please start another game";
    displayMessage = true;
    return;
  }
  //  user didin't click in available subgame
  if (currentGameNumber != -1 && game != currentGameNumber  && checkCurrentGame) {
    outputMessage = "Please make your selection in the correct sub-game";
    displayMessage = true;
    return;
  }

  //  if the square is alrady taken or we are done ( a winner hs been found)
  let p1 = playerScore[PLAYER1][game].indexOf(box);
  let p2 = playerScore[PLAYER2][game].indexOf(box);
  if (p1 >= 0 || p2 >= 0 || done)
    return;
  //  the square is open
  //  I don't want to check whose turn it is if this is called from
  //  the server sending me my opponent's turn
  if (checkWhoseTurn)
    if (!yourTurn) {
      outputMessage = "NOT your turn !!";
      displayMessage = true;
      return;
    }

  let color = (player == PLAYER1) ? PLAYER1_COLOR : PLAYER2_COLOR;
  let availableColor = (player == PLAYER1) ? PLAYER2_SHADE : PLAYER1_SHADE;
  document.getElementById(id).style.backgroundColor = color;
  playerScore[player][game].push(box); //  put this square's id in the array
  boxesTaken++;
  moves[moveIndex++] = {player, id};

  subGameWinner = checkWinnerPlayer(playerScore[player][game]);
  if (subGameWinner) {
    playerScore[player][OUTERGAME].push(gameLocation[game]);
    for (y = 1; y <= 3; y++)
      for (x = 1; x <= 3; x++) {
        boxTemp = game + 1 + "" + y + "" + x;
        if ((document.getElementById(boxTemp).style.backgroundColor != PLAYER2_COLOR) &&
          (document.getElementById(boxTemp).style.backgroundColor != PLAYER1_COLOR)) {
          boxesTaken++;
        }
        document.getElementById(boxTemp).style.backgroundColor = color;
      }
  } //  check to see if player  won.
  //console.log("Clicked - Number of Boxes Taken: " + boxesTaken);

  if (checkWinnerPlayer(playerScore[player][OUTERGAME])) {
    outputMessage = color + ' wins click Reset to play again';
    displayMessage = true;
    boxesTaken = 82;
    done = true;

  } //  if outer game won

  // if the box clicked in the inner game is in the outter game,  the next player can move anywhere
  p1Win = playerScore[PLAYER1][OUTERGAME].indexOf(box);
  p2Win = playerScore[PLAYER2][OUTERGAME].indexOf(box);
  catWin = catsGame.indexOf(box);
  if (p1Win >= 0 || p2Win >= 0 || catWin >= 0)
    currentGameNumber = -1;
  else
    currentGameNumber = gameLocation.indexOf(box);

  //  set next turn color
  color = (player != PLAYER1) ? PLAYER1_COLOR : PLAYER2_COLOR;
  document.getElementById("turnbox").style.backgroundColor = color;

  if (!done) {
    if (!subGameWinner) {
      let p1g = playerScore[PLAYER1][game].length;
      let p2g = playerScore[PLAYER2][game].length;
      if (p1g + p2g == 9) {
        catsGame.push(gameLocation[game]);
      }
    } //  end if not sub game winner
    //  clear available moves
    for (g = 1; g <= 9; g++) // game
      for (y = 1; y <= 3; y++)
        for (x = 1; x <= 3; x++) {
          myIndex = g + "" + y + "" + x;
          //  console.log(myIndex + " : " + document.getElementById(myIndex).style.backgroundColor);
          if ((document.getElementById(myIndex).style.backgroundColor == PLAYER2_SHADE) ||
            (document.getElementById(myIndex).style.backgroundColor == PLAYER1_SHADE))
            document.getElementById(myIndex).style.backgroundColor = ""
        } //  end for y

    //  show available moves
    //  if the next move is in an inner game that is already full, the player van move anywhere
    if (currentGameNumber == -1) {
      for (g = 0; g < 9; g++) // game
        shadeBoxes(g, availableColor);
    } else { //  just highlight the inner game there the playerc can move
      shadeBoxes(currentGameNumber, availableColor);
    } //  end else
  } //  end if NOT won
  player = (player ^ PLAYER1) ? PLAYER1 : PLAYER2; //  change player

  if (boxesTaken > 80) { // game over
    if (!done) {
      outputMessage = "CATS game \n\nPlease start another game";
      displayMessage = true;
    }
  }
  if (checkWhoseTurn) {
    SendTurn(id);
  }
}
/*******************************************************************************
 **    Shadeboxes
 *******************************************************************************/
function shadeBoxes(GameNumber, shadeColor) {
  for (y = 1; y <= 3; y++)
    for (x = 1; x <= 3; x++) {
      myIndex = GameNumber + 1 + "" + y + "" + x;
      if (document.getElementById(myIndex).style.backgroundColor == "")
        document.getElementById(myIndex).style.backgroundColor = shadeColor;
    } //  end for y
} //end shade Boxes

/*******************************************************************************
 **    Play  Again
 *******************************************************************************/
const BTN_PLAYAGAIN = document.querySelector("#playagain");

function onPlayAgain() {
  console.log("Play again button has been pushed");
  // need to blank out the arrays
  for (i = 0; i < 2; i++) //  number of players
    for (g = 0; g <= 9; g++) //  number of games
      while (0 < playerScore[i][g].length)
        playerScore[i][g].pop();

  // need to blank out the gaming squares
  for (g = 1; g <= 9; g++) //  number of games
    for (y = 1; y <= 3; y++)
      for (x = 1; x <= 3; x++) {
        let id = g + "" + y + "" + x;
        document.getElementById(id).style.backgroundColor = ""; //  lightgrey  '#F1F6F3'

      }

  while (0 < catsGame.length)
    catsGame.pop();
  done = false;
  currentGameNumber = -1;
  boxesTaken = 0;

  //  need to send a message to the opponenet and all they
  //  should do is call this function
  if (!recievedPlayAgain)
    sendPlayAgain();
  recievedPlayAgain = false;
}
BTN_PLAYAGAIN.addEventListener("click", onPlayAgain, false);


/*******************************************************************************
 **    checkWinnerPlayer
 *******************************************************************************/
function checkWinnerPlayer(currentGame) {
  let playerrows = [];
  let playercols = [];

  for (i = 0; i < currentGame.length; i++) {
    let rowsColumns = "" + currentGame[i] //convert int to string
    playerrows.push(parseInt(rowsColumns.substring(0, 1)));
    playercols.push(parseInt(rowsColumns.substring(1)));
  }

  let playerWinner = checkForRowColumn(playerrows);
  if (!playerWinner)
    playerWinner = checkForRowColumn(playercols);
  if (!playerWinner)
    playerWinner = checkForDiagonal(currentGame);

  if (playerWinner) {
    return true;
  }
  return false;
}

/*******************************************************************************
 **    checkForRowColumn
 *******************************************************************************/
function checkForRowColumn(array) {
  if (array.length > 2) {
    let one = 0;
    let two = 0;
    let three = 0;
    for (i = 0; i < array.length; i++) {
      if (array[i] == 1)
        one++;
      if (array[i] == 2)
        two++;
      if (array[i] == 3)
        three++;
    }
    if (one == 3 || two == 3 || three == 3)
      return true;
  }
  return false;
}

/*******************************************************************************
 **    checkForDiagonal
 *******************************************************************************/
function checkForDiagonal(playerScoreD) {
  if (playerScoreD.length > 2) {
    if (playerScoreD.indexOf(11) > -1 && playerScoreD.indexOf(22) > -1 && playerScoreD.indexOf(33) > -1)
      return true;
    if (playerScoreD.indexOf(13) > -1 && playerScoreD.indexOf(22) > -1 && playerScoreD.indexOf(31) > -1)
      return true;
    ""
  }
  return false;
}

//  i am using a function, becuase some day I may want to change this to use Modals
function PopUpMessage(message) {
  alert(message);
}
