import Phaser from 'phaser';

import defaultPlayerSpritesheet from "./assets/sprites/scientist_game.png"
import tilemapCsv from "./assets/tilemaps/csv/lab1.csv"
import defaultTileset from "./assets/tilemaps/tiles/factory64x64.png"
import { Player } from './player';

export const INPUT = Object.freeze({ UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4, SPACE: 5 });
export const TILEWIDTH = 64;
export const TILEHEIGHT = 64;

export class LabScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.map = null;
        this.debugGraphics = null;
        this.helpText = null;
        this.player = null;
        this.showDebug = false;
        this.cursors = null;
        this.lastInputTime = 0;
        this.lastInput = 0;
        this.minInputDelayMs = 50;
    }

    preload() {
        this.load.image('tiles', defaultTileset);
        this.load.tilemapCSV('map', tilemapCsv);
        this.load.spritesheet('player', defaultPlayerSpritesheet, { frameWidth: TILEWIDTH, frameHeight: TILEHEIGHT });
    }

    create() {
        // When loading a CSV map, make sure to specify the tileWidth and tileHeight
        this.map = this.make.tilemap({ key: 'map', tileWidth: TILEWIDTH, tileHeight: TILEHEIGHT });
        var tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, tileset, 0, 0);

        this.player = new Player(this, 10, 5, 'player', 0);

        // Set up the player to collide with the tilemap layer. Alternatively, you can manually run
        // collisions in update via: this.physics.world.collide(player, layer).
        this.physics.add.collider(this.player, layer);

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

    update(time, delta) {
        // game logic is tied to player input; enemies only move when player does
        // keep track of last input and last input time for this purpose
        var anyKeyPressed = this.anyCursorDown();
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
                }

                this.lastInputTime = time;

                // will need this if we want to animate each turn
                // for now, things will just "teleport" to their next tile
                //this.lastInput = input;
            }
        }

        this.player.update(input, this);

        // update enemies with player position

        this.keyPressedLastTick = anyKeyPressed;
    }

    anyCursorDown() {
        return this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown || this.cursors.space.isDown;
    }

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
