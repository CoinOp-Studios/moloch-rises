import Phaser from 'phaser';
import EasyStar from 'easystarjs';
import { Player } from './player';
import { Enemy } from './enemy';
import { getBoardContract, getAvatarContract } from './contractAbi'

import defaultPlayerSpritesheet from "./assets/sprites/scientist_game.png";
import defaultEnemySpritesheet from "./assets/sprites/droids_sprite_64x64.png"
import tilemapCsv from "./assets/tilemaps/csv/lab1.csv";
import defaultTileset from "./assets/tilemaps/tiles/factory64x64.png";
import * as dialogue from './assets/dialogue.json';

import { VrfProvider } from './vrfProvider';
import { AbiCoder } from 'ethers/lib/utils';

export const INPUT = Object.freeze({UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4, SPACE : 5});
export const TILEWIDTH = 64;
export const TILEHEIGHT = 64;
export const NUM_ENEMIES = 3;
const COLLISION_INDEX_START = 54;
const COLLISION_INDEX_END = 83;
const ENEMY_SPRITE_SIZE_PX = 64;
const WALKABLE_RANGES = [
    [1,3], [26,28], [51, 53], [76,78], [101, 103], [126, 128], [183, 185], [189, 200]
];
const COLLIDING_RANGES = [
    [4, 25], [29, 50], [54, 75], [79, 100], [104, 125], [129, 182], [186, 188]
];
const PATHFINDER_ITERATIONS = 1000;

