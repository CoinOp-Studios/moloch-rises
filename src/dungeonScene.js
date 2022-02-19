import Phaser from 'phaser';
import EasyStar from 'easystarjs'
import { Player } from './player';

import defaultTileset from "./assets/tilemaps/tiles/catastrophi_tiles_16.png"
import tilemapCsv from "./assets/tilemaps/csv/catastrophi_level2.csv"
import defaultPlayerSpritesheet from "./assets/sprites/spaceman.png"
import { Enemy } from './enemy';

export const INPUT = Object.freeze({UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4, SPACE : 5});
export const TILEWIDTH = 16;
export const TILEHEIGHT = 16;
export const NUM_ENEMIES = 3;
const COLLISION_INDEX_START = 54;
const COLLISION_INDEX_END = 83;
const PATHFINDER_ITERATIONS = 1000;

export class DungeonScene extends Phaser.Scene {
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

        // game objects with collision which need to
        // check for one another
        this.collidingGameObjects = [];
        this.enemies = [];

        // move history 
        this.moveHistory = [];
    }


    preload() {
        this.load.image('tiles', defaultTileset);
        this.load.tilemapCSV('map', tilemapCsv);
        this.load.spritesheet('player', defaultPlayerSpritesheet, { frameWidth: TILEWIDTH, frameHeight: TILEHEIGHT });
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
        this.player = new Player(this, 3, 0, 'player', 1);
        this.collidingGameObjects.push(this.player);

        for (var i = 0; i < NUM_ENEMIES; i++) {
            var enemyXY = this.getEnemySpawnPosition(i);
            // TODO: update texture
            var enemy = new Enemy(this, enemyXY[0], enemyXY[1], 'player', 2);
            this.enemies.push(enemy);
            this.collidingGameObjects.push(enemy);
        }

        this.enemies[0].tint = 0xff0000;
        this.enemies[1].tint = 0x00ff00;
        this.enemies[2].tint = 0x0000ff;

        this.physics.add.collider(this.player, layer);

        // INITIALIZE HISTORY
        this.moveHistory.push([this.player.tileX(), this.player.tileY(), false]);
        this.enemies.forEach(enemy => {
            this.moveHistory.push([enemy.tileX(), enemy.tileY(), false]);
        });

        // CONFIGURE CAMERA
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.player);

        this.debugGraphics = this.add.graphics();
        var scene = this;
        this.input.keyboard.on('keydown-C', function (event) {
            scene.showDebug = !scene.showDebug;
            scene.drawDebug();
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.helpText = this.add.text(16, 16, this.getHelpMessage(), {
            fontSize: '18px',
            fill: '#ffffff'
        });

        this.helpText.setScrollFactor(0);


    }

    update (time, delta) {
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
        this.enemies.forEach(enemy => {
            enemy.update(playerInputAccepted);
        });
        
        this.keyPressedLastTick = anyKeyPressed;
    }

    anyCursorDown () {
        return this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.space.isDown;
    }

    getEnemySpawnPosition(enemyIndex) {
        var x = 2 + enemyIndex;
        var y = 12;
        return [x,y];
    }

    // checks if a tile at coordinate x,y has collision enabled
    doesTileCollide(x,y) {
        var nextTile = this.map.getTileAt(x, y);
        return nextTile == null || nextTile.collides;
    }

    // checks if a tile type had collision enabled
    // i is the index of the tile type in the set of tiles for the map
    doesTileIndexCollide(i) {
        // cheap check for now based on ranges of tiles colliding;
        // this should be replaced by a check for a property on a particular tile
        // index with e.g. if(!tileset.tileProperties.hasOwnProperty(index))
        return i >= COLLISION_INDEX_START && i <= COLLISION_INDEX_END;
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

    // easystar is returning coordinates in non-walkable tiles.... this needs a review!
    buildAcceptableTileList() {
        var tileset = this.map.tilesets[0];
        var properties = tileset.tileProperties;
        var acceptableTiles = [];

        for(var i = tileset.firstgid-1; i < tileset.total; i++){ // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
            if (!properties.hasOwnProperty(i)) {
                // If there is no property indicated at all, it means it's a walkable tile
                acceptableTiles.push(i+1);
                continue;
            }
            if (!properties[i].collide) acceptableTiles.push(i+1);
            if (properties[i].cost) Game.finder.setTileCost(i+1, properties[i].cost); // If there is a cost attached to the tile, let's register it
        }
        this.pathfinder.setAcceptableTiles(acceptableTiles);
    }

    getTileID(x, y) {
        var tile = this.map.getTileAt(x, y);
        return tile.index;
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
