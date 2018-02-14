'use strict';

var MTG = angular.module("MTG", []);

var MTG_App = angular.module("MTG_App", ["MTG"]);

MTG.controller("MTG_Ctrl", ["$scope",
	function($scope) {

		var players = $scope.players = [];
		$scope.sortedPlayers = [];

		var roundCount = 0;

		$scope.selectedRound = 0;
		$scope.playerNameToAdd = "";

		$scope.roundCountRange = function()
		{
			return new Array(roundCount).fill(1).map((v, i) => i);
		}

		function sortPlayers(players)
		{
			return players.sort((p1, p2) => {
				// Match points
				var PMP1 = $scope.computePlayerMatchPoints(p1);
				var PMP2 = $scope.computePlayerMatchPoints(p2);
				if (PMP1 != PMP2)
				{
					return (PMP2 - PMP1);
				}

				// Tie breaker 1
				var OMWP1 = $scope.computeOpponentMatchWinPercent(p1);
				var OMWP2 = $scope.computeOpponentMatchWinPercent(p2);
				if (OMWP1 != OMWP2)
				{
					return (OMWP2 - OMWP1);
				}

				// Tie breaker 2
				var PGWP1 = $scope.computePlayerGameWinPercent(p1);
				var PGWP2 = $scope.computePlayerGameWinPercent(p2);
				if (PGWP1 != PGWP2)
				{
					return (PGWP2 - PGWP1);
				}

				// Tie breaker 3
				var OGWP1 = $scope.computeOpponentGameWinPercent(p1);
				var OGWP2 = $scope.computeOpponentGameWinPercent(p2);
				if (OGWP1 != OGWP2)
				{
					return (OGWP2 - OGWP1);
				}

				return (Math.random() > 0.5 ? 1 : -1);
			});
		}
		
		function findBye()
		{
			var byePlayer = players.reduceRight((previousValue, currentValue) => {
				if (currentValue.byeCount < previousValue.byeCount)
				{
					return currentValue;
				}
				else if (currentValue.byeCount == previousValue.byeCount)
				{
					return (Math.random() < 0.5 ? currentValue : previousValue);
				}
				return previousValue;
			});
			return byePlayer;
		}
	
		function createPlayer(playerName)
		{
			return {
				"name": playerName,
				"matches": []
			};
		}

		function searchForAPlayer(playerName)
		{
			var player = null;
			for (var i = 0; i < players.length; i++)
			{
				var p = players[i];
				if (p.name == playerName)
				{
					player = p;
				}
			}
			return player;
		}

		$scope.computeMatchesWin = function(player)
		{
			return player.matches.reduce((pv, cv) => {
				if (cv.finished && (cv.myGames > cv.opponentGames))
				{
					pv += 1;
				}
				return pv;
			}, 0);
		}

		$scope.computeMatchesLoose = function(player)
		{
			return player.matches.reduce((pv, cv) => {
				if (cv.finished && (cv.myGames < cv.opponentGames))
				{
					pv += 1;
				}
				return pv;
			}, 0);
		}

		$scope.computeMatchesDraw = function(player)
		{
			return player.matches.reduce((pv, cv) => {
				if (cv.finished && (cv.myGames == cv.opponentGames))
				{
					pv += 1;
				}
				return pv;
			}, 0);
		}

		$scope.computeByeCount = function(player)
		{
			return player.matches.reduce((pv, cv) => {
				if (cv.bye)
				{
					pv += 1;
				}
				return pv;
			}, 0);
		}

		$scope.computePlayerMatchPoints = function(player)
		{
			return player.matches.reduce((pv, cv) => {
				if (cv.bye || (cv.finished && (cv.myGames > cv.opponentGames)))
				{
					pv += 3;
				}
				else if (cv.finished && (cv.myGames == cv.opponentGames))
				{
					pv += 1;
				}
				return pv;
			}, 0);
		}

		$scope.computePlayerMatchWinPercent = function(player)
		{
			var matchPoints = $scope.computePlayerMatchPoints(player);

			var roundsPlayed = player.matches.reduce((pv, cv) => {
				if (cv.bye || cv.finished)
				{
					pv += 1;
				}
				return pv;
			}, 0);

			var res = (matchPoints / (3 * roundsPlayed));

			if (isNaN(res) || (res < 1 / 3))
			{
				res = (1 / 3);
			}

			return res.toFixed(4);
		}

		$scope.computeOpponentMatchWinPercent = function(player)
		{
			var opponentCount = 0;

			var res = player.matches.reduce((pv, cv) => {
				if (!cv.bye)
				{
					var opponent = searchForAPlayer(cv.opponent);
					if (opponent)
					{
						pv += $scope.computePlayerMatchWinPercent(opponent);
						opponentCount++;
					}
				}
				return pv;
			}, 0);

			res /= opponentCount;

			if (isNaN(res) || (res < 1 / 3))
			{
				res = (1 / 3);
			}

			return res.toFixed(4);
		}

		$scope.computePlayerGamePoints = function(player)
		{
			var res = player.matches.reduce((pv, cv) => {
				if (cv.finished)
				{
					pv += (3 * cv.myGames);
				}
				else if (cv.bye)
				{
					pv += (3 * 2);
				}
				return pv;
			}, 0);

			return res;
		}

		$scope.computePlayerGameWinPercent = function(player)
		{
			var gamePoints = $scope.computePlayerGamePoints(player);

			var gamesPlayed = player.matches.reduce((pv, cv) => {
				if (cv.finished)
				{
					pv += (cv.myGames + cv.opponentGames);
				}
				else if (cv.bye)
				{
					pv += 2;
				}
				return pv;
			}, 0);

			var res = (gamePoints / (3 * gamesPlayed));

			if (isNaN(res) || (res < 1 / 3))
			{
				res = (1 / 3);
			}

			return res.toFixed(4);
		}

		$scope.computeOpponentGameWinPercent = function(player)
		{
			var opponentCount = 0;

			var res = player.matches.reduce((pv, cv) => {
				if (!cv.bye)
				{
					var opponent = searchForAPlayer(cv.opponent);
					if (opponent)
					{
						pv += $scope.computePlayerGameWinPercent(opponent);
						opponentCount++;
					}
				}
				return pv;
			}, 0);

			res /= opponentCount;

			if (isNaN(res) || (res < 1 / 3))
			{
				res = (1 / 3);
			}

			return res.toFixed(4);
		}

		function createMatch(opponentName, bye)
		{
			return {
				"opponent": opponentName,
				"bye": bye,
				"finished": false,
				"myGames": 0,
				"opponentGames": 0
			};
		}

		var newRound = $scope.newRound = function()
		{
			console.log("New round", roundCount);

			$scope.sortedPlayers = sortPlayers(players.slice());

			if ($scope.sortedPlayers.length % 2)
			{
				var byePlayer = findBye();

				byePlayer.byeCount++;

				byePlayer.matches[roundCount] = createMatch("", true, 0, 0);

				console.log("bye", byePlayer.name);
			}

			for (var i = 0; i < $scope.sortedPlayers.length; i++)
			{
				var p = $scope.sortedPlayers[i];
				if (p.matches[roundCount])
				{
					continue;
				}
				var o = null;
				for (var j = i + 1; j < $scope.sortedPlayers.length; j++)
				{
					o = $scope.sortedPlayers[j]
					if (o.matches[roundCount])
					{
						continue;
					}
					break;
				}
				p.matches[roundCount] = createMatch(o.name, false);
				o.matches[roundCount] = createMatch(p.name, false);
				console.log(p.name, "vs", o.name);
			}

			$scope.selectedRound = roundCount;
			roundCount++;

			save();
		}

		var updateScore = $scope.updateScore = function(match)
		{
			var opponent = searchForAPlayer(match.opponent);
			if (opponent)
			{
				opponent.matches[$scope.selectedRound].myGames = match.opponentGames;
				opponent.matches[$scope.selectedRound].opponentGames = match.myGames;
				opponent.matches[$scope.selectedRound].finished = match.finished;
			}

			save();
		}

		var reset = $scope.reset = function()
		{
			roundCount = 0;
			players = [];
			save();
			load();
		}

		var addPlayer = $scope.addPlayer = function()
		{
			players.push(createPlayer($scope.playerNameToAdd));
			$scope.playerNameToAdd = "";
			save();
			console.log(players);
		}

		function saveCookie(name, data)
		{
			var days = 1;
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
			document.cookie = (name + "=" + data + expires);
		}

		function loadCookie(name)
		{
			var cookie = decodeURIComponent(document.cookie);
			var idx = cookie.indexOf(name+"=");
			if (idx == -1)
			{
				return null;
			}
			var idxstart = cookie.indexOf("=", idx+1);
			if (idxstart == -1)
			{
				return null;
			}
			var idxend = cookie.indexOf(";", idxstart+1);
			if (idxend == -1)
			{
				idxend = cookie.length;
			}
			idxend -= 1;
			var data = cookie.substr(idxstart+1, idxend - idxstart);
			if (!data)
			{

				return null;
			}

			return data;
		}

		function saveData(name, data)
		{
			saveCookie(name, angular.toJson(data));
		}

		function loadData(name)
		{
			var data = loadCookie(name);
			if (!data)
			{
				return null;
			}
			return JSON.parse(data);
		}

		function save()
		{
			saveData("players", players);
			saveData("roundCount", roundCount);
			$scope.sortedPlayers = sortPlayers(players.slice());
		}

		function load()
		{
			var playersT = loadData("players");
			if (playersT)
			{
				players = $scope.players = playersT;
				$scope.sortedPlayers = sortPlayers(playersT.slice());
			}

			console.log(players);

			var roundCountT = loadData("roundCount");
			if (roundCountT)
			{
				roundCount = roundCountT;
				$scope.selectedRound = roundCount - 1;
			}
		}

		load();
	}
]);
