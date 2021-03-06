import EasyStar from 'easystarjs';
import { AbiCoder } from 'ethers/lib/utils';
import Phaser from 'phaser';

import damageSpritesheet from "./assets/animations/explosionSheet.png";
import * as dialogue from './assets/dialogue.json';
import defaultEnemySpritesheet from "./assets/sprites/droids_sprite_64x64.png";
import defaultPlayerSpritesheet from "./assets/sprites/scientist_game.png";
import tilemapCsv from "./assets/tilemaps/csv/lab1.csv";
import defaultTileset from "./assets/tilemaps/tiles/factory64x64.png";
import * as constants from './constants';
import { NUM_ENEMIES, TILEHEIGHT, TILEWIDTH } from './constants';
import { getAvatarContract, getBoardContract, startBoard, completeBoard } from './contractAbi'
import { Enemy } from './enemy';
import { Player } from './player';
import { VrfProvider } from './vrfProvider';

export const INPUT = Object.freeze({ UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4, SPACE: 5 });

const GAME_MODE = Object.freeze({ OFFLINE: 1, ONLINE:2 });
const COLLISION_INDEX_START = 54;
const COLLISION_INDEX_END = 83;
const ENEMY_SPRITE_SIZE_PX = 64;
const WALKABLE_RANGES = [
    [1, 3], [26, 28], [51, 53], [76, 78], [101, 103], [126, 128], [183, 185], [189, 200]
];
const COLLIDING_RANGES = [
    [4, 25], [29, 50], [54, 75], [79, 100], [104, 125], [129, 182], [186, 188]
];
const PATHFINDER_ITERATIONS = 1000;

export class LabScene extends Phaser.Scene {
    constructor(config) {
        super(config);

        // map
        this.map = null;
        this.tileset = null;

        // ai
        this.pathfinder = null;

        // UI / UX elements
        this.debugGraphics = null;
        this.helpText = null;
        this.showDebug = false;
        this.modeSelectPrompt = null;

        // game lifecycle
        this.gameMode = 0;
        this.turnsRemaining = -1;

        // input
        this.cursors = null;
        this.lastInputTime = 0;
        this.lastInput = 0;
        this.minInputDelayMs = 50;

        // on-chain state
        this.avatar = null;
        this.board = null;
        this.currentGame = null;

        // web3 provider
        this.provider = null;

        // game objects with collision which need to
        // check for one another
        this.player = null;
        this.collidingGameObjects = [];
        this.enemies = [];

        // move history 
        this.moveHistory = [];
    }

    //////////////// PHASER LIFECYLE //////////////////////////

