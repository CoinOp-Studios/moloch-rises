import Phaser from 'phaser';

import { Character } from './character';
import { TILEHEIGHT, TILEWIDTH, INPUT} from './labScene';

export class Enemy extends Character {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame);
        this.pathfinder = this.scene.pathfinder;
    }

    update (playerMoved) {
        if (!playerMoved) return;

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

        var attackedPlayer = this.scene.player.tileX() == nextX && this.scene.player.tileY() == nextY;

        // this mixes previous (position) and next (attack) turns
        this.scene.moveHistory.push([this.tileX(), this.tileY(), attackedPlayer]);

        if (attackedPlayer) {
            // monster attacks player

            // play sound

            return;
        }

        super.moveTileXY(nextX, nextY);
    }

    damage(damageDone) {
        // animate damage done

        // apply damage

        // play death animation + sound

        // update tile to dead enemy sprite
    }
}
