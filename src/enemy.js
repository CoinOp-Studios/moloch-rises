import Phaser from 'phaser';

import { Character } from './character';
import { TILEHEIGHT, TILEWIDTH, INPUT} from './labScene';
import { VrfProvider } from './vrfProvider';

export class Enemy extends Character {
    constructor(scene, x, y, texture, frame, config = {}, vrfProvider) {
        super(scene, x, y, texture, frame, config, vrfProvider);
        this.pathfinder = this.scene.pathfinder;
    }

    update (playerMoved) {
        this.updateAnimations();
        if (!playerMoved || this.isDead()) return;

        // move toward the player
        var ex = this.tileX();
        var ey = this.tileY();
        var px = this.scene.player.tileX();
        var py = this.scene.player.tileY();
        var nextX, nextY;

        this.pathfinder.findPath(ex, ey, px, py, function( path ) {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                nextX = path[1].x;
                nextY = path[1].y;
                console.log("nextX %s, nextY %s", nextX, nextY);
            }
        });

        this.pathfinder.calculate();

        var attackPlayer = this.scene.player.tileX() == nextX && this.scene.player.tileY() == nextY;

        // this mixes previous (position) and next (attack) turns
        this.scene.moveHistory.push([this.tileX(), this.tileY(), attackPlayer]);

        if (attackPlayer) {
            this.attack(this.scene.player);
            return;
        }

        this.pathfinder.stopAvoidingAdditionalPoint(this.tileX(), this.tileY());

        if (this.tileX() != nextX || this.tileY() != nextY) {
            super.moveTileXY(nextX, nextY);
        }

        this.pathfinder.avoidAdditionalPoint(this.tileX(), this.tileY());
    } 

    initOfflineStats() {
        this.hp = 1;
        this.ap = 1;
        this.dp = 1;
    }
    
    initStats(boardContract){
        this.initOfflineStats();
        // TODO
    }

    kill() {
        // play death animation + sound + dialogue
        console.log("%s: killing!", this.getName());
        this.animateDialogue('death');
        this.playSound('death');

        // change sprite
        this.setFrame(this.frame.name + 1);
    }
}