    preload() {
        this.load.image('tiles', defaultTileset);
        this.load.tilemapCSV('map', tilemapCsv);
        this.load.spritesheet('player', defaultPlayerSpritesheet, { frameWidth: TILEWIDTH, frameHeight: TILEHEIGHT });
        for (var i = 0; i < NUM_ENEMIES; i++) {
            this.load.spritesheet(
                'enemy_' + i,
                defaultEnemySpritesheet,
                {
                    frameWidth: ENEMY_SPRITE_SIZE_PX,
                    frameHeight: ENEMY_SPRITE_SIZE_PX,
                    startFrame: 2 * i,
                    endFrame: 2 * i + 1
                }
            );
        }
        this.load.spritesheet('damageSprites', damageSpritesheet, { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.pathfinder = new EasyStar.js();

        // LOAD MAP 
        this.map = this.make.tilemap({ key: 'map', tileWidth: TILEWIDTH, tileHeight: TILEHEIGHT });
        this.tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, this.tileset, 0, 0);
        this.map.setCollisionBetween(COLLISION_INDEX_START, COLLISION_INDEX_END);
        this.pathfinder.setGrid(this.buildPathfindingGrid());
        this.pathfinder.setAcceptableTiles(this.buildAcceptableTileList());
        // so that we can call this in the update loop
        this.pathfinder.enableSync();
        // we recalculate every turn... keeping this low for now
        this.pathfinder.setIterationsPerCalculation(PATHFINDER_ITERATIONS);
        this.vrfProvider = new VrfProvider();

        // SPAWN SPRITES
        this.player = new Player(
            this,
            2,
            5,
            'player',
            0, // frame
            this.getPlayerConfig(),
            this.vrfProvider);
        this.collidingGameObjects.push(this.player);

        for (var i = 0; i < NUM_ENEMIES; i++) {
            var enemyXY = this.getEnemySpawnPosition(i);
            var enemy = new Enemy(
                this,
                enemyXY[0],
                enemyXY[1],
                'enemy_' + i,
                i * 2, //frame
                this.getEnemyConfig(), 
                this.vrfProvider);

            enemy.scaleX = TILEWIDTH / ENEMY_SPRITE_SIZE_PX;
            enemy.scaleY = TILEHEIGHT / ENEMY_SPRITE_SIZE_PX;
            this.enemies.push(enemy);
            this.collidingGameObjects.push(enemy);
        }

        // INITIALIZE ANIMATIONS
        this.anims.create({
            key: "damageAnimation",
            //frameRate:, 
            frames: this.anims.generateFrameNumbers("damageSprites", {}),
            repeat: 0
        });

        this.physics.add.collider(this.player, layer);

        // INITIALIZE HISTORY
        this.moveHistory.push([this.player.tileX(), this.player.tileY(), false]);
        this.enemies.forEach(enemy => {
            this.moveHistory.push([enemy.tileX(), enemy.tileY(), false]);
        });

        // CONFIGURE CAMERA
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // INIT INPUT
        this.cursors = this.input.keyboard.createCursorKeys();

        // INIT UI / UX
        this.turnsRemainingText = this.add.text(0, 0, "TURNS REMAINING: XX", {
            fontSize: constants.TURNS_REMAINING_FONT_SIZE_STRING,
            fontFamily: constants.TURNS_REMAINING_FONT_FAMILY,
            color: "#fff",
            backgroundColor: "#000"
        });
        this.turnsRemainingText.setPosition(
            (constants.VIEWPORT_WIDTH - this.turnsRemainingText.width) / 2,
            constants.VIEWPORT_HEIGHT - this.turnsRemainingText.height);
        this.turnsRemainingText.setAlpha(0);
    }

    update (time, delta) {
        // block until either:
        //      wallet is connected & on-chain state retrieved <---- ONLINE mode
        // OR   opted-out of wallet, default offline state used <---- OFFLINE mode
        if (!this.initGameState()) {
            if (this.modeSelectPrompt == null) {
                this.modeSelectPrompt = this.add.text(
                    0,
                    0,
                    constants.CONNECT_PROMPT_TEXT,
                    {fontSize: '22px', backgroundColor:"#000", color: "#fff"});
                this.modeSelectPrompt.setPosition((constants.VIEWPORT_WIDTH - this.modeSelectPrompt.width) / 2, 80)
            }
            return;
        }

        if (this.modeSelectPrompt != null) {
            this.modeSelectPrompt.destroy();
            this.modeSelectPrompt = null;
        }
 
        if (!this.hasGameStarted()){
            return;
        }

        if (!this.gameStarted) {
            this.startGame();
            this.gameStarted = true;
        }
 
        var input;
        if (!this.gameOver) {
            input = this.getInput(time);
        }
        
        // update sprites
        this.player.update(input, this);

        if (input != null) {
            this.decrementTurnsRemaining();
        }

        // update enemies 
        var allEnemiesDead = true;
        this.enemies.forEach(enemy => {
            enemy.update(input != null);
            allEnemiesDead = allEnemiesDead && enemy.isDead();
        });

        this.endGameIfOver(allEnemiesDead);
    }

    // TODO: add menu or visual prompt before sending a txn using user's wallet
    hasGameStarted() {
        if (this.gameMode == GAME_MODE.OFFLINE) {
            // no extra interaction necessary if wallet isn't connected
            return true;
        }
        if (this.gameMode == GAME_MODE.ONLINE) {
            // send prompt to user

            // wait for user to affirm prompt 
            return true;
        }

        return false;
    }

    decrementTurnsRemaining() {
        this.turnsRemaining--;
        this.turnsRemainingText.setText(constants.TURNS_REMAINING_TEXT + " " + this.turnsRemaining);
        this.turnsRemainingText.updateText();
    }

    haveMaxTurnsElapsed() {
        return this.turnsRemaining <= 0;
    }

    startGame() {
        this.turnsRemainingText.setText(constants.TURNS_REMAINING_TEXT + " " + this.turnsRemaining);
        this.turnsRemainingText.setAlpha(1);
        if (this.gameMode == GAME_MODE.OFFLINE || this.currentGame != null) {
            console.log("offline mode enabled or game is in progress");
            this.vrfProvider.setSeed(this.getOfflineBoard.maxTurns);
            return; 
        }
        
        console.log("starting game on-chain");
        startBoard(this.provider, this.board, this.avatar[0].id).then((gameId, gameData) => {
            console.log("retrieved on-chain gameId: %s and gameData ", gameId, gameData);
            [this.gameId, this.gameData] = [gameId, gameData];
            // TODO: get the seed from character sheet
            this.vrfProvider.setSeed(this.gameData.seed);
        });

    }

    getInput(time) {
        // game logic is tied to player input; enemies only move when player does
        // keep track of last input and last input time for this purpose
        const anyKeyPressed = this.anyCursorDown();
        var input = null;
        // accept new input if we're x ms ahead of the last input and the player isn't holding a key down
        if (this.lastInputTime + this.minInputDelayMs < time) {
            if (anyKeyPressed) {
                if (!this.keyPressedLastTick) {
                    if (this.cursors.left.isDown) {
                        input = INPUT.LEFT;
                    }
                    else if (this.cursors.right.isDown) {
                        input = INPUT.RIGHT;
                    }
                    else if (this.cursors.up.isDown) {
                        input = INPUT.UP;
                    }
                    else if (this.cursors.down.isDown) {
                        input = INPUT.DOWN;
                    }
                    else if (this.cursors.space.isDown) {
                        input = INPUT.SPACE;
                    }

                    this.lastInputTime = time;
                }
                // will need this if we want to animate each turn
                // for now, things will just "teleport" to their next tile
                //this.lastInput = input;
            }
        }
        this.keyPressedLastTick = anyKeyPressed;
        return input;
    }

    endGame() {
        console.log("ending game on-chain");
        if (this.gameMode == GAME_MODE.OFFLINE)
            return; 

        completeBoard(this.provider, this.board, this.gameId, this.gameData);
    }

    endGameIfOver(allEnemiesDead) {
        var terminal = false;
        var victory = false;

        if (allEnemiesDead) {
            terminal = true;
            victory = true;
        }
        else if (this.player.isDead()) {
            // animation
            terminal = true;
        }
        else if (this.haveMaxTurnsElapsed()) {
            // animation
            terminal = true;
        }

        if (!terminal || this.gameOver)
            return false;
        
        this.gameOver = true;
        
        if (this.gameMode == GAME_MODE.OFFLINE) {
            if (victory) {
                this.animateVictory();
                // dispaly a "here's what you *would* win prompt"
            } else {
                this.animateDefeat(this.haveMaxTurnsElapsed());
            }
        }
        if (this.gameMode == GAME_MODE.ONLINE) {
            this.gameData.completed = true;
            if (victory) {
                this.gameData.victory = true;
                // submit result + end game

                // claim NFT

                // submit ZK history
            } else {
                // update game state
                this.gameData.victory = false;
                this.gameData.resign = this.haveMaxTurnsElapsed();
                this.animateDefeat(this.haveMaxTurnsElapsed());

                // animate damage to equipped loot
                this.animateLootdamage();
            }
        }

        return true;
    }

    resetGame() {
        this.gameMode = 0;
        this.currentGame = null;
        this.gameOver = false;
        this.gameStarted = false;
        // TODO: recreate the scene
        this.scene.restart();
    }

    /////////////////////////////////////////////

    anyCursorDown() {
        return this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.space.isDown;
    }

    getEnemySpawnPosition(enemyIndex) {
        if (enemyIndex == 0) {
            return [7, 4];
        }
        if (enemyIndex == 1) {
            return [15, 1];
        }
        if (enemyIndex == 2) {
            return [20, 10];
        }
        return [-1, -1];
    }

    //////////// TILING & NAVIGATION //////////////////
    getTileID(x, y) {
        const tile = this.map.getTileAt(x, y);
        return tile.index;
    }

    // checks if a tile at coordinate x,y has collision enabled
    doesTileCollide(x,y) {
        const nextTile = this.map.getTileAt(x, y);
        return nextTile == null || this.doesTileIDCollide(nextTile.index);
    }

    doesTileIDCollide(index) {
        return this.map.tilesets[0].tileProperties.hasOwnProperty(index + 1);
    }

    buildPathfindingGrid() {
        var grid = [];
        for (var y = 0; y < this.map.height; y++) {
            var col = [];
            for (var x = 0; x < this.map.width; x++) {
                // In each cell we store the ID of the tile, which corresponds
                // to its index in the tileset of the map ("ID" field in Tiled)
                col.push(this.getTileID(x, y));
            }
            grid.push(col);
        }
        return grid;
    }

    buildAcceptableTileList() {
        var tileset = this.map.tilesets[0];
        var properties = tileset.tileProperties;
        var acceptableTiles = [];

        // iterate manually set ranges for collision
        COLLIDING_RANGES.forEach(range => {
            for (var i = range[0]; i <= range[1]; i++) {
                properties[i] = new Object();
                properties[i]['collide'] = true;
            }
        });

        for (var i = tileset.firstgid; i < tileset.total; i++) { // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
            if (!properties.hasOwnProperty(i + 1)) acceptableTiles.push(i);
        }
        this.pathfinder.setAcceptableTiles(acceptableTiles);
    }

    //////////ON-CHAIN INTERACTIONS////////////

    /// returns true if:
    ///     offline mode is selected 
    /// OR  wallet is connected, avatar selected, board state retrieved
    /// and false otherwise  
    initGameState() {
        // If the game mode has been set, then the requisited state has been
        //  retrieved
        if (this.gameMode == GAME_MODE.OFFLINE || this.gameMode == GAME_MODE.ONLINE)
            return true;

        var initialized = false;
        // check via the scene manager if the user has connected to the wallet scene
        var walletScene = this.scene.manager.getScene('wallet');
       
        let seed;
        // check if the user has either opted for offline play, or connected a wallet and avatar
        if (walletScene.provider != null && walletScene.currentAvatar != null && walletScene.boardContract != null) {
            this.provider = walletScene.provider;
            this.avatar = walletScene.currentAvatar;
            this.board = walletScene.boardContract;
            this.gameMode = GAME_MODE.ONLINE;
            initialized = true;
        }
        else if (walletScene.offline) {
            this.avatar = this.getOfflineAvatar();
            this.board = this.getOfflineBoard();
            this.gameMode = GAME_MODE.OFFLINE;
            initialized = true;
        }

        if (initialized) {
            this.initGameStateFromBoard(this.board);
            this.player.initStatsFromAvatar(this.avatar[0]);
        }

        return initialized;
    }

    initGameStateFromBoard(boardContract) {
        this.enemies.forEach(enemy => {
            if (this.gameMode == GAME_MODE.OFFLINE) {
                enemy.initOfflineStats();
            }
            if (this.gameMode == GAME_MODE.ONLINE) {
                enemy.initStats(this.board);
            }
        });

        if (this.gameMode == GAME_MODE.OFFLINE)
            this.turnsRemaining = 50;
        //TODO
        if (this.gameMode == GAME_MODE.ONLINE)
            this.turnsRemaining = 50;
    }

    getOfflineAvatar() {
        return JSON.parse(
            '[{"id":"0x0","fields":{"name":"Alcibiades","description":"An avatar ready to fight moloch.","image":"ipfs://bafkreib4ftqeobfmdy7kvurixv55m7nqtvwj3o2hw3clsyo3hjpxwo3sda","attributes":[{"trait_type":"HP","value":3},{"trait_type":"AP","value":1},{"trait_type":"DP","value":0},{"trait_type":"Armor","value":"Worn Lab Coat"},{"trait_type":"Weapon","value":"Used Plasma Cutter"},{"trait_type":"Implant","value":"No Implant"},{"trait_type":"Experience","value":0}]}},0]'
        );
    }

    getOfflineBoard() {
        return {maxTurns: 50};
    }

    /////////EMBELLISHMENTS/////////
    getEnemyConfig() {
        return {
            "dialogue": dialogue["enemy"]
        };
    }

    getPlayerConfig() {
        return {
            "dialogue": dialogue["player"]
        };
    }

    animateVictory() {
        this.player.animateText("YOU HAVE VANQUISHED MOLOCH!", this.player.x, this.player.y, "#D4AF37", 50);
    }

    animateDefeat(turnsElapsed) {

    }
    //////////DEBUG///////////////

    drawDebug() {
        this.debugGraphics.clear();

        if (this.showDebug) {
            // Pass in null for any of the style options to disable drawing that component
            this.map.renderDebug(this.debugGraphics, {
                tileColor: null, // Non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles
                faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
            });
        }

        this.helpText.setText(this.getHelpMessage());
    }

    getHelpMessage() {
        return 'Arrow keys to move.' +
            '\nPress "C" to toggle debug visuals: ' + (this.showDebug ? 'on' : 'off');
    }
}