export class LabScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.pathfinder = null;
        this.map = null;
        this.tileset = null;
        this.debugGraphics = null;
        this.helpText = null;
        this.player = null;
        this.showDebug = false;
        this.cursors = null;
        this.lastInputTime = 0;
        this.lastInput = 0;
        this.minInputDelayMs = 50;
        this.avatar = null;
        this.board = null;

        // web3 provider
        this.connectWalletPrompt = null;
        this.provider = null;

        // game objects with collision which need to
        // check for one another
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
        for (var i = 0; i < NUM_ENEMIES; i++){
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
    }

    create () {
        this.pathfinder = new EasyStar.js();

        // LOAD MAP 
        this.map = this.make.tilemap({ key: 'map', tileWidth: TILEWIDTH, tileHeight: TILEHEIGHT});
        this.tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, this.tileset, 0, 0);
        this.map.setCollisionBetween(COLLISION_INDEX_START, COLLISION_INDEX_END);
        this.pathfinder.setGrid(this.buildPathfindingGrid());
        this.pathfinder.setAcceptableTiles(this.buildAcceptableTileList());
        // so that we can call this in the update loop
        this.pathfinder.enableSync();
        // we recalculate every turn... keeping this low for now
        this.pathfinder.setIterationsPerCalculation(PATHFINDER_ITERATIONS);

        // SPAWN SPRITES
        this.player = new Player(
            this,
            1,
            3,
            'player',
            0, // frame
            this.getPlayerConfig(),
            new VrfProvider());
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
                new VrfProvider());

            enemy.scaleX = TILEWIDTH / ENEMY_SPRITE_SIZE_PX;
            enemy.scaleY = TILEHEIGHT / ENEMY_SPRITE_SIZE_PX;
            this.enemies.push(enemy);
            this.collidingGameObjects.push(enemy);
        }

        this.physics.add.collider(this.player, layer);

        // INITIALIZE HISTORY
        this.moveHistory.push([this.player.tileX(), this.player.tileY(), false]);
        this.enemies.forEach(enemy => {
            this.moveHistory.push([enemy.tileX(), enemy.tileY(), false]);
        });

        // CONFIGURE CAMERA
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.player);

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update (time, delta) {
        // block until wallet is connected 
        if (this.provider == null || this.avatar == null) {
            if (this.connectWalletPrompt == null) {
                this.connectWalletPrompt = this.add.text(16, 100, "please connect a wallet to continue!", {fontSize: '40px'});
            }
            // check via the scene manager if the user has connected to the wallet scene
            var walletScene = this.scene.manager.getScene('wallet');
            this.provider = walletScene.provider;
            this.avatar = walletScene.currentAvatar;
            // spin until the user connects a wallet

            return;
        }

        if (this.connectWalletPrompt != null) {
            this.connectWalletPrompt.destroy();
            this.connectWalletPrompt = null;
        }
        
        // UPDATE STATE FROM ON CHAIN
        console.log("retrieving game board from on chain")
        getBoardContract(this.provider).then(b => {
            this.board = b;
        });

        if (this.board == null) {
            return;
        }

        // start a game
        //let tx = this.board.start(this.avatar.id);

        // game logic is tied to player input; enemies only move when player does
        // keep track of last input and last input time for this purpose
        var anyKeyPressed = this.anyCursorDown();
        var input = null;
        var playerInputAccepted = false;
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
                    else if (this.cursors.space.isDown){
                        input = INPUT.SPACE;
                    }
                    
                    this.lastInputTime = time;
                    playerInputAccepted = true;
                }
                // will need this if we want to animate each turn
                // for now, things will just "teleport" to their next tile
                //this.lastInput = input;
            }
        }

        // update sprites
        this.player.update(input, this);

        // update enemies 
        var allDead = true;
        this.enemies.forEach(enemy => {
            enemy.update(playerInputAccepted);
            allDead = allDead && enemy.isDead();
        });

        if (allDead) {
            this.player.animateText("YOU HAVE VANQUISHED MOLOCH!", this.player.x, this.player.y, "#D4AF37", 50);
        }
        
        this.keyPressedLastTick = anyKeyPressed;
    }

    /////////////////////////////////////////////

    anyCursorDown () {
        return this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.space.isDown;
    }

    getEnemySpawnPosition(enemyIndex) {
        var x = 1 + enemyIndex;
        var y = 12;
        return [x,y];
    }

    //////////// TILING & NAVIGATION //////////////////
    getTileID(x, y) {
        var tile = this.map.getTileAt(x, y);
        return tile.index;
    }

    // checks if a tile at coordinate x,y has collision enabled
    doesTileCollide(x,y) {
        var nextTile = this.map.getTileAt(x, y);
        return nextTile == null || this.doesTileIDCollide(nextTile.index);
    }

    doesTileIDCollide(index) {
        return this.map.tilesets[0].tileProperties.hasOwnProperty(index + 1);
    }

    buildPathfindingGrid()
    {
        var grid = [];
        for(var y = 0; y < this.map.height; y++){
            var col = [];
            for(var x = 0; x < this.map.width; x++){
                // In each cell we store the ID of the tile, which corresponds
                // to its index in the tileset of the map ("ID" field in Tiled)
                col.push(this.getTileID(x,y));
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
           for(var i = range[0]; i <= range[1]; i++) {
               properties[i] = new Object();
               properties[i]['collide'] = true;
           } 
        });

        for (var i = tileset.firstgid; i < tileset.total; i++){ // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
            if (!properties.hasOwnProperty(i + 1)) acceptableTiles.push(i);
        }
        this.pathfinder.setAcceptableTiles(acceptableTiles);
    } 

    //////////ON-CHAIN INTERACTIONS////////////

    getSeedFromBoardContact() {
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

    //////////DEBUG///////////////

    drawDebug () {
        this.debugGraphics.clear();

        if (this.showDebug)
        {
            // Pass in null for any of the style options to disable drawing that component
            this.map.renderDebug(this.debugGraphics, {
                tileColor: null, // Non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles
                faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
            });
        }

        this.helpText.setText(this.getHelpMessage());
    }

    getHelpMessage () {
        return 'Arrow keys to move.' +
            '\nPress "C" to toggle debug visuals: ' + (this.showDebug ? 'on' : 'off');
    }
}
