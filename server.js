var express = require('express');
var socket = require('socket.io');

//App setup
var app = express();
var server = app.listen(7777, function() {
  console.log('Listening to requests on port 7777');
});

//Static files
app.use(express.static('public'));
app.use(express.urlencoded());
app.use(express.json());
var gameRooms = [];

//Receive post request
app.post('/', function(request, response) {
  // console.log('Name:', request.body.game.name);
  // console.log('Room:', request.body.game.room);
  // console.log('Symbol:', request.body.game.symbol);

  //Stays on the same page
  response.status(204).send();
});

//Socket setup
var io = socket(server);

io.on('connection', function(socket) {
  console.log('Connection with the socket', socket.id);
  //console.log(io.nsps['/'].adapter.rooms);

  function roomDuplicate(room, socketId) {
    let duplicate = false;
    let duplicateIndex;
    for (let i = 0; i < gameRooms.length; i++) {
      if (gameRooms[i].roomNumber == room) {
        duplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (duplicate) {
      let player1 = gameRooms[duplicateIndex].Players.Player1;
      let player2 = gameRooms[duplicateIndex].Players.Player2;

      if (player1[2] == socketId) {
        //Player2 moves to Player1 and Player2 is deleted
        for (let i = 0; i < player1.length; i++) {
          player1[i] = player2[i];
          player2[i] = "";
        }
      } else {
        //Player1 remains on Player1 and Player2 is deleted
        for (let i = 0; i < player1.length; i++) {
          player2[i] = "";
        }
      }

      gameRooms[duplicateIndex].roomCount = parseInt(gameRooms[duplicateIndex].roomCount) - 1;

      if (gameRooms[duplicateIndex].roomCount == 0) {
        //Delete room object from array
        gameRooms.splice(duplicateIndex, 1);
      }
      return true;
    }
    else {
      return false;
    }
  }
  function displayRooms() {
    console.log("");
    for (let i = 0; i < gameRooms.length; i++) {
      console.log(gameRooms[i]);
    }
  }


  socket.on('disconnecting', (reason) => {
    let rooms = Object.keys(socket.rooms);
    // console.log(rooms); // [ '123', '8Z6XiCSqKL6ZhWEHAAAA' ]
    // console.log(rooms[0]); // 123
    // console.log(rooms[1]); // 8Z6XiCSqKL6ZhWEHAAAA

    if (roomDuplicate(rooms[0], socket.id)) {
      console.log("Player disconnected successfully.");
      displayRooms();
    }

    //Emit the new gameRooms
    io.sockets.emit('roomsList', gameRooms);
  });

  socket.on('formSubmit', (data) => {
    //Disconnects from connected rooms since it can only be in one at a time
    let rooms = Object.keys(socket.rooms);

    console.log(rooms);
    if (rooms[0].length === 3) {
      //Player will only ever be connected to 1 room
      socket.leave(rooms[0]);
    }

    if (roomDuplicate(rooms[0], socket.id)) {
      console.log("Room existed and the player was removed");
    }

    //Check if room sent is already in gameRooms
    let duplicate = false;
    let duplicateIndex;
    for (let i = 0; i < gameRooms.length; i++) {
      if (gameRooms[i].roomNumber == data.room) {
        duplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    // let newRoomObjectExample =  {
    //   roomNumber: "123" ,
    //   roomCount: "1",
    //   Players: {
    //     Player1: ["Player1Name", "O", "P1socket.id"],
    //     Player2: ["Player2Name", "X", "P2socket.id"]
    //   }
    // };

    let newRoom = {
      roomNumber: data.room,
      roomCount: "0",
      Players: {
        Player1: ["", "", ""],
        Player2: ["", "", ""]
      }
    };

    if (!duplicate) {
      newRoom.roomCount = 1;
      newRoom.Players.Player1[0] = data.name;
      newRoom.Players.Player1[1] = data.symbol;
      newRoom.Players.Player1[2] = socket.id;

      gameRooms.push(newRoom);

      //Client joins room
      socket.join(data.room);
    } else {
      if (gameRooms[duplicateIndex].roomCount < 2) {
        //Client joins room
        newRoom.roomCount = parseInt(gameRooms[duplicateIndex].roomCount) + 1;

        //Populate first player data since the room id is duplicated
        newRoom.Players.Player1[0] = gameRooms[duplicateIndex].Players.Player1[0];
        newRoom.Players.Player1[1] = gameRooms[duplicateIndex].Players.Player1[1];
        newRoom.Players.Player1[2] = gameRooms[duplicateIndex].Players.Player1[2];

        //First player joining the room gets to choose its symbol, second one just gets the one available
        newRoom.Players.Player2[0] = data.name;
        newRoom.Players.Player1[1] == "O" ? newRoom.Players.Player2[1] = "X" : newRoom.Players.Player2[1] = "O";
        newRoom.Players.Player2[2] = socket.id;

        gameRooms[duplicateIndex] = newRoom;

        //Client joins room
        socket.join(data.room);
      }
    }

    //Emit the new gameRooms
    displayRooms();
    io.sockets.emit('roomsList', gameRooms);
    io.to(data.room).emit('TestEvent');
  });
});
